import 'server-only';
import { Type } from '@google/genai';
import { z } from 'zod';
import { serverConfig } from '../config';
import type { TranscriptTurn } from '../types';
import { getGeminiClient, withTimeout } from './client';

export const evaluatorOutputSchema = z.object({
  clarity: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  persuasion: z.number().min(0).max(100),
  tone_composure: z.number().min(0).max(100),
  strongest_point: z.string().min(10).max(320),
  priority_improvement: z.string().min(10).max(320),
  better_phrasing_example: z.string().min(10).max(320),
  recurring_weakness_tag: z
    .enum([
      'rambling_structure',
      'vague_metrics',
      'off_topic_drift',
      'weak_call_to_action',
      'defensive_tone',
      'excessive_hedging',
      'rushed_closing',
      'none',
    ])
    .transform((val) => (val === 'none' ? null : val)),
});

export interface ComputedEvaluation {
  clarity: number;
  relevance: number;
  persuasion: number;
  toneComposure: number;
  overallScore: number;
  strongestPoint: string;
  priorityImprovement: string;
  betterPhrasingExample: string;
  recurringWeaknessTag: string | null;
}

export function computeDeterministicOverallScore(scores: {
  clarity: number;
  relevance: number;
  persuasion: number;
  toneComposure: number;
}): number {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const sum =
    clamp(scores.clarity) +
    clamp(scores.relevance) +
    clamp(scores.persuasion) +
    clamp(scores.toneComposure);
  return Math.round(sum / 4);
}

const EVALUATOR_SYSTEM_PROMPT = `Anda adalah Evaluator Komunikasi Profesional Kalamuji.
Tugas Anda adalah menilai transkrip percakapan pengguna secara objektif, konstruktif, dan praktis dalam bahasa Indonesia.

4 INDIKATOR PENILAIAN (SKALA 0–100):
1. clarity (Clarity & Cognitive Load — Sweller): Apakah pesan terstruktur, ringkas, mudah dicerna, dan tidak membebani pendengar dengan kalimat berputar-putar.
2. relevance (Relevance & Appropriateness — Wiemann/Spitzberg): Apakah jawaban langsung menjawab pertanyaan lawan bicara dan sesuai konteks profesional.
3. persuasion (Persuasion & Credibility — Petty/Cacioppo ELM): Apakah argumen didukung alasan logis, bukti/contoh konkret, dan membangun kredibilitas.
4. tone_composure (Tone & Composure — Ericsson Deliberate Practice): Apakah pilihan kata menunjukkan ketenangan, kontrol diri, tidak defensif, dan profesional di bawah tekanan.

JANGKAR SKOR (SCORING ANCHORS):
- 0–49: Belum efektif — jawaban tidak menjawab inti, sangat bertele-tele, atau tidak sesuai etika profesional.
- 50–69: Cukup dasar — maksud tersampaikan tetapi masih normatif, kurang bukti konkret, atau struktur kurang rapi.
- 70–84: Baik & profesional — jelas, relevan, sopan, dengan ruang peningkatan pada ketajaman argumen atau ringkasnya kalimat.
- 85–100: Sangat kuat — terstruktur tajam, meyakinkan dengan bukti konkret, tenang, dan siap untuk situasi berisiko tinggi.

ATURAN ETIKA & GAYA UMPAN BALIK:
- Fokus hanya pada perilaku komunikasi yang tampak di transkrip.
- DILARANG keras memberikan diagnosis klinis, psikologis, atau label kepribadian.
- Berikan umpan balik yang spesifik, membumi, dan langsung bisa dipraktikkan di sesi berikutnya.
- Jangan menghitung skor total; cukup berikan 4 skor indikator.`;

export async function evaluateSessionTranscript(input: {
  counterpartRole: string;
  situationGoal: string;
  pressureLevel: string;
  transcript: TranscriptTurn[];
}): Promise<ComputedEvaluation> {
  const formattedTranscript = input.transcript
    .map((t) => `[${t.speaker === 'user' ? 'PENGGUNA' : 'LAWAN BICARA'}]: ${t.text}`)
    .join('\n');

  const userPrompt = [
    `KONTEKS SESI:`,
    `- Lawan bicara: ${input.counterpartRole}`,
    `- Tujuan pengguna: ${input.situationGoal}`,
    `- Tingkat tekanan: ${input.pressureLevel}`,
    ``,
    `TRANSKRIP LENGKAP:`,
    formattedTranscript,
  ].join('\n');

  const ai = getGeminiClient();

  const response = await withTimeout(
    () =>
      ai.models.generateContent({
        model: serverConfig.gemini.evaluatorModel,
        contents: userPrompt,
        config: {
          systemInstruction: EVALUATOR_SYSTEM_PROMPT,
          temperature: 0.2,
          maxOutputTokens: 700,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clarity: { type: Type.INTEGER },
              relevance: { type: Type.INTEGER },
              persuasion: { type: Type.INTEGER },
              tone_composure: { type: Type.INTEGER },
              strongest_point: { type: Type.STRING },
              priority_improvement: { type: Type.STRING },
              better_phrasing_example: { type: Type.STRING },
              recurring_weakness_tag: {
                type: Type.STRING,
                enum: [
                  'rambling_structure',
                  'vague_metrics',
                  'off_topic_drift',
                  'weak_call_to_action',
                  'defensive_tone',
                  'excessive_hedging',
                  'rushed_closing',
                  'none',
                ],
              },
            },
            required: [
              'clarity',
              'relevance',
              'persuasion',
              'tone_composure',
              'strongest_point',
              'priority_improvement',
              'better_phrasing_example',
              'recurring_weakness_tag',
            ],
          },
        },
      }),
    20_000
  );

  const rawJson = JSON.parse(response.text ?? '{}');
  const validated = evaluatorOutputSchema.parse(rawJson);

  const clarity = Math.max(0, Math.min(100, Math.round(validated.clarity)));
  const relevance = Math.max(0, Math.min(100, Math.round(validated.relevance)));
  const persuasion = Math.max(0, Math.min(100, Math.round(validated.persuasion)));
  const toneComposure = Math.max(0, Math.min(100, Math.round(validated.tone_composure)));

  const overallScore = computeDeterministicOverallScore({
    clarity,
    relevance,
    persuasion,
    toneComposure,
  });

  return {
    clarity,
    relevance,
    persuasion,
    toneComposure,
    overallScore,
    strongestPoint: validated.strongest_point.trim(),
    priorityImprovement: validated.priority_improvement.trim(),
    betterPhrasingExample: validated.better_phrasing_example.trim(),
    recurringWeaknessTag: validated.recurring_weakness_tag,
  };
}
