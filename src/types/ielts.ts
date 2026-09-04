import { 
  SectionType, 
  QuestionType,
  QuestionOption, 
  IELTSQuestion, 
  IELTSPassageOrPart, 
  IELTSSection, 
  IELTSTest,
  BandConversionTable,
  BandConversionRule
} from './testSchema';

export * from './testSchema';

export type StudentStatus = 
  | 'High School Student' 
  | 'University Student' 
  | 'Fresh Graduate' 
  | 'Working Professional';

export type TargetBand = 
  | 'Band 5.0' 
  | 'Band 6.0' 
  | 'Band 6.5' 
  | 'Band 7.0+' 
  | 'Not Sure';

export type SectionState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'AUTO_SUBMITTED';

export interface UserProfile {
  candidateId: string;
  fullName: string;
  whatsapp: string;
  age: string;
  currentStatus: StudentStatus;
  targetScore: TargetBand;
  resultId: string;
  accessCode?: string;
  registeredAt: string;
  is_qa?: boolean;
  isQa?: boolean;
}

export type ModuleType = 'reading' | 'listening' | 'writing' | 'speaking';

export interface SectionProgressItem {
  sectionType: ModuleType;
  status: SectionState;
  startedAt?: string;
  deadlineAt?: string;
  submittedAt?: string;
  submissionType?: 'MANUAL' | 'AUTO_TIMEOUT';
}

export interface UserAnswers {
  reading: Record<number, string>;
  listening: Record<number, string>;
  readingFlagged?: number[];
  listeningFlagged?: number[];
  writing: {
    task1: string;
    task2: string;
    wordCountTask1?: number;
    wordCountTask2?: number;
    savedAt?: string;
  };
  speaking: {
    part1Audio?: string;
    part2Audio?: string;
    part3Audio?: string;
    part1Transcript?: string;
    part2Transcript?: string;
    part3Transcript?: string;
    part1Duration?: number;
    part2Duration?: number;
    part3Duration?: number;
    part1MimeType?: string;
    part2MimeType?: string;
    part3MimeType?: string;
    part1FileSize?: number;
    part2FileSize?: number;
    part3FileSize?: number;
    part1_q1_audio?: string;
    part1_q1_duration?: number;
    part1_q1_transcript?: string;
    part1_q1_mime_type?: string;
    part1_q1_file_size?: number;
    part1_q2_audio?: string;
    part1_q2_duration?: number;
    part1_q2_transcript?: string;
    part1_q2_mime_type?: string;
    part1_q2_file_size?: number;
    part2_audio?: string;
    part2_duration?: number;
    part2_transcript?: string;
    part2_mime_type?: string;
    part2_file_size?: number;
    part3_q1_audio?: string;
    part3_q1_duration?: number;
    part3_q1_transcript?: string;
    part3_q1_mime_type?: string;
    part3_q1_file_size?: number;
    part3_q2_audio?: string;
    part3_q2_duration?: number;
    part3_q2_transcript?: string;
    part3_q2_mime_type?: string;
    part3_q2_file_size?: number;
    savedAt?: string;
  };
}

// =========================================================================
// RAW CANDIDATE RESPONSE PERSISTENCE (Never overwritten by scoring)
// =========================================================================
export interface RawObjectiveResponse {
  candidate_id: string;
  result_id: string;
  section: 'reading' | 'listening';
  question_number: number;
  question_id: string;
  candidate_answer: string; // Original raw answer
  official_answer: string;  // Accepted official answer key
  auto_is_correct: boolean;
  saved_at?: string;
  submitted_at?: string;
}

export interface RawWritingResponse {
  candidate_id: string;
  result_id: string;
  task_1_response: string; // Untruncated original
  task_1_word_count: number;
  task_2_response: string; // Untruncated original
  task_2_word_count: number;
  saved_at?: string;
  submitted_at?: string;
}

export interface RawSpeakingResponse {
  candidate_id: string;
  result_id: string;
  part: 1 | 2 | 3;
  question_id: string;
  audio_storage_path: string;
  duration?: number;
  mime_type?: string;
  file_size?: number;
  transcript?: string;
  saved_at?: string;
  submitted_at?: string;
}

export interface CandidateRawResponseStore {
  reading: Record<number, RawObjectiveResponse>;
  listening: Record<number, RawObjectiveResponse>;
  writing: RawWritingResponse;
  speaking: Record<number, RawSpeakingResponse>;
}

// =========================================================================
// TUTOR MANUAL CHECKING & QA TYPES
// =========================================================================
export interface ObjectiveManualCheckItem {
  questionNumber: number;
  candidateAnswer: string;
  officialAnswer: string;
  autoIsCorrect: boolean;
  tutorIsCorrect: boolean;
  tutorNote?: string;
}

export interface ManualVerificationRecord {
  reading: {
    checks: Record<number, ObjectiveManualCheckItem>;
    autoScore: number;
    tutorScore: number;
    difference: number;
    matchCount: number;
    matchPercentage: number;
    tutorBand: number;
  };
  listening: {
    checks: Record<number, ObjectiveManualCheckItem>;
    autoScore: number;
    tutorScore: number;
    difference: number;
    matchCount: number;
    matchPercentage: number;
    tutorBand: number;
  };
  writing: {
    task1: { ta: number; cc: number; lr: number; gra: number };
    task2: { tr: number; cc: number; lr: number; gra: number };
    tutorBand: number;
    tutorNotes?: string;
  };
  speaking: {
    fc: number;
    lr: number;
    gra: number;
    pro: number;
    tutorBand: number;
    tutorNotes?: string;
  };
  tutorOverallBand: number;
  evaluatorName: string;
  checkedAt: string;
  isApproved: boolean;
  overrideReason?: string;
  sectionStatuses?: Partial<Record<'reading' | 'listening' | 'writing' | 'speaking', {
    status: 'NOT STARTED' | 'DRAFT' | 'SUBMITTED' | 'REOPENED';
    revision: number;
    submittedAt?: string;
    reopenedAt?: string;
    edited_after_ai_reveal?: boolean;
  }>>;
  sectionRevisions?: Partial<Record<'reading' | 'listening' | 'writing' | 'speaking', Array<{
    revision: number;
    status: 'DRAFT' | 'SUBMITTED' | 'REOPENED';
    savedAt: string;
    edited_after_ai_reveal?: boolean;
    snapshot: unknown;
  }>>>;
}

export interface CriterionEvidence {
  criterion: string;
  score: number;
  positiveEvidence: string[];
  limitingEvidence: string[];
  descriptorMatch: string;
  feedback: string;
  confidence?: 'High' | 'Medium' | 'Low';
}

export interface SpeakingEvaluationDetail {
  fc: CriterionEvidence;
  lr: CriterionEvidence;
  gra: CriterionEvidence;
  pro: CriterionEvidence;
  rawAverage: number;
  estimatedBand: number;
}

export interface WritingTaskEvaluationDetail {
  taskNumber: 1 | 2;
  criterion1: CriterionEvidence;
  cc: CriterionEvidence;
  lr: CriterionEvidence;
  gra: CriterionEvidence;
  taskAverage: number;
}

export interface WritingEvaluationDetail {
  task1: WritingTaskEvaluationDetail;
  task2: WritingTaskEvaluationDetail;
  wordCountTask1: number;
  wordCountTask2: number;
  totalWords: number;
  rawWeightedScore: number;
  estimatedBand: number;
}

export type AssessmentStatus = 
  | 'Not Evaluated' 
  | 'Awaiting AI Evaluation'
  | 'AI Evaluation Failed'
  | 'AI Evaluated' 
  | 'Partially Evaluated'
  | 'Tutor Evaluated' 
  | 'Tutor Verified';

export interface SectionScoreReport {
  band: string | number;
  rawScore?: number;
  totalQuestions?: number;
  correctPercentage?: number;
  correctAnswersList?: number[];
  incorrectAnswersList?: number[];
  wordCount?: number;
  speakingDetail?: SpeakingEvaluationDetail;
  writingDetail?: WritingEvaluationDetail;
  assessmentStatus?: AssessmentStatus;
  feedbackCategories?: Array<{
    category: string;
    score: string;
    feedback: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface EvaluationAuditRecord {
  rubric_version: string;
  evaluation_mode: 'AI' | 'TUTOR' | 'HYBRID';
  evaluator: string;
  evaluation_timestamp: string;
  criterion_scores: Record<string, number | string>;
  evidence: Record<string, { positive: string[]; limiting: string[] }>;
  final_band: number | string;
  manual_override: boolean;
  override_reason?: string;
}

export interface DualAssessmentComparison {
  aiAssessment?: {
    readingBand: number | string;
    listeningBand: number | string;
    writingBand: number | string;
    speakingBand: number | string;
    overallBand: number | string;
    speakingDetail?: SpeakingEvaluationDetail;
    writingDetail?: WritingEvaluationDetail;
  };
  tutorAssessment?: {
    readingBand: number | string;
    listeningBand: number | string;
    writingBand: number | string;
    speakingBand: number | string;
    overallBand: number | string;
    speakingDetail?: SpeakingEvaluationDetail;
    writingDetail?: WritingEvaluationDetail;
  };
  bandDifference?: number;
  needsManualReview?: boolean;
  activeMode: 'AI' | 'TUTOR';
}

export interface AIAssessmentRecord {
  candidate_id: string;
  result_id: string;
  section: 'writing' | 'speaking';
  evaluation_id?: string;
  provider?: string;
  rubric_version: string;
  prompt_version?: string;
  model_name: string;
  model_version: string;
  evaluation_timestamp?: string;
  input_hash?: string;
  created_at: string;
  raw_ai_response?: any;
  criterion_scores: Record<string, number | null>;
  criterion_evidence: Record<string, { positive: string[]; limiting: string[]; descriptorReason: string; feedback?: string }>;
  estimated_band: number | string;
  calculated_band?: number | string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evaluation_status: 'AI EVALUATED' | 'AWAITING AI EVALUATION' | 'AI EVALUATION FAILED' | 'PARTIALLY EVALUATED' | 'REQUIRES_TUTOR_EVALUATION';
  status?: 'AI EVALUATED' | 'AWAITING AI EVALUATION' | 'AI EVALUATION FAILED' | 'PARTIALLY EVALUATED' | 'REQUIRES_TUTOR_EVALUATION';
  is_active?: boolean;
}

export interface AICalibrationMetrics {
  totalTutorVerifiedSamples: number;
  writing: {
    samples: number;
    exactMatchCount: number;
    withinHalfBandCount: number;
    moreThanHalfBandCount: number;
    exactMatchPct: number;
    withinHalfBandPct: number;
    moreThanHalfBandPct: number;
    meanAbsoluteBandError: number;
    criterionAgreement: Record<string, number>;
  };
  speaking: {
    samples: number;
    exactMatchCount: number;
    withinHalfBandCount: number;
    moreThanHalfBandCount: number;
    exactMatchPct: number;
    withinHalfBandPct: number;
    moreThanHalfBandPct: number;
    meanAbsoluteBandError: number;
    criterionAgreement: Record<string, number>;
  };
  disagreementRows: Array<{
    candidate: string;
    section: 'Writing' | 'Speaking';
    aiBand: number;
    tutorBand: number;
    delta: number;
    largestCriterionDifference: string;
  }>;
}

export interface TestEvaluation {
  resultId: string;
  testId: string;
  user: UserProfile;
  is_qa?: boolean;
  isQa?: boolean;
  completedAt: string;
  overallBand: string | number;
  reading: SectionScoreReport;
  listening: SectionScoreReport;
  writing: SectionScoreReport;
  speaking: SectionScoreReport;
  answers: UserAnswers;
  status: 'Pending Evaluation' | 'Evaluated';
  adminNotes?: string;
  dualComparison?: DualAssessmentComparison;
  auditTrail?: EvaluationAuditRecord[];
  sectionProgress?: Record<ModuleType, SectionProgressItem>;
  rawResponses?: CandidateRawResponseStore;
  manualChecks?: ManualVerificationRecord;
  aiAssessments?: {
    writing?: AIAssessmentRecord;
    speaking?: AIAssessmentRecord;
  };
  aiAssessmentHistory?: AIAssessmentRecord[];
}

// Aliases
export type ReadingQuestion = IELTSQuestion & { id: number; passageId: number; type: QuestionType; question: string; correctAnswer: string };
export type ReadingPassage = IELTSPassageOrPart & { content: string[] };
export type ListeningQuestion = IELTSQuestion & { id: number; sectionId: number; type: QuestionType; question: string; correctAnswer: string; audioTimestamp?: string };
export type ListeningSectionData = IELTSPassageOrPart & { audioDurationSeconds: number; transcript: string; speakerPrompt: string; context: string };
export type WritingTaskData = IELTSPassageOrPart & { taskId: 1 | 2; prompt: string; chartType?: 'bar' | 'pie' | 'line' | 'table'; chartDataDesc?: string; minWords: number; recommendedMinutes: number; criteriaTips: string[] };
export type SpeakingTaskData = IELTSPassageOrPart & { partId: 1 | 2 | 3; instructions: string; bulletPoints?: string[]; recordTimeSeconds: number };
