import { 
  CriterionEvidence, 
  SpeakingEvaluationDetail, 
  WritingEvaluationDetail, 
  WritingTaskEvaluationDetail, 
  SectionScoreReport, 
  EvaluationAuditRecord 
} from '../types/ielts';

// Helper to round raw score to nearest standard IELTS 0.5 band step
export function roundToNearestHalfBand(rawScore: number): number {
  if (rawScore <= 0) return 0.0;
  const rounded = Math.round(rawScore * 2) / 2;
  return Math.min(9.0, Math.max(1.0, rounded));
}

export function createPendingSpeakingReport(): { report: SectionScoreReport; detail: SpeakingEvaluationDetail; audit: EvaluationAuditRecord } {
  const dummyEvidence = (criterion: string): CriterionEvidence => ({
    criterion,
    score: 0,
    positiveEvidence: [],
    limitingEvidence: [],
    descriptorMatch: "Awaiting AI evaluation and/or manual tutor verification.",
    feedback: "Awaiting AI evaluation.",
    confidence: "Low"
  });

  const detail: SpeakingEvaluationDetail = {
    fc: dummyEvidence("Fluency and Coherence (FC)"),
    lr: dummyEvidence("Lexical Resource (LR)"),
    gra: dummyEvidence("Grammatical Range and Accuracy (GRA)"),
    pro: dummyEvidence("Pronunciation (PRO)"),
    rawAverage: 0,
    estimatedBand: 0
  };

  const report: SectionScoreReport = {
    band: "AWAITING AI EVALUATION",
    assessmentStatus: "Awaiting AI Evaluation",
    speakingDetail: detail,
    strengths: ["Voice response recorded and stored in permanent object storage."],
    weaknesses: ["Awaiting AI criterion evaluation across FC, LR, GRA, and PRO criteria."],
    recommendations: ["Complete manual tutor review in Admin Dashboard."]
  };

  const audit: EvaluationAuditRecord = {
    rubric_version: "IELTS-Cambridge-Descriptors-2026.1",
    evaluation_mode: "HYBRID",
    evaluator: "System (Pending)",
    evaluation_timestamp: new Date().toISOString(),
    criterion_scores: {},
    evidence: { speaking: { positive: [], limiting: [] }, writing: { positive: [], limiting: [] } },
    final_band: "AWAITING AI EVALUATION",
    manual_override: false,
    override_reason: "Initial submission stored; awaiting AI evaluation and tutor rubric verification."
  };

  return { report, detail, audit };
}

export function createPendingWritingReport(): { report: SectionScoreReport; detail: WritingEvaluationDetail; audit: EvaluationAuditRecord } {
  const dummyEvidence = (criterion: string): CriterionEvidence => ({
    criterion,
    score: 0,
    positiveEvidence: [],
    limitingEvidence: [],
    descriptorMatch: "Awaiting AI evaluation and/or manual tutor verification.",
    feedback: "Awaiting AI evaluation.",
    confidence: "Low"
  });

  const dummyTask = (taskNumber: 1 | 2): WritingTaskEvaluationDetail => ({
    taskNumber,
    criterion1: dummyEvidence(taskNumber === 1 ? "Task Achievement (TA)" : "Task Response (TR)"),
    cc: dummyEvidence("Coherence and Cohesion (CC)"),
    lr: dummyEvidence("Lexical Resource (LR)"),
    gra: dummyEvidence("Grammatical Range and Accuracy (GRA)"),
    taskAverage: 0
  });

  const detail: WritingEvaluationDetail = {
    task1: dummyTask(1),
    task2: dummyTask(2),
    wordCountTask1: 0,
    wordCountTask2: 0,
    totalWords: 0,
    rawWeightedScore: 0,
    estimatedBand: 0
  };

  const report: SectionScoreReport = {
    band: "AWAITING AI EVALUATION",
    assessmentStatus: "Awaiting AI Evaluation",
    writingDetail: detail,
    strengths: ["Original candidate writing stored in database."],
    weaknesses: ["Awaiting AI criterion evaluation across Task 1 and Task 2."],
    recommendations: ["Review Task 1 and Task 2 responses in Admin Dashboard."]
  };

  const audit: EvaluationAuditRecord = {
    rubric_version: "IELTS-Cambridge-Descriptors-2026.1",
    evaluation_mode: "HYBRID",
    evaluator: "System (Pending)",
    evaluation_timestamp: new Date().toISOString(),
    criterion_scores: {},
    evidence: { speaking: { positive: [], limiting: [] }, writing: { positive: [], limiting: [] } },
    final_band: "AWAITING AI EVALUATION",
    manual_override: false,
    override_reason: "Initial submission stored; awaiting AI evaluation and tutor rubric verification."
  };

  return { report, detail, audit };
}

// =========================================================================
// 1. IELTS SPEAKING ASSESSMENT ENGINE (Official 4-Criteria Rubric)
// =========================================================================

export function evaluateSpeakingWithRubric(
  speaking: {
    part1Audio?: string;
    part2Audio?: string;
    part3Audio?: string;
    part1Duration?: number;
    part2Duration?: number;
    part3Duration?: number;
    part1Transcript?: string;
    part2Transcript?: string;
    part3Transcript?: string;
  },
  tutorScores?: { fc: number; lr: number; gra: number; pro: number }
): { detail: SpeakingEvaluationDetail; report: SectionScoreReport; audit: EvaluationAuditRecord } {
  // If no tutor scores supplied, return clear 'Not Evaluated' status (Section 2)
  if (!tutorScores) {
    return createPendingSpeakingReport();
  }

  const fcScore = tutorScores.fc;
  const lrScore = tutorScores.lr;
  const graScore = tutorScores.gra;
  const proScore = tutorScores.pro;

  const rawAverage = (fcScore + lrScore + graScore + proScore) / 4;
  const estimatedBand = roundToNearestHalfBand(rawAverage);

  const fcEvidence: CriterionEvidence = {
    criterion: "Fluency and Coherence (FC)",
    score: fcScore,
    positiveEvidence: [
      fcScore >= 6 ? "Able to sustain speech at length on familiar and abstract topics." : "Communicates basic ideas with some noticeable effort.",
      "Uses a range of connectives and discourse markers to structure responses."
    ],
    limitingEvidence: [
      fcScore < 7 ? "Occasional self-correction and hesitation when searching for complex expressions." : "Minor pauses for content formulation."
    ],
    descriptorMatch: `Band ${fcScore.toFixed(1)}: Speaks at length without noticeable effort; uses connectives with occasional hesitation.`,
    feedback: fcScore >= 6.5 
      ? "Strong continuity of speech; expand complex topic development." 
      : "Focus on reducing speech hesitation and linking ideas smoothly.",
    confidence: "High"
  };

  const lrEvidence: CriterionEvidence = {
    criterion: "Lexical Resource (LR)",
    score: lrScore,
    positiveEvidence: [
      lrScore >= 6 ? "Has wide enough vocabulary to discuss topics at length and make meaning clear." : "Uses adequate basic vocabulary for daily topics.",
      "Attempts idiomatic language and topic-specific vocabulary."
    ],
    limitingEvidence: [
      lrScore < 7 ? "Occasional inappropriate word choices or minor collocation slips." : "Slight repetition of common descriptors."
    ],
    descriptorMatch: `Band ${lrScore.toFixed(1)}: Has wide vocabulary to discuss topics clearly, with some inaccuracies.`,
    feedback: lrScore >= 6.5 
      ? "Good lexical range; focus on natural academic collocations." 
      : "Expand topic vocabulary to avoid repetitive word choices.",
    confidence: "High"
  };

  const graEvidence: CriterionEvidence = {
    criterion: "Grammatical Range and Accuracy (GRA)",
    score: graScore,
    positiveEvidence: [
      graScore >= 6 ? "Uses a mix of simple and complex structures with good control." : "Produces basic sentence forms with reasonable accuracy.",
      "Frequently produces error-free simple sentences."
    ],
    limitingEvidence: [
      graScore < 7 ? "Errors persist when attempting complex grammatical structures." : "Noticeable slips in tense consistency and articles."
    ],
    descriptorMatch: `Band ${graScore.toFixed(1)}: Uses a mix of simple and complex structures with occasional errors that do not impede communication.`,
    feedback: graScore >= 6.5 
      ? "High structural control; refine complex conditional and subordinate clauses." 
      : "Strengthen grammatical accuracy in complex sentences and verb tenses.",
    confidence: "High"
  };

  const proEvidence: CriterionEvidence = {
    criterion: "Pronunciation (PRO)",
    score: proScore,
    positiveEvidence: [
      proScore >= 6 ? "Uses a range of pronunciation features with mixed control." : "Generally intelligible throughout.",
      "Can generally be understood throughout, though mispronunciation of individual words may occur."
    ],
    limitingEvidence: [
      proScore < 7 ? "Occasional lack of clarity in rhythm, intonation, or difficult phonemes." : "Inconsistent sentence stress."
    ],
    descriptorMatch: `Band ${proScore.toFixed(1)}: Sustains intelligible speech with effective use of phonological features.`,
    feedback: proScore >= 6.5 
      ? "Clear articulation and expressive sentence stress." 
      : "Work on natural word stress, sentence linking, and intonation.",
    confidence: "High"
  };

  const detail: SpeakingEvaluationDetail = {
    fc: fcEvidence,
    lr: lrEvidence,
    gra: graEvidence,
    pro: proEvidence,
    rawAverage,
    estimatedBand
  };

  const report: SectionScoreReport = {
    band: estimatedBand,
    assessmentStatus: "Tutor Evaluated",
    speakingDetail: detail,
    feedbackCategories: [
      { category: "Fluency & Coherence", score: `Band ${fcScore.toFixed(1)}`, feedback: fcEvidence.feedback },
      { category: "Lexical Resource", score: `Band ${lrScore.toFixed(1)}`, feedback: lrEvidence.feedback },
      { category: "Grammar Range & Accuracy", score: `Band ${graScore.toFixed(1)}`, feedback: graEvidence.feedback },
      { category: "Pronunciation", score: `Band ${proScore.toFixed(1)}`, feedback: proEvidence.feedback }
    ],
    strengths: [
      fcEvidence.positiveEvidence[0],
      lrEvidence.positiveEvidence[0],
      graEvidence.positiveEvidence[0]
    ],
    weaknesses: [
      fcEvidence.limitingEvidence[0],
      graEvidence.limitingEvidence[0]
    ],
    recommendations: [
      "Practice speaking with connected discourse without long pauses.",
      "Increase accuracy of complex clauses and advanced idiomatic collocations."
    ]
  };

  const audit: EvaluationAuditRecord = {
    rubric_version: "IELTS-Cambridge-Descriptors-2026.1",
    evaluation_mode: "TUTOR",
    evaluator: "Certified IELTS Tutor",
    evaluation_timestamp: new Date().toISOString(),
    criterion_scores: { FC: fcScore, LR: lrScore, GRA: graScore, PRO: proScore },
    evidence: {
      speaking: {
        positive: [fcEvidence.positiveEvidence[0], lrEvidence.positiveEvidence[0]],
        limiting: [graEvidence.limitingEvidence[0], proEvidence.limitingEvidence[0]]
      },
      writing: { positive: [], limiting: [] }
    },
    final_band: estimatedBand,
    manual_override: true,
    override_reason: "Tutor evaluated using official IELTS 4-criteria Speaking rubric."
  };

  return { detail, report, audit };
}

// =========================================================================
// 2. IELTS WRITING ASSESSMENT ENGINE (Task 1 + Task 2 Official Rubrics)
// =========================================================================

export function evaluateWritingWithRubric(
  writing: { task1: string; task2: string },
  tutorScores?: {
    task1: { ta: number; cc: number; lr: number; gra: number };
    task2: { tr: number; cc: number; lr: number; gra: number };
  }
): { detail: WritingEvaluationDetail; report: SectionScoreReport; audit: EvaluationAuditRecord } {
  const words1 = writing.task1 ? writing.task1.trim().split(/\s+/).filter(Boolean).length : 0;
  const words2 = writing.task2 ? writing.task2.trim().split(/\s+/).filter(Boolean).length : 0;
  const totalWords = words1 + words2;

  // If no tutor scores supplied, return clear 'Not Evaluated' status (Section 2)
  if (!tutorScores) {
    return createPendingWritingReport();
  }

  const t1Scores = tutorScores.task1;
  const t2Scores = tutorScores.task2;

  const t1Avg = (t1Scores.ta + t1Scores.cc + t1Scores.lr + t1Scores.gra) / 4;
  const t2Avg = (t2Scores.tr + t2Scores.cc + t2Scores.lr + t2Scores.gra) / 4;

  const rawWeightedScore = (t1Avg + 2 * t2Avg) / 3;
  const estimatedBand = roundToNearestHalfBand(rawWeightedScore);

  const task1Detail: WritingTaskEvaluationDetail = {
    taskNumber: 1,
    criterion1: {
      criterion: "Task Achievement (TA)",
      score: t1Scores.ta,
      positiveEvidence: ["Addresses the requirements of the academic chart report."],
      limitingEvidence: ["May have minor gaps in highlighting key comparative trends."],
      descriptorMatch: `Band ${t1Scores.ta.toFixed(1)}: Presents an overview with appropriate selection of key data points.`,
      feedback: t1Scores.ta >= 6.5 ? "Clear overview and detailed data selection." : "Ensure a clear overall trend and comparative data points.",
      confidence: "High"
    },
    cc: {
      criterion: "Coherence & Cohesion (CC)",
      score: t1Scores.cc,
      positiveEvidence: ["Logically organizes information with a clear progression."],
      limitingEvidence: ["Occasional mechanical use of cohesive devices."],
      descriptorMatch: `Band ${t1Scores.cc.toFixed(1)}: Information is arranged coherently with clear overall progression.`,
      feedback: "Maintain clear paragraph transitions and varied linking words.",
      confidence: "High"
    },
    lr: {
      criterion: "Lexical Resource (LR)",
      score: t1Scores.lr,
      positiveEvidence: ["Uses an adequate range of vocabulary for data description."],
      limitingEvidence: ["Minor word choice or spelling slips."],
      descriptorMatch: `Band ${t1Scores.lr.toFixed(1)}: Uses adequate range of vocabulary with some precision.`,
      feedback: "Incorporate specialized data trend terminology (e.g., fluctuation, plateau).",
      confidence: "High"
    },
    gra: {
      criterion: "Grammatical Range & Accuracy (GRA)",
      score: t1Scores.gra,
      positiveEvidence: ["Uses a mix of simple and complex sentence structures."],
      limitingEvidence: ["Some grammatical errors in complex sentence construction."],
      descriptorMatch: `Band ${t1Scores.gra.toFixed(1)}: Uses a mix of simple and complex sentence forms.`,
      feedback: "Focus on passive voice accuracy and complex clause control.",
      confidence: "High"
    },
    taskAverage: t1Avg
  };

  const task2Detail: WritingTaskEvaluationDetail = {
    taskNumber: 2,
    criterion1: {
      criterion: "Task Response (TR)",
      score: t2Scores.tr,
      positiveEvidence: ["Addresses all parts of the essay prompt."],
      limitingEvidence: ["Some ideas could be further elaborated with concrete real-world evidence."],
      descriptorMatch: `Band ${t2Scores.tr.toFixed(1)}: Presents a clear position throughout the response with relevant main ideas.`,
      feedback: t2Scores.tr >= 6.5 ? "Well-developed argument with supported examples." : "Ensure both advantages and disadvantages are balanced with clear examples.",
      confidence: "High"
    },
    cc: {
      criterion: "Coherence & Cohesion (CC)",
      score: t2Scores.cc,
      positiveEvidence: ["Presents a clear central topic within each paragraph."],
      limitingEvidence: ["Occasional repetitive linking phrases."],
      descriptorMatch: `Band ${t2Scores.cc.toFixed(1)}: Cohesively connects ideas across paragraphs with clear logical progression.`,
      feedback: "Use diverse discourse markers and clear topic sentences.",
      confidence: "High"
    },
    lr: {
      criterion: "Lexical Resource (LR)",
      score: t2Scores.lr,
      positiveEvidence: ["Uses appropriate academic vocabulary for social issues."],
      limitingEvidence: ["Occasional collocation errors."],
      descriptorMatch: `Band ${t2Scores.lr.toFixed(1)}: Uses an adequate range of academic vocabulary.`,
      feedback: "Deploy precise collocations related to demographics, economics, and healthcare.",
      confidence: "High"
    },
    gra: {
      criterion: "Grammatical Range & Accuracy (GRA)",
      score: t2Scores.gra,
      positiveEvidence: ["Produces complex structures with frequent error-free sentences."],
      limitingEvidence: ["Minor punctuation or complex tense slips."],
      descriptorMatch: `Band ${t2Scores.gra.toFixed(1)}: Uses a variety of complex structures with good overall accuracy.`,
      feedback: "Ensure flawless subject-verb agreement and complex conditional accuracy.",
      confidence: "High"
    },
    taskAverage: t2Avg
  };

  const detail: WritingEvaluationDetail = {
    task1: task1Detail,
    task2: task2Detail,
    wordCountTask1: words1,
    wordCountTask2: words2,
    totalWords,
    rawWeightedScore,
    estimatedBand
  };

  const report: SectionScoreReport = {
    band: estimatedBand,
    wordCount: totalWords,
    assessmentStatus: "Tutor Evaluated",
    writingDetail: detail,
    feedbackCategories: [
      { category: "Task 1 (Report)", score: `Band ${t1Avg.toFixed(1)}`, feedback: task1Detail.criterion1.feedback },
      { category: "Task 2 (Essay)", score: `Band ${t2Avg.toFixed(1)}`, feedback: task2Detail.criterion1.feedback },
      { category: "Coherence & Cohesion", score: `Band ${((t1Scores.cc + t2Scores.cc) / 2).toFixed(1)}`, feedback: task2Detail.cc.feedback },
      { category: "Lexical Resource", score: `Band ${((t1Scores.lr + t2Scores.lr) / 2).toFixed(1)}`, feedback: task2Detail.lr.feedback },
      { category: "Grammatical Accuracy", score: `Band ${((t1Scores.gra + t2Scores.gra) / 2).toFixed(1)}`, feedback: task2Detail.gra.feedback }
    ],
    strengths: [
      task1Detail.criterion1.positiveEvidence[0],
      task2Detail.criterion1.positiveEvidence[0]
    ],
    weaknesses: [
      task1Detail.criterion1.limitingEvidence[0],
      task2Detail.criterion1.limitingEvidence[0]
    ],
    recommendations: [
      "Ensure Task 1 contains a distinct overview paragraph without numerical data.",
      "Develop Task 2 body paragraphs with clear topic sentences and relevant supporting examples."
    ]
  };

  const audit: EvaluationAuditRecord = {
    rubric_version: "IELTS-Cambridge-Descriptors-2026.1",
    evaluation_mode: "TUTOR",
    evaluator: "Certified IELTS Tutor",
    evaluation_timestamp: new Date().toISOString(),
    criterion_scores: {
      T1_TA: t1Scores.ta,
      T1_CC: t1Scores.cc,
      T1_LR: t1Scores.lr,
      T1_GRA: t1Scores.gra,
      T2_TR: t2Scores.tr,
      T2_CC: t2Scores.cc,
      T2_LR: t2Scores.lr,
      T2_GRA: t2Scores.gra
    },
    evidence: {
      speaking: { positive: [], limiting: [] },
      writing: {
        positive: [task1Detail.criterion1.positiveEvidence[0], task2Detail.criterion1.positiveEvidence[0]],
        limiting: [task1Detail.criterion1.limitingEvidence[0], task2Detail.criterion1.limitingEvidence[0]]
      }
    },
    final_band: estimatedBand,
    manual_override: true,
    override_reason: "Tutor evaluated using official IELTS Task 1 & Task 2 rubrics (double-weighted Task 2)."
  };

  return { detail, report, audit };
}
