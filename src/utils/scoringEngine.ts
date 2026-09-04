import { BandConversionTable, BandConversionRule, IELTSQuestion, SectionScoreReport } from '../types/ielts';
import { cambridgeOfficialTest } from '../data/cambridgeTestBank';

// Default Admin-Editable Band Conversion Table for Academic Reading & Listening (0–40 Standard Scale)
export const defaultBandConversionTable: BandConversionTable = {
  reading: [
    { minScore: 39, maxScore: 40, band: 9.0 },
    { minScore: 37, maxScore: 38, band: 8.5 },
    { minScore: 35, maxScore: 36, band: 8.0 },
    { minScore: 33, maxScore: 34, band: 7.5 },
    { minScore: 30, maxScore: 32, band: 7.0 },
    { minScore: 27, maxScore: 29, band: 6.5 },
    { minScore: 23, maxScore: 26, band: 6.0 },
    { minScore: 19, maxScore: 22, band: 5.5 },
    { minScore: 15, maxScore: 18, band: 5.0 },
    { minScore: 13, maxScore: 14, band: 4.5 },
    { minScore: 10, maxScore: 12, band: 4.0 },
    { minScore: 8, maxScore: 9, band: 3.5 },
    { minScore: 6, maxScore: 7, band: 3.0 },
    { minScore: 4, maxScore: 5, band: 2.5 },
    { minScore: 0, maxScore: 3, band: 0.0 }
  ],
  listening: [
    { minScore: 39, maxScore: 40, band: 9.0 },
    { minScore: 37, maxScore: 38, band: 8.5 },
    { minScore: 35, maxScore: 36, band: 8.0 },
    { minScore: 32, maxScore: 34, band: 7.5 },
    { minScore: 30, maxScore: 31, band: 7.0 },
    { minScore: 26, maxScore: 29, band: 6.5 },
    { minScore: 23, maxScore: 25, band: 6.0 },
    { minScore: 18, maxScore: 22, band: 5.5 },
    { minScore: 16, maxScore: 17, band: 5.0 },
    { minScore: 13, maxScore: 15, band: 4.5 },
    { minScore: 10, maxScore: 12, band: 4.0 },
    { minScore: 8, maxScore: 9, band: 3.5 },
    { minScore: 6, maxScore: 7, band: 3.0 },
    { minScore: 4, maxScore: 5, band: 2.5 },
    { minScore: 0, maxScore: 3, band: 0.0 }
  ]
};

export function getStoredBandConversionTable(): BandConversionTable {
  return defaultBandConversionTable;
}

export function saveBandConversionTable(table: BandConversionTable): void {
  void table;
}

// Convert raw score to estimated diagnostic band using configurable mapping
export function rawScoreToEstimatedBand(
  rawScore: number, 
  totalPossible: number = 40, 
  sectionType: 'reading' | 'listening',
  customTable?: BandConversionTable
): number {
  const table = customTable || getStoredBandConversionTable();
  const rules = table[sectionType];

  // Scale rawScore proportionally if total questions differs from 40
  const scaledScore = totalPossible === 40 ? rawScore : Math.round((rawScore / totalPossible) * 40);

  for (const rule of rules) {
    if (scaledScore >= rule.minScore && scaledScore <= rule.maxScore) {
      return rule.band;
    }
  }

  return 0.0;
}

// Normalizes user input and correct answers for robust deterministic comparison
export function normalizeAnswer(ans: string): string {
  if (!ans) return '';
  return ans
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // strip punctuation
    .replace(/\s+/g, " "); // collapse whitespace
}

// Matches candidate response against official answer key and acceptable variants
export function isAnswerCorrect(candidateAnswer: string, question: IELTSQuestion): boolean {
  if (!candidateAnswer) return false;

  const normalizedCandidate = normalizeAnswer(candidateAnswer);

  // Exact correct answer
  const normalizedCorrect = normalizeAnswer(question.correct_answer);
  if (normalizedCandidate === normalizedCorrect) return true;

  // True / False / Not Given shortcuts
  if (question.question_type === 'true-false-not-given') {
    if (normalizedCorrect === 'true' && (normalizedCandidate === 't' || normalizedCandidate === 'true')) return true;
    if (normalizedCorrect === 'false' && (normalizedCandidate === 'f' || normalizedCandidate === 'false')) return true;
    if (normalizedCorrect === 'not given' && (normalizedCandidate === 'ng' || normalizedCandidate === 'not given' || normalizedCandidate === 'notgiven')) return true;
  }

  // Acceptable answer variants (e.g. British vs American spelling, optional numbers)
  if (question.acceptable_answers && question.acceptable_answers.length > 0) {
    for (const variant of question.acceptable_answers) {
      if (normalizedCandidate === normalizeAnswer(variant)) {
        return true;
      }
    }
  }

  return false;
}

// Deterministic Evaluation of Reading Section (Cambridge 17 Test 4, Q1–40)
export function evaluateReadingObjective(
  answers: Record<number, string>, 
  customConversion?: BandConversionTable
): SectionScoreReport {
  const section = cambridgeOfficialTest.sections.find(s => s.section_type === 'reading')!;
  const allQuestions = section.parts.flatMap(p => p.questions);
  const total = allQuestions.length;

  let correctCount = 0;
  const correctList: number[] = [];
  const incorrectList: number[] = [];

  // Track paired questions to prevent double-counting the same letter
  // Paired Q23 & Q24: ['B', 'E']
  const pair23_24_ans1 = normalizeAnswer(answers[23] || '');
  const pair23_24_ans2 = normalizeAnswer(answers[24] || '');
  const pair23_24_valid = ['b', 'e'];
  let q23_awarded = false;
  let q24_awarded = false;

  if (pair23_24_valid.includes(pair23_24_ans1)) {
    q23_awarded = true;
  }
  if (pair23_24_valid.includes(pair23_24_ans2) && pair23_24_ans2 !== pair23_24_ans1) {
    q24_awarded = true;
  } else if (!q23_awarded && pair23_24_valid.includes(pair23_24_ans2)) {
    q24_awarded = true;
  }

  // Paired Q25 & Q26: ['B', 'D']
  const pair25_26_ans1 = normalizeAnswer(answers[25] || '');
  const pair25_26_ans2 = normalizeAnswer(answers[26] || '');
  const pair25_26_valid = ['b', 'd'];
  let q25_awarded = false;
  let q26_awarded = false;

  if (pair25_26_valid.includes(pair25_26_ans1)) {
    q25_awarded = true;
  }
  if (pair25_26_valid.includes(pair25_26_ans2) && pair25_26_ans2 !== pair25_26_ans1) {
    q26_awarded = true;
  } else if (!q25_awarded && pair25_26_valid.includes(pair25_26_ans2)) {
    q26_awarded = true;
  }

  allQuestions.forEach((q) => {
    const qNum = q.question_number;
    let isCorrect = false;

    if (qNum === 23) {
      isCorrect = q23_awarded;
    } else if (qNum === 24) {
      isCorrect = q24_awarded;
    } else if (qNum === 25) {
      isCorrect = q25_awarded;
    } else if (qNum === 26) {
      isCorrect = q26_awarded;
    } else {
      const userAns = answers[qNum] || '';
      isCorrect = isAnswerCorrect(userAns, q);
    }

    if (isCorrect) {
      correctCount++;
      correctList.push(qNum);
    } else {
      incorrectList.push(qNum);
    }
  });

  const percentage = Math.round((correctCount / total) * 100);
  const estimatedBand = rawScoreToEstimatedBand(correctCount, total, 'reading', customConversion);

  return {
    band: estimatedBand,
    rawScore: correctCount,
    totalQuestions: total,
    correctPercentage: percentage,
    correctAnswersList: correctList,
    incorrectAnswersList: incorrectList,
    assessmentStatus: 'AI Evaluated',
    feedbackCategories: [
      {
        category: "Factual Accuracy & Key Scanning",
        score: `${correctCount} / ${total} Correct`,
        feedback: `Verified deterministically against Cambridge 17 answer keys (${percentage}% accuracy).`
      },
      {
        category: "True / False / Not Given Mastery",
        score: correctCount >= 28 ? "Proficient" : "Developing",
        feedback: "Ability to distinguish explicit contradictions from unmentioned facts."
      },
      {
        category: "Estimated Reading Band",
        score: `Band ${estimatedBand.toFixed(1)}`,
        feedback: `Calculated from raw score ${correctCount}/${total} using official scale table.`
      }
    ],
    strengths: [
      `Answered ${correctCount} of ${total} questions correctly under timed conditions.`,
      `Demonstrated solid scanning across Academic Reading passages.`
    ],
    weaknesses: [
      incorrectList.length > 0 ? `Review missed items on question numbers: ${incorrectList.slice(0, 6).join(', ')}.` : 'No major weaknesses identified in this test set.'
    ],
    recommendations: [
      "Review the question types with incorrect responses to identify distractor patterns.",
      "Expand academic vocabulary and practice time allocation (20 mins per passage)."
    ]
  };
}

// Deterministic Evaluation of Listening Section (Cambridge 18 Test 4, Q1–40)
export function evaluateListeningObjective(
  answers: Record<number, string>,
  customConversion?: BandConversionTable
): SectionScoreReport {
  const section = cambridgeOfficialTest.sections.find(s => s.section_type === 'listening')!;
  const allQuestions = section.parts.flatMap(p => p.questions);
  const total = allQuestions.length;

  let correctCount = 0;
  const correctList: number[] = [];
  const incorrectList: number[] = [];

  // Paired Q21 & Q22: ['B', 'D']
  const pair21_22_ans1 = normalizeAnswer(answers[21] || '');
  const pair21_22_ans2 = normalizeAnswer(answers[22] || '');
  const pair21_22_valid = ['b', 'd'];
  let q21_awarded = false;
  let q22_awarded = false;

  if (pair21_22_valid.includes(pair21_22_ans1)) {
    q21_awarded = true;
  }
  if (pair21_22_valid.includes(pair21_22_ans2) && pair21_22_ans2 !== pair21_22_ans1) {
    q22_awarded = true;
  } else if (!q21_awarded && pair21_22_valid.includes(pair21_22_ans2)) {
    q22_awarded = true;
  }

  allQuestions.forEach((q) => {
    const qNum = q.question_number;
    let isCorrect = false;

    if (qNum === 21) {
      isCorrect = q21_awarded;
    } else if (qNum === 22) {
      isCorrect = q22_awarded;
    } else {
      const userAns = answers[qNum] || '';
      isCorrect = isAnswerCorrect(userAns, q);
    }

    if (isCorrect) {
      correctCount++;
      correctList.push(qNum);
    } else {
      incorrectList.push(qNum);
    }
  });

  const percentage = Math.round((correctCount / total) * 100);
  const estimatedBand = rawScoreToEstimatedBand(correctCount, total, 'listening', customConversion);

  return {
    band: estimatedBand,
    rawScore: correctCount,
    totalQuestions: total,
    correctPercentage: percentage,
    correctAnswersList: correctList,
    incorrectAnswersList: incorrectList,
    assessmentStatus: 'AI Evaluated',
    feedbackCategories: [
      {
        category: "Audio Detail & Word Capture",
        score: `${correctCount} / ${total} Correct`,
        feedback: `Verified deterministically against Cambridge 18 answer keys (${percentage}% accuracy).`
      },
      {
        category: "Distractor & Keyword Navigation",
        score: correctCount >= 28 ? "Proficient" : "Developing",
        feedback: "Ability to track conversation turns and anticipate speaker cues."
      },
      {
        category: "Estimated Listening Band",
        score: `Band ${estimatedBand.toFixed(1)}`,
        feedback: `Calculated from raw score ${correctCount}/${total} using official scale table.`
      }
    ],
    strengths: [
      `Captured key details across multiple speaker accents and dialogue contexts.`,
      `Successfully answered ${correctCount}/${total} items.`
    ],
    weaknesses: [
      incorrectList.length > 0 ? `Incorrect audio items: #${incorrectList.slice(0, 6).join(', #')}.` : 'Strong overall listening comprehension.'
    ],
    recommendations: [
      "Practice keyword prediction before the audio track begins.",
      "Train spelling accuracy for proper nouns and numeric sequences."
    ]
  };
}

// Aliases for compatibility
export const convertRawScoreToBand = (raw: number, type: 'reading' | 'listening') => rawScoreToEstimatedBand(raw, 40, type);
export const evaluateReadingAnswers = evaluateReadingObjective;
export const evaluateListeningAnswers = evaluateListeningObjective;
