import React, { useMemo, useState } from 'react';
import {
  UserProfile,
  UserAnswers,
  ManualVerificationRecord,
  ObjectiveManualCheckItem,
  TestEvaluation
} from '../types/ielts';
import { cambridgeOfficialTest } from '../data/cambridgeTestBank';
import { audioStorage } from '../services/audioStorage';
import { dbService, DBCandidateData } from '../services/db';
import { saveStoredEvaluatorStaffToken } from '../services/aiEvaluator';
import {
  evaluateSpeakingWithRubric,
  evaluateWritingWithRubric,
  roundToNearestHalfBand
} from '../utils/subjectiveAssessment';
import { generateEvaluation } from '../utils/scoring';
import { rawScoreToEstimatedBand } from '../utils/scoringEngine';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  Lock,
  Mic,
  PenTool,
  Play,
  Save,
  Search,
  ShieldCheck
} from 'lucide-react';

type TutorTab = 'info' | 'writing' | 'speaking' | 'objective';
type TutorSectionKey = 'reading' | 'listening' | 'writing' | 'speaking';
type WritingScores = {
  task1: { ta: number; cc: number; lr: number; gra: number };
  task2: { tr: number; cc: number; lr: number; gra: number };
};
type SpeakingScores = { fc: number; lr: number; gra: number; pro: number };

const scoreOptions = Array.from({ length: 9 }, (_, index) => index + 1);
const writingSection = cambridgeOfficialTest.sections.find(section => section.section_type === 'writing');
const speakingSection = cambridgeOfficialTest.sections.find(section => section.section_type === 'speaking');

function wordCount(text = '') {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function bandText(value: number | string | undefined) {
  if (typeof value === 'number') return value >= 1 ? `Band ${value.toFixed(1)}` : 'AI belum menilai';
  if (!value) return '-';
  if (String(value).toUpperCase().includes('AWAITING') || String(value).toUpperCase().includes('NOT EVALUATED')) {
    return 'AI belum menilai';
  }
  return String(value);
}

function tutorBandValue(candidate: TestEvaluation, section: 'writing' | 'speaking') {
  const value = candidate.manualChecks?.[section]?.tutorBand;
  return typeof value === 'number' ? value.toFixed(1) : '-';
}

function tutorOverallValue(candidate: TestEvaluation) {
  const value = candidate.manualChecks?.tutorOverallBand;
  return typeof value === 'number' ? value.toFixed(1) : '-';
}

function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function partText(content: unknown, fallback = '') {
  if (Array.isArray(content)) return content.join('\n');
  if (typeof content === 'string') return content;
  return fallback;
}

function objectiveQuestionText(section: 'reading' | 'listening', questionNumber: number) {
  const targetSection = cambridgeOfficialTest.sections.find(item => item.section_type === section);
  const question = targetSection?.parts
    .flatMap(part => part.questions || [])
    .find(item => item.question_number === questionNumber);
  return question?.prompt || `Question ${questionNumber}`;
}

function objectiveQuestionOption(section: 'reading' | 'listening', questionNumber: number, answer?: string) {
  if (!answer) return '';
  const targetSection = cambridgeOfficialTest.sections.find(item => item.section_type === section);
  const question = targetSection?.parts
    .flatMap(part => part.questions || [])
    .find(item => item.question_number === questionNumber);
  const option = question?.options?.find(item => item.label.toUpperCase() === answer.toUpperCase());
  return option ? `${option.label} - ${option.text}` : answer;
}

function AnswerBadge({ value }: { value?: string }) {
  const clean = (value || '-').trim();
  const isTfng = ['TRUE', 'FALSE', 'NOT GIVEN'].includes(clean.toUpperCase());
  return (
    <span className={`inline-flex max-w-full items-center rounded-lg px-2.5 py-1 text-sm font-extrabold ${
      isTfng ? 'border border-blue-200 bg-blue-50 text-blue-800' : 'bg-white text-slate-800'
    }`}>
      {clean || '-'}
    </span>
  );
}

function sectionStatus(candidate: TestEvaluation, section: TutorSectionKey) {
  const status = candidate.manualChecks?.sectionStatuses?.[section]?.status;
  if (status) return status;
  if (candidate.manualChecks?.isApproved && candidate.manualChecks?.[section as 'writing' | 'speaking' | 'reading' | 'listening']?.tutorBand) {
    return 'SUBMITTED';
  }
  return candidate.manualChecks?.[section as 'writing' | 'speaking' | 'reading' | 'listening'] ? 'DRAFT' : 'NOT STARTED';
}

function sectionCompleted(candidate: TestEvaluation, section: TutorSectionKey) {
  return sectionStatus(candidate, section) === 'SUBMITTED';
}

function candidateCompleted(candidate: TestEvaluation) {
  const required: TutorSectionKey[] = (candidate.isQa || candidate.is_qa)
    ? ['reading', 'listening', 'writing', 'speaking']
    : ['writing', 'speaking'];
  return required.every(section => sectionCompleted(candidate, section));
}

function isTechnicalQaSeed(candidate: TestEvaluation) {
  const speaking = candidate.answers?.speaking || {};
  const transcript = [
    speaking.part1Transcript,
    speaking.part2Transcript,
    speaking.part3Transcript
  ].filter(Boolean).join(' ');
  return /^Candidate QA-0[123]$/i.test(candidate.user?.fullName || '') || /QA transcript candidate/i.test(transcript);
}

function QaSampleBadge({ candidate }: { candidate: TestEvaluation }) {
  return isTechnicalQaSeed(candidate) ? (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
      Dummy Audio Sample
    </span>
  ) : /QA/i.test(candidate.user?.fullName || '') ? (
    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
      QA Candidate
    </span>
  ) : null;
}

function defaultWritingScores(candidate?: TestEvaluation): WritingScores {
  return candidate?.manualChecks?.writing
    ? {
        task1: candidate.manualChecks.writing.task1,
        task2: candidate.manualChecks.writing.task2
      }
    : {
        task1: { ta: 6, cc: 6, lr: 6, gra: 6 },
        task2: { tr: 6, cc: 6, lr: 6, gra: 6 }
      };
}

function defaultSpeakingScores(candidate?: TestEvaluation): SpeakingScores {
  return candidate?.manualChecks?.speaking
    ? {
        fc: candidate.manualChecks.speaking.fc,
        lr: candidate.manualChecks.speaking.lr,
        gra: candidate.manualChecks.speaking.gra,
        pro: candidate.manualChecks.speaking.pro
      }
    : { fc: 6, lr: 6, gra: 6, pro: 6 };
}

function makeObjectiveChecks(candidate: TestEvaluation, section: 'reading' | 'listening') {
  const checks: Record<number, boolean> = {};
  const existing = candidate.manualChecks?.[section]?.checks || {};
  const raw = candidate.rawResponses?.[section] || {};
  const totalQuestions = (candidate.isQa || candidate.is_qa) ? 5 : 40;
  for (let q = 1; q <= totalQuestions; q += 1) {
    checks[q] = existing[q]?.tutorIsCorrect ?? raw[q]?.auto_is_correct ?? false;
  }
  return checks;
}

function selectInput(value: number, onChange: (value: number) => void, locked: boolean) {
  return (
    <select
      value={value}
      disabled={locked}
      onChange={event => onChange(Number(event.target.value))}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 disabled:bg-slate-100"
    >
      {scoreOptions.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

function StatusPill({ status }: { status: string }) {
  return status === 'SUBMITTED' ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      SUBMITTED
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
      {status}
    </span>
  );
}

function candidateDataToEvaluation(candData: DBCandidateData): TestEvaluation {
  const profile: UserProfile = {
    candidateId: candData.candidate.candidate_id,
    fullName: candData.candidate.name,
    whatsapp: candData.candidate.whatsapp,
    age: candData.candidate.age,
    currentStatus: candData.candidate.current_status,
    targetScore: candData.candidate.target_band,
    resultId: candData.candidate.result_id,
    accessCode: candData.candidate.raw_access_code,
    registeredAt: candData.candidate.created_at
  };
  if (candData.evaluation) {
    const existingAnswers = candData.evaluation.answers || {};
    return {
      ...candData.evaluation,
      resultId: candData.evaluation.resultId || candData.candidate.result_id,
      user: {
        ...profile,
        ...(candData.evaluation.user || {})
      },
      answers: {
        reading: existingAnswers.reading || {},
        listening: existingAnswers.listening || {},
        readingFlagged: existingAnswers.readingFlagged || [],
        listeningFlagged: existingAnswers.listeningFlagged || [],
        writing: existingAnswers.writing || { task1: '', task2: '' },
        speaking: existingAnswers.speaking || {}
      }
    };
  }
  const answers: UserAnswers = {
    reading: candData.answers.reading || {},
    listening: candData.answers.listening || {},
    readingFlagged: candData.answers.reading_flagged || [],
    listeningFlagged: candData.answers.listening_flagged || [],
    writing: {
      task1: candData.answers.writing.task1 || '',
      task2: candData.answers.writing.task2 || ''
    },
    speaking: candData.answers.speaking || {}
  };
  return generateEvaluation(profile, answers);
}

export const TutorDashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<TestEvaluation[]>([]);
  const [token, setToken] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TestEvaluation | null>(null);
  const [activeTab, setActiveTab] = useState<TutorTab>('info');
  const [writingScores, setWritingScores] = useState<WritingScores>(defaultWritingScores());
  const [speakingScores, setSpeakingScores] = useState<SpeakingScores>(defaultSpeakingScores());
  const [readingChecks, setReadingChecks] = useState<Record<number, boolean>>({});
  const [listeningChecks, setListeningChecks] = useState<Record<number, boolean>>({});
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return submissions.filter(candidate => {
      if (!term) return true;
      return (
        candidate.user.fullName.toLowerCase().includes(term) ||
        candidate.user.whatsapp.toLowerCase().includes(term) ||
        candidate.resultId.toLowerCase().includes(term)
      );
    });
  }, [submissions, search]);

  const pendingCount = submissions.filter(candidate => !candidateCompleted(candidate)).length;
  const completedCount = submissions.length - pendingCount;
  const writingRaw = (writingScores.task1.ta + writingScores.task1.cc + writingScores.task1.lr + writingScores.task1.gra) / 4;
  const task2Raw = (writingScores.task2.tr + writingScores.task2.cc + writingScores.task2.lr + writingScores.task2.gra) / 4;
  const tutorWritingBand = roundToNearestHalfBand((writingRaw + 2 * task2Raw) / 3);
  const tutorSpeakingBand = roundToNearestHalfBand((speakingScores.fc + speakingScores.lr + speakingScores.gra + speakingScores.pro) / 4);

  const refreshTutorSubmissions = async () => {
    const all = await dbService.getTutorCandidates();
    setSubmissions(Object.values(all).map(candidateDataToEvaluation));
  };

  const openCandidate = (candidate: TestEvaluation) => {
    setSelected(candidate);
    setActiveTab('info');
    setWritingScores(defaultWritingScores(candidate));
    setSpeakingScores(defaultSpeakingScores(candidate));
    setReadingChecks(makeObjectiveChecks(candidate, 'reading'));
    setListeningChecks(makeObjectiveChecks(candidate, 'listening'));
    setPlayingKey(null);
  };

  const handleUnlock = async () => {
    try {
      await saveStoredEvaluatorStaffToken(token);
      await refreshTutorSubmissions();
      setIsUnlocked(true);
      setToken('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Tutor access token was rejected.');
    }
  };

  const playAudio = async (key: string, path?: string) => {
    if (!path) return;
    if (playingKey === key) {
      setPlayingKey(null);
      return;
    }
    const url = await audioStorage.getAudio(path);
    if (!url) return;
    setPlayingKey(key);
    const audio = new Audio(url);
    audio.onended = () => setPlayingKey(null);
    audio.play();
  };

  const persistAssessment = async (section: TutorSectionKey, submitAndLock: boolean) => {
    if (!selected) return;
    if (submitAndLock && !window.confirm('Submit assessment section ini? Setelah submit, section ini terkunci untuk blind calibration.')) {
      return;
    }

    const writingResult = evaluateWritingWithRubric(selected.answers.writing, writingScores);
    const speakingResult = evaluateSpeakingWithRubric(selected.answers.speaking, speakingScores);
    const readingScore = Object.values(readingChecks).filter(Boolean).length;
    const listeningScore = Object.values(listeningChecks).filter(Boolean).length;
    const objectiveTotal = (selected.isQa || selected.is_qa) ? 5 : 40;
    const readingBand = rawScoreToEstimatedBand(readingScore, objectiveTotal, 'reading');
    const listeningBand = rawScoreToEstimatedBand(listeningScore, objectiveTotal, 'listening');
    const overallBand = roundToNearestHalfBand((readingBand + listeningBand + tutorWritingBand + tutorSpeakingBand) / 4);

    const makeChecks = (section: 'reading' | 'listening', checks: Record<number, boolean>) => {
      const raw = selected.rawResponses?.[section] || {};
      const rows: Record<number, ObjectiveManualCheckItem> = {};
      for (let q = 1; q <= objectiveTotal; q += 1) {
        rows[q] = {
          questionNumber: q,
          candidateAnswer: raw[q]?.candidate_answer || selected.answers[section]?.[q] || '',
          officialAnswer: raw[q]?.official_answer || '',
          autoIsCorrect: raw[q]?.auto_is_correct || false,
          tutorIsCorrect: Boolean(checks[q])
        };
      }
      return rows;
    };

    const readingManual = makeChecks('reading', readingChecks);
    const listeningManual = makeChecks('listening', listeningChecks);
    const readingAuto = selected.reading.rawScore || 0;
    const listeningAuto = selected.listening.rawScore || 0;
    const previousStatuses = selected.manualChecks?.sectionStatuses || {};
    const currentRevision = previousStatuses[section]?.revision || 0;
    const nextRevision = previousStatuses[section]?.status === 'REOPENED' ? currentRevision + 1 : Math.max(1, currentRevision || 1);
    const savedAt = new Date().toISOString();
    const nextStatuses = {
      ...previousStatuses,
      [section]: {
        status: submitAndLock ? 'SUBMITTED' : 'DRAFT',
        revision: nextRevision,
        submittedAt: submitAndLock ? savedAt : previousStatuses[section]?.submittedAt,
        edited_after_ai_reveal: Boolean(previousStatuses[section]?.edited_after_ai_reveal)
      }
    } as ManualVerificationRecord['sectionStatuses'];
    const requiredSections: TutorSectionKey[] = (selected.isQa || selected.is_qa)
      ? ['reading', 'listening', 'writing', 'speaking']
      : ['writing', 'speaking'];
    const isFullyApproved = requiredSections.every(item => (
      item === section ? submitAndLock : previousStatuses[item]?.status === 'SUBMITTED'
    ));

    const manualRecord: ManualVerificationRecord = {
      reading: {
        checks: readingManual,
        autoScore: readingAuto,
        tutorScore: readingScore,
        difference: Math.abs(readingAuto - readingScore),
        matchCount: Object.values(readingManual).filter(row => row.autoIsCorrect === row.tutorIsCorrect).length,
        matchPercentage: Math.round((Object.values(readingManual).filter(row => row.autoIsCorrect === row.tutorIsCorrect).length / objectiveTotal) * 100),
        tutorBand: readingBand
      },
      listening: {
        checks: listeningManual,
        autoScore: listeningAuto,
        tutorScore: listeningScore,
        difference: Math.abs(listeningAuto - listeningScore),
        matchCount: Object.values(listeningManual).filter(row => row.autoIsCorrect === row.tutorIsCorrect).length,
        matchPercentage: Math.round((Object.values(listeningManual).filter(row => row.autoIsCorrect === row.tutorIsCorrect).length / objectiveTotal) * 100),
        tutorBand: listeningBand
      },
      writing: { ...writingScores, tutorBand: tutorWritingBand },
      speaking: { ...speakingScores, tutorBand: tutorSpeakingBand },
      tutorOverallBand: overallBand,
      evaluatorName: 'IELTS Tutor',
      checkedAt: savedAt,
      isApproved: isFullyApproved,
      overrideReason: submitAndLock ? `Tutor submitted ${section} assessment.` : `Tutor saved ${section} draft.`,
      sectionStatuses: nextStatuses,
      sectionRevisions: {
        ...(selected.manualChecks?.sectionRevisions || {}),
        [section]: [
          ...(selected.manualChecks?.sectionRevisions?.[section] || []),
          {
            revision: nextRevision,
            status: submitAndLock ? 'SUBMITTED' : 'DRAFT',
            savedAt,
            edited_after_ai_reveal: Boolean(nextStatuses?.[section]?.edited_after_ai_reveal),
            snapshot: section === 'writing'
              ? writingScores
              : section === 'speaking'
                ? speakingScores
                : section === 'reading'
                  ? readingChecks
                  : listeningChecks
          }
        ]
      }
    };

    const updatedComparison = {
      aiAssessment: selected.dualComparison?.aiAssessment,
      tutorAssessment: {
        readingBand,
        listeningBand,
        writingBand: tutorWritingBand,
        speakingBand: tutorSpeakingBand,
        overallBand,
        writingDetail: writingResult.detail,
        speakingDetail: speakingResult.detail
      },
      activeMode: 'TUTOR' as const,
      needsManualReview: !isFullyApproved,
      bandDifference: typeof selected.dualComparison?.aiAssessment?.overallBand === 'number'
        ? Math.abs(selected.dualComparison.aiAssessment.overallBand - overallBand)
        : undefined
    };

    const auditEntry = {
      rubric_version: 'IELTS-Cambridge-Descriptors-2026.1',
      evaluation_mode: 'TUTOR' as const,
      evaluator: 'IELTS Tutor',
      evaluation_timestamp: new Date().toISOString(),
      criterion_scores: {
        Writing_T1_TA: writingScores.task1.ta,
        Writing_T1_CC: writingScores.task1.cc,
        Writing_T1_LR: writingScores.task1.lr,
        Writing_T1_GRA: writingScores.task1.gra,
        Writing_T2_TR: writingScores.task2.tr,
        Writing_T2_CC: writingScores.task2.cc,
        Writing_T2_LR: writingScores.task2.lr,
        Writing_T2_GRA: writingScores.task2.gra,
        Speaking_FC: speakingScores.fc,
        Speaking_LR: speakingScores.lr,
        Speaking_GRA: speakingScores.gra,
        Speaking_PRO: speakingScores.pro
      },
      evidence: { speaking: { positive: [], limiting: [] }, writing: { positive: [], limiting: [] } },
      final_band: overallBand,
      manual_override: submitAndLock,
      override_reason: submitAndLock ? `Tutor submitted ${section} assessment.` : `Tutor saved ${section} draft.`
    };

    const updated: Partial<TestEvaluation> = {
      overallBand: isFullyApproved ? overallBand : selected.overallBand,
      writing: section === 'writing' && submitAndLock ? writingResult.report : selected.writing,
      speaking: section === 'speaking' && submitAndLock ? speakingResult.report : selected.speaking,
      status: isFullyApproved ? 'Evaluated' : selected.status,
      manualChecks: manualRecord,
      dualComparison: updatedComparison,
      auditTrail: [...(selected.auditTrail || []), auditEntry]
    };

    try {
      const persisted = await dbService.saveTutorAssessment(selected.resultId, updated);
      setSubmissions(prev => prev.map(candidate => (
        candidate.resultId === selected.resultId ? persisted : candidate
      )));
      setSelected(persisted);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Tutor assessment could not be saved.');
    }
  };

  const reopenSection = async (section: TutorSectionKey) => {
    if (!selected) return;
    if (!window.confirm('Buka kembali assessment section ini untuk revisi? Revisi baru akan dibuat dan hasil lama tetap disimpan.')) return;
    const previous = selected.manualChecks;
    if (!previous) return;
    const status = previous.sectionStatuses?.[section];
    const updated: Partial<TestEvaluation> = {
      manualChecks: {
        ...previous,
        isApproved: false,
        sectionStatuses: {
          ...(previous.sectionStatuses || {}),
          [section]: {
            status: 'REOPENED',
            revision: status?.revision || 1,
            submittedAt: status?.submittedAt,
            reopenedAt: new Date().toISOString(),
            edited_after_ai_reveal: true
          }
        }
      }
    };
    try {
      const persisted = await dbService.saveTutorAssessment(selected.resultId, updated);
      setSubmissions(prev => prev.map(candidate => candidate.resultId === selected.resultId ? persisted : candidate));
      setSelected(persisted);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Section could not be reopened.');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-[#e6eaf2] bg-white p-7 shadow-soft">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#08245c]">IELTS Tutor Assessment Portal</h1>
              <p className="text-xs font-medium text-slate-500">Review candidate responses and submit verified IELTS diagnostic assessments.</p>
            </div>
          </div>
          <label className="mb-1 block text-xs font-bold text-slate-700">Tutor Access Token</label>
          <input
            type="password"
            value={token}
            onChange={event => setToken(event.target.value)}
            className="mb-3 w-full rounded-xl border border-slate-200 bg-[#f8fbff] px-3 py-2 text-sm"
            placeholder="Enter secure access token"
          />
          <button
            onClick={handleUnlock}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Open Tutor Workspace
          </button>
        </div>
      </div>
    );
  }

  if (selected) {
    const sectionLock = (section: TutorSectionKey) => sectionCompleted(selected, section);
    const tabs: Array<{ key: TutorTab; label: string; icon: React.ElementType }> = [
      { key: 'info', label: 'Candidate Info', icon: ClipboardCheck },
      { key: 'writing', label: 'Writing Assessment', icon: PenTool },
      { key: 'speaking', label: 'Speaking Assessment', icon: Mic },
      { key: 'objective', label: 'Reading / Listening QA', icon: BookOpen }
    ];

    return (
      <div className="mx-auto max-w-6xl px-4 py-6 pb-12 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#e6eaf2] bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <button onClick={() => setSelected(null)} className="mb-3 flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-700">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to candidates
            </button>
            <h1 className="text-xl font-extrabold text-[#08245c] sm:text-2xl">{selected.user.fullName}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-500">{selected.resultId} · {selected.user.whatsapp}</p>
              <QaSampleBadge candidate={selected} />
            </div>
          </div>
          {candidateCompleted(selected) && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
              <Lock className="h-4 w-4" />
              Assessment Submitted ✓
            </div>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all sm:justify-start ${
                  activeTab === tab.key ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-blue-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'info' && (
          <div className="grid gap-4 rounded-3xl border border-[#e6eaf2] bg-white p-6 shadow-soft sm:grid-cols-2">
            <Info label="Candidate Name" value={selected.user.fullName} />
            <Info label="WhatsApp" value={selected.user.whatsapp} />
            <Info label="Result ID" value={selected.resultId} />
            <Info label="Date Completed" value={new Date(selected.completedAt).toLocaleString()} />
            <Info label="Reading Status" value={sectionStatus(selected, 'reading')} />
            <Info label="Listening Status" value={sectionStatus(selected, 'listening')} />
            <Info label="Writing Status" value={sectionStatus(selected, 'writing')} />
            <Info label="Speaking Status" value={sectionStatus(selected, 'speaking')} />
            <Info label="Tutor Writing Band" value={tutorBandValue(selected, 'writing')} />
            <Info label="Tutor Speaking Band" value={tutorBandValue(selected, 'speaking')} />
            <Info label="Tutor Overall Band" value={tutorOverallValue(selected)} />
          </div>
        )}

        {activeTab === 'writing' && (
          <div className="space-y-5">
            <SectionStatusBanner status={sectionStatus(selected, 'writing')} />
            {selected.manualChecks?.sectionStatuses?.writing?.edited_after_ai_reveal && <BlindCalibrationNotice />}
            <WritingTaskCard
              title="TASK 1"
              prompt={String(writingSection?.parts[0]?.content || '')}
              chart
              response={selected.answers.writing.task1}
              scores={[
                ['Task Achievement', writingScores.task1.ta, value => setWritingScores(prev => ({ ...prev, task1: { ...prev.task1, ta: value } }))],
                ['Coherence & Cohesion', writingScores.task1.cc, value => setWritingScores(prev => ({ ...prev, task1: { ...prev.task1, cc: value } }))],
                ['Lexical Resource', writingScores.task1.lr, value => setWritingScores(prev => ({ ...prev, task1: { ...prev.task1, lr: value } }))],
                ['Grammatical Range & Accuracy', writingScores.task1.gra, value => setWritingScores(prev => ({ ...prev, task1: { ...prev.task1, gra: value } }))]
              ]}
              locked={sectionLock('writing')}
            />
            <WritingTaskCard
              title="TASK 2"
              prompt={String(writingSection?.parts[1]?.content || '')}
              response={selected.answers.writing.task2}
              scores={[
                ['Task Response', writingScores.task2.tr, value => setWritingScores(prev => ({ ...prev, task2: { ...prev.task2, tr: value } }))],
                ['Coherence & Cohesion', writingScores.task2.cc, value => setWritingScores(prev => ({ ...prev, task2: { ...prev.task2, cc: value } }))],
                ['Lexical Resource', writingScores.task2.lr, value => setWritingScores(prev => ({ ...prev, task2: { ...prev.task2, lr: value } }))],
                ['Grammatical Range & Accuracy', writingScores.task2.gra, value => setWritingScores(prev => ({ ...prev, task2: { ...prev.task2, gra: value } }))]
              ]}
              locked={sectionLock('writing')}
            />
            <BandSummary label="Tutor Writing Band" value={tutorWritingBand} />
            {sectionLock('writing') && <Comparison candidate={selected} section="writing" />}
            <SectionActions
              saveLabel="Save Writing Draft"
              submitLabel="Submit Writing Assessment"
              completed={sectionLock('writing')}
              onSave={() => persistAssessment('writing', false)}
              onSubmit={() => persistAssessment('writing', true)}
              onEdit={() => reopenSection('writing')}
            />
          </div>
        )}

        {activeTab === 'speaking' && (
          <div className="space-y-5">
            <SectionStatusBanner status={sectionStatus(selected, 'speaking')} />
            {selected.manualChecks?.sectionStatuses?.speaking?.edited_after_ai_reveal && <BlindCalibrationNotice />}
            {speakingReviewItems(selected).map(item => {
              const audio = selected.answers.speaking[item.audioKey as keyof typeof selected.answers.speaking] as string | undefined;
              const duration = selected.answers.speaking[item.durationKey as keyof typeof selected.answers.speaking] as number | undefined;
              const transcript = selected.answers.speaking[item.transcriptKey as keyof typeof selected.answers.speaking] as string | undefined;
              const fileSize = selected.answers.speaking[item.fileSizeKey as keyof typeof selected.answers.speaking] as number | undefined;
              return (
                <div key={item.key} className="rounded-3xl border border-[#e6eaf2] bg-white p-4 shadow-soft sm:p-6">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-black text-[#08245c]">{item.label}</h3>
                    <span className="text-xs font-bold text-slate-500">{duration ? `${duration}s` : 'No duration'}{fileSize ? ` · ${Math.round(fileSize / 1024)} KB` : ''}</span>
                  </div>
                  <div className="mb-3 rounded-2xl bg-[#f8fbff] p-4">
                    <p className="mb-2 text-[11px] font-black uppercase text-slate-400">Pertanyaan</p>
                    <p className="whitespace-pre-line text-sm font-medium text-slate-700">
                    {item.prompt}
                    </p>
                  </div>
                  <p className="mb-2 text-[11px] font-black uppercase text-slate-400">Rekaman Peserta</p>
                  <button
                    onClick={() => playAudio(item.key, audio)}
                    disabled={!audio}
                    className="mb-3 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:bg-slate-300"
                  >
                    <Play className="h-4 w-4" />
                    {playingKey === item.key ? 'Playing' : 'Play / Pause'}
                  </button>
                  <WaveformMini active={playingKey === item.key} />
                  <p className="mt-3 text-sm font-bold text-slate-700">
                    Durasi: <span className="font-mono">{duration ? formatDuration(duration) : '00:00'}</span>
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    <strong>Transcript:</strong> {transcript || 'No transcript available.'}
                  </p>
                </div>
              );
            })}

            <div className="rounded-3xl border border-[#e6eaf2] bg-white p-4 shadow-soft sm:p-6">
              <h3 className="mb-4 text-base font-extrabold text-[#08245c]">Overall Speaking Assessment</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ScoreField label="Fluency & Coherence" value={speakingScores.fc} locked={sectionLock('speaking')} onChange={value => setSpeakingScores(prev => ({ ...prev, fc: value }))} />
                <ScoreField label="Lexical Resource" value={speakingScores.lr} locked={sectionLock('speaking')} onChange={value => setSpeakingScores(prev => ({ ...prev, lr: value }))} />
                <ScoreField label="Grammar" value={speakingScores.gra} locked={sectionLock('speaking')} onChange={value => setSpeakingScores(prev => ({ ...prev, gra: value }))} />
                <ScoreField label="Pronunciation" value={speakingScores.pro} locked={sectionLock('speaking')} onChange={value => setSpeakingScores(prev => ({ ...prev, pro: value }))} />
              </div>
              <BandSummary label="Tutor Speaking Band" value={tutorSpeakingBand} />
            </div>
            {sectionLock('speaking') && <Comparison candidate={selected} section="speaking" />}
            <SectionActions
              saveLabel="Save Speaking Draft"
              submitLabel="Submit Speaking Assessment"
              completed={sectionLock('speaking')}
              onSave={() => persistAssessment('speaking', false)}
              onSubmit={() => persistAssessment('speaking', true)}
              onEdit={() => reopenSection('speaking')}
            />
          </div>
        )}

        {activeTab === 'objective' && (
          <div className="space-y-5">
            <SectionStatusBanner status={sectionStatus(selected, 'reading')} />
            {selected.manualChecks?.sectionStatuses?.reading?.edited_after_ai_reveal && <BlindCalibrationNotice />}
            <ObjectivePanel title="Reading QA" icon={BookOpen} candidate={selected} section="reading" checks={readingChecks} setChecks={setReadingChecks} reveal={sectionLock('reading')} locked={sectionLock('reading')} />
            <SectionActions
              saveLabel="Save Reading QA"
              submitLabel="Submit Reading QA"
              completed={sectionLock('reading')}
              onSave={() => persistAssessment('reading', false)}
              onSubmit={() => persistAssessment('reading', true)}
              onEdit={() => reopenSection('reading')}
            />
            <SectionStatusBanner status={sectionStatus(selected, 'listening')} />
            {selected.manualChecks?.sectionStatuses?.listening?.edited_after_ai_reveal && <BlindCalibrationNotice />}
            <ObjectivePanel title="Listening QA" icon={Headphones} candidate={selected} section="listening" checks={listeningChecks} setChecks={setListeningChecks} reveal={sectionLock('listening')} locked={sectionLock('listening')} />
            <SectionActions
              saveLabel="Save Listening QA"
              submitLabel="Submit Listening QA"
              completed={sectionLock('listening')}
              onSave={() => persistAssessment('listening', false)}
              onSubmit={() => persistAssessment('listening', true)}
              onEdit={() => reopenSection('listening')}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 rounded-3xl border border-[#e6eaf2] bg-white p-4 shadow-soft sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#08245c] sm:text-2xl">IELTS Tutor Assessment Portal</h1>
            <p className="text-sm font-medium text-slate-500">Review candidate responses and submit verified IELTS diagnostic assessments.</p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase text-amber-700">Pending Review</p>
          <p className="text-3xl font-extrabold text-amber-800">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase text-emerald-700">Completed</p>
          <p className="text-3xl font-extrabold text-emerald-800">{completedCount}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-black uppercase text-blue-700">Candidates</p>
          <p className="text-3xl font-extrabold text-blue-800">{submissions.length}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="w-full bg-transparent text-sm outline-none"
          placeholder="Search name, WhatsApp, or Result ID"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#e6eaf2] bg-white shadow-soft">
        <table className="hidden w-full text-left text-sm md:table">
          <thead className="bg-[#f8fbff] text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Candidate Name</th>
              <th className="px-5 py-4">Date Completed</th>
              <th className="px-5 py-4">Writing Status</th>
              <th className="px-5 py-4">Speaking Status</th>
              <th className="px-5 py-4">Tutor Band</th>
              <th className="px-5 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(candidate => (
              <tr key={candidate.resultId} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="font-extrabold text-[#08245c]">{candidate.user.fullName}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{candidate.resultId}</span>
                    <QaSampleBadge candidate={candidate} />
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{new Date(candidate.completedAt).toLocaleDateString()}</td>
                <td className="px-5 py-4"><StatusPill status={sectionStatus(candidate, 'writing')} /></td>
                <td className="px-5 py-4"><StatusPill status={sectionStatus(candidate, 'speaking')} /></td>
                <td className="px-5 py-4 text-xs font-black text-[#08245c]">
                  W {tutorBandValue(candidate, 'writing')} · S {tutorBandValue(candidate, 'speaking')} · O {tutorOverallValue(candidate)}
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => openCandidate(candidate)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700">
                    {candidateCompleted(candidate) ? 'View Assessment' : 'Evaluate'}
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td className="px-5 py-10 text-center text-sm font-medium text-slate-500" colSpan={6}>No candidates found.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="divide-y divide-slate-100 md:hidden">
          {filtered.map(candidate => (
            <div key={candidate.resultId} className="space-y-3 p-4">
              <div>
                <div className="text-base font-extrabold text-[#08245c]">{candidate.user.fullName}</div>
                <div className="text-xs font-bold text-slate-500">{candidate.resultId}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-[#f8fbff] p-3">
                  <p className="mb-1 font-black uppercase text-slate-400">Writing</p>
                  <StatusPill status={sectionStatus(candidate, 'writing')} />
                  <p className="mt-2 font-black text-[#08245c]">Band {tutorBandValue(candidate, 'writing')}</p>
                </div>
                <div className="rounded-xl bg-[#f8fbff] p-3">
                  <p className="mb-1 font-black uppercase text-slate-400">Speaking</p>
                  <StatusPill status={sectionStatus(candidate, 'speaking')} />
                  <p className="mt-2 font-black text-[#08245c]">Band {tutorBandValue(candidate, 'speaking')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-slate-600">Overall: Band {tutorOverallValue(candidate)}</span>
                <button onClick={() => openCandidate(candidate)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700">
                  {candidateCompleted(candidate) ? 'View' : 'Evaluate'}
                </button>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <div className="p-8 text-center text-sm font-medium text-slate-500">No candidates found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

function speakingReviewItems(candidate: TestEvaluation) {
  if (candidate.isQa || candidate.is_qa) {
    return [
      {
        key: 'part1_q1',
        label: 'Part 1 Q1',
        prompt: 'How many hours do you usually sleep at night?',
        audioKey: 'part1_q1_audio',
        durationKey: 'part1_q1_duration',
        transcriptKey: 'part1_q1_transcript',
        fileSizeKey: 'part1_q1_file_size'
      },
      {
        key: 'part1_q2',
        label: 'Part 1 Q2',
        prompt: 'Do you sometimes sleep during the day? Why / why not?',
        audioKey: 'part1_q2_audio',
        durationKey: 'part1_q2_duration',
        transcriptKey: 'part1_q2_transcript',
        fileSizeKey: 'part1_q2_file_size'
      },
      {
        key: 'part2',
        label: 'Part 2',
        prompt: partText(speakingSection?.parts.find(item => item.id === 2)?.content, ''),
        audioKey: 'part2_audio',
        durationKey: 'part2_duration',
        transcriptKey: 'part2_transcript',
        fileSizeKey: 'part2_file_size'
      },
      {
        key: 'part3_q1',
        label: 'Part 3 Q1',
        prompt: 'How important is it for children to have lots of friends at school?',
        audioKey: 'part3_q1_audio',
        durationKey: 'part3_q1_duration',
        transcriptKey: 'part3_q1_transcript',
        fileSizeKey: 'part3_q1_file_size'
      },
      {
        key: 'part3_q2',
        label: 'Part 3 Q2',
        prompt: 'Do you think it is wrong for parents to influence which friends their children have?',
        audioKey: 'part3_q2_audio',
        durationKey: 'part3_q2_duration',
        transcriptKey: 'part3_q2_transcript',
        fileSizeKey: 'part3_q2_file_size'
      }
    ];
  }

  return [1, 2, 3].map(part => {
    const prompt = speakingSection?.parts.find(item => item.id === part);
    return {
      key: `part${part}`,
      label: `PART ${part}`,
      prompt: partText(prompt?.content, prompt?.questions?.[0]?.prompt || ''),
      audioKey: `part${part}Audio`,
      durationKey: `part${part}Duration`,
      transcriptKey: `part${part}Transcript`,
      fileSizeKey: `part${part}FileSize`
    };
  });
}

function SectionStatusBanner({ status }: { status: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
      Section Status: <span className="text-[#08245c]">{status}</span>
    </div>
  );
}

function BlindCalibrationNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">
      Revised After AI Reveal — Excluded from Blind Calibration
    </div>
  );
}

function SectionActions({
  saveLabel,
  submitLabel,
  completed,
  onSave,
  onSubmit,
  onEdit
}: {
  saveLabel: string;
  submitLabel: string;
  completed: boolean;
  onSave: () => void;
  onSubmit: () => void;
  onEdit: () => void;
}) {
  if (completed) {
    return (
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-white/95 p-3 shadow-lg backdrop-blur md:sticky md:bottom-4 md:flex-row md:items-center md:justify-end">
        <div className="flex items-center gap-2 px-2 text-sm font-black text-emerald-700 md:mr-auto">
          <CheckCircle2 className="h-4 w-4" />
          Assessment Submitted ✓
        </div>
        <button onClick={onEdit} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50 md:w-auto">
          Edit Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:sticky md:bottom-4 md:flex-row md:items-center md:justify-end">
      <button onClick={onSave} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50 md:w-auto">
        <Save className="h-4 w-4" />
        {saveLabel}
      </button>
      <button onClick={onSubmit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-700 md:w-auto">
        <Lock className="h-4 w-4" />
        {submitLabel}
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8fbff] p-4">
      <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-800">{value}</p>
    </div>
  );
}

function ScoreField({ label, value, onChange, locked }: { label: string; value: number; onChange: (value: number) => void; locked: boolean }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-black text-slate-600">{label}</span>
      {selectInput(value, onChange, locked)}
    </label>
  );
}

function BandSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-right">
      <span className="mr-3 text-xs font-black uppercase text-blue-700">{label}</span>
      <strong className="text-2xl text-[#08245c]">{value.toFixed(1)}</strong>
    </div>
  );
}

function WaveformMini({ active }: { active: boolean }) {
  const bars = [28, 14, 34, 20, 40, 18, 30, 24, 38, 16, 32, 22, 36, 18, 30, 26, 40, 20];
  return (
    <div className="flex h-12 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3">
      {bars.map((height, index) => (
        <span
          key={index}
          className={`w-1.5 rounded-full ${active ? 'bg-blue-500' : 'bg-slate-300'}`}
          style={{ height }}
        />
      ))}
    </div>
  );
}

function MetalChart() {
  const rows = [
    ['Copper', '+2.0%', '+1.0%', '+1.5%'],
    ['Nickel', '+6.0%', '-3.0%', '+1.0%'],
    ['Zinc', '+1.0%', '-1.0%', '+2.0%']
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#f8fbff] p-4">
      <p className="mb-3 text-[11px] font-black uppercase text-slate-500">Cambridge 18 Metal Percentage Change Graphic</p>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <strong>Metal</strong>
        <strong>January</strong>
        <strong>June</strong>
        <strong>December</strong>
        {rows.flatMap(row => row.map(cell => <span key={`${row[0]}-${cell}`} className="rounded-lg bg-white px-2 py-1 font-bold text-slate-700">{cell}</span>))}
      </div>
    </div>
  );
}

function WritingTaskCard({
  title,
  prompt,
  chart,
  response,
  scores,
  locked
}: {
  title: string;
  prompt: string;
  chart?: boolean;
  response: string;
  scores: Array<[string, number, (value: number) => void]>;
  locked: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[#e6eaf2] bg-white p-4 shadow-soft sm:p-6">
      <h3 className="mb-3 text-base font-extrabold text-[#08245c]">{title}</h3>
      <p className="mb-4 whitespace-pre-line rounded-2xl bg-[#f8fbff] p-4 text-sm leading-7 text-slate-700">{prompt}</p>
      {chart && <div className="mb-4"><MetalChart /></div>}
      <div className="mb-4 rounded-2xl border border-slate-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <strong className="text-sm text-slate-700">Candidate Response</strong>
          <span className="text-xs font-bold text-slate-500">{wordCount(response)} words</span>
        </div>
        <p className="whitespace-pre-line text-sm leading-7 text-slate-800">{response || 'No response submitted.'}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {scores.map(([label, value, onChange]) => (
          <ScoreField key={label} label={label} value={value} onChange={onChange} locked={locked} />
        ))}
      </div>
    </div>
  );
}

function ObjectivePanel({
  title,
  icon: Icon,
  candidate,
  section,
  checks,
  setChecks,
  reveal,
  locked
}: {
  title: string;
  icon: React.ElementType;
  candidate: TestEvaluation;
  section: 'reading' | 'listening';
  checks: Record<number, boolean>;
  setChecks: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  reveal: boolean;
  locked: boolean;
}) {
  const raw = candidate.rawResponses?.[section] || {};
  const totalQuestions = (candidate.isQa || candidate.is_qa) ? 5 : 40;
  const rows = Array.from({ length: totalQuestions }, (_, index) => index + 1);
  const matchCount = rows.filter(q => Boolean(raw[q]?.auto_is_correct) === Boolean(checks[q])).length;
  const questionLabel = section === 'reading' ? 'Soal / Pernyataan' : 'Soal';
  const keyLabel = section === 'reading' ? 'Kunci Jawaban' : 'Kunci / Jawaban yang Diterima';
  return (
    <div className="rounded-3xl border border-[#e6eaf2] bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />
        <h3 className="font-extrabold text-[#08245c]">{title}</h3>
      </div>
      <div className="max-h-[680px] space-y-4 overflow-auto pr-1">
        {rows.map(q => {
          const candidateAnswer = raw[q]?.candidate_answer || candidate.answers[section]?.[q] || '';
          const officialAnswer = raw[q]?.official_answer || '';
          return (
            <div key={q} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase text-slate-400">Nomor Soal</p>
                  <h4 className="text-lg font-extrabold text-[#08245c]">SOAL {q}</h4>
                </div>
                <div className="rounded-2xl bg-[#f8fbff] p-3">
                  <p className="mb-2 text-[11px] font-black uppercase text-slate-400">Penilaian Tutor</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setChecks(prev => ({ ...prev, [q]: true }))}
                      className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                        checks[q] ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
                      } disabled:opacity-60`}
                    >
                      Benar
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setChecks(prev => ({ ...prev, [q]: false }))}
                      className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                        !checks[q] ? 'bg-rose-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
                      } disabled:opacity-60`}
                    >
                      Salah
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
                <div>
                  <p className="mb-1 text-[11px] font-black uppercase text-slate-400">{questionLabel}</p>
                  <p className="whitespace-pre-line text-sm font-semibold leading-6 text-slate-800">
                    {objectiveQuestionText(section, q)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-black uppercase text-slate-400">Jawaban Peserta</p>
                  <AnswerBadge value={objectiveQuestionOption(section, q, candidateAnswer)} />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-black uppercase text-slate-400">{keyLabel}</p>
                  <AnswerBadge value={objectiveQuestionOption(section, q, officialAnswer)} />
                </div>
              </div>
              {reveal && (
                <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-800">
                  Auto Result: {raw[q]?.auto_is_correct ? 'Benar' : 'Salah'} · Tutor Result: {checks[q] ? 'Benar' : 'Salah'}
                  {Boolean(raw[q]?.auto_is_correct) !== Boolean(checks[q]) ? ' · Ada perbedaan' : ' · Sesuai'}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {reveal && (
        <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-800">
          Kesesuaian Auto vs Tutor: {matchCount} / {totalQuestions}
        </div>
      )}
    </div>
  );
}

function Comparison({ candidate, section }: { candidate: TestEvaluation; section?: 'writing' | 'speaking' }) {
  const ai = candidate.dualComparison?.aiAssessment;
  const tutor = candidate.dualComparison?.tutorAssessment;
  const row = (label: string, aiValue: number | string | undefined, tutorValue: number | string | undefined) => (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2 font-bold text-slate-700">{label}</td>
      <td className="px-4 py-2 text-slate-600">{bandText(aiValue)}</td>
      <td className="px-4 py-2 text-slate-600">{bandText(tutorValue)}</td>
      <td className="px-4 py-2 text-slate-500">
        {typeof aiValue === 'number' && aiValue >= 1 && typeof tutorValue === 'number' ? Math.abs(aiValue - tutorValue).toFixed(1) : '-'}
      </td>
    </tr>
  );
  return (
    <div className="mt-6 rounded-3xl border border-[#e6eaf2] bg-white p-6 shadow-soft">
      <h3 className="mb-4 text-base font-extrabold text-[#08245c]">AI vs Tutor Comparison</h3>
      <table className="w-full text-left text-sm">
        <thead className="text-xs font-black uppercase text-slate-400">
          <tr>
            <th className="px-4 py-2">Criterion</th>
            <th className="px-4 py-2">AI</th>
            <th className="px-4 py-2">Tutor</th>
            <th className="px-4 py-2">Delta</th>
          </tr>
        </thead>
        <tbody>
          {(!section || section === 'writing') && row('Writing', ai?.writingBand, tutor?.writingBand)}
          {(!section || section === 'writing') && row('Writing T1 Task Achievement', ai?.writingDetail?.task1.criterion1.score, tutor?.writingDetail?.task1.criterion1.score)}
          {(!section || section === 'writing') && row('Writing T1 Coherence & Cohesion', ai?.writingDetail?.task1.cc.score, tutor?.writingDetail?.task1.cc.score)}
          {(!section || section === 'writing') && row('Writing T1 Lexical Resource', ai?.writingDetail?.task1.lr.score, tutor?.writingDetail?.task1.lr.score)}
          {(!section || section === 'writing') && row('Writing T1 Grammar', ai?.writingDetail?.task1.gra.score, tutor?.writingDetail?.task1.gra.score)}
          {(!section || section === 'writing') && row('Writing T2 Task Response', ai?.writingDetail?.task2.criterion1.score, tutor?.writingDetail?.task2.criterion1.score)}
          {(!section || section === 'writing') && row('Writing T2 Coherence & Cohesion', ai?.writingDetail?.task2.cc.score, tutor?.writingDetail?.task2.cc.score)}
          {(!section || section === 'writing') && row('Writing T2 Lexical Resource', ai?.writingDetail?.task2.lr.score, tutor?.writingDetail?.task2.lr.score)}
          {(!section || section === 'writing') && row('Writing T2 Grammar', ai?.writingDetail?.task2.gra.score, tutor?.writingDetail?.task2.gra.score)}
          {(!section || section === 'speaking') && row('Speaking', ai?.speakingBand, tutor?.speakingBand)}
          {(!section || section === 'speaking') && row('Speaking FC', ai?.speakingDetail?.fc.score, tutor?.speakingDetail?.fc.score)}
          {(!section || section === 'speaking') && row('Speaking LR', ai?.speakingDetail?.lr.score, tutor?.speakingDetail?.lr.score)}
          {(!section || section === 'speaking') && row('Speaking GRA', ai?.speakingDetail?.gra.score, tutor?.speakingDetail?.gra.score)}
          {(!section || section === 'speaking') && row('Speaking Pronunciation', ai?.speakingDetail?.pro.score || 'Not Evaluated', tutor?.speakingDetail?.pro.score)}
        </tbody>
      </table>
    </div>
  );
}
