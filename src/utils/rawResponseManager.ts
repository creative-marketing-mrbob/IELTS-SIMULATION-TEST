// Utility for Managing Raw Candidate Responses & Tutor Manual Checking Data
import { 
  UserProfile, 
  UserAnswers, 
  RawObjectiveResponse, 
  RawWritingResponse, 
  RawSpeakingResponse, 
  CandidateRawResponseStore, 
  ManualVerificationRecord,
  ObjectiveManualCheckItem
} from '../types/ielts';
import { 
  evaluateReadingAnswers, 
  evaluateListeningAnswers, 
  convertRawScoreToBand 
} from './scoringEngine';
import { 
  roundToNearestHalfBand 
} from './subjectiveAssessment';

// Cambridge 17 Reading Test 4 Official Display Keys
export const readingOfficialDisplayKeys: Record<number, string> = {
  1: 'FALSE', 2: 'FALSE', 3: 'NOT GIVEN', 4: 'TRUE', 5: 'NOT GIVEN', 6: 'TRUE',
  7: 'droppings', 8: 'coffee', 9: 'mosquitoes', 10: 'protein', 11: 'unclean', 12: 'culture', 13: 'houses',
  14: 'E', 15: 'A', 16: 'D', 17: 'F', 18: 'C',
  19: 'descendants', 20: 'sermon', 21: 'fine', 22: 'innovation',
  23: 'B / E (either order)', 24: 'B / E (either order)',
  25: 'B / D (either order)', 26: 'B / D (either order)',
  27: 'D', 28: 'E', 29: 'F', 30: 'B', 31: 'H', 32: 'E',
  33: 'FALSE', 34: 'NOT GIVEN', 35: 'NOT GIVEN', 36: 'TRUE',
  37: 'memory', 38: 'numbers', 39: 'communication', 40: 'visual'
};

// Cambridge 18 Listening Test 4 Official Display Keys
export const listeningOfficialDisplayKeys: Record<number, string> = {
  1: 'Receptionist', 2: 'Medical', 3: 'Chastons', 4: 'Appointments', 5: 'Database',
  6: 'Experience', 7: 'confident', 8: 'Temporary', 9: '1.15', 10: 'Parking',
  11: 'B', 12: 'A', 13: 'A', 14: 'C', 15: 'F', 16: 'G', 17: 'E', 18: 'A', 19: 'C', 20: 'B',
  21: 'B / D (either order)', 22: 'B / D (either order)',
  23: 'D', 24: 'A', 25: 'C', 26: 'G', 27: 'F', 28: 'A', 29: 'B', 30: 'C',
  31: 'Plot', 32: 'Poverty', 33: 'Europe', 34: 'Poetry', 35: 'Drawings', 36: 'Furniture',
  37: 'Lamps', 38: 'harbour / harbor', 39: 'Children', 40: 'Relatives'
};

export function buildCandidateRawResponseStore(
  user: UserProfile, 
  answers: UserAnswers
): CandidateRawResponseStore {
  const isQa = Boolean(user.is_qa || user.isQa || user.resultId.includes('-QA-'));
  const objectiveTotal = isQa ? 5 : 40;
  const readingEval = evaluateReadingAnswers(answers.reading || {});
  const listeningEval = evaluateListeningAnswers(answers.listening || {});

  const readingResponses: Record<number, RawObjectiveResponse> = {};
  for (let q = 1; q <= objectiveTotal; q++) {
    const candAns = answers.reading?.[q] || '';
    const isCorrect = readingEval.correctAnswersList?.includes(q) || false;
    readingResponses[q] = {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      section: 'reading',
      question_number: q,
      question_id: `reading-q-${q}`,
      candidate_answer: candAns,
      official_answer: readingOfficialDisplayKeys[q] || '',
      auto_is_correct: isCorrect,
      saved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString()
    };
  }

  const listeningResponses: Record<number, RawObjectiveResponse> = {};
  for (let q = 1; q <= objectiveTotal; q++) {
    const candAns = answers.listening?.[q] || '';
    const isCorrect = listeningEval.correctAnswersList?.includes(q) || false;
    listeningResponses[q] = {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      section: 'listening',
      question_number: q,
      question_id: `listening-q-${q}`,
      candidate_answer: candAns,
      official_answer: listeningOfficialDisplayKeys[q] || '',
      auto_is_correct: isCorrect,
      saved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString()
    };
  }

  const writingResponses: RawWritingResponse = {
    candidate_id: user.candidateId,
    result_id: user.resultId,
    task_1_response: answers.writing?.task1 || '',
    task_1_word_count: answers.writing?.wordCountTask1 || answers.writing?.task1?.trim().split(/\s+/).filter(Boolean).length || 0,
    task_2_response: answers.writing?.task2 || '',
    task_2_word_count: answers.writing?.wordCountTask2 || answers.writing?.task2?.trim().split(/\s+/).filter(Boolean).length || 0,
    saved_at: answers.writing?.savedAt || new Date().toISOString(),
    submitted_at: new Date().toISOString()
  };

  const speakingResponses: Record<number, RawSpeakingResponse> = isQa ? {
    1: {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      part: 1,
      question_id: 'speaking-p1-q1',
      audio_storage_path: answers.speaking?.part1_q1_audio || '',
      duration: answers.speaking?.part1_q1_duration,
      transcript: answers.speaking?.part1_q1_transcript,
      saved_at: answers.speaking?.savedAt || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    },
    2: {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      part: 1,
      question_id: 'speaking-p1-q2',
      audio_storage_path: answers.speaking?.part1_q2_audio || '',
      duration: answers.speaking?.part1_q2_duration,
      transcript: answers.speaking?.part1_q2_transcript,
      saved_at: answers.speaking?.savedAt || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    },
    3: {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      part: 2,
      question_id: 'speaking-part-2',
      audio_storage_path: answers.speaking?.part2_audio || '',
      duration: answers.speaking?.part2_duration,
      transcript: answers.speaking?.part2_transcript,
      saved_at: answers.speaking?.savedAt || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    },
    4: {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      part: 3,
      question_id: 'speaking-p3-q1',
      audio_storage_path: answers.speaking?.part3_q1_audio || '',
      duration: answers.speaking?.part3_q1_duration,
      transcript: answers.speaking?.part3_q1_transcript,
      saved_at: answers.speaking?.savedAt || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    },
    5: {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      part: 3,
      question_id: 'speaking-p3-q2',
      audio_storage_path: answers.speaking?.part3_q2_audio || '',
      duration: answers.speaking?.part3_q2_duration,
      transcript: answers.speaking?.part3_q2_transcript,
      saved_at: answers.speaking?.savedAt || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    }
  } : {
    1: {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      part: 1,
      question_id: 'speaking-part-1',
      audio_storage_path: answers.speaking?.part1Audio || '',
      duration: answers.speaking?.part1Duration,
      transcript: answers.speaking?.part1Transcript || 'Cambridge 18 Speaking Part 1 (Sleep topics response)',
      saved_at: answers.speaking?.savedAt || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    },
    2: {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      part: 2,
      question_id: 'speaking-part-2',
      audio_storage_path: answers.speaking?.part2Audio || '',
      duration: answers.speaking?.part2Duration,
      transcript: answers.speaking?.part2Transcript || 'Cambridge 18 Speaking Part 2 (Good friend cue card response)',
      saved_at: answers.speaking?.savedAt || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    },
    3: {
      candidate_id: user.candidateId,
      result_id: user.resultId,
      part: 3,
      question_id: 'speaking-part-3',
      audio_storage_path: answers.speaking?.part3Audio || '',
      duration: answers.speaking?.part3Duration,
      transcript: answers.speaking?.part3Transcript || 'Cambridge 18 Speaking Part 3 (Friendship discussion response)',
      saved_at: answers.speaking?.savedAt || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    }
  };

  return {
    reading: readingResponses,
    listening: listeningResponses,
    writing: writingResponses,
    speaking: speakingResponses
  };
}

export function initializeManualVerificationRecord(
  rawStore: CandidateRawResponseStore,
  initialWritingScores = { task1: { ta: 6.0, cc: 6.0, lr: 6.0, gra: 5.5 }, task2: { tr: 6.0, cc: 6.0, lr: 6.0, gra: 5.5 } },
  initialSpeakingScores = { fc: 6.0, lr: 6.0, gra: 5.5, pro: 6.0 },
  evaluator = 'Senior IELTS Tutor'
): ManualVerificationRecord {
  const objectiveTotal = Object.keys(rawStore.reading || {}).length || 40;
  const readingChecks: Record<number, ObjectiveManualCheckItem> = {};
  let readingAutoCount = 0;
  for (let q = 1; q <= objectiveTotal; q++) {
    const raw = rawStore.reading[q];
    if (raw.auto_is_correct) readingAutoCount++;
    readingChecks[q] = {
      questionNumber: q,
      candidateAnswer: raw.candidate_answer,
      officialAnswer: raw.official_answer,
      autoIsCorrect: raw.auto_is_correct,
      tutorIsCorrect: raw.auto_is_correct // defaults to auto result
    };
  }

  const listeningChecks: Record<number, ObjectiveManualCheckItem> = {};
  let listeningAutoCount = 0;
  for (let q = 1; q <= objectiveTotal; q++) {
    const raw = rawStore.listening[q];
    if (raw.auto_is_correct) listeningAutoCount++;
    listeningChecks[q] = {
      questionNumber: q,
      candidateAnswer: raw.candidate_answer,
      officialAnswer: raw.official_answer,
      autoIsCorrect: raw.auto_is_correct,
      tutorIsCorrect: raw.auto_is_correct // defaults to auto result
    };
  }

  const readingBand = convertRawScoreToBand(readingAutoCount, 'reading');
  const listeningBand = convertRawScoreToBand(listeningAutoCount, 'listening');

  const t1Avg = (initialWritingScores.task1.ta + initialWritingScores.task1.cc + initialWritingScores.task1.lr + initialWritingScores.task1.gra) / 4;
  const t2Avg = (initialWritingScores.task2.tr + initialWritingScores.task2.cc + initialWritingScores.task2.lr + initialWritingScores.task2.gra) / 4;
  const writingTutorBand = roundToNearestHalfBand((t1Avg + t2Avg * 2) / 3);

  const speakingTutorBand = roundToNearestHalfBand(
    (initialSpeakingScores.fc + initialSpeakingScores.lr + initialSpeakingScores.gra + initialSpeakingScores.pro) / 4
  );

  const overallTutorBand = roundToNearestHalfBand(
    (readingBand + listeningBand + writingTutorBand + speakingTutorBand) / 4
  );

  return {
    reading: {
      checks: readingChecks,
      autoScore: readingAutoCount,
      tutorScore: readingAutoCount,
      difference: 0,
      matchCount: objectiveTotal,
      matchPercentage: 100,
      tutorBand: readingBand
    },
    listening: {
      checks: listeningChecks,
      autoScore: listeningAutoCount,
      tutorScore: listeningAutoCount,
      difference: 0,
      matchCount: objectiveTotal,
      matchPercentage: 100,
      tutorBand: listeningBand
    },
    writing: {
      task1: initialWritingScores.task1,
      task2: initialWritingScores.task2,
      tutorBand: writingTutorBand
    },
    speaking: {
      ...initialSpeakingScores,
      tutorBand: speakingTutorBand
    },
    tutorOverallBand: overallTutorBand,
    evaluatorName: evaluator,
    checkedAt: new Date().toISOString(),
    isApproved: false
  };
}
