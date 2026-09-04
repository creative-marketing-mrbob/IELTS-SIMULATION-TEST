import { UserAnswers, TestEvaluation, UserProfile, DualAssessmentComparison } from '../types/ielts';
import { evaluateReadingObjective, evaluateListeningObjective } from './scoringEngine';
import { createPendingSpeakingReport, createPendingWritingReport, roundToNearestHalfBand } from './subjectiveAssessment';
import { buildCandidateRawResponseStore, initializeManualVerificationRecord } from './rawResponseManager';

export function calculateReadingScore(answers: Record<number, string>) {
  return evaluateReadingObjective(answers);
}

export function calculateListeningScore(answers: Record<number, string>) {
  return evaluateListeningObjective(answers);
}

export function generateEvaluation(user: UserProfile, answers: UserAnswers): TestEvaluation {
  const isQa = Boolean(user.is_qa || user.isQa || user.resultId.includes('-QA-'));
  const reading = evaluateReadingObjective(answers.reading);
  const listening = evaluateListeningObjective(answers.listening);
  if (isQa) {
    reading.totalQuestions = 5;
    reading.rawScore = (reading.correctAnswersList || []).filter(q => q <= 5).length;
    reading.correctPercentage = Math.round((reading.rawScore / 5) * 100);
    reading.correctAnswersList = (reading.correctAnswersList || []).filter(q => q <= 5);
    reading.incorrectAnswersList = Array.from({ length: 5 }, (_, idx) => idx + 1).filter(q => !reading.correctAnswersList?.includes(q));
    listening.totalQuestions = 5;
    listening.rawScore = (listening.correctAnswersList || []).filter(q => q <= 5).length;
    listening.correctPercentage = Math.round((listening.rawScore / 5) * 100);
    listening.correctAnswersList = (listening.correctAnswersList || []).filter(q => q <= 5);
    listening.incorrectAnswersList = Array.from({ length: 5 }, (_, idx) => idx + 1).filter(q => !listening.correctAnswersList?.includes(q));
  }
  const writingPending = createPendingWritingReport();
  const speakingPending = createPendingSpeakingReport();

  const readingBandNum = typeof reading.band === 'number' ? reading.band : 5.5;
  const listeningBandNum = typeof listening.band === 'number' ? listening.band : 5.5;

  const rawResponses = buildCandidateRawResponseStore(user, answers);
  const manualChecks = initializeManualVerificationRecord(rawResponses);

  const dualComparison: DualAssessmentComparison = {
    aiAssessment: {
      readingBand: readingBandNum,
      listeningBand: listeningBandNum,
      writingBand: "AWAITING AI EVALUATION",
      speakingBand: "AWAITING AI EVALUATION",
      overallBand: "Pending Subjective Evaluation",
      speakingDetail: speakingPending.detail,
      writingDetail: writingPending.detail
    },
    tutorAssessment: undefined,
    activeMode: 'TUTOR',
    needsManualReview: true
  };

  const auditTrail = [
    writingPending.audit,
    speakingPending.audit
  ];

  return {
    resultId: user.resultId,
    testId: "CAMBRIDGE-IELTS-17-18-OFFICIAL",
    is_qa: isQa,
    isQa,
    user,
    completedAt: new Date().toISOString(),
    overallBand: "Pending Evaluation",
    reading,
    listening,
    writing: writingPending.report,
    speaking: speakingPending.report,
    answers,
    rawResponses,
    manualChecks,
    status: 'Pending Evaluation',
    dualComparison,
    auditTrail,
    adminNotes: `Candidate completed IELTS diagnostic simulation. Target Band: ${user.targetScore}. Objective sections scored; Writing & Speaking awaiting AI evaluation and tutor verification.`
  };
}

export function generateResultId(fullName: string): string {
  const cleanName = fullName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'USER';
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `IELTS-${year}-${cleanName}${randomSuffix}`;
}
