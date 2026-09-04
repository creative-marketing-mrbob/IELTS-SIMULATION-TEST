// Real AI IELTS Evaluator Service
// Evaluates IELTS Academic Writing (Task 1 & Task 2) and Speaking using official Cambridge IELTS Descriptors.
// Core Principle: AI NEVER guesses an overall band; it performs criterion-by-criterion evidence matching,
// assigns integer descriptor bands (1-9), and uses the deterministic calculation formulas.

import { 
  UserProfile, 
  UserAnswers, 
  WritingEvaluationDetail, 
  SpeakingEvaluationDetail, 
  SectionScoreReport, 
  AIAssessmentRecord, 
  AICalibrationMetrics,
  TestEvaluation,
  CriterionEvidence
} from '../types/ielts';
import { roundToNearestHalfBand } from '../utils/subjectiveAssessment';
import { cambridgeOfficialTest } from '../data/cambridgeTestBank';

const GEMINI_MODEL_NAME = 'gemini-1.5-flash';
const RUBRIC_VERSION = 'IELTS-Cambridge-Descriptors-2026.1';

export function getStoredEvaluatorAdminToken(): string {
  return '';
}

export async function saveStoredEvaluatorAdminToken(token: string): Promise<void> {
  const response = await fetch('/api/admin/evaluator-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Admin evaluator login failed.');
  }
}

export async function saveStoredEvaluatorStaffToken(token: string): Promise<'ADMIN' | 'TUTOR'> {
  const response = await fetch('/api/staff/evaluator-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Evaluator login failed.');
  }
  return payload.role === 'ADMIN' ? 'ADMIN' : 'TUTOR';
}

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };
type CriterionPayload = {
  band?: unknown;
  positiveEvidence?: unknown;
  limitingEvidence?: unknown;
  descriptorReason?: unknown;
  feedback?: unknown;
  confidence?: unknown;
};

const wordCount = (text?: string): number => text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

const normalizeConfidence = (c: unknown): 'High' | 'Medium' | 'Low' => {
  if (typeof c === 'string' && c.toUpperCase() === 'LOW') return 'Low';
  if (typeof c === 'string' && c.toUpperCase() === 'MEDIUM') return 'Medium';
  return 'High';
};

const normalizeRecordConfidence = (criteria: CriterionEvidence[]): 'HIGH' | 'MEDIUM' | 'LOW' => {
  if (criteria.some(c => c.confidence === 'Low')) return 'LOW';
  if (criteria.some(c => c.confidence === 'Medium')) return 'MEDIUM';
  return 'HIGH';
};

const parseWholeBand = (value: unknown, label: string): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 9) {
    throw new Error(`Invalid AI response: ${label} must be a whole-number band from 1 to 9.`);
  }
  return numeric;
};

const stringArray = (value: unknown): string[] => (
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
);

const requireText = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid AI response: ${label} is required.`);
  }
  return value.trim();
};

const buildCriterionEvidence = (
  criterion: string,
  payload: CriterionPayload | undefined,
  label: string
): CriterionEvidence => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`Invalid AI response: missing ${label}.`);
  }

  return {
    criterion,
    score: parseWholeBand(payload.band, label),
    positiveEvidence: stringArray(payload.positiveEvidence),
    limitingEvidence: stringArray(payload.limitingEvidence),
    descriptorMatch: requireText(payload.descriptorReason, `${label}.descriptorReason`),
    feedback: requireText(payload.feedback, `${label}.feedback`),
    confidence: normalizeConfidence(payload.confidence)
  };
};

const extractDataUrlAudio = (dataUrl?: string): { mimeType: string; base64: string } | null => {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:([^;,]+)[^,]*;base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

const buildSpeakingAudioParts = (speakingAnswers: UserAnswers['speaking']): GeminiPart[] => {
  const parts: GeminiPart[] = [];
  ([
    ['Part 1 audio', speakingAnswers.part1Audio],
    ['Part 2 audio', speakingAnswers.part2Audio],
    ['Part 3 audio', speakingAnswers.part3Audio]
  ] as const).forEach(([label, audio]) => {
    const parsed = extractDataUrlAudio(audio);
    if (parsed) {
      parts.push({ text: `\n=== ${label.toUpperCase()} ===` });
      parts.push({ inline_data: { mime_type: parsed.mimeType, data: parsed.base64 } });
    }
  });
  return parts;
};

const getWritingPart = (taskId: 1 | 2) => {
  const writingSection = cambridgeOfficialTest.sections.find(s => s.section_type === 'writing');
  const part = writingSection?.parts.find(p => p.id === taskId);
  if (!part) throw new Error(`Missing Cambridge Writing Task ${taskId} prompt.`);
  return part;
};

const getSpeakingPart = (partId: 1 | 2 | 3) => {
  const speakingSection = cambridgeOfficialTest.sections.find(s => s.section_type === 'speaking');
  const part = speakingSection?.parts.find(p => p.id === partId);
  if (!part) throw new Error(`Missing Cambridge Speaking Part ${partId} prompt.`);
  return part;
};

async function requestSecureAIEvaluation(
  section: 'writing' | 'speaking',
  user: UserProfile,
  answers: { task1: string; task2: string } | UserAnswers['speaking']
): Promise<{ success: boolean; assessment?: AIAssessmentRecord; detail?: WritingEvaluationDetail | SpeakingEvaluationDetail; report?: SectionScoreReport; error?: string }> {
  try {
    const response = await fetch('/api/ai-evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, user, answers })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      return {
        success: false,
        error: payload?.error || `AI Evaluation Failed: secure endpoint returned ${response.status}.`
      };
    }

    return payload;
  } catch (err: any) {
    return { success: false, error: err?.message || 'AI Evaluation Failed: secure endpoint unavailable.' };
  }
}

// =========================================================================
// OFFICIAL DESCRIPTORS PROMPT CONTEXT
// =========================================================================

const WRITING_RUBRIC_SYSTEM_PROMPT = `
You are a senior certified Cambridge IELTS Senior Examiner.
Evaluate the candidate's IELTS Academic Writing Task 1 and Task 2 submissions with strict fidelity to the official IELTS Band Descriptors.

CRITICAL RULES:
1. NEVER guess or invent an overall band.
2. For EVERY criterion, assign an INTEGER band score from 1 to 9 (e.g. 4, 5, 6, 7, 8, 9). Do NOT assign decimals like 6.3 or 5.8.
3. Select the HIGHEST band whose positive characteristics are sufficiently supported by actual candidate response evidence.
4. If performance sits between descriptors, choose the lower fully supported descriptor.
5. In descriptorReason, explicitly state what prevents the response from reaching the next band (e.g. "Not Band 7 because...").
6. Provide short, exact quote excerpts in positiveEvidence and limitingEvidence from the candidate text. Do NOT invent sentences the candidate did not write.
7. If the candidate response is empty or <= 20 words, assign Band 1 or 2 with an underlength warning.

OUTPUT FORMAT (JSON ONLY):
{
  "task1": {
    "taskAchievement": {
      "band": 6,
      "positiveEvidence": ["...", "..."],
      "limitingEvidence": ["...", "..."],
      "descriptorReason": "Supported Band 6 because... Not Band 7 because...",
      "feedback": "...",
      "confidence": "HIGH"
    },
    "coherenceCohesion": {
      "band": 6,
      "positiveEvidence": ["..."],
      "limitingEvidence": ["..."],
      "descriptorReason": "...",
      "feedback": "...",
      "confidence": "HIGH"
    },
    "lexicalResource": {
      "band": 6,
      "positiveEvidence": ["..."],
      "limitingEvidence": ["..."],
      "descriptorReason": "...",
      "feedback": "...",
      "confidence": "HIGH"
    },
    "grammaticalRangeAccuracy": {
      "band": 5,
      "positiveEvidence": ["..."],
      "limitingEvidence": ["..."],
      "descriptorReason": "...",
      "feedback": "...",
      "confidence": "HIGH"
    }
  },
  "task2": {
    "taskResponse": {
      "band": 6,
      "positiveEvidence": ["..."],
      "limitingEvidence": ["..."],
      "descriptorReason": "...",
      "feedback": "...",
      "confidence": "HIGH"
    },
    "coherenceCohesion": {
      "band": 6,
      "positiveEvidence": ["..."],
      "limitingEvidence": ["..."],
      "descriptorReason": "...",
      "feedback": "...",
      "confidence": "HIGH"
    },
    "lexicalResource": {
      "band": 6,
      "positiveEvidence": ["..."],
      "limitingEvidence": ["..."],
      "descriptorReason": "...",
      "feedback": "...",
      "confidence": "HIGH"
    },
    "grammaticalRangeAccuracy": {
      "band": 6,
      "positiveEvidence": ["..."],
      "limitingEvidence": ["..."],
      "descriptorReason": "...",
      "feedback": "...",
      "confidence": "HIGH"
    }
  }
}
`;

const SPEAKING_RUBRIC_SYSTEM_PROMPT = `
You are a senior certified Cambridge IELTS Senior Examiner.
Evaluate the candidate's IELTS Speaking performance across all parts (Part 1, Part 2, Part 3) based on the transcripts and metadata provided.

CRITICAL RULES:
1. Apply the official IELTS Speaking Band Descriptors strictly. A candidate must fully fit the positive features of a band before receiving that band.
2. Rate the average performance across Part 1 + Part 2 + Part 3, but penalize missing, extremely short, off-topic, memorised, or non-communicative responses.
3. Band 5 is NOT a default middle score. Only award Band 5+ when the candidate usually keeps going, produces more than isolated/simple responses, has enough vocabulary for the topic, and shows rateable sentence control.
4. If answers are mostly "I don't know", "no idea", unrelated words, repeated filler, silence, laughter/noise, or do not answer the prompt, treat the response as non-communicative and assign Band 1 for FC, LR, GRA, and Pronunciation.
5. If the whole performance is a few isolated words, wholly unrelated to the prompts, or has virtually no communicative meaning, assign Band 1 for all criteria.
6. Band 2 is only for isolated words or memorised utterances with at least a tiny amount of recognisable communication. If FC is totally incoherent or LR shows no communication possible, assign Band 1.
7. PRONUNCIATION RULE: If audio evidence is supplied, evaluate pronunciation from that audio and assign an INTEGER pronunciation.band score (1 to 9) with pronunciation.status = "AI_EVALUATED".
8. Only set pronunciation.status to "REQUIRES_TUTOR_EVALUATION" with band: null when audio evidence is missing.
9. In descriptorReason, explain why the descriptor was selected and what prevents reaching the next band.
10. Quote short excerpts from the transcript.

OUTPUT FORMAT (JSON ONLY):
{
  "fluencyCoherence": {
    "band": 6,
    "positiveEvidence": ["..."],
    "limitingEvidence": ["..."],
    "descriptorReason": "...",
    "feedback": "...",
    "confidence": "HIGH"
  },
  "lexicalResource": {
    "band": 6,
    "positiveEvidence": ["..."],
    "limitingEvidence": ["..."],
    "descriptorReason": "...",
    "feedback": "...",
    "confidence": "HIGH"
  },
  "grammaticalRangeAccuracy": {
    "band": 5,
    "positiveEvidence": ["..."],
    "limitingEvidence": ["..."],
    "descriptorReason": "...",
    "feedback": "...",
    "confidence": "HIGH"
  },
  "pronunciation": {
    "status": "AI_EVALUATED",
    "band": 6,
    "positiveEvidence": ["..."],
    "limitingEvidence": ["..."],
    "descriptorReason": "...",
    "feedback": "...",
    "confidence": "HIGH"
  }
}
`;

// =========================================================================
// AI EVALUATOR ENGINE
// =========================================================================

export async function evaluateWritingWithAI(
  user: UserProfile,
  writingAnswers: { task1: string; task2: string }
): Promise<{ success: boolean; assessment?: AIAssessmentRecord; detail?: WritingEvaluationDetail; report?: SectionScoreReport; error?: string }> {
  const result = await requestSecureAIEvaluation('writing', user, writingAnswers);
  return {
    success: result.success,
    assessment: result.assessment,
    detail: result.detail as WritingEvaluationDetail | undefined,
    report: result.report,
    error: result.error
  };
}

export async function evaluateSpeakingWithAI(
  user: UserProfile,
  speakingAnswers: UserAnswers['speaking']
): Promise<{ success: boolean; assessment?: AIAssessmentRecord; detail?: SpeakingEvaluationDetail; report?: SectionScoreReport; error?: string }> {
  const result = await requestSecureAIEvaluation('speaking', user, speakingAnswers);
  return {
    success: result.success,
    assessment: result.assessment,
    detail: result.detail as SpeakingEvaluationDetail | undefined,
    report: result.report,
    error: result.error
  };
}

// =========================================================================
// AI CALIBRATION METRICS ENGINE
// =========================================================================

export function calculateAICalibrationMetrics(submissions: TestEvaluation[]): AICalibrationMetrics {
  let verifiedCount = 0;
  let wSamples = 0, wExact = 0, wWithinHalf = 0, wMoreThanHalf = 0;
  let sSamples = 0, sExact = 0, sWithinHalf = 0, sMoreThanHalf = 0;
  let wAbsTotal = 0;
  let sAbsTotal = 0;
  const writingCriterion = {
    'Task Achievement / Response': { matches: 0, samples: 0 },
    'Coherence & Cohesion': { matches: 0, samples: 0 },
    'Lexical Resource': { matches: 0, samples: 0 },
    Grammar: { matches: 0, samples: 0 }
  };
  const speakingCriterion = {
    'Fluency & Coherence': { matches: 0, samples: 0 },
    'Lexical Resource': { matches: 0, samples: 0 },
    Grammar: { matches: 0, samples: 0 },
    Pronunciation: { matches: 0, samples: 0 }
  };
  const disagreementRows: AICalibrationMetrics['disagreementRows'] = [];

  const addCriterion = (bucket: Record<string, { matches: number; samples: number }>, label: string, ai?: number, tutor?: number) => {
    if (typeof ai !== 'number' || typeof tutor !== 'number') return;
    bucket[label].samples++;
    if (Math.abs(ai - tutor) <= 0.5) bucket[label].matches++;
  };

  const criterionPct = (bucket: Record<string, { matches: number; samples: number }>) => Object.fromEntries(
    Object.entries(bucket).map(([label, value]) => [
      label,
      value.samples > 0 ? Math.round((value.matches / value.samples) * 100) : 0
    ])
  );

  for (const sub of submissions) {
    if (!sub?.user?.fullName || !sub.resultId) continue;

    const tutorWritingBand = typeof sub.manualChecks?.writing?.tutorBand === 'number' ? sub.manualChecks.writing.tutorBand : null;
    const aiWritingBand = typeof sub.dualComparison?.aiAssessment?.writingBand === 'number' ? sub.dualComparison.aiAssessment.writingBand : null;

    const tutorSpeakingBand = typeof sub.manualChecks?.speaking?.tutorBand === 'number' ? sub.manualChecks.speaking.tutorBand : null;
    const aiSpeakingBand = typeof sub.dualComparison?.aiAssessment?.speakingBand === 'number' ? sub.dualComparison.aiAssessment.speakingBand : null;

    if (tutorWritingBand !== null && aiWritingBand !== null) {
      wSamples++;
      const diff = Math.abs(tutorWritingBand - aiWritingBand);
      wAbsTotal += diff;
      if (diff === 0) wExact++;
      if (diff <= 0.5) wWithinHalf++;
      if (diff > 0.5) wMoreThanHalf++;

      const aiDetail = sub.dualComparison?.aiAssessment?.writingDetail;
      const tutor = sub.manualChecks?.writing;
      addCriterion(writingCriterion, 'Task Achievement / Response', aiDetail?.task1.criterion1.score, tutor?.task1.ta);
      addCriterion(writingCriterion, 'Task Achievement / Response', aiDetail?.task2.criterion1.score, tutor?.task2.tr);
      addCriterion(writingCriterion, 'Coherence & Cohesion', aiDetail?.task1.cc.score, tutor?.task1.cc);
      addCriterion(writingCriterion, 'Coherence & Cohesion', aiDetail?.task2.cc.score, tutor?.task2.cc);
      addCriterion(writingCriterion, 'Lexical Resource', aiDetail?.task1.lr.score, tutor?.task1.lr);
      addCriterion(writingCriterion, 'Lexical Resource', aiDetail?.task2.lr.score, tutor?.task2.lr);
      addCriterion(writingCriterion, 'Grammar', aiDetail?.task1.gra.score, tutor?.task1.gra);
      addCriterion(writingCriterion, 'Grammar', aiDetail?.task2.gra.score, tutor?.task2.gra);

      const writingDiffs = [
        { label: 'Task Achievement / Response', value: Math.max(Math.abs((aiDetail?.task1.criterion1.score || 0) - (tutor?.task1.ta || 0)), Math.abs((aiDetail?.task2.criterion1.score || 0) - (tutor?.task2.tr || 0))) },
        { label: 'Coherence & Cohesion', value: Math.max(Math.abs((aiDetail?.task1.cc.score || 0) - (tutor?.task1.cc || 0)), Math.abs((aiDetail?.task2.cc.score || 0) - (tutor?.task2.cc || 0))) },
        { label: 'Lexical Resource', value: Math.max(Math.abs((aiDetail?.task1.lr.score || 0) - (tutor?.task1.lr || 0)), Math.abs((aiDetail?.task2.lr.score || 0) - (tutor?.task2.lr || 0))) },
        { label: 'Grammar', value: Math.max(Math.abs((aiDetail?.task1.gra.score || 0) - (tutor?.task1.gra || 0)), Math.abs((aiDetail?.task2.gra.score || 0) - (tutor?.task2.gra || 0))) }
      ].sort((a, b) => b.value - a.value);

      disagreementRows.push({
        candidate: sub.user.fullName,
        section: 'Writing',
        aiBand: aiWritingBand,
        tutorBand: tutorWritingBand,
        delta: diff,
        largestCriterionDifference: writingDiffs[0]?.label || 'N/A'
      });
    }

    if (tutorSpeakingBand !== null && aiSpeakingBand !== null) {
      sSamples++;
      const diff = Math.abs(tutorSpeakingBand - aiSpeakingBand);
      sAbsTotal += diff;
      if (diff === 0) sExact++;
      if (diff <= 0.5) sWithinHalf++;
      if (diff > 0.5) sMoreThanHalf++;

      const aiDetail = sub.dualComparison?.aiAssessment?.speakingDetail;
      const tutor = sub.manualChecks?.speaking;
      addCriterion(speakingCriterion, 'Fluency & Coherence', aiDetail?.fc.score, tutor?.fc);
      addCriterion(speakingCriterion, 'Lexical Resource', aiDetail?.lr.score, tutor?.lr);
      addCriterion(speakingCriterion, 'Grammar', aiDetail?.gra.score, tutor?.gra);
      addCriterion(speakingCriterion, 'Pronunciation', aiDetail?.pro.score, tutor?.pro);

      const speakingDiffs = [
        { label: 'Fluency & Coherence', value: Math.abs((aiDetail?.fc.score || 0) - (tutor?.fc || 0)) },
        { label: 'Lexical Resource', value: Math.abs((aiDetail?.lr.score || 0) - (tutor?.lr || 0)) },
        { label: 'Grammar', value: Math.abs((aiDetail?.gra.score || 0) - (tutor?.gra || 0)) },
        { label: 'Pronunciation', value: Math.abs((aiDetail?.pro.score || 0) - (tutor?.pro || 0)) }
      ].sort((a, b) => b.value - a.value);

      disagreementRows.push({
        candidate: sub.user.fullName,
        section: 'Speaking',
        aiBand: aiSpeakingBand,
        tutorBand: tutorSpeakingBand,
        delta: diff,
        largestCriterionDifference: speakingDiffs[0]?.label || 'N/A'
      });
    }

    if (sub.status === 'Evaluated' && sub.manualChecks?.isApproved) {
      verifiedCount++;
    }
  }

  return {
    totalTutorVerifiedSamples: verifiedCount,
    writing: {
      samples: wSamples,
      exactMatchCount: wExact,
      withinHalfBandCount: wWithinHalf,
      moreThanHalfBandCount: wMoreThanHalf,
      exactMatchPct: wSamples > 0 ? Math.round((wExact / wSamples) * 100) : 0,
      withinHalfBandPct: wSamples > 0 ? Math.round((wWithinHalf / wSamples) * 100) : 0,
      moreThanHalfBandPct: wSamples > 0 ? Math.round((wMoreThanHalf / wSamples) * 100) : 0,
      meanAbsoluteBandError: wSamples > 0 ? Math.round((wAbsTotal / wSamples) * 100) / 100 : 0,
      criterionAgreement: criterionPct(writingCriterion)
    },
    speaking: {
      samples: sSamples,
      exactMatchCount: sExact,
      withinHalfBandCount: sWithinHalf,
      moreThanHalfBandCount: sMoreThanHalf,
      exactMatchPct: sSamples > 0 ? Math.round((sExact / sSamples) * 100) : 0,
      withinHalfBandPct: sSamples > 0 ? Math.round((sWithinHalf / sSamples) * 100) : 0,
      moreThanHalfBandPct: sSamples > 0 ? Math.round((sMoreThanHalf / sSamples) * 100) : 0,
      meanAbsoluteBandError: sSamples > 0 ? Math.round((sAbsTotal / sSamples) * 100) / 100 : 0,
      criterionAgreement: criterionPct(speakingCriterion)
    },
    disagreementRows: disagreementRows.sort((a, b) => b.delta - a.delta)
  };
}
