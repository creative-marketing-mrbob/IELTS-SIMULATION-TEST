import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  UserProfile, 
  ModuleType, 
  UserAnswers, 
  TestEvaluation, 
  SectionState, 
  SectionProgressItem 
} from '../types/ielts';
import { 
  dbService, 
  DBCandidateData, 
  normalizeWhatsApp 
} from '../services/db';
import { generateEvaluation } from '../utils/scoring';

export type AppView = 'register' | 'access-info' | 'dashboard' | 'test' | 'result' | 'admin' | 'tutor' | 'database';

interface TestContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  user: UserProfile | null;
  activeSectionType: ModuleType | null;
  setActiveSectionType: (sec: ModuleType | null) => void;
  sectionProgress: Record<ModuleType, SectionProgressItem>;
  answers: UserAnswers;
  evaluation: TestEvaluation | null;
  allSubmissions: TestEvaluation[];
  isSaving: boolean;
  isSubmittingSection: boolean;
  isQaMode: boolean;
  qaQuestionLimit: number | null;
  selectedAudioDeviceId: string;
  setSelectedAudioDeviceId: (id: string) => void;
  hasCompletedAudioSetup: boolean;
  setHasCompletedAudioSetup: (val: boolean) => void;
  
  // Registration & Session Recovery
  registerUser: (formData: {
    fullName: string;
    whatsapp: string;
    age: string;
    currentStatus: any;
    targetScore: any;
  }) => Promise<void>;
  resumeSessionWithCode: (whatsapp: string, accessCode: string) => Promise<{ success: boolean; error?: string }>;
  logoutCandidate: () => void;

  // Section Lifecycle & Independent 60-Min Server Timers
  startSection: (sectionType: ModuleType) => void;
  submitSection: (sectionType: ModuleType) => void;
  submitSectionAsync: (sectionType: ModuleType, overrideAnswers?: UserAnswers) => Promise<{ success: boolean; error?: string }>;
  autoTimeoutSection: (sectionType: ModuleType) => void;
  getSectionRemainingSeconds: (sectionType: ModuleType) => number;

  // Real-time Autosave Handlers
  updateReadingAnswer: (qId: number, answer: string) => void;
  updateListeningAnswer: (qId: number, answer: string) => void;
  toggleFlagQuestion: (sectionType: 'reading' | 'listening', qId: number) => void;
  updateWritingAnswer: (task: 'task1' | 'task2', text: string) => void;
  updateSpeakingAnswer: (part: 'part1' | 'part2' | 'part3', audioDataUrl: string, durationSec?: number, meta?: { mimeType?: string; fileSize?: number }) => void;
  updateSpeakingQaAnswer: (itemKey: 'part1_q1' | 'part1_q2' | 'part2' | 'part3_q1' | 'part3_q2', storagePath: string, durationSec: number, meta?: { mimeType?: string; fileSize?: number }) => Promise<void>;

  // Admin Actions
  refreshAdminSubmissions: () => Promise<void>;
  deleteSubmission: (resultId: string) => void;
  updateSubmissionEvaluation: (resultId: string, updatedFields: Partial<TestEvaluation>) => void;
  resetAll: () => void;
}

const defaultProgress: Record<ModuleType, SectionProgressItem> = {
  reading: { sectionType: 'reading', status: 'NOT_STARTED' },
  listening: { sectionType: 'listening', status: 'NOT_STARTED' },
  writing: { sectionType: 'writing', status: 'NOT_STARTED' },
  speaking: { sectionType: 'speaking', status: 'NOT_STARTED' }
};

const defaultAnswers: UserAnswers = {
  reading: {},
  listening: {},
  readingFlagged: [],
  listeningFlagged: [],
  writing: { task1: '', task2: '' },
  speaking: {}
};

const TestContext = createContext<TestContextType | undefined>(undefined);

const routeViewFromPath = (): AppView => {
  if (window.location.pathname === '/admin') return 'admin';
  if (window.location.pathname === '/tutor') return 'tutor';
  if (window.location.pathname === '/database') return 'database';
  return 'register';
};

const routePathForView = (view: AppView) => {
  if (view === 'admin') return '/admin';
  if (view === 'tutor') return '/tutor';
  if (view === 'database') return '/database';
  return `/${window.location.search || ''}`;
};

export const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentViewState] = useState<AppView>(routeViewFromPath);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSectionType, setActiveSectionType] = useState<ModuleType | null>(null);
  const [sectionProgress, setSectionProgress] = useState<Record<ModuleType, SectionProgressItem>>(defaultProgress);
  const [answers, setAnswers] = useState<UserAnswers>(defaultAnswers);
  const [evaluation, setEvaluation] = useState<TestEvaluation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [hasCompletedAudioSetup, setHasCompletedAudioSetup] = useState<boolean>(false);
  const answersRef = useRef<UserAnswers>(defaultAnswers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const setCurrentView = useCallback((view: AppView) => {
    setCurrentViewState(view);
    const nextPath = routePathForView(view);
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (nextPath !== currentPath) {
      window.history.pushState({ view }, '', nextPath);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentViewState(routeViewFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [isQaModeState, setIsQaModeState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('qa') === '5' || params.get('qa') === 'true' || params.get('is_qa') === 'true';
  });

  const isQaMode = isQaModeState || Boolean(
    user?.is_qa ||
    user?.isQa ||
    user?.resultId?.includes('-QA-') ||
    (user?.resultId && user.resultId.includes('QA')) ||
    (user?.fullName && /QA/i.test(user.fullName))
  );

  const qaQuestionLimit = isQaMode ? 5 : null;

  // Load candidate list for admin
  const [allSubmissions, setAllSubmissions] = useState<TestEvaluation[]>([]);

  const candidateDataToEvaluation = useCallback((candData: DBCandidateData): TestEvaluation => {
    if (candData.evaluation) return candData.evaluation;
    const profile: UserProfile = {
      candidateId: candData.candidate.candidate_id,
      fullName: candData.candidate.name,
      whatsapp: candData.candidate.whatsapp,
      age: candData.candidate.age,
      currentStatus: candData.candidate.current_status,
      targetScore: candData.candidate.target_band,
      resultId: candData.candidate.result_id,
      accessCode: candData.candidate.raw_access_code,
      registeredAt: candData.candidate.created_at,
      is_qa: Boolean(candData.candidate.is_qa || candData.candidate.isQa),
      isQa: Boolean(candData.candidate.is_qa || candData.candidate.isQa)
    };
    return generateEvaluation(profile, {
      reading: candData.answers.reading || {},
      listening: candData.answers.listening || {},
      writing: { task1: candData.answers.writing.task1 || '', task2: candData.answers.writing.task2 || '' },
      speaking: candData.answers.speaking || {}
    });
  }, []);

  // Hydrate candidate data into React state
  const loadCandidateDataIntoState = useCallback((candData: DBCandidateData) => {
    const cand = candData.candidate;
    const persistedQa = Boolean(cand.is_qa || cand.isQa);
    setIsQaModeState(persistedQa);
    const profile: UserProfile = {
      candidateId: cand.candidate_id,
      fullName: cand.name,
      whatsapp: cand.whatsapp,
      age: cand.age,
      currentStatus: cand.current_status,
      targetScore: cand.target_band,
      resultId: cand.result_id,
      accessCode: cand.raw_access_code,
      registeredAt: cand.created_at,
      is_qa: persistedQa,
      isQa: persistedQa
    };
    setUser(profile);

    // Map progress
    const prog: Record<ModuleType, SectionProgressItem> = {
      reading: {
        sectionType: 'reading',
        status: candData.progress.reading.status,
        startedAt: candData.progress.reading.started_at,
        deadlineAt: candData.progress.reading.deadline_at,
        submittedAt: candData.progress.reading.submitted_at,
        submissionType: candData.progress.reading.submission_type
      },
      listening: {
        sectionType: 'listening',
        status: candData.progress.listening.status,
        startedAt: candData.progress.listening.started_at,
        deadlineAt: candData.progress.listening.deadline_at,
        submittedAt: candData.progress.listening.submitted_at,
        submissionType: candData.progress.listening.submission_type
      },
      writing: {
        sectionType: 'writing',
        status: candData.progress.writing.status,
        startedAt: candData.progress.writing.started_at,
        deadlineAt: candData.progress.writing.deadline_at,
        submittedAt: candData.progress.writing.submitted_at,
        submissionType: candData.progress.writing.submission_type
      },
      speaking: {
        sectionType: 'speaking',
        status: candData.progress.speaking.status,
        startedAt: candData.progress.speaking.started_at,
        deadlineAt: candData.progress.speaking.deadline_at,
        submittedAt: candData.progress.speaking.submitted_at,
        submissionType: candData.progress.speaking.submission_type
      }
    };
    setSectionProgress(prog);

    setAnswers({
      reading: candData.answers.reading || {},
      listening: candData.answers.listening || {},
      readingFlagged: candData.answers.reading_flagged || [],
      listeningFlagged: candData.answers.listening_flagged || [],
      writing: {
        task1: candData.answers.writing.task1 || '',
        task2: candData.answers.writing.task2 || '',
        wordCountTask1: candData.answers.writing.word_count_task1 || 0,
        wordCountTask2: candData.answers.writing.word_count_task2 || 0,
        savedAt: candData.answers.writing.saved_at
      },
      speaking: candData.answers.speaking || {}
    });

    if (candData.evaluation) {
      setEvaluation(candData.evaluation);
    }

    // Check if all 4 sections are completed
    const allCompleted = Object.values(prog).every(p => p.status === 'COMPLETED' || p.status === 'AUTO_SUBMITTED');
    if (allCompleted) {
      setCurrentView('result');
    } else {
      setCurrentView('dashboard');
    }
  }, []);

  const refreshAdminSubmissions = useCallback(async () => {
    const all = await dbService.getAllCandidates();
    setAllSubmissions(Object.values(all).map(candidateDataToEvaluation));
  }, [candidateDataToEvaluation]);

  // Auto-resume existing browser session on mount (Part G)
  useEffect(() => {
    let cancelled = false;

    dbService.resumeCurrentSession()
      .then(existing => {
        if (!cancelled && existing) {
          loadCandidateDataIntoState(existing);
        }
      })
      .catch(error => console.warn('Supabase session resume failed', error));

    return () => {
      cancelled = true;
    };
  }, [loadCandidateDataIntoState]);

  const buildCandidateData = useCallback((
    updatedUser: UserProfile | null,
    updatedProgress: Record<ModuleType, SectionProgressItem>,
    updatedAnswers: UserAnswers,
    updatedEval?: TestEvaluation | null
  ): DBCandidateData | null => {
    if (!updatedUser) return null;
    const userIsQa = Boolean(
      updatedUser.is_qa ||
      updatedUser.isQa ||
      isQaModeState ||
      updatedUser.resultId?.includes('-QA-')
    );
    return {
      candidate: {
        candidate_id: updatedUser.candidateId,
        name: updatedUser.fullName,
        whatsapp: normalizeWhatsApp(updatedUser.whatsapp),
        age: updatedUser.age,
        current_status: updatedUser.currentStatus,
        target_band: updatedUser.targetScore,
        result_id: updatedUser.resultId,
        access_code_hash: '', // Preserved inside service
        raw_access_code: updatedUser.accessCode,
        is_qa: userIsQa,
        isQa: userIsQa,
        created_at: updatedUser.registeredAt,
        last_access_at: new Date().toISOString()
      },
      progress: {
        reading: {
          candidate_id: updatedUser.candidateId,
          section_type: 'reading',
          status: updatedProgress.reading.status,
          started_at: updatedProgress.reading.startedAt,
          deadline_at: updatedProgress.reading.deadlineAt,
          submitted_at: updatedProgress.reading.submittedAt,
          submission_type: updatedProgress.reading.submissionType
        },
        listening: {
          candidate_id: updatedUser.candidateId,
          section_type: 'listening',
          status: updatedProgress.listening.status,
          started_at: updatedProgress.listening.startedAt,
          deadline_at: updatedProgress.listening.deadlineAt,
          submitted_at: updatedProgress.listening.submittedAt,
          submission_type: updatedProgress.listening.submissionType
        },
        writing: {
          candidate_id: updatedUser.candidateId,
          section_type: 'writing',
          status: updatedProgress.writing.status,
          started_at: updatedProgress.writing.startedAt,
          deadline_at: updatedProgress.writing.deadlineAt,
          submitted_at: updatedProgress.writing.submittedAt,
          submission_type: updatedProgress.writing.submissionType
        },
        speaking: {
          candidate_id: updatedUser.candidateId,
          section_type: 'speaking',
          status: updatedProgress.speaking.status,
          started_at: updatedProgress.speaking.startedAt,
          deadline_at: updatedProgress.speaking.deadlineAt,
          submitted_at: updatedProgress.speaking.submittedAt,
          submission_type: updatedProgress.speaking.submissionType
        }
      },
      answers: {
        candidate_id: updatedUser.candidateId,
        reading: updatedAnswers.reading,
        listening: updatedAnswers.listening,
        reading_flagged: updatedAnswers.readingFlagged || [],
        listening_flagged: updatedAnswers.listeningFlagged || [],
        writing: {
          task1: updatedAnswers.writing.task1,
          task2: updatedAnswers.writing.task2,
          word_count_task1: updatedAnswers.writing.wordCountTask1 || 0,
          word_count_task2: updatedAnswers.writing.wordCountTask2 || 0,
          saved_at: new Date().toISOString()
        },
        speaking: {
          ...updatedAnswers.speaking,
          saved_at: new Date().toISOString()
        }
      },
      evaluation: updatedEval || undefined
    };
  }, [isQaModeState]);

  // Persist current state to Database Service
  const syncToDatabase = useCallback((
    updatedUser: UserProfile | null,
    updatedProgress: Record<ModuleType, SectionProgressItem>,
    updatedAnswers: UserAnswers,
    updatedEval?: TestEvaluation | null
  ) => {
    const candData = buildCandidateData(updatedUser, updatedProgress, updatedAnswers, updatedEval);
    if (!candData) return;
    setIsSaving(true);

    dbService.saveCandidateData(candData)
      .catch(error => console.warn('Supabase save failed', error))
      .finally(() => setTimeout(() => setIsSaving(false), 300));
  }, [buildCandidateData]);

  const flushToDatabase = useCallback(async (
    updatedUser: UserProfile | null,
    updatedProgress: Record<ModuleType, SectionProgressItem>,
    updatedAnswers: UserAnswers,
    updatedEval?: TestEvaluation | null
  ) => {
    const candData = buildCandidateData(updatedUser, updatedProgress, updatedAnswers, updatedEval);
    if (!candData) return;
    setIsSaving(true);
    try {
      await dbService.saveCandidateData(candData);
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  }, [buildCandidateData]);

  // Registration handler (Part E & F)
  const registerUser = (formData: {
    fullName: string;
    whatsapp: string;
    age: string;
    currentStatus: any;
    targetScore: any;
  }) => {
    return dbService.registerCandidate({
      fullName: formData.fullName,
      whatsapp: formData.whatsapp,
      age: formData.age,
      currentStatus: formData.currentStatus,
      targetScore: formData.targetScore,
      is_qa: isQaModeState,
      isQa: isQaModeState
    }).then(({ candidate, accessCode }) => {
      const persistedQa = Boolean(candidate.is_qa || candidate.isQa || isQaModeState);
      const profile: UserProfile = {
        candidateId: candidate.candidate_id,
        fullName: candidate.name,
        whatsapp: candidate.whatsapp,
        age: candidate.age,
        currentStatus: candidate.current_status,
        targetScore: candidate.target_band,
        resultId: candidate.result_id,
        accessCode,
        registeredAt: candidate.created_at,
        is_qa: persistedQa,
        isQa: persistedQa
      };

      setUser(profile);
      setSectionProgress(defaultProgress);
      setAnswers(defaultAnswers);
      setEvaluation(null);
      setCurrentView('access-info'); // Show "Simpan Akses Test Kamu" screen
    }).catch(error => {
      alert(error?.message || 'Registration failed because Supabase is not connected.');
    });
  };

  // Cross-device resume handler (Part H)
  const resumeSessionWithCode = async (whatsapp: string, accessCode: string) => {
    const res = await dbService.resumeWithAccessCode(whatsapp, accessCode);
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Autentikasi gagal.' };
    }
    loadCandidateDataIntoState(res.data);
    return { success: true };
  };

  const logoutCandidate = () => {
    dbService.clearCurrentSession().catch(error => console.warn('Session clear failed', error));
    setUser(null);
    setSectionProgress(defaultProgress);
    setAnswers(defaultAnswers);
    setEvaluation(null);
    setCurrentView('register');
  };

  // Start Section with independent 60-min server timer (Part K, L, M)
  const startSection = (sectionType: ModuleType) => {
    if (!user) return;
    const currentStatus = sectionProgress[sectionType].status;

    let startedAt = sectionProgress[sectionType].startedAt;
    let deadlineAt = sectionProgress[sectionType].deadlineAt;

    // If starting for the first time, establish start and deadline (+60 mins)
    if (!startedAt || currentStatus === 'NOT_STARTED') {
      const startTime = new Date();
      const deadlineTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 60 minutes
      startedAt = startTime.toISOString();
      deadlineAt = deadlineTime.toISOString();
    }

    const updatedProg: Record<ModuleType, SectionProgressItem> = {
      ...sectionProgress,
      [sectionType]: {
        ...sectionProgress[sectionType],
        status: 'IN_PROGRESS',
        startedAt,
        deadlineAt
      }
    };

    setSectionProgress(updatedProg);
    setActiveSectionType(sectionType);
    setCurrentView('test');
    syncToDatabase(user, updatedProg, answers, evaluation);
  };

  // Calculate remaining seconds based on server deadline (Part M)
  const getSectionRemainingSeconds = useCallback((sectionType: ModuleType): number => {
    const item = sectionProgress[sectionType];
    if (!item.deadlineAt) return 60 * 60;
    const deadlineMs = new Date(item.deadlineAt).getTime();
    const nowMs = Date.now();
    return Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
  }, [sectionProgress]);

  // Section Submission Handler (Part Z, AA, AB)
  const submitSectionAsync = async (
    sectionType: ModuleType,
    overrideAnswers?: UserAnswers
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Candidate session not found.' };
    const finalAnswers = overrideAnswers || answersRef.current;

    if (sectionType === 'speaking' && isQaMode) {
      const required: Array<[keyof UserAnswers['speaking'], keyof UserAnswers['speaking'], keyof UserAnswers['speaking'], string]> = [
        ['part1_q1_audio', 'part1_q1_duration', 'part1_q1_file_size', 'Part 1 Question 1'],
        ['part1_q2_audio', 'part1_q2_duration', 'part1_q2_file_size', 'Part 1 Question 2'],
        ['part2_audio', 'part2_duration', 'part2_file_size', 'Part 2'],
        ['part3_q1_audio', 'part3_q1_duration', 'part3_q1_file_size', 'Part 3 Question 1'],
        ['part3_q2_audio', 'part3_q2_duration', 'part3_q2_file_size', 'Part 3 Question 2']
      ];
      const missing = required
        .filter(([audioKey, durationKey, sizeKey]) => {
          const duration = finalAnswers.speaking[durationKey];
          const fileSize = finalAnswers.speaking[sizeKey];
          return !finalAnswers.speaking[audioKey] ||
            typeof duration !== 'number' ||
            duration <= 0 ||
            (typeof fileSize === 'number' && fileSize <= 0);
        })
        .map(([, , , label]) => label);

      if (missing.length) {
        return { success: false, error: `Rekaman berikut belum tersimpan:\n${missing.join('\n')}` };
      }
    }

    setIsSubmittingSection(true);
    const now = new Date().toISOString();

    const updatedProg: Record<ModuleType, SectionProgressItem> = {
      ...sectionProgress,
      [sectionType]: {
        ...sectionProgress[sectionType],
        status: 'COMPLETED',
        submittedAt: now,
        submissionType: 'MANUAL'
      }
    };

    try {
      await flushToDatabase(user, sectionProgress, finalAnswers, evaluation);
    } catch (error) {
      setIsSubmittingSection(false);
      const detail = error instanceof Error ? `\n\nDetail: ${error.message}` : '';
      return { success: false, error: `Beberapa jawaban belum berhasil disimpan. Silakan coba lagi.${detail}` };
    }

    // Check if all 4 sections are completed
    const allCompleted = Object.values(updatedProg).every(p => p.status === 'COMPLETED' || p.status === 'AUTO_SUBMITTED');

    let finalEval: TestEvaluation | null = evaluation;
    if (allCompleted) {
      finalEval = generateEvaluation(user, finalAnswers);
      setEvaluation(finalEval);
      setAllSubmissions(prev => {
        const filtered = prev.filter(s => s.resultId !== user.resultId);
        return [finalEval!, ...filtered];
      });
    }

    try {
      await flushToDatabase(user, updatedProg, finalAnswers, finalEval);
    } catch (error) {
      setIsSubmittingSection(false);
      const detail = error instanceof Error ? `\n\nDetail: ${error.message}` : '';
      return { success: false, error: `Beberapa jawaban belum berhasil disimpan. Silakan coba lagi.${detail}` };
    }

    if (sectionType === 'writing' || sectionType === 'speaking') {
      dbService.triggerAutoAiEvaluation(user.resultId, sectionType)
        .catch(error => console.warn('Auto AI evaluation trigger failed', error));
    }

    setAnswers(finalAnswers);
    setSectionProgress(updatedProg);
    setActiveSectionType(null);
    setCurrentView(allCompleted ? 'result' : 'dashboard');
    setIsSubmittingSection(false);
    return { success: true };
  };

  const submitSection = (sectionType: ModuleType) => {
    submitSectionAsync(sectionType).then(result => {
      if (!result.success && result.error) alert(result.error);
    });
  };

  // Section Timeout Auto-Submit (Part N)
  const autoTimeoutSection = (sectionType: ModuleType) => {
    if (!user) return;
    const now = new Date().toISOString();

    const updatedProg: Record<ModuleType, SectionProgressItem> = {
      ...sectionProgress,
      [sectionType]: {
        ...sectionProgress[sectionType],
        status: 'AUTO_SUBMITTED',
        submittedAt: now,
        submissionType: 'AUTO_TIMEOUT'
      }
    };
    setSectionProgress(updatedProg);
    setActiveSectionType(null);

    const allCompleted = Object.values(updatedProg).every(p => p.status === 'COMPLETED' || p.status === 'AUTO_SUBMITTED');

    let finalEval: TestEvaluation | null = evaluation;
    if (allCompleted) {
      finalEval = generateEvaluation(user, answers);
      setEvaluation(finalEval);
      setAllSubmissions(prev => {
        const filtered = prev.filter(s => s.resultId !== user.resultId);
        return [finalEval!, ...filtered];
      });
      setCurrentView('result');
    } else {
      setCurrentView('dashboard');
    }

    syncToDatabase(user, updatedProg, answers, finalEval);
  };

  // Autosave handlers for Objective Questions (Part AC)
  const updateReadingAnswer = (qId: number, answer: string) => {
    const updated: UserAnswers = {
      ...answers,
      reading: { ...answers.reading, [qId]: answer }
    };
    setAnswers(updated);
    syncToDatabase(user, sectionProgress, updated, evaluation);
  };

  const updateListeningAnswer = (qId: number, answer: string) => {
    const updated: UserAnswers = {
      ...answers,
      listening: { ...answers.listening, [qId]: answer }
    };
    setAnswers(updated);
    syncToDatabase(user, sectionProgress, updated, evaluation);
  };

  const toggleFlagQuestion = (sectionType: 'reading' | 'listening', qId: number) => {
    const key = sectionType === 'reading' ? 'readingFlagged' : 'listeningFlagged';
    const current = answers[key] || [];
    const updatedList = current.includes(qId) ? current.filter(id => id !== qId) : [...current, qId];
    const updated: UserAnswers = {
      ...answers,
      [key]: updatedList
    };
    setAnswers(updated);
    syncToDatabase(user, sectionProgress, updated, evaluation);
  };

  // Writing Autosave (Part U)
  const updateWritingAnswer = (task: 'task1' | 'task2', text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const updated: UserAnswers = {
      ...answers,
      writing: {
        ...answers.writing,
        [task]: text,
        [task === 'task1' ? 'wordCountTask1' : 'wordCountTask2']: words,
        savedAt: new Date().toISOString()
      }
    };
    setAnswers(updated);
    syncToDatabase(user, sectionProgress, updated, evaluation);
  };

  // Speaking Autosave (Part X)
  const updateSpeakingAnswer = (
    part: 'part1' | 'part2' | 'part3',
    audioDataUrl: string,
    durationSec?: number,
    meta?: { mimeType?: string; fileSize?: number }
  ) => {
    const currentAnswers = answersRef.current;
    const updated: UserAnswers = {
      ...currentAnswers,
      speaking: {
        ...currentAnswers.speaking,
        [`${part}Audio`]: audioDataUrl,
        [`${part}Duration`]: durationSec,
        [`${part}MimeType`]: meta?.mimeType,
        [`${part}FileSize`]: meta?.fileSize,
        savedAt: new Date().toISOString()
      }
    };
    answersRef.current = updated;
    setAnswers(updated);
    syncToDatabase(user, sectionProgress, updated, evaluation);
  };

  const updateSpeakingQaAnswer = async (
    itemKey: 'part1_q1' | 'part1_q2' | 'part2' | 'part3_q1' | 'part3_q2',
    storagePath: string,
    durationSec: number,
    meta?: { mimeType?: string; fileSize?: number }
  ) => {
    const currentAnswers = answersRef.current;
    const updated: UserAnswers = {
      ...currentAnswers,
      speaking: {
        ...currentAnswers.speaking,
        [`${itemKey}_audio`]: storagePath,
        [`${itemKey}_duration`]: durationSec,
        [`${itemKey}_mime_type`]: meta?.mimeType,
        [`${itemKey}_file_size`]: meta?.fileSize,
        savedAt: new Date().toISOString()
      }
    };
    answersRef.current = updated;
    setAnswers(updated);
    await flushToDatabase(user, sectionProgress, updated, evaluation);
  };

  // Admin Actions
  const deleteSubmission = (resultId: string) => {
    setAllSubmissions(prev => prev.filter(s => s.resultId !== resultId));
    dbService.deleteSubmission(resultId).catch(error => console.warn('Supabase delete failed', error));
  };

  const updateSubmissionEvaluation = (resultId: string, updatedFields: Partial<TestEvaluation>) => {
    const currentSubmission = allSubmissions.find(s => s.resultId === resultId);
    const persistedUpdate = currentSubmission ? { ...currentSubmission, ...updatedFields } : null;

    setAllSubmissions(prev => prev.map(s => {
      if (s.resultId === resultId) {
        return { ...s, ...updatedFields };
      }
      return s;
    }));

    dbService.getAllCandidates()
      .then(all => {
        const existing = Object.values(all).find(data => data.candidate.result_id === resultId);
        if (existing && persistedUpdate) {
          return dbService.saveCandidateData({
            ...existing,
            evaluation: persistedUpdate
          });
        }
      })
      .catch(error => console.warn('Supabase evaluation update failed', error));
  };

  const resetAll = () => {
    logoutCandidate();
  };

  return (
    <TestContext.Provider
      value={{
        currentView,
        setCurrentView,
        user,
        activeSectionType,
        setActiveSectionType,
        sectionProgress,
        answers,
        evaluation,
        allSubmissions,
        isSaving,
        isSubmittingSection,
        isQaMode,
        qaQuestionLimit,
        selectedAudioDeviceId,
        setSelectedAudioDeviceId,
        hasCompletedAudioSetup,
        setHasCompletedAudioSetup,
        registerUser,
        resumeSessionWithCode,
        logoutCandidate,
        startSection,
        submitSection,
        submitSectionAsync,
        autoTimeoutSection,
        getSectionRemainingSeconds,
        updateReadingAnswer,
        updateListeningAnswer,
        toggleFlagQuestion,
        updateWritingAnswer,
        updateSpeakingAnswer,
        updateSpeakingQaAnswer,
        refreshAdminSubmissions,
        deleteSubmission,
        updateSubmissionEvaluation,
        resetAll
      }}
    >
      {children}
    </TestContext.Provider>
  );
};

export const useTest = () => {
  const context = useContext(TestContext);
  if (!context) throw new Error('useTest must be used within TestProvider');
  return context;
};
