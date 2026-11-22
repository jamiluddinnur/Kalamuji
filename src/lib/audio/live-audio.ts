'use client';

/**
 * Lightweight browser audio engine for Gemini Live API:
 * - Captures microphone audio and downsamples to 16kHz 16-bit PCM (base64)
 * - Plays back 24kHz 16-bit PCM (base64) gaplessly via unlocked AudioContext
 * - Supports instant barge-in interruption (stopPlayback)
 */

export function base64ToInt16Array(base64: string): Int16Array {
  const binary = window.atob(base64);
  const byteLength = binary.length;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
}

export function int16ArrayToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...sub);
  }
  return window.btoa(binary);
}

function downsampleTo16kPcm(input: Float32Array, inputSampleRate: number): Int16Array {
  const targetRate = 16000;
  if (inputSampleRate === targetRate) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i += 1) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  const ratio = inputSampleRate / targetRate;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Int16Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i += 1) {
      accum += input[i];
      count += 1;
    }
    const sample = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

export class RealtimeAudioEngine {
  private playbackCtx: AudioContext | null = null;
  private captureCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private nextPlayTime = 0;
  private muted = false;

  /**
   * Must be called inside a user click/tap handler to unlock audio on iOS/Safari/Chrome.
   */
  async unlockAudio(): Promise<void> {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!this.playbackCtx) {
      this.playbackCtx = new AudioCtx({ sampleRate: 24000 });
    }
    if (this.playbackCtx.state === 'suspended') {
      await this.playbackCtx.resume();
    }
  }

  async startMicCapture(
    onPcmChunk: (base64Pcm16: string) => void,
    onVolumeLevel?: (level: number) => void
  ): Promise<void> {
    await this.unlockAudio();

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.captureCtx = new AudioCtx();
    if (this.captureCtx.state === 'suspended') {
      await this.captureCtx.resume();
    }

    this.sourceNode = this.captureCtx.createMediaStreamSource(this.mediaStream);
    // 2048 samples (~42ms at 48kHz) balances low latency with low mobile CPU usage
    this.processorNode = this.captureCtx.createScriptProcessor(2048, 1, 1);

    const captureSampleRate = this.captureCtx.sampleRate;

    this.processorNode.onaudioprocess = (event) => {
      if (this.muted) {
        onVolumeLevel?.(0);
        return;
      }

      const channelData = event.inputBuffer.getChannelData(0);

      if (onVolumeLevel) {
        let sumSq = 0;
        for (let i = 0; i < channelData.length; i += 4) {
          sumSq += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sumSq / (channelData.length / 4));
        onVolumeLevel(Math.min(1, rms * 4.5));
      }

      const pcm16 = downsampleTo16kPcm(channelData, captureSampleRate);
      onPcmChunk(int16ArrayToBase64(pcm16));
    };

    // Route through a silent gain node so onaudioprocess fires without local echo
    const silentGain = this.captureCtx.createGain();
    silentGain.gain.value = 0;

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(silentGain);
    silentGain.connect(this.captureCtx.destination);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /**
   * Queues a 24kHz 16-bit PCM base64 audio chunk from Gemini Live API for gapless playback.
   */
  enqueuePcm24k(base64Pcm: string, onPlaybackEmpty?: () => void): void {
    if (!this.playbackCtx) return;

    if (this.playbackCtx.state === 'suspended') {
      void this.playbackCtx.resume();
    }

    const pcm16 = base64ToInt16Array(base64Pcm);
    if (pcm16.length === 0) return;

    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i += 1) {
      float32[i] = pcm16[i] / 0x8000;
    }

    const buffer = this.playbackCtx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    const source = this.playbackCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackCtx.destination);

    const now = this.playbackCtx.currentTime;
    const startAt = Math.max(now + 0.01, this.nextPlayTime);
    this.nextPlayTime = startAt + buffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        onPlaybackEmpty?.();
      }
    };

    source.start(startAt);
  }

  /**
   * Immediately halts AI audio playback (used when user interrupts / barges in).
   */
  stopPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
    }
    this.activeSources.clear();
    if (this.playbackCtx) {
      this.nextPlayTime = this.playbackCtx.currentTime;
    }
  }

  async destroy(): Promise<void> {
    this.stopPlayback();

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }
    if (this.captureCtx) {
      await this.captureCtx.close().catch(() => {});
      this.captureCtx = null;
    }
    if (this.playbackCtx) {
      await this.playbackCtx.close().catch(() => {});
      this.playbackCtx = null;
    }
  }
}
