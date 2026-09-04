import React, { useEffect, useState } from 'react';
import { useTest } from '../context/TestContext';
import { 
  TestEvaluation, 
  AssessmentStatus, 
  DualAssessmentComparison, 
  BandConversionTable,
  SpeakingEvaluationDetail,
  WritingEvaluationDetail,
  ManualVerificationRecord,
  ObjectiveManualCheckItem,
  AICalibrationMetrics,
  AIAssessmentRecord
} from '../types/ielts';
import { 
  downloadReadingPDF, 
  downloadListeningPDF, 
  downloadWritingPDF, 
  downloadSpeakingPDF, 
  downloadComprehensivePDF 
} from '../utils/pdfGenerator';
import {
  getReadingConsultation,
  getListeningConsultation,
  getWritingConsultation,
  getSpeakingConsultation
} from '../utils/consultationMessages';
import {
  getStoredBandConversionTable,
  saveBandConversionTable,
  defaultBandConversionTable,
  convertRawScoreToBand
} from '../utils/scoringEngine';
import {
  evaluateSpeakingWithRubric,
  evaluateWritingWithRubric,
  roundToNearestHalfBand
} from '../utils/subjectiveAssessment';
import {
  readingOfficialDisplayKeys,
  listeningOfficialDisplayKeys
} from '../utils/rawResponseManager';
import { audioStorage } from '../services/audioStorage';
import { 
  evaluateWritingWithAI, 
  evaluateSpeakingWithAI, 
  calculateAICalibrationMetrics,
  getStoredEvaluatorAdminToken,
  saveStoredEvaluatorAdminToken
} from '../services/aiEvaluator';
import { 
  Search, 
  FileDown, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic, 
  ShieldCheck, 
  Play, 
  Pause, 
  Trash2, 
  ArrowLeft,
  Save,
  X,
  ChevronRight,
  Send,
  MessageCircle,
  Copy,
  Check,
  AlertTriangle,
  Sliders,
  Sparkles,
  UserCheck,
  CheckCircle2,
  User,
  ClipboardList,
  FileText,
  PhoneCall,
  CheckSquare,
  XCircle,
  ListChecks,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Cpu,
  RefreshCw,
  BarChart2,
  Key
} from 'lucide-react';

function displayAdminBand(value: unknown) {
  if (typeof value === 'number') return value >= 1 ? value.toFixed(1) : '-';
  if (typeof value === 'string' && value.trim()) {
    const upper = value.toUpperCase();
    if (upper.includes('PARTIALLY')) return 'Perlu cek tutor';
    if (upper.includes('AWAITING') || upper.includes('NOT EVALUATED')) return 'AI belum menilai';
    if (upper.includes('FAILED')) return 'Gagal';
    return value;
  }
  return '-';
}

function candidateBandSummary(candidate: TestEvaluation) {
  const manualOverall = candidate.manualChecks?.tutorOverallBand;
  const overall = typeof manualOverall === 'number' ? manualOverall : candidate.overallBand;
  return displayAdminBand(overall);
}

function displayAdminStatus(status: string) {
  if (status === 'Evaluated') return 'Selesai';
  if (status === 'Pending Evaluation') return 'Menunggu';
  return status || 'Menunggu';
}

function buildAdminFollowUpMessage(candidate: TestEvaluation) {
  const reading = displayAdminBand(candidate.manualChecks?.reading?.tutorBand ?? candidate.reading.band);
  const listening = displayAdminBand(candidate.manualChecks?.listening?.tutorBand ?? candidate.listening.band);
  const writing = displayAdminBand(candidate.manualChecks?.writing?.tutorBand ?? candidate.dualComparison?.aiAssessment?.writingBand ?? candidate.writing.band);
  const speaking = displayAdminBand(candidate.manualChecks?.speaking?.tutorBand ?? candidate.dualComparison?.aiAssessment?.speakingBand ?? candidate.speaking.band);
  const overall = candidateBandSummary(candidate);

  return `Hi ${candidate.user.fullName}, berikut ringkasan hasil IELTS Diagnostic kamu:

Reading: ${reading}
Listening: ${listening}
Writing: ${writing}
Speaking: ${speaking}
Overall: ${overall}

Result ID: ${candidate.resultId}`;
}

function getFollowUpBand(candidate: TestEvaluation, section: 'reading' | 'listening' | 'writing' | 'speaking') {
  if (section === 'reading') return candidate.manualChecks?.reading?.tutorBand ?? candidate.reading.band;
  if (section === 'listening') return candidate.manualChecks?.listening?.tutorBand ?? candidate.listening.band;
  if (section === 'writing') return candidate.dualComparison?.aiAssessment?.writingBand ?? candidate.manualChecks?.writing?.tutorBand ?? candidate.writing.band;
  return candidate.dualComparison?.aiAssessment?.speakingBand ?? candidate.manualChecks?.speaking?.tutorBand ?? candidate.speaking.band;
}

function buildSectionFollowUpMessage(candidate: TestEvaluation, section: 'reading' | 'listening' | 'writing' | 'speaking' | 'overall') {
  const name = candidate.user.fullName;
  const target = candidate.user.targetScore || 'Band 6.5';
  if (section === 'reading') {
    return getReadingConsultation(name, getFollowUpBand(candidate, 'reading'), target, candidate.reading.incorrectAnswersList).whatsappMessage;
  }
  if (section === 'listening') {
    return getListeningConsultation(name, getFollowUpBand(candidate, 'listening'), target, candidate.listening.incorrectAnswersList).whatsappMessage;
  }
  if (section === 'writing') {
    return getWritingConsultation(name, getFollowUpBand(candidate, 'writing'), target, candidate.dualComparison?.aiAssessment?.writingDetail ?? candidate.writing.writingDetail).whatsappMessage;
  }
  if (section === 'speaking') {
    return getSpeakingConsultation(name, getFollowUpBand(candidate, 'speaking'), target, candidate.dualComparison?.aiAssessment?.speakingDetail ?? candidate.speaking.speakingDetail).whatsappMessage;
  }
  return buildAdminFollowUpMessage(candidate);
}

type AdminDashboardMode = 'followup' | 'database';
type FollowUpKey = 'reading' | 'listening' | 'writing' | 'speaking' | 'overall';

export const AdminDashboard: React.FC<{ mode?: AdminDashboardMode }> = ({ mode = 'followup' }) => {
  const { allSubmissions, setCurrentView, deleteSubmission, updateSubmissionEvaluation, refreshAdminSubmissions } = useTest();
  const isDatabaseMode = mode === 'database';
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected candidate for modal popup
  const [selectedCandidate, setSelectedCandidate] = useState<TestEvaluation | null>(null);

  // Active modal tab: 'info' | 'responses' | 'manual' | 'evaluation' | 'reports' | 'followup'
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'responses' | 'manual' | 'evaluation' | 'reports' | 'followup'>('info');

  // Sub-tab inside Manual Checking: 'reading' | 'listening' | 'writing' | 'speaking' | 'summary'
  const [manualSectionTab, setManualSectionTab] = useState<'reading' | 'listening' | 'writing' | 'speaking' | 'summary'>('reading');

  // Blind QA Mode States (Section 3 & 4)
  const [isBlindQA, setIsBlindQA] = useState<boolean>(false);
  const [blindQASubmitted, setBlindQASubmitted] = useState<boolean>(false);

  // Active evaluation mode in evaluation tab: 'AI' | 'TUTOR'
  const [evalMode, setEvalMode] = useState<'AI' | 'TUTOR'>('AI');

  // Band conversion settings drawer
  const [showBandSettings, setShowBandSettings] = useState(false);
  const [bandTable, setBandTable] = useState<BandConversionTable>(getStoredBandConversionTable());

  // AI Evaluator Settings Modal
  const [showAISettings, setShowAISettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getStoredEvaluatorAdminToken());
  const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [candidateLoadError, setCandidateLoadError] = useState<string | null>(null);

  // Audio Playback in Modal
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);

  // Editable custom consultation message overrides
  const [customMessages, setCustomMessages] = useState<{ [key: string]: string }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeFollowUpKey, setActiveFollowUpKey] = useState<FollowUpKey>('overall');

  // Manual Checking State (Objective Q1..Q40 Tutor Toggles)
  const [readingTutorChecks, setReadingTutorChecks] = useState<Record<number, boolean>>({});
  const [listeningTutorChecks, setListeningTutorChecks] = useState<Record<number, boolean>>({});

  // Tutor Rubric Form State
  const [tutorSpeakingScores, setTutorSpeakingScores] = useState({
    fc: 6.0,
    lr: 6.0,
    gra: 5.5,
    pro: 6.0
  });

  const [tutorWritingScores, setTutorWritingScores] = useState({
    task1: { ta: 6.0, cc: 6.0, lr: 6.0, gra: 5.5 },
    task2: { tr: 6.0, cc: 6.0, lr: 6.0, gra: 5.5 }
  });

  const [tutorNotes, setTutorNotes] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('Senior IELTS Tutor');
  const [overrideReason, setOverrideReason] = useState('');

  const visibleSubmissions = allSubmissions.filter(s => s?.user?.fullName && s?.resultId);

  const filteredSubmissions = visibleSubmissions.filter(s => 
    s.resultId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user.whatsapp.includes(searchTerm)
  );
  const selectedIsQa = Boolean(selectedCandidate?.is_qa || selectedCandidate?.isQa || selectedCandidate?.resultId.includes('-QA-'));
  const objectiveQuestionCount = selectedIsQa ? 5 : 40;

  const loadAdminCandidates = async () => {
    setIsLoadingCandidates(true);
    setCandidateLoadError(null);
    try {
      await refreshAdminSubmissions();
    } catch (error: any) {
      const message = String(error?.message || '');
      setCandidateLoadError(
        message.includes('Admin session required')
          ? 'Admin token belum aktif. Masukkan token admin dulu supaya daftar kandidat bisa dimuat.'
          : message || 'Daftar kandidat belum bisa dimuat.'
      );
      if (message.includes('Admin session required')) {
        setShowAISettings(true);
      }
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  useEffect(() => {
    loadAdminCandidates();
  }, []);

  // Calibration metrics computed across submissions
  const calibrationMetrics: AICalibrationMetrics = calculateAICalibrationMetrics(visibleSubmissions);
  const calibrationLabel = (samples: number) => {
    if (samples < 10) return 'Data masih sedikit';
    if (samples < 30) return 'Mulai terbaca';
    if (samples < 50) return 'Sedang dikumpulkan';
    return 'Data cukup';
  };

  const createFailedAIAssessment = (
    candidate: TestEvaluation,
    section: 'writing' | 'speaking',
    error?: string
  ): AIAssessmentRecord => ({
    candidate_id: candidate.user.candidateId,
    result_id: candidate.resultId,
    section,
    evaluation_id: `failed_${section}_${Date.now()}`,
    provider: 'secure-ai-endpoint',
    rubric_version: 'IELTS-Cambridge-Descriptors-2026.1',
    prompt_version: 'ai-evaluator-secure-endpoint-2026-09-03',
    model_name: 'gemini-1.5-flash',
    model_version: 'server-configured',
    evaluation_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    raw_ai_response: { error },
    criterion_scores: {},
    criterion_evidence: {},
    estimated_band: 'AI EVALUATION FAILED',
    calculated_band: 'AI EVALUATION FAILED',
    confidence: 'LOW',
    evaluation_status: 'AI EVALUATION FAILED',
    status: 'AI EVALUATION FAILED',
    is_active: false
  });

  const handleOpenCandidateModal = (candidate: TestEvaluation, initialTab: 'info' | 'responses' | 'manual' | 'evaluation' | 'reports' | 'followup' = 'info') => {
    setSelectedCandidate(candidate);
    setActiveModalTab(initialTab);
    if (initialTab === 'followup') setActiveFollowUpKey('overall');
    setManualSectionTab('reading');
    setIsBlindQA(false);
    setBlindQASubmitted(false);
    setAiStatusMessage(null);
    const comparison = candidate.dualComparison;
    setEvalMode(comparison?.activeMode || 'AI');
    const candidateIsQa = Boolean(candidate.is_qa || candidate.isQa || candidate.resultId.includes('-QA-'));
    const candidateQuestionCount = candidateIsQa ? 5 : 40;

    // Initialize Manual Objective Checks from existing or auto
    const rChecks: Record<number, boolean> = {};
    for (let q = 1; q <= candidateQuestionCount; q++) {
      if (candidate.manualChecks?.reading?.checks?.[q]) {
        rChecks[q] = candidate.manualChecks.reading.checks[q].tutorIsCorrect;
      } else {
        rChecks[q] = candidate.reading.correctAnswersList?.includes(q) || false;
      }
    }
    setReadingTutorChecks(rChecks);

    const lChecks: Record<number, boolean> = {};
    for (let q = 1; q <= candidateQuestionCount; q++) {
      if (candidate.manualChecks?.listening?.checks?.[q]) {
        lChecks[q] = candidate.manualChecks.listening.checks[q].tutorIsCorrect;
      } else {
        lChecks[q] = candidate.listening.correctAnswersList?.includes(q) || false;
      }
    }
    setListeningTutorChecks(lChecks);

    // Initialize tutor scores from stored or AI
    if (candidate.manualChecks?.speaking) {
      setTutorSpeakingScores({
        fc: candidate.manualChecks.speaking.fc,
        lr: candidate.manualChecks.speaking.lr,
        gra: candidate.manualChecks.speaking.gra,
        pro: candidate.manualChecks.speaking.pro
      });
    } else if (candidate.speaking.speakingDetail && typeof candidate.speaking.band === 'number') {
      const sp = candidate.speaking.speakingDetail;
      setTutorSpeakingScores({
        fc: sp.fc.score,
        lr: sp.lr.score,
        gra: sp.gra.score,
        pro: sp.pro.score
      });
    }

    if (candidate.manualChecks?.writing) {
      setTutorWritingScores({
        task1: candidate.manualChecks.writing.task1,
        task2: candidate.manualChecks.writing.task2
      });
    } else if (candidate.writing.writingDetail && typeof candidate.writing.band === 'number') {
      const wd = candidate.writing.writingDetail;
      setTutorWritingScores({
        task1: { ta: wd.task1.criterion1.score, cc: wd.task1.cc.score, lr: wd.task1.lr.score, gra: wd.task1.gra.score },
        task2: { tr: wd.task2.criterion1.score, cc: wd.task2.cc.score, lr: wd.task2.lr.score, gra: wd.task2.gra.score }
      });
    }

    setTutorNotes(candidate.adminNotes || '');
    setEvaluatorName(candidate.manualChecks?.evaluatorName || 'Senior IELTS Tutor');
    setOverrideReason(candidate.manualChecks?.overrideReason || '');

    // Initialize consultation messages
    setCustomMessages({
      reading: buildSectionFollowUpMessage(candidate, 'reading'),
      listening: buildSectionFollowUpMessage(candidate, 'listening'),
      writing: buildSectionFollowUpMessage(candidate, 'writing'),
      speaking: buildSectionFollowUpMessage(candidate, 'speaking'),
      overall: buildSectionFollowUpMessage(candidate, 'overall')
    });
  };

  const handleCloseModal = () => {
    setSelectedCandidate(null);
    setPlayingAudioKey(null);
    setIsEvaluatingAI(false);
  };

  // Run Real AI Evaluation (Writing + Speaking)
  const handleTriggerAIEvaluation = async () => {
    if (!selectedCandidate) return;
    setIsEvaluatingAI(true);
    setAiStatusMessage("AI sedang menilai jawaban kandidat...");

    const wRes = await evaluateWritingWithAI(selectedCandidate.user, selectedCandidate.answers.writing);
    const sRes = await evaluateSpeakingWithAI(selectedCandidate.user, selectedCandidate.answers.speaking);

    setIsEvaluatingAI(false);

    if (!wRes.success && !sRes.success) {
      setAiStatusMessage(`AI belum berhasil menilai. Writing: ${wRes.error || 'belum tersedia'} | Speaking: ${sRes.error || 'belum tersedia'}`);
      return;
    }

    const writingHadActiveAI = Boolean(selectedCandidate.aiAssessments?.writing);
    const speakingHadActiveAI = Boolean(selectedCandidate.aiAssessments?.speaking);
    const failedWritingAssessment = !wRes.success ? createFailedAIAssessment(selectedCandidate, 'writing', wRes.error) : null;
    const failedSpeakingAssessment = !sRes.success ? createFailedAIAssessment(selectedCandidate, 'speaking', sRes.error) : null;
    const failedWritingReport = !wRes.success && !writingHadActiveAI
      ? { ...selectedCandidate.writing, band: 'AI EVALUATION FAILED', assessmentStatus: 'AI Evaluation Failed' as AssessmentStatus }
      : selectedCandidate.writing;
    const failedSpeakingReport = !sRes.success && !speakingHadActiveAI
      ? { ...selectedCandidate.speaking, band: 'AI EVALUATION FAILED', assessmentStatus: 'AI Evaluation Failed' as AssessmentStatus }
      : selectedCandidate.speaking;
    const updatedWriting = wRes.success && wRes.report ? wRes.report : failedWritingReport;
    const updatedSpeaking = sRes.success && sRes.report ? sRes.report : failedSpeakingReport;
    const writingBand = updatedWriting.band;
    const speakingBand = updatedSpeaking.band;
    const overallAI =
      typeof writingBand === 'number' &&
      typeof speakingBand === 'number' &&
      typeof selectedCandidate.reading.band === 'number' &&
      typeof selectedCandidate.listening.band === 'number'
        ? roundToNearestHalfBand((selectedCandidate.reading.band + selectedCandidate.listening.band + writingBand + speakingBand) / 4)
        : "Partially Evaluated";

    const updatedComparison: DualAssessmentComparison = {
      aiAssessment: {
        readingBand: selectedCandidate.reading.band,
        listeningBand: selectedCandidate.listening.band,
        writingBand,
        speakingBand,
        overallBand: overallAI,
        speakingDetail: sRes.detail || selectedCandidate.speaking.speakingDetail,
        writingDetail: wRes.detail || selectedCandidate.writing.writingDetail
      },
      tutorAssessment: selectedCandidate.dualComparison?.tutorAssessment,
      activeMode: 'AI',
      needsManualReview: overallAI === "Partially Evaluated" || !wRes.success || !sRes.success
    };

    const updatedCandidate: Partial<TestEvaluation> = {
      writing: updatedWriting,
      speaking: updatedSpeaking,
      aiAssessments: {
        writing: wRes.assessment || selectedCandidate.aiAssessments?.writing,
        speaking: sRes.assessment || selectedCandidate.aiAssessments?.speaking
      },
      aiAssessmentHistory: [
        ...(selectedCandidate.aiAssessmentHistory || []).map(item => ({
          ...item,
          is_active:
            (item.section === 'writing' && wRes.assessment) || (item.section === 'speaking' && sRes.assessment)
              ? false
              : item.is_active
        })),
        ...(wRes.assessment ? [{ ...wRes.assessment, is_active: true }] : []),
        ...(sRes.assessment ? [{ ...sRes.assessment, is_active: true }] : []),
        ...(failedWritingAssessment ? [failedWritingAssessment] : []),
        ...(failedSpeakingAssessment ? [failedSpeakingAssessment] : [])
      ],
      dualComparison: updatedComparison
    };

    updateSubmissionEvaluation(selectedCandidate.resultId, updatedCandidate);
    setSelectedCandidate(prev => prev ? ({ ...prev, ...updatedCandidate } as TestEvaluation) : null);
    const statusParts = [
      wRes.success ? "Writing sudah dinilai AI" : `Writing belum berhasil dinilai (${wRes.error})`,
      sRes.success ? (sRes.assessment?.evaluation_status === 'PARTIALLY EVALUATED' ? "Speaking sudah dinilai sebagian; pronunciation tetap dicek tutor" : "Speaking sudah dinilai AI") : `Speaking belum berhasil dinilai (${sRes.error})`
    ];
    setAiStatusMessage(`✅ ${statusParts.join(' | ')}`);
  };

  // Toggle tutor check for Reading Q
  const toggleReadingCheck = (qNum: number, value?: boolean) => {
    setReadingTutorChecks(prev => ({
      ...prev,
      [qNum]: value !== undefined ? value : !prev[qNum]
    }));
  };

  // Toggle tutor check for Listening Q
  const toggleListeningCheck = (qNum: number, value?: boolean) => {
    setListeningTutorChecks(prev => ({
      ...prev,
      [qNum]: value !== undefined ? value : !prev[qNum]
    }));
  };

  // Computed live scores for Manual Checking
  const tutorReadingScore = Object.values(readingTutorChecks).filter(Boolean).length;
  const autoReadingScore = selectedCandidate?.reading?.rawScore || 0;
  const readingDiff = tutorReadingScore - autoReadingScore;
  const tutorReadingBand = convertRawScoreToBand(tutorReadingScore, 'reading');

  const tutorListeningScore = Object.values(listeningTutorChecks).filter(Boolean).length;
  const autoListeningScore = selectedCandidate?.listening?.rawScore || 0;
  const listeningDiff = tutorListeningScore - autoListeningScore;
  const tutorListeningBand = convertRawScoreToBand(tutorListeningScore, 'listening');

  const liveTutorSpeakingRaw = (tutorSpeakingScores.fc + tutorSpeakingScores.lr + tutorSpeakingScores.gra + tutorSpeakingScores.pro) / 4;
  const liveTutorSpeakingBand = roundToNearestHalfBand(liveTutorSpeakingRaw);

  const liveT1Avg = (tutorWritingScores.task1.ta + tutorWritingScores.task1.cc + tutorWritingScores.task1.lr + tutorWritingScores.task1.gra) / 4;
  const liveT2Avg = (tutorWritingScores.task2.tr + tutorWritingScores.task2.cc + tutorWritingScores.task2.lr + tutorWritingScores.task2.gra) / 4;
  const liveTutorWritingRaw = (liveT1Avg + liveT2Avg * 2) / 3;
  const liveTutorWritingBand = roundToNearestHalfBand(liveTutorWritingRaw);

  const tutorOverallBand = roundToNearestHalfBand(
    (tutorReadingBand + tutorListeningBand + liveTutorWritingBand + liveTutorSpeakingBand) / 4
  );

  const aiOverallBand = typeof selectedCandidate?.dualComparison?.aiAssessment?.overallBand === 'number'
    ? selectedCandidate.dualComparison.aiAssessment.overallBand
    : typeof selectedCandidate?.overallBand === 'number' ? selectedCandidate.overallBand : 5.5;
  const hasAiWritingScore = typeof selectedCandidate?.dualComparison?.aiAssessment?.writingBand === 'number' || typeof selectedCandidate?.writing?.band === 'number';
  const hasAiSpeakingScore = typeof selectedCandidate?.dualComparison?.aiAssessment?.speakingBand === 'number' || typeof selectedCandidate?.speaking?.band === 'number';
  const hasAiScores = hasAiWritingScore || hasAiSpeakingScore;

  const overallBandDiff = Math.abs(tutorOverallBand - aiOverallBand);
  const needsManualReview = overallBandDiff > 0.5;

  const handleSaveManualVerification = (isApproved: boolean = false) => {
    if (!selectedCandidate) return;
    if (isApproved && !window.confirm('Kirim dan kunci penilaian tutor?\n\nSetelah dikunci, penilaian tidak dapat diubah.')) {
      return;
    }

    // Recalculate speaking with tutor scores
    const speakingResult = evaluateSpeakingWithRubric(selectedCandidate.answers.speaking, tutorSpeakingScores);
    
    // Recalculate writing with tutor scores
    const writingResult = evaluateWritingWithRubric(selectedCandidate.answers.writing, tutorWritingScores);

    // Build manual verification object
    const readingChecksRecord: Record<number, ObjectiveManualCheckItem> = {};
    let rMatchCount = 0;
    for (let q = 1; q <= objectiveQuestionCount; q++) {
      const autoCorrect = selectedCandidate.reading.correctAnswersList?.includes(q) || false;
      const tutorCorrect = readingTutorChecks[q] ?? autoCorrect;
      if (autoCorrect === tutorCorrect) rMatchCount++;
      readingChecksRecord[q] = {
        questionNumber: q,
        candidateAnswer: selectedCandidate.answers.reading?.[q] || '',
        officialAnswer: readingOfficialDisplayKeys[q] || '',
        autoIsCorrect: autoCorrect,
        tutorIsCorrect: tutorCorrect
      };
    }

    const listeningChecksRecord: Record<number, ObjectiveManualCheckItem> = {};
    let lMatchCount = 0;
    for (let q = 1; q <= objectiveQuestionCount; q++) {
      const autoCorrect = selectedCandidate.listening.correctAnswersList?.includes(q) || false;
      const tutorCorrect = listeningTutorChecks[q] ?? autoCorrect;
      if (autoCorrect === tutorCorrect) lMatchCount++;
      listeningChecksRecord[q] = {
        questionNumber: q,
        candidateAnswer: selectedCandidate.answers.listening?.[q] || '',
        officialAnswer: listeningOfficialDisplayKeys[q] || '',
        autoIsCorrect: autoCorrect,
        tutorIsCorrect: tutorCorrect
      };
    }

    const manualRecord: ManualVerificationRecord = {
      reading: {
        checks: readingChecksRecord,
        autoScore: autoReadingScore,
        tutorScore: tutorReadingScore,
        difference: readingDiff,
        matchCount: rMatchCount,
        matchPercentage: (rMatchCount / objectiveQuestionCount) * 100,
        tutorBand: tutorReadingBand
      },
      listening: {
        checks: listeningChecksRecord,
        autoScore: autoListeningScore,
        tutorScore: tutorListeningScore,
        difference: listeningDiff,
        matchCount: lMatchCount,
        matchPercentage: (lMatchCount / objectiveQuestionCount) * 100,
        tutorBand: tutorListeningBand
      },
      writing: {
        task1: tutorWritingScores.task1,
        task2: tutorWritingScores.task2,
        tutorBand: liveTutorWritingBand,
        tutorNotes
      },
      speaking: {
        ...tutorSpeakingScores,
        tutorBand: liveTutorSpeakingBand,
        tutorNotes
      },
      tutorOverallBand,
      evaluatorName,
      checkedAt: new Date().toISOString(),
      isApproved,
      overrideReason
    };

    const updatedComparison: DualAssessmentComparison = {
      aiAssessment: selectedCandidate.dualComparison?.aiAssessment || {
        readingBand: selectedCandidate.reading.band,
        listeningBand: selectedCandidate.listening.band,
        writingBand: selectedCandidate.writing.band,
        speakingBand: selectedCandidate.speaking.band,
        overallBand: aiOverallBand,
        speakingDetail: selectedCandidate.speaking.speakingDetail,
        writingDetail: selectedCandidate.writing.writingDetail
      },
      tutorAssessment: {
        readingBand: tutorReadingBand,
        listeningBand: tutorListeningBand,
        writingBand: liveTutorWritingBand,
        speakingBand: liveTutorSpeakingBand,
        overallBand: tutorOverallBand,
        speakingDetail: speakingResult.detail,
        writingDetail: writingResult.detail
      },
      bandDifference: overallBandDiff,
      needsManualReview,
      activeMode: isApproved ? 'TUTOR' : selectedCandidate.dualComparison?.activeMode || 'AI'
    };

    const auditEntry = {
      rubric_version: "IELTS-Cambridge-Descriptors-2026.1",
      evaluation_mode: (isApproved ? "TUTOR" : "HYBRID") as any,
      evaluator: evaluatorName,
      evaluation_timestamp: new Date().toISOString(),
      criterion_scores: {
        Reading_Auto: autoReadingScore,
        Reading_Tutor: tutorReadingScore,
        Listening_Auto: autoListeningScore,
        Listening_Tutor: tutorListeningScore,
        Speaking_FC: tutorSpeakingScores.fc,
        Speaking_LR: tutorSpeakingScores.lr,
        Speaking_GRA: tutorSpeakingScores.gra,
        Speaking_PRO: tutorSpeakingScores.pro,
        Writing_T1_TA: tutorWritingScores.task1.ta,
        Writing_T1_CC: tutorWritingScores.task1.cc,
        Writing_T2_TR: tutorWritingScores.task2.tr,
        Writing_T2_GRA: tutorWritingScores.task2.gra,
        Final_Overall_Band: tutorOverallBand
      },
      evidence: {
        speaking: { positive: speakingResult.detail.fc.positiveEvidence, limiting: speakingResult.detail.gra.limitingEvidence },
        writing: { positive: writingResult.detail.task1.criterion1.positiveEvidence, limiting: writingResult.detail.task2.criterion1.limitingEvidence }
      },
      final_band: tutorOverallBand,
      manual_override: isApproved,
      override_reason: overrideReason || "Tutor manual QA inspection & rubric verification"
    };

    const updatedCandidate: Partial<TestEvaluation> = {
      overallBand: isApproved ? tutorOverallBand : selectedCandidate.overallBand,
      reading: {
        ...selectedCandidate.reading,
        band: isApproved ? tutorReadingBand : selectedCandidate.reading.band,
        rawScore: isApproved ? tutorReadingScore : selectedCandidate.reading.rawScore
      },
      listening: {
        ...selectedCandidate.listening,
        band: isApproved ? tutorListeningBand : selectedCandidate.listening.band,
        rawScore: isApproved ? tutorListeningScore : selectedCandidate.listening.rawScore
      },
      speaking: isApproved ? speakingResult.report : selectedCandidate.speaking,
      writing: isApproved ? writingResult.report : selectedCandidate.writing,
      status: isApproved ? 'Evaluated' : selectedCandidate.status,
      adminNotes: tutorNotes,
      dualComparison: updatedComparison,
      manualChecks: manualRecord,
      auditTrail: [
        ...(selectedCandidate.auditTrail || []),
        auditEntry
      ]
    };

    updateSubmissionEvaluation(selectedCandidate.resultId, updatedCandidate);
    setSelectedCandidate(prev => prev ? ({ ...prev, ...updatedCandidate } as TestEvaluation) : null);

    // Refresh consultation messages
    const name = selectedCandidate.user.fullName;
    const target = selectedCandidate.user.targetScore;
    const finalReadingBand = isApproved ? tutorReadingBand : selectedCandidate.reading.band;
    const finalListeningBand = isApproved ? tutorListeningBand : selectedCandidate.listening.band;
    const finalWritingBand = isApproved ? liveTutorWritingBand : selectedCandidate.writing.band;
    const finalSpeakingBand = isApproved ? liveTutorSpeakingBand : selectedCandidate.speaking.band;

    setCustomMessages({
      reading: getReadingConsultation(name, finalReadingBand, target, selectedCandidate.reading.incorrectAnswersList).whatsappMessage,
      listening: getListeningConsultation(name, finalListeningBand, target, selectedCandidate.listening.incorrectAnswersList).whatsappMessage,
      writing: getWritingConsultation(name, finalWritingBand, target, writingResult.detail).whatsappMessage,
      speaking: getSpeakingConsultation(name, finalSpeakingBand, target, speakingResult.detail).whatsappMessage,
      overall: buildAdminFollowUpMessage({
        ...selectedCandidate,
        manualChecks: {
          ...(selectedCandidate.manualChecks || {} as any),
          tutorOverallBand
        }
      } as TestEvaluation)
    });

    alert(isApproved ? "Assessment Submitted ✓" : "Draft assessment saved.");
  };

  const handleAudioPlay = async (audioKey: string, audioDataUrlOrPath?: string) => {
    if (!audioDataUrlOrPath) return;
    if (playingAudioKey === audioKey) {
      setPlayingAudioKey(null);
    } else {
      setPlayingAudioKey(audioKey);
      let playableUrl = audioDataUrlOrPath;
      if (audioDataUrlOrPath.startsWith('speaking-recordings/')) {
        const retrieved = await audioStorage.getAudio(audioDataUrlOrPath);
        if (retrieved) playableUrl = retrieved;
      }
      const audio = new Audio(playableUrl);
      audio.play();
      audio.onended = () => setPlayingAudioKey(null);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    return clean.startsWith('0') ? `62${clean.slice(1)}` : clean;
  };

  const handleSendWhatsApp = (message: string) => {
    if (!selectedCandidate) return;
    const formattedPhone = formatPhoneNumber(selectedCandidate.user.whatsapp);
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const openCandidateFollowUp = (candidate: TestEvaluation, section: FollowUpKey = 'overall') => {
    setActiveFollowUpKey(section);
    handleOpenCandidateModal(candidate, 'info');
  };

  const handleCopyMessage = (sectionKey: string, message: string) => {
    navigator.clipboard.writeText(message);
    setCopiedKey(sectionKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const showComparison = !isBlindQA || blindQASubmitted;
  const followUpSections: Array<{ key: FollowUpKey; label: string; icon: any }> = [
    { key: 'reading', label: 'Reading Consultation', icon: BookOpen },
    { key: 'listening', label: 'Listening Consultation', icon: Headphones },
    { key: 'writing', label: 'Writing Consultation', icon: PenTool },
    { key: 'speaking', label: 'Speaking Consultation', icon: Mic },
    { key: 'overall', label: 'Overall Consultation', icon: CheckCircle2 }
  ];
  const activeFollowUp = followUpSections.find(section => section.key === activeFollowUpKey) || followUpSections[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-7">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-[#e6eaf2] shadow-soft">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#08245c] text-white flex items-center justify-center">
              {isDatabaseMode ? <ClipboardList className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              {isDatabaseMode ? 'Database' : 'Admin Follow Up'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#08245c] tracking-tight">
            {isDatabaseMode ? 'Database Member IELTS' : 'Follow Up Member IELTS'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            {isDatabaseMode
              ? 'Data lengkap peserta, jawaban, penilaian, PDF, dan riwayat.'
              : 'Cari member, lihat band ringkas, lalu follow up via WhatsApp.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 self-stretch sm:self-center flex-wrap gap-2">
          {!isDatabaseMode && (
            <button
              onClick={() => setCurrentView('database')}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs px-3.5 py-2.5 rounded-full border border-blue-200 transition-all flex items-center space-x-1.5"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Database</span>
            </button>
          )}

          {isDatabaseMode && (
            <>
              <button
                onClick={() => setCurrentView('admin')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs px-3.5 py-2.5 rounded-full border border-emerald-200 transition-all flex items-center space-x-1.5"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Follow Up</span>
              </button>
              <button
                onClick={() => setShowAISettings(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-3.5 py-2.5 rounded-full border border-indigo-200 transition-all flex items-center space-x-1.5"
                title="Masukkan token admin"
              >
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>Akses</span>
              </button>

              <button
                onClick={() => setShowBandSettings(!showBandSettings)}
                className="bg-[#f8fbff] hover:bg-slate-100 text-slate-700 font-extrabold text-xs px-3.5 py-2.5 rounded-full border border-[#e6eaf2] transition-all flex items-center space-x-1.5"
                title="Pengaturan konversi skor"
              >
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>Atur Band</span>
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentView('register')}
            className="bg-[#f8fbff] hover:bg-slate-100 text-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-full border border-[#e6eaf2] transition-all flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* AI AND TUTOR SUMMARY CARD */}
      <div className="hidden bg-white p-5 sm:p-6 rounded-3xl border border-[#e6eaf2] shadow-soft space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-extrabold text-[#08245c]">
              Ringkasan Nilai AI vs Tutor
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Sudah dicek tutor: <strong className="text-slate-900">{calibrationMetrics.totalTutorVerifiedSamples}</strong>
          </span>
        </div>

        {calibrationMetrics.writing.samples === 0 && calibrationMetrics.speaking.samples === 0 ? (
          <div className="py-3 text-center text-xs text-slate-400 font-semibold bg-[#f8fbff] rounded-2xl border border-dashed border-slate-200">
            Belum ada nilai tutor yang dikunci. Perbandingan AI dan tutor akan muncul setelah tutor submit penilaian.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#f8fbff] p-3.5 rounded-2xl border border-[#e6eaf2] space-y-2">
              <span className="font-extrabold text-blue-900 block text-[11px] uppercase tracking-wider">
                Writing ({calibrationMetrics.writing.samples} data)
              </span>
              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider">
                <span className="text-slate-500">{calibrationLabel(calibrationMetrics.writing.samples)}</span>
                <span className="text-blue-700">Rata-rata beda {calibrationMetrics.writing.meanAbsoluteBandError.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Sama</span>
                  <strong className="text-emerald-700 text-sm">{calibrationMetrics.writing.exactMatchPct}%</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Dekat</span>
                  <strong className="text-blue-700 text-sm">{calibrationMetrics.writing.withinHalfBandPct}%</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Beda jauh</span>
                  <strong className="text-amber-700 text-sm">{calibrationMetrics.writing.moreThanHalfBandPct}%</strong>
                </div>
              </div>
              <div className="rounded-xl bg-white p-2 text-[11px] font-bold text-slate-500 border border-slate-100">
                Menampilkan ringkasan perbandingan band AI dan tutor.
              </div>
            </div>

            <div className="bg-[#f8fbff] p-3.5 rounded-2xl border border-[#e6eaf2] space-y-2">
              <span className="font-extrabold text-red-900 block text-[11px] uppercase tracking-wider">
                Speaking ({calibrationMetrics.speaking.samples} data)
              </span>
              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider">
                <span className="text-slate-500">{calibrationLabel(calibrationMetrics.speaking.samples)}</span>
                <span className="text-red-700">Rata-rata beda {calibrationMetrics.speaking.meanAbsoluteBandError.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Sama</span>
                  <strong className="text-emerald-700 text-sm">{calibrationMetrics.speaking.exactMatchPct}%</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Dekat</span>
                  <strong className="text-blue-700 text-sm">{calibrationMetrics.speaking.withinHalfBandPct}%</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">Beda jauh</span>
                  <strong className="text-amber-700 text-sm">{calibrationMetrics.speaking.moreThanHalfBandPct}%</strong>
                </div>
              </div>
              <div className="rounded-xl bg-white p-2 text-[11px] font-bold text-slate-500 border border-slate-100">
                Menampilkan ringkasan perbandingan band AI dan tutor.
              </div>
            </div>
          </div>
        )}

        {calibrationMetrics.disagreementRows.length > 0 && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            Ada {calibrationMetrics.disagreementRows.length} hasil dengan perbedaan AI dan tutor. Buka kandidat untuk melihat detailnya.
          </div>
        )}
      </div>

      {/* AI SETTINGS MODAL POPUP */}
      {showAISettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-[#e6eaf2] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-[#08245c]">Admin Token</h3>
              </div>
              <button onClick={() => setShowAISettings(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Masukkan token admin untuk membuka daftar kandidat dan fitur penilaian AI.
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Token Admin:</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder="Masukkan token admin"
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fbff] border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <strong className="block text-slate-800">Setelah token aktif:</strong>
                <div>• daftar kandidat akan muncul,</div>
                <div>• admin bisa melihat nilai AI dan nilai tutor,</div>
                <div>• admin bisa menjalankan ulang penilaian AI bila diperlukan.</div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={async () => {
                  try {
                    await saveStoredEvaluatorAdminToken(apiKeyInput);
                    await loadAdminCandidates();
                    setShowAISettings(false);
                    setApiKeyInput('');
                    alert("Token admin aktif.");
                  } catch (error: any) {
                    alert(error?.message || 'Token admin belum bisa dipakai.');
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all"
              >
                Aktifkan Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAND CONVERSION TABLE SETTINGS DRAWER */}
      {showBandSettings && (
        <div className="bg-white p-6 rounded-3xl border border-blue-200 shadow-soft space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-extrabold text-[#08245c]">
                Admin-Editable Band Conversion Mapping Table (0–40 Raw Score &rarr; Estimated Diagnostic Band)
              </h3>
            </div>
            <button
              onClick={() => {
                setBandTable(defaultBandConversionTable);
                saveBandConversionTable(defaultBandConversionTable);
                alert("Reset to official default conversion table!");
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Reading Mapping */}
            <div className="space-y-2">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Academic Reading Conversion Rules (Cambridge 17)</span>
              </h4>
              <div className="bg-[#f8fbff] p-3 rounded-2xl border border-[#e6eaf2] max-h-48 overflow-y-auto space-y-1.5">
                {bandTable.reading.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between font-mono py-0.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600">Raw Score: {rule.minScore} – {rule.maxScore}</span>
                    <strong className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Band {rule.band.toFixed(1)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Listening Mapping */}
            <div className="space-y-2">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1">
                <Headphones className="w-3.5 h-3.5 text-indigo-600" />
                <span>Listening Conversion Rules (Cambridge 18)</span>
              </h4>
              <div className="bg-[#f8fbff] p-3 rounded-2xl border border-[#e6eaf2] max-h-48 overflow-y-auto space-y-1.5">
                {bandTable.listening.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between font-mono py-0.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600">Raw Score: {rule.minScore} – {rule.maxScore}</span>
                    <strong className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">Band {rule.band.toFixed(1)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {candidateLoadError && (
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2 text-sm font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{candidateLoadError}</span>
          </div>
          <button
            onClick={() => setShowAISettings(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all"
          >
            Masukkan Admin Token
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e6eaf2] shadow-soft flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, WhatsApp, atau Result ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[#f8fbff] border border-[#e6eaf2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs font-bold text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
          <span>{isLoadingCandidates ? 'Memuat data...' : <>Total: <strong className="text-slate-800">{filteredSubmissions.length}</strong> Peserta</>}</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-600 font-bold">
            {filteredSubmissions.filter(s => s.status === 'Evaluated').length} Selesai
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-amber-600 font-bold">
            {filteredSubmissions.filter(s => s.status === 'Pending Evaluation').length} Menunggu
          </span>
        </div>
      </div>

      {/* MAIN CANDIDATE LIST TABLE */}
      <div className="bg-white rounded-3xl border border-[#e6eaf2] shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hidden w-full text-left border-collapse md:table">
            <thead>
              <tr className="bg-[#f8fbff] border-b border-[#e6eaf2] text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Nama</th>
                {isDatabaseMode && <th className="py-4 px-6">WhatsApp</th>}
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Band</th>
                {isDatabaseMode && <th className="py-4 px-6">Selesai</th>}
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6eaf2] text-xs sm:text-sm font-medium text-slate-800">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={isDatabaseMode ? 6 : 4} className="py-12 text-center text-slate-400 text-xs font-semibold">
                    No candidate records found matching "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((candidate) => (
                  <tr
                    key={candidate.resultId}
                    onClick={() => handleOpenCandidateModal(candidate)}
                    className="hover:bg-[#f8fbff] transition-colors cursor-pointer group"
                  >
                    {/* 1. Candidate Name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          {candidate.user.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900">{candidate.user.fullName}</div>
                          <div className="text-[11px] font-mono text-blue-600 font-bold">{candidate.resultId}</div>
                        </div>
                      </div>
                    </td>

                    {isDatabaseMode && (
                      <td className="py-4 px-6 font-bold text-slate-600">{candidate.user.whatsapp}</td>
                    )}

                    {/* 2. Status */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        candidate.status === 'Evaluated'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {displayAdminStatus(candidate.status)}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs">
                      <div className="font-black text-[#08245c]">Overall {candidateBandSummary(candidate)}</div>
                      <div className="mt-1 font-bold text-slate-500">
                        W {displayAdminBand(candidate.manualChecks?.writing?.tutorBand ?? candidate.writing.band)}
                        {' · '}
                        S {displayAdminBand(candidate.manualChecks?.speaking?.tutorBand ?? candidate.speaking.band)}
                      </div>
                    </td>

                    {/* 3. Date Completed */}
                    {isDatabaseMode && (
                      <td className="py-4 px-6 text-slate-500 text-xs">
                        <div>{new Date(candidate.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(candidate.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    )}

                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCandidateFollowUp(candidate, 'overall');
                          }}
                          className="inline-flex items-center space-x-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100 transition-all hover:bg-emerald-600 hover:text-white"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Follow Up</span>
                        </button>
                        {isDatabaseMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCandidateModal(candidate);
                            }}
                            className="inline-flex items-center space-x-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700 transition-all hover:bg-blue-600 hover:text-white"
                          >
                            <span>Detail</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="divide-y divide-[#e6eaf2] md:hidden">
            {filteredSubmissions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                No candidate records found matching "{searchTerm}".
              </div>
            ) : (
              filteredSubmissions.map(candidate => (
                <div
                  key={candidate.resultId}
                  onClick={() => handleOpenCandidateModal(candidate)}
                  className="space-y-3 p-4 cursor-pointer hover:bg-[#f8fbff] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-slate-900">{candidate.user.fullName}</div>
                      <div className="text-[11px] font-mono text-blue-600 font-bold">{candidate.resultId}</div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      candidate.status === 'Evaluated'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {displayAdminStatus(candidate.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-[#f8fbff] p-3">
                      <p className="font-black uppercase text-slate-400">Writing</p>
                      <p className="mt-1 font-black text-[#08245c]">
                        {displayAdminBand(candidate.manualChecks?.writing?.tutorBand ?? candidate.writing.band)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#f8fbff] p-3">
                      <p className="font-black uppercase text-slate-400">Speaking</p>
                      <p className="mt-1 font-black text-[#08245c]">
                        {displayAdminBand(candidate.manualChecks?.speaking?.tutorBand ?? candidate.speaking.band)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3">
                      <p className="font-black uppercase text-blue-500">Overall</p>
                      <p className="mt-1 font-black text-blue-800">
                        {candidateBandSummary(candidate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCandidateFollowUp(candidate, 'overall');
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-100"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Follow Up
                    </button>
                    {isDatabaseMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCandidateModal(candidate);
                        }}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white"
                      >
                        Detail
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTERED MODAL POPUP WITH 6 TABS (INCLUDING REAL AI EVALUATION) */}
      {/* ========================================================================= */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-20 sm:pt-24 animate-in fade-in duration-150">
          
          {/* Modal Container */}
          <div className="relative w-full max-w-5xl bg-white rounded-3xl p-6 sm:p-8 border border-[#e6eaf2] shadow-2xl max-h-[calc(100dvh-6rem)] overflow-y-auto space-y-6 text-left">
            
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Top Header */}
            <div className="space-y-1 pr-10">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                  {selectedCandidate.resultId}
                </span>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  Cambridge 17/18 Diagnostic Test
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#08245c] tracking-tight">
                {selectedCandidate.user.fullName}
              </h2>
              <p className="text-xs text-slate-400">
                Completed on {new Date(selectedCandidate.completedAt).toLocaleString('en-GB')}
              </p>
            </div>

            {/* Simplified admin view keeps the modal focused on profile and scores. */}
            <div className={isDatabaseMode ? "overflow-x-auto border-b border-slate-100 pb-2 flex items-center gap-2 text-xs font-extrabold" : "hidden"}>
              <button
                onClick={() => setActiveModalTab('info')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeModalTab === 'info'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#f8fbff] text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Info Peserta</span>
              </button>

              <button
                onClick={() => setActiveModalTab('responses')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeModalTab === 'responses'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#f8fbff] text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Jawaban Test</span>
              </button>

              <button
                onClick={() => setActiveModalTab('manual')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeModalTab === 'manual'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Cek Tutor</span>
              </button>

              <button
                onClick={() => setActiveModalTab('evaluation')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeModalTab === 'evaluation'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#f8fbff] text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Nilai AI</span>
              </button>

              <button
                onClick={() => setActiveModalTab('reports')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeModalTab === 'reports'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#f8fbff] text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>

              <button
                onClick={() => setActiveModalTab('followup')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  activeModalTab === 'followup'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Follow Up</span>
              </button>
            </div>

            {/* Candidate summary */}
            {activeModalTab === 'info' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="bg-[#f8fbff] p-5 rounded-2xl border border-[#e6eaf2] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">Nama</span>
                    <strong className="text-slate-800 text-sm">{selectedCandidate.user.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">WhatsApp</span>
                    <strong className="text-slate-800 text-sm">{selectedCandidate.user.whatsapp}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Umur</span>
                    <strong className="text-slate-800 text-sm">{selectedCandidate.user.age} Tahun</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Status</span>
                    <strong className="text-slate-800">{selectedCandidate.user.currentStatus}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Target IELTS</span>
                    <strong className="text-blue-700 text-sm">{selectedCandidate.user.targetScore}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Result ID</span>
                    <strong className="text-slate-800 font-mono">{selectedCandidate.resultId}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <span className="block font-black uppercase text-blue-500">Reading</span>
                    <strong className="mt-1 block text-xl text-blue-900">{displayAdminBand(selectedCandidate.manualChecks?.reading?.tutorBand ?? selectedCandidate.reading.band)}</strong>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <span className="block font-black uppercase text-indigo-500">Listening</span>
                    <strong className="mt-1 block text-xl text-indigo-900">{displayAdminBand(selectedCandidate.manualChecks?.listening?.tutorBand ?? selectedCandidate.listening.band)}</strong>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="block font-black uppercase text-slate-400">Writing AI</span>
                    <strong className="mt-1 block text-xl text-[#08245c]">{displayAdminBand(selectedCandidate.dualComparison?.aiAssessment?.writingBand ?? selectedCandidate.writing.band)}</strong>
                    <span className="mt-1 block font-bold text-slate-500">Tutor {displayAdminBand(selectedCandidate.manualChecks?.writing?.tutorBand)}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="block font-black uppercase text-slate-400">Speaking AI</span>
                    <strong className="mt-1 block text-xl text-[#08245c]">{displayAdminBand(selectedCandidate.dualComparison?.aiAssessment?.speakingBand ?? selectedCandidate.speaking.band)}</strong>
                    <span className="mt-1 block font-bold text-slate-500">Tutor {displayAdminBand(selectedCandidate.manualChecks?.speaking?.tutorBand)}</span>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-1">
                    <span className="block font-black uppercase text-emerald-600">Overall</span>
                    <strong className="mt-1 block text-2xl text-emerald-900">{candidateBandSummary(selectedCandidate)}</strong>
                  </div>
                </div>

                <div className="grid gap-3">
                  <button
                    onClick={handleTriggerAIEvaluation}
                    disabled={isEvaluatingAI}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:bg-indigo-300"
                  >
                    <RefreshCw className={`h-4 w-4 ${isEvaluatingAI ? 'animate-spin' : ''}`} />
                    {isEvaluatingAI ? 'AI menilai...' : hasAiScores ? 'Nilai Ulang AI' : 'Nilai dengan AI'}
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-xs font-black uppercase text-slate-400">Download PDF</p>
                  <div className="grid gap-2 sm:grid-cols-5">
                    <button
                      onClick={() => downloadReadingPDF(selectedCandidate)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-extrabold text-blue-700 hover:bg-blue-100"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Reading
                    </button>
                    <button
                      onClick={() => downloadListeningPDF(selectedCandidate)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Listening
                    </button>
                    <button
                      onClick={() => downloadWritingPDF(selectedCandidate)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Writing
                    </button>
                    <button
                      onClick={() => downloadSpeakingPDF(selectedCandidate)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Speaking
                    </button>
                    <button
                      onClick={() => downloadComprehensivePDF(selectedCandidate)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#08245c] px-3 py-2.5 text-xs font-extrabold text-white hover:bg-[#061634]"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Overall
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e6eaf2] bg-[#f8fbff] p-4">
                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {followUpSections.map(section => (
                      <button
                        key={section.key}
                        onClick={() => setActiveFollowUpKey(section.key)}
                        className={`rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                          activeFollowUpKey === section.key
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50'
                        }`}
                      >
                        {section.key === 'overall' ? 'Overall' : section.key.charAt(0).toUpperCase() + section.key.slice(1)}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const IconComp = activeFollowUp.icon;
                    const msg = customMessages[activeFollowUp.key] || '';
                    return (
                      <div className="rounded-2xl border border-[#e6eaf2] bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 font-extrabold text-[#08245c]">
                            <IconComp className="h-4 w-4" />
                            {activeFollowUp.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyMessage(activeFollowUp.key, msg)}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                            >
                              {copiedKey === activeFollowUp.key ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                              {copiedKey === activeFollowUp.key ? 'Tersalin' : 'Salin'}
                            </button>
                            <button
                              onClick={() => handleSendWhatsApp(msg)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Kirim via WhatsApp
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={5}
                          value={msg}
                          onChange={e => setCustomMessages({ ...customMessages, [activeFollowUp.key]: e.target.value })}
                          className="w-full resize-none rounded-xl border border-[#e6eaf2] bg-white p-3 font-mono text-[11px] text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    );
                  })()}
                </div>

                {aiStatusMessage && (
                  <div className={`rounded-xl p-3 text-xs font-bold ${
                    aiStatusMessage.startsWith('✅') ? 'border border-emerald-200 bg-emerald-50 text-emerald-800' : 'border border-amber-200 bg-amber-50 text-amber-800'
                  }`}>
                    {aiStatusMessage}
                  </div>
                )}

                {/* 4 Section Statuses (hidden in simplified admin view) */}
                <div className="hidden bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                    Candidate Section Statuses (Multi-Day Progress)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-bold">
                    <div className="bg-[#f8fbff] p-2.5 rounded-xl border border-[#e6eaf2] flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 text-blue-700">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Reading</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedCandidate.sectionProgress?.reading?.status || 'Completed'}
                      </span>
                    </div>

                    <div className="bg-[#f8fbff] p-2.5 rounded-xl border border-[#e6eaf2] flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 text-indigo-700">
                        <Headphones className="w-3.5 h-3.5" />
                        <span>Listening</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedCandidate.sectionProgress?.listening?.status || 'Completed'}
                      </span>
                    </div>

                    <div className="bg-[#f8fbff] p-2.5 rounded-xl border border-[#e6eaf2] flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 text-blue-700">
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Writing</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedCandidate.sectionProgress?.writing?.status || (selectedCandidate.answers.writing.task1 || selectedCandidate.answers.writing.task2 ? 'Completed' : 'Not Started')}
                      </span>
                    </div>

                    <div className="bg-[#f8fbff] p-2.5 rounded-xl border border-[#e6eaf2] flex items-center justify-between">
                      <span className="flex items-center space-x-1.5 text-red-600">
                        <Mic className="w-3.5 h-3.5" />
                        <span>Speaking</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedCandidate.sectionProgress?.speaking?.status || (selectedCandidate.answers.speaking.part1Audio ? 'Completed' : 'Not Started')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overall Score Banner */}
                <div className="hidden bg-blue-50 p-5 rounded-2xl border border-blue-200 flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-blue-900 uppercase">Estimated IELTS Diagnostic Band</span>
                    <h3 className="text-3xl font-black text-blue-700">
                      {typeof selectedCandidate.overallBand === 'number' ? `Band ${selectedCandidate.overallBand.toFixed(1)}` : String(selectedCandidate.overallBand)}
                    </h3>
                  </div>
                  <div className="text-xs text-blue-900 space-y-1 sm:text-right">
                    <div>Reading: <strong>{typeof selectedCandidate.reading.band === 'number' ? `Band ${selectedCandidate.reading.band.toFixed(1)}` : String(selectedCandidate.reading.band)}</strong></div>
                    <div>Listening: <strong>{typeof selectedCandidate.listening.band === 'number' ? `Band ${selectedCandidate.listening.band.toFixed(1)}` : String(selectedCandidate.listening.band)}</strong></div>
                    <div>Writing: <strong>{typeof selectedCandidate.writing.band === 'number' ? `Band ${selectedCandidate.writing.band.toFixed(1)}` : String(selectedCandidate.writing.band)}</strong></div>
                    <div>Speaking: <strong>{typeof selectedCandidate.speaking.band === 'number' ? `Band ${selectedCandidate.speaking.band.toFixed(1)}` : String(selectedCandidate.speaking.band)}</strong></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TEST RESPONSES */}
            {activeModalTab === 'responses' && (
              <div className="space-y-4 animate-in fade-in duration-100 text-xs">
                
                {/* Reading Responses */}
                <div className="bg-[#f8fbff] p-4 rounded-2xl border border-[#e6eaf2] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#08245c] flex items-center space-x-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Reading Responses ({selectedIsQa ? 'QA Mode: Q1-Q5' : 'Cambridge 17: 40 Questions'})</span>
                    </span>
                    <span className="font-bold text-blue-700 font-mono">
                      Raw: {selectedCandidate.reading.rawScore || 0}/{objectiveQuestionCount} Correct ({selectedCandidate.reading.correctPercentage || 0}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 max-h-36 overflow-y-auto p-1 font-mono text-[11px]">
                    {Array.from({ length: objectiveQuestionCount }).map((_, idx) => {
                      const qNum = idx + 1;
                      const ans = selectedCandidate.answers.reading[qNum];
                      const isCorrect = selectedCandidate.reading.correctAnswersList?.includes(qNum);

                      return (
                        <div key={qNum} className={`p-1.5 rounded-lg border text-center ${
                          isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : ans ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          <div>#{qNum}</div>
                          <div className="truncate font-sans font-semibold">{ans || '-'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Listening Responses */}
                <div className="bg-[#f8fbff] p-4 rounded-2xl border border-[#e6eaf2] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#08245c] flex items-center space-x-1.5">
                      <Headphones className="w-4 h-4 text-indigo-600" />
                      <span>Listening Responses ({selectedIsQa ? 'QA Mode: Q1-Q5' : 'Cambridge 18: 40 Questions'})</span>
                    </span>
                    <span className="font-bold text-indigo-700 font-mono">
                      Raw: {selectedCandidate.listening.rawScore || 0}/{objectiveQuestionCount} Correct ({selectedCandidate.listening.correctPercentage || 0}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 max-h-36 overflow-y-auto p-1 font-mono text-[11px]">
                    {Array.from({ length: objectiveQuestionCount }).map((_, idx) => {
                      const qNum = idx + 1;
                      const ans = selectedCandidate.answers.listening[qNum];
                      const isCorrect = selectedCandidate.listening.correctAnswersList?.includes(qNum);

                      return (
                        <div key={qNum} className={`p-1.5 rounded-lg border text-center ${
                          isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : ans ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          <div>#{qNum}</div>
                          <div className="truncate font-sans font-semibold">{ans || '-'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Writing Responses */}
                <div className="space-y-2">
                  <div className="bg-[#f8fbff] p-3.5 rounded-xl border border-[#e6eaf2]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-700">Writing Task 1 Response (Metal Price Changes 2014):</span>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">
                        {selectedCandidate.answers.writing.task1?.trim().split(/\s+/).filter(Boolean).length || 0} words
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {selectedCandidate.answers.writing.task1 || "No Task 1 response."}
                    </p>
                  </div>

                  <div className="bg-[#f8fbff] p-3.5 rounded-xl border border-[#e6eaf2]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-700">Writing Task 2 Response (Ageing Population Debate):</span>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">
                        {selectedCandidate.answers.writing.task2?.trim().split(/\s+/).filter(Boolean).length || 0} words
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {selectedCandidate.answers.writing.task2 || "No Task 2 response."}
                    </p>
                  </div>
                </div>

                {/* Speaking Audio Recordings */}
                <div className="bg-[#f8fbff] p-3.5 rounded-xl border border-[#e6eaf2] space-y-2">
                  <span className="font-bold text-slate-700 block">Speaking Audio Recordings (Cambridge 18 Speaking Test 4):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(selectedIsQa ? [
                      { label: 'Part 1 Q1', audioKey: 'part1_q1_audio', durationKey: 'part1_q1_duration' },
                      { label: 'Part 1 Q2', audioKey: 'part1_q2_audio', durationKey: 'part1_q2_duration' },
                      { label: 'Part 2', audioKey: 'part2_audio', durationKey: 'part2_duration' },
                      { label: 'Part 3 Q1', audioKey: 'part3_q1_audio', durationKey: 'part3_q1_duration' },
                      { label: 'Part 3 Q2', audioKey: 'part3_q2_audio', durationKey: 'part3_q2_duration' }
                    ] : [
                      { label: 'Part 1', audioKey: 'part1Audio', durationKey: 'part1Duration' },
                      { label: 'Part 2', audioKey: 'part2Audio', durationKey: 'part2Duration' },
                      { label: 'Part 3', audioKey: 'part3Audio', durationKey: 'part3Duration' }
                    ]).map((item) => {
                      const audioData = selectedCandidate.answers.speaking[item.audioKey as keyof typeof selectedCandidate.answers.speaking];
                      const duration = selectedCandidate.answers.speaking[item.durationKey as keyof typeof selectedCandidate.answers.speaking];
                      const isPlaying = playingAudioKey === `modal-${selectedCandidate.resultId}-${item.audioKey}`;

                      return (
                        <div key={item.audioKey} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                          <span className="font-bold">{item.label}</span>
                          {typeof audioData === 'string' && audioData ? (
                            <button
                              onClick={() => handleAudioPlay(`modal-${selectedCandidate.resultId}-${item.audioKey}`, audioData)}
                              className={`p-1.5 px-2.5 rounded-md text-[10px] font-bold flex items-center space-x-1 ${
                                isPlaying ? 'bg-red-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              <span>{isPlaying ? 'Pause' : 'Play'}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">None</span>
                          )}
                          {typeof duration === 'number' && duration > 0 && <span className="text-[10px] font-mono text-slate-400">{duration}s</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: MANUAL CHECKING & BLIND QA MODE */}
            {activeModalTab === 'manual' && (
              <div className="space-y-4 animate-in fade-in duration-100 text-xs">
                
                {/* Mode Switcher Banner: Blind QA Toggle */}
                <div className="bg-[#f8fbff] p-4 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-md">
                        {isBlindQA ? (blindQASubmitted ? "Cek Tutor Selesai" : "Cek Tutor Aktif") : "Mode Review"}
                      </span>
                      <h3 className="text-sm font-extrabold text-[#08245c]">
                        Cek Jawaban Tutor
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isBlindQA 
                        ? (blindQASubmitted 
                            ? "Nilai AI dan nilai tutor sudah bisa dibandingkan."
                            : "Nilai AI dan kunci jawaban disembunyikan dulu sampai tutor selesai menilai.")
                        : "Cek jawaban kandidat dan isi nilai tutor."}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!isBlindQA ? (
                      <button
                        onClick={() => {
                          setIsBlindQA(true);
                          setBlindQASubmitted(false);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Mulai Cek Tutor</span>
                      </button>
                    ) : !blindQASubmitted ? (
                      <button
                        onClick={() => setBlindQASubmitted(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Selesai Cek Tutor</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsBlindQA(false);
                          setBlindQASubmitted(false);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl flex items-center space-x-1 transition-all"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Keluar Mode Cek</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl space-x-1">
                    <button
                      onClick={() => setManualSectionTab('reading')}
                      className={`px-3 py-1.5 rounded-lg font-extrabold transition-all flex items-center space-x-1 ${
                        manualSectionTab === 'reading' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Reading QA</span>
                    </button>

                    <button
                      onClick={() => setManualSectionTab('listening')}
                      className={`px-3 py-1.5 rounded-lg font-extrabold transition-all flex items-center space-x-1 ${
                        manualSectionTab === 'listening' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Listening QA</span>
                    </button>

                    <button
                      onClick={() => setManualSectionTab('writing')}
                      className={`px-3 py-1.5 rounded-lg font-extrabold transition-all flex items-center space-x-1 ${
                        manualSectionTab === 'writing' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Writing QA</span>
                    </button>

                    <button
                      onClick={() => setManualSectionTab('speaking')}
                      className={`px-3 py-1.5 rounded-lg font-extrabold transition-all flex items-center space-x-1 ${
                        manualSectionTab === 'speaking' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Speaking QA</span>
                    </button>

                    <button
                      onClick={() => setManualSectionTab('summary')}
                      className={`px-3 py-1.5 rounded-lg font-extrabold transition-all flex items-center space-x-1 ${
                        manualSectionTab === 'summary' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Overall QA Summary</span>
                    </button>
                  </div>
                </div>

                {/* 1. READING MANUAL CHECKING TABLE */}
                {manualSectionTab === 'reading' && (
                  <div className="space-y-3">
                    {showComparison ? (
                      <div className="bg-[#f8fbff] p-4 rounded-2xl border border-blue-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[#08245c]">Reading Manual QA ({selectedIsQa ? 'Q1-Q5' : 'Cambridge 17: Q1-Q40'})</h4>
                            <span className="text-[11px] text-slate-500">
                              Auto Score: <strong>{autoReadingScore}/{objectiveQuestionCount}</strong> | Tutor Verified: <strong className="text-blue-700">{tutorReadingScore}/{objectiveQuestionCount}</strong> (Estimated Band {tutorReadingBand.toFixed(1)})
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            readingDiff === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}>
                            {readingDiff === 0 ? 'Sesuai' : `Beda: ${readingDiff > 0 ? '+' : ''}${readingDiff}`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-indigo-900 text-xs font-bold flex items-center justify-between">
                        <span>Mode cek tutor aktif. Selesaikan penilaian dulu untuk melihat pembanding AI.</span>
                        <span className="font-mono">Verified: {Object.keys(readingTutorChecks).length}/{objectiveQuestionCount}</span>
                      </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-[#e6eaf2] overflow-hidden max-h-96 overflow-y-auto">
                      <table className="w-full text-left border-collapse font-sans">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Q#</th>
                            <th className="py-2.5 px-3">Candidate Raw Answer</th>
                            {showComparison && <th className="py-2.5 px-3">Official Answer Key</th>}
                            {showComparison && <th className="py-2.5 px-3 text-center">Auto Result</th>}
                            <th className="py-2.5 px-3 text-center">Tutor Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {Array.from({ length: objectiveQuestionCount }).map((_, idx) => {
                            const qNum = idx + 1;
                            const candAns = selectedCandidate.answers.reading[qNum] || '';
                            const official = readingOfficialDisplayKeys[qNum] || '';
                            const autoIsCorrect = selectedCandidate.reading.correctAnswersList?.includes(qNum) || false;
                            const tutorIsCorrect = readingTutorChecks[qNum] ?? (showComparison ? autoIsCorrect : false);
                            const hasDiscrepancy = showComparison && autoIsCorrect !== tutorIsCorrect;

                            return (
                              <tr key={qNum} className={hasDiscrepancy ? 'bg-amber-50/70 font-bold border-l-4 border-amber-500' : 'hover:bg-slate-50/50'}>
                                <td className="py-2 px-3 font-mono font-bold text-slate-600">Q{qNum}</td>
                                <td className="py-2 px-3 font-mono text-slate-900">{candAns || <span className="text-slate-400 italic">(Blank)</span>}</td>
                                
                                {showComparison && (
                                  <td className="py-2 px-3 font-mono text-blue-700">{official}</td>
                                )}

                                {showComparison && (
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                      autoIsCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {autoIsCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                                    </span>
                                  </td>
                                )}

                                <td className="py-2 px-3 text-center">
                                  <div className="inline-flex items-center space-x-1">
                                    <button
                                      onClick={() => toggleReadingCheck(qNum, true)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        tutorIsCorrect === true
                                          ? 'bg-emerald-600 text-white shadow-sm'
                                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                      }`}
                                    >
                                      Correct ✓
                                    </button>

                                    <button
                                      onClick={() => toggleReadingCheck(qNum, false)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        tutorIsCorrect === false
                                          ? 'bg-rose-600 text-white shadow-sm'
                                          : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                      }`}
                                    >
                                      Incorrect ✗
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. LISTENING MANUAL CHECKING TABLE */}
                {manualSectionTab === 'listening' && (
                  <div className="space-y-3">
                    {showComparison ? (
                      <div className="bg-[#f8fbff] p-4 rounded-2xl border border-indigo-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                            <Headphones className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[#08245c]">Listening Manual QA ({selectedIsQa ? 'Q1-Q5' : 'Cambridge 18: Q1-Q40'})</h4>
                            <span className="text-[11px] text-slate-500">
                              Auto Score: <strong>{autoListeningScore}/{objectiveQuestionCount}</strong> | Tutor Verified: <strong className="text-indigo-700">{tutorListeningScore}/{objectiveQuestionCount}</strong> (Estimated Band {tutorListeningBand.toFixed(1)})
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            listeningDiff === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}>
                            {listeningDiff === 0 ? 'Sesuai' : `Beda: ${listeningDiff > 0 ? '+' : ''}${listeningDiff}`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-indigo-900 text-xs font-bold flex items-center justify-between">
                        <span>Mode cek tutor aktif. Kunci jawaban disembunyikan sementara.</span>
                        <span className="font-mono">Verified: {Object.keys(listeningTutorChecks).length}/{objectiveQuestionCount}</span>
                      </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-[#e6eaf2] overflow-hidden max-h-96 overflow-y-auto">
                      <table className="w-full text-left border-collapse font-sans">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Q#</th>
                            <th className="py-2.5 px-3">Candidate Raw Answer</th>
                            {showComparison && <th className="py-2.5 px-3">Official / Accepted Key(s)</th>}
                            {showComparison && <th className="py-2.5 px-3 text-center">Auto Result</th>}
                            <th className="py-2.5 px-3 text-center">Tutor Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {Array.from({ length: objectiveQuestionCount }).map((_, idx) => {
                            const qNum = idx + 1;
                            const candAns = selectedCandidate.answers.listening[qNum] || '';
                            const official = listeningOfficialDisplayKeys[qNum] || '';
                            const autoIsCorrect = selectedCandidate.listening.correctAnswersList?.includes(qNum) || false;
                            const tutorIsCorrect = listeningTutorChecks[qNum] ?? (showComparison ? autoIsCorrect : false);
                            const hasDiscrepancy = showComparison && autoIsCorrect !== tutorIsCorrect;

                            return (
                              <tr key={qNum} className={hasDiscrepancy ? 'bg-amber-50/70 font-bold border-l-4 border-amber-500' : 'hover:bg-slate-50/50'}>
                                <td className="py-2 px-3 font-mono font-bold text-slate-600">Q{qNum}</td>
                                <td className="py-2 px-3 font-mono text-slate-900">{candAns || <span className="text-slate-400 italic">(Blank)</span>}</td>
                                
                                {showComparison && (
                                  <td className="py-2 px-3 font-mono text-indigo-700">{official}</td>
                                )}

                                {showComparison && (
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                      autoIsCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {autoIsCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                                    </span>
                                  </td>
                                )}

                                <td className="py-2 px-3 text-center">
                                  <div className="inline-flex items-center space-x-1">
                                    <button
                                      onClick={() => toggleListeningCheck(qNum, true)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        tutorIsCorrect === true
                                          ? 'bg-emerald-600 text-white shadow-sm'
                                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                      }`}
                                    >
                                      Correct ✓
                                    </button>

                                    <button
                                      onClick={() => toggleListeningCheck(qNum, false)}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        tutorIsCorrect === false
                                          ? 'bg-rose-600 text-white shadow-sm'
                                          : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                      }`}
                                    >
                                      Incorrect ✗
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. WRITING MANUAL CHECKING & RUBRIC */}
                {manualSectionTab === 'writing' && (
                  <div className="space-y-4">
                    {showComparison && (
                      <div className="bg-[#f8fbff] p-4 rounded-2xl border border-blue-200 flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-[#08245c]">Writing Manual Rubric Grading</h4>
                          <p className="text-[11px] text-slate-500">
                            Status: <strong>{selectedCandidate.writing.assessmentStatus || "Not Evaluated"}</strong> | Estimated Tutor Band: <strong className="text-blue-700">{liveTutorWritingBand.toFixed(1)}</strong>
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-xl border border-blue-200">
                          Tutor Band: {liveTutorWritingBand.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Untruncated Responses & Grading Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Task 1 */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-extrabold text-[#08245c]">Task 1 Response (Metal Prices 2014)</span>
                          <span className="font-mono text-[11px] text-slate-500 font-bold">
                            {selectedCandidate.answers.writing.task1?.trim().split(/\s+/).filter(Boolean).length || 0} words
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                          {selectedCandidate.answers.writing.task1 || "No Task 1 response."}
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block">Task Achievement (TA)</label>
                            <select
                              value={tutorWritingScores.task1.ta}
                              onChange={e => setTutorWritingScores({ ...tutorWritingScores, task1: { ...tutorWritingScores.task1, ta: parseFloat(e.target.value) } })}
                              className="w-full mt-1 p-1.5 bg-[#f8fbff] border border-slate-200 rounded-lg font-bold"
                            >
                              {[0, 1, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(b => (
                                <option key={b} value={b}>Band {b.toFixed(1)}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block">Coherence (CC)</label>
                            <select
                              value={tutorWritingScores.task1.cc}
                              onChange={e => setTutorWritingScores({ ...tutorWritingScores, task1: { ...tutorWritingScores.task1, cc: parseFloat(e.target.value) } })}
                              className="w-full mt-1 p-1.5 bg-[#f8fbff] border border-slate-200 rounded-lg font-bold"
                            >
                              {[0, 1, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(b => (
                                <option key={b} value={b}>Band {b.toFixed(1)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Task 2 */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-extrabold text-[#08245c]">Task 2 Response (Ageing Population)</span>
                          <span className="font-mono text-[11px] text-slate-500 font-bold">
                            {selectedCandidate.answers.writing.task2?.trim().split(/\s+/).filter(Boolean).length || 0} words
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                          {selectedCandidate.answers.writing.task2 || "No Task 2 response."}
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block">Task Response (TR)</label>
                            <select
                              value={tutorWritingScores.task2.tr}
                              onChange={e => setTutorWritingScores({ ...tutorWritingScores, task2: { ...tutorWritingScores.task2, tr: parseFloat(e.target.value) } })}
                              className="w-full mt-1 p-1.5 bg-[#f8fbff] border border-slate-200 rounded-lg font-bold"
                            >
                              {[0, 1, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(b => (
                                <option key={b} value={b}>Band {b.toFixed(1)}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block">Coherence (CC)</label>
                            <select
                              value={tutorWritingScores.task2.cc}
                              onChange={e => setTutorWritingScores({ ...tutorWritingScores, task2: { ...tutorWritingScores.task2, cc: parseFloat(e.target.value) } })}
                              className="w-full mt-1 p-1.5 bg-[#f8fbff] border border-slate-200 rounded-lg font-bold"
                            >
                              {[0, 1, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(b => (
                                <option key={b} value={b}>Band {b.toFixed(1)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. SPEAKING MANUAL CHECKING & RECORDING REPLAY */}
                {manualSectionTab === 'speaking' && (
                  <div className="space-y-4">
                    {showComparison && (
                      <div className="bg-[#f8fbff] p-4 rounded-2xl border border-red-200 flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-[#08245c]">Speaking Recording Replay & Rubric</h4>
                          <p className="text-[11px] text-slate-500">
                            Status: <strong>{selectedCandidate.speaking.assessmentStatus || "Not Evaluated"}</strong> | Estimated Tutor Band: <strong className="text-red-600">{liveTutorSpeakingBand.toFixed(1)}</strong>
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold bg-red-50 text-red-700 px-3 py-1 rounded-xl border border-red-200">
                          Tutor Band: {liveTutorSpeakingBand.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Speaking Recording Players */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(selectedIsQa ? [
                        { label: 'Part 1 Q1', audioKey: 'part1_q1_audio', durationKey: 'part1_q1_duration' },
                        { label: 'Part 1 Q2', audioKey: 'part1_q2_audio', durationKey: 'part1_q2_duration' },
                        { label: 'Part 2', audioKey: 'part2_audio', durationKey: 'part2_duration' },
                        { label: 'Part 3 Q1', audioKey: 'part3_q1_audio', durationKey: 'part3_q1_duration' },
                        { label: 'Part 3 Q2', audioKey: 'part3_q2_audio', durationKey: 'part3_q2_duration' }
                      ] : [
                        { label: 'Speaking Part 1', audioKey: 'part1Audio', durationKey: 'part1Duration' },
                        { label: 'Speaking Part 2', audioKey: 'part2Audio', durationKey: 'part2Duration' },
                        { label: 'Speaking Part 3', audioKey: 'part3Audio', durationKey: 'part3Duration' }
                      ]).map((item) => {
                        const audioData = selectedCandidate.answers.speaking[item.audioKey as keyof typeof selectedCandidate.answers.speaking];
                        const duration = selectedCandidate.answers.speaking[item.durationKey as keyof typeof selectedCandidate.answers.speaking];
                        const isPlaying = playingAudioKey === `manual-${selectedCandidate.resultId}-${item.audioKey}`;

                        return (
                          <div key={item.audioKey} className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                            <span className="font-bold text-[#08245c] block text-xs">{item.label}</span>
                            {audioData ? (
                              <div className="space-y-2">
                                <button
                                  onClick={() => handleAudioPlay(`manual-${selectedCandidate.resultId}-${item.audioKey}`, String(audioData))}
                                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                                    isPlaying ? 'bg-red-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                  <span>{isPlaying ? 'Pause Audio' : 'Play Recording'}</span>
                                </button>
                                <span className="text-[10px] text-slate-400 block font-mono text-center">
                                  Object Storage (.webm){typeof duration === 'number' && duration > 0 ? ` | ${duration}s` : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs block py-2 text-center">No audio recorded</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Criteria Sliders */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Fluency & Coherence</label>
                        <select
                          value={tutorSpeakingScores.fc}
                          onChange={e => setTutorSpeakingScores({ ...tutorSpeakingScores, fc: parseFloat(e.target.value) })}
                          className="w-full mt-1 p-1.5 bg-[#f8fbff] border border-slate-200 rounded-lg font-bold"
                        >
                          {[4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(b => (
                            <option key={b} value={b}>Band {b.toFixed(1)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Lexical Resource</label>
                        <select
                          value={tutorSpeakingScores.lr}
                          onChange={e => setTutorSpeakingScores({ ...tutorSpeakingScores, lr: parseFloat(e.target.value) })}
                          className="w-full mt-1 p-1.5 bg-[#f8fbff] border border-slate-200 rounded-lg font-bold"
                        >
                          {[4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(b => (
                            <option key={b} value={b}>Band {b.toFixed(1)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Grammar Range</label>
                        <select
                          value={tutorSpeakingScores.gra}
                          onChange={e => setTutorSpeakingScores({ ...tutorSpeakingScores, gra: parseFloat(e.target.value) })}
                          className="w-full mt-1 p-1.5 bg-[#f8fbff] border border-slate-200 rounded-lg font-bold"
                        >
                          {[4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(b => (
                            <option key={b} value={b}>Band {b.toFixed(1)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">Pronunciation</label>
                        <select
                          value={tutorSpeakingScores.pro}
                          onChange={e => setTutorSpeakingScores({ ...tutorSpeakingScores, pro: parseFloat(e.target.value) })}
                          className="w-full mt-1 p-1.5 bg-[#f8fbff] border border-slate-200 rounded-lg font-bold"
                        >
                          {[4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(b => (
                            <option key={b} value={b}>Band {b.toFixed(1)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. OVERALL QA & SCORE APPROVAL */}
                {manualSectionTab === 'summary' && (
                  <div className="space-y-4">
                    <div className="bg-[#f8fbff] p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#08245c]">Auto / AI vs Tutor Score Comparison</span>
                        {needsManualReview && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Perlu dicek ulang</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block">Reading</span>
                          <strong className="text-blue-700">Auto: {selectedCandidate.reading.band}</strong>
                          <div className="text-slate-600 font-bold">Tutor: {tutorReadingBand.toFixed(1)}</div>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block">Listening</span>
                          <strong className="text-indigo-700">Auto: {selectedCandidate.listening.band}</strong>
                          <div className="text-slate-600 font-bold">Tutor: {tutorListeningBand.toFixed(1)}</div>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block">Writing</span>
                          <strong className="text-blue-700">AI: {typeof selectedCandidate.writing.band === 'number' ? selectedCandidate.writing.band.toFixed(1) : String(selectedCandidate.writing.band)}</strong>
                          <div className="text-slate-600 font-bold">Tutor: {liveTutorWritingBand.toFixed(1)}</div>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block">Speaking</span>
                          <strong className="text-red-600">AI: {typeof selectedCandidate.speaking.band === 'number' ? selectedCandidate.speaking.band.toFixed(1) : String(selectedCandidate.speaking.band)}</strong>
                          <div className="text-slate-600 font-bold">Tutor: {liveTutorSpeakingBand.toFixed(1)}</div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-blue-900 block">OVERALL</span>
                          <strong className="text-blue-700 text-sm">Tutor: Band {tutorOverallBand.toFixed(1)}</strong>
                          <div className="text-[10px] text-slate-500 font-bold">Beda: {overallBandDiff.toFixed(1)} Band</div>
                        </div>
                      </div>
                    </div>

                    {/* Evaluator Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Evaluator Name:</label>
                        <input
                          type="text"
                          value={evaluatorName}
                          onChange={e => setEvaluatorName(e.target.value)}
                          className="w-full mt-1 p-2 bg-[#f8fbff] border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Override / QA Reason:</label>
                        <input
                          type="text"
                          value={overrideReason}
                          onChange={e => setOverrideReason(e.target.value)}
                          placeholder="e.g. Verified spelling and clause complexity"
                          className="w-full mt-1 p-2 bg-[#f8fbff] border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom QA Action Bar */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => handleSaveManualVerification(false)}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    onClick={() => handleSaveManualVerification(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Submit & Lock Assessment</span>
                  </button>
                </div>

              </div>
            )}

            {/* TAB 4: EVALUATION & RUBRIC */}
            {activeModalTab === 'evaluation' && (
              <div className="space-y-5 animate-in fade-in duration-100 text-xs">
                
                {/* AI Score Action Bar */}
                <div className="bg-[#f8fbff] p-4 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-indigo-600" />
                      <span className="font-extrabold text-[#08245c]">Nilai AI</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {hasAiScores ? 'AI sudah memberi nilai untuk kandidat ini.' : 'AI belum punya nilai untuk kandidat ini. Klik tombol di kanan untuk menilai sekarang.'}
                    </p>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${
                      hasAiScores
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {hasAiScores ? 'AI sudah menilai' : 'Belum dinilai AI'}
                    </span>
                    <button
                      onClick={handleTriggerAIEvaluation}
                      disabled={isEvaluatingAI}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isEvaluatingAI ? 'animate-spin' : ''}`} />
                      <span>{isEvaluatingAI ? 'Sedang menilai...' : hasAiScores ? 'Nilai Ulang dengan AI' : 'Nilai dengan AI'}</span>
                    </button>
                  </div>
                </div>

                {aiStatusMessage && (
                  <div className={`p-3 rounded-xl font-bold text-xs ${
                    aiStatusMessage.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {aiStatusMessage}
                  </div>
                )}

                {!showComparison ? (
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 text-indigo-900 font-bold">
                    Nilai AI disembunyikan dulu sampai tutor selesai submit penilaian.
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WRITING BREAKDOWN */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-extrabold text-[#08245c] flex items-center space-x-1.5">
                        <PenTool className="w-4 h-4 text-blue-600" />
                        <span>Writing</span>
                      </span>
                      <span className="font-mono text-blue-700 font-bold">
                        {hasAiWritingScore
                          ? (typeof selectedCandidate.writing.band === 'number' ? `Band ${selectedCandidate.writing.band.toFixed(1)}` : String(selectedCandidate.writing.band))
                          : 'Belum dinilai'}
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="bg-[#f8fbff] p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-slate-800 block mb-1">Task 1</strong>
                        <div className="grid grid-cols-4 gap-1 text-center font-mono">
                          <div className="bg-white p-1 rounded border">TA: {selectedCandidate.writing.writingDetail?.task1.criterion1.score || '-'}</div>
                          <div className="bg-white p-1 rounded border">CC: {selectedCandidate.writing.writingDetail?.task1.cc.score || '-'}</div>
                          <div className="bg-white p-1 rounded border">LR: {selectedCandidate.writing.writingDetail?.task1.lr.score || '-'}</div>
                          <div className="bg-white p-1 rounded border">GRA: {selectedCandidate.writing.writingDetail?.task1.gra.score || '-'}</div>
                        </div>
                      </div>

                      <div className="bg-[#f8fbff] p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-slate-800 block mb-1">Task 2</strong>
                        <div className="grid grid-cols-4 gap-1 text-center font-mono">
                          <div className="bg-white p-1 rounded border">TR: {selectedCandidate.writing.writingDetail?.task2.criterion1.score || '-'}</div>
                          <div className="bg-white p-1 rounded border">CC: {selectedCandidate.writing.writingDetail?.task2.cc.score || '-'}</div>
                          <div className="bg-white p-1 rounded border">LR: {selectedCandidate.writing.writingDetail?.task2.lr.score || '-'}</div>
                          <div className="bg-white p-1 rounded border">GRA: {selectedCandidate.writing.writingDetail?.task2.gra.score || '-'}</div>
                        </div>
                      </div>

                      <div className="text-slate-500">
                        Nilai akhir writing mengikuti bobot Task 2 yang lebih besar.
                      </div>
                    </div>
                  </div>

                  {/* SPEAKING BREAKDOWN */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-extrabold text-[#08245c] flex items-center space-x-1.5">
                        <Mic className="w-4 h-4 text-red-600" />
                        <span>Speaking</span>
                      </span>
                      <span className="font-mono text-red-600 font-bold">
                        {hasAiSpeakingScore
                          ? (typeof selectedCandidate.speaking.band === 'number' ? `Band ${selectedCandidate.speaking.band.toFixed(1)}` : String(selectedCandidate.speaking.band))
                          : 'Belum dinilai'}
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="bg-[#f8fbff] p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-slate-800 block mb-1">Detail nilai</strong>
                        <div className="grid grid-cols-4 gap-1 text-center font-mono">
                          <div className="bg-white p-1 rounded border">FC: {selectedCandidate.speaking.speakingDetail?.fc.score || '-'}</div>
                          <div className="bg-white p-1 rounded border">LR: {selectedCandidate.speaking.speakingDetail?.lr.score || '-'}</div>
                          <div className="bg-white p-1 rounded border">GRA: {selectedCandidate.speaking.speakingDetail?.gra.score || '-'}</div>
                          <div className="bg-white p-1 rounded border">PRO: {selectedCandidate.speaking.speakingDetail?.pro.score || '-'}</div>
                        </div>
                      </div>

                      {selectedCandidate.speaking.speakingDetail?.pro.score === 0 && (
                        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                          Pronunciation perlu dicek tutor dari rekaman.
                        </div>
                      )}

                      <div className="text-slate-500">
                        Nilai speaking diambil dari rata-rata empat aspek.
                      </div>
                    </div>
                  </div>
                </div>
                )}

              </div>
            )}

            {/* TAB 5: PDF REPORTS */}
            {activeModalTab === 'reports' && (
              <div className="space-y-4 animate-in fade-in duration-100 text-xs">
                <p className="text-slate-500">
                  Unduh laporan diagnostik terpisah untuk setiap bagian IELTS (Cambridge 17/18 Official).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#f8fbff] p-4 rounded-2xl border border-[#e6eaf2] flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-[#08245c]">Reading Diagnostic PDF</h4>
                      <p className="text-slate-400 text-[11px]">Cambridge 17 Test 4 Analysis</p>
                    </div>
                    <button
                      onClick={() => downloadReadingPDF(selectedCandidate)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center space-x-1 shadow-sm"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>

                  <div className="bg-[#f8fbff] p-4 rounded-2xl border border-[#e6eaf2] flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-[#08245c]">Listening Diagnostic PDF</h4>
                      <p className="text-slate-400 text-[11px]">Cambridge 18 Test 4 Analysis</p>
                    </div>
                    <button
                      onClick={() => downloadListeningPDF(selectedCandidate)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center space-x-1 shadow-sm"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>

                  <div className="bg-[#f8fbff] p-4 rounded-2xl border border-[#e6eaf2] flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-[#08245c]">Writing Diagnostic PDF</h4>
                      <p className="text-slate-400 text-[11px]">Task 1 & Task 2 Descriptors</p>
                    </div>
                    <button
                      onClick={() => downloadWritingPDF(selectedCandidate)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center space-x-1 shadow-sm"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>

                  <div className="bg-[#f8fbff] p-4 rounded-2xl border border-[#e6eaf2] flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-[#08245c]">Speaking Diagnostic PDF</h4>
                      <p className="text-slate-400 text-[11px]">FC, LR, GRA, PRO Breakdown</p>
                    </div>
                    <button
                      onClick={() => downloadSpeakingPDF(selectedCandidate)}
                      className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-3.5 py-2 rounded-xl flex items-center space-x-1 shadow-sm"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => downloadComprehensivePDF(selectedCandidate)}
                    className="w-full py-3 rounded-xl bg-[#08245c] hover:bg-[#061634] text-white font-extrabold transition-all flex items-center justify-center space-x-2 shadow-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Download Full 4-Skills Diagnostic Summary PDF</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: WHATSAPP FOLLOW UP */}
            {activeModalTab === 'followup' && (
              <div className="space-y-4 animate-in fade-in duration-100 text-xs">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {followUpSections.map(section => (
                    <button
                      key={section.key}
                      onClick={() => setActiveFollowUpKey(section.key)}
                      className={`rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                        activeFollowUpKey === section.key
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50'
                      }`}
                    >
                      {section.key === 'overall' ? 'Overall' : section.key.charAt(0).toUpperCase() + section.key.slice(1)}
                    </button>
                  ))}
                </div>

                {(() => {
                  const IconComp = activeFollowUp.icon;
                  const msg = customMessages[activeFollowUp.key] || '';
                  return (
                    <div className="rounded-2xl border border-[#e6eaf2] bg-[#f8fbff] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-extrabold text-[#08245c]">
                          <IconComp className="h-4 w-4" />
                          {activeFollowUp.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyMessage(activeFollowUp.key, msg)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-800"
                          >
                            {copiedKey === activeFollowUp.key ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedKey === activeFollowUp.key ? 'Tersalin' : 'Salin'}
                          </button>
                          <button
                            onClick={() => handleSendWhatsApp(msg)}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Kirim via WhatsApp
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={8}
                        value={msg}
                        onChange={e => setCustomMessages({ ...customMessages, [activeFollowUp.key]: e.target.value })}
                        className="w-full rounded-xl border border-[#e6eaf2] bg-white p-3 font-mono text-[11px] text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex justify-end items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  if (confirm(`Hapus data kandidat ${selectedCandidate.user.fullName}?`)) {
                    deleteSubmission(selectedCandidate.resultId);
                    handleCloseModal();
                  }
                }}
                className="hidden text-xs text-red-500 hover:text-red-700 font-semibold items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Candidate Record</span>
              </button>

              <button
                onClick={handleCloseModal}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl"
              >
                Tutup
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
