import 'server-only';
import type { PressureLevel, TranscriptTurn } from '../types';

export const MAX_ROLEPLAY_CHARS = 200;

const PRESSURE_GUIDANCE: Record<PressureLevel, string> = {
  low: 'Bersikap ramah, suportif, dan beri ruang lawan bicara menjelaskan.',
  medium: 'Bersikap profesional, kritis secara wajar, dan tanyakan detail konkret.',
  high: 'Bersikap tegas, skeptis terhadap jawaban normatif, dan desak bukti atau solusi cepat.',
};

const PERSONA_GUIDANCE: Record<string, string> = {
  professional_calm: 'Nada tenang, terukur, bahasa Indonesia profesional namun natural.',
  executive_direct: 'Nada lugas, efisien, langsung ke inti masalah.',
  warm_hr: 'Nada hangat, ramah, tetap menjaga standar profesional wawancara.',
};

export interface RoleplayPromptInput {
  counterpartRole: string;
  situationGoal: string;
  pressureLevel: PressureLevel;
  voicePersona: string;
  crossSessionMemorySummary?: string | null;
}

export function buildRoleplaySystemPrompt(input: RoleplayPromptInput): string {
  const personaStyle =
    PERSONA_GUIDANCE[input.voicePersona] ?? PERSONA_GUIDANCE.professional_calm;
  const pressureStyle = PRESSURE_GUIDANCE[input.pressureLevel];

  const memoryBlock = input.crossSessionMemorySummary
    ? `\nKONTEKS RIWAYAT PENGGUNA (gunakan secara halus untuk menguji area perbaikan tanpa menyebutkannya secara eksplisit):\n${input.crossSessionMemorySummary.slice(0, 350)}`
    : '';

  return [
    `Anda adalah lawan bicara simulasi profesional bernama Kalamuji.`,
    `PERAN ANDA: ${input.counterpartRole}.`,
    `TUJUAN SITUASI PENGGUNA: ${input.situationGoal}.`,
    `TINGKAT TEKANAN: ${pressureStyle}`,
    `GAYA BICARA: ${personaStyle}`,
    memoryBlock,
    ``,
    `ATURAN KETAT (WAJIB DIPATUHI):`,
    `1. Balas HANYA sebagai karakter peran Anda dalam bahasa Indonesia lisan yang natural.`,
    `2. MAKSIMAL 200 KARAKTER (sekitar 1-2 kalimat pendek, 10-15 detik bicara).`,
    `3. DILARANG menggunakan markdown, bullet point, emoji, tanda bintang, atau narasi aksi seperti *tersenyum*.`,
    `4. Akhiri dengan satu pertanyaan atau tanggapan singkat yang memancing pengguna berbicara kembali.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatRecentTranscript(turns: TranscriptTurn[]): string {
  const recent = turns.slice(-8);
  if (recent.length === 0) return '(Belum ada percakapan sebelumnya. Mulai sesi.)';
  return recent
    .map((t) => `${t.speaker === 'user' ? 'Pengguna' : 'Anda'}: ${t.text}`)
    .join('\n');
}

export function enforceRoleplayLength(rawText: string): string {
  const cleaned = rawText
    .replace(/\*[^*]*\*/g, '')
    .replace(/[#_`>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= MAX_ROLEPLAY_CHARS) {
    return cleaned;
  }

  const slice = cleaned.slice(0, MAX_ROLEPLAY_CHARS);
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('?'),
    slice.lastIndexOf('!')
  );
  if (lastSentenceEnd >= 80) {
    return slice.slice(0, lastSentenceEnd + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice.slice(0, MAX_ROLEPLAY_CHARS - 1);
  return `${trimmed.replace(/[,;:\s]+$/, '')}.`;
}
