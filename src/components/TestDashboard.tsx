import React, { useState } from 'react';
import { useTest } from '../context/TestContext';
import { ModuleType, SectionState } from '../types/ielts';
import { 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  LogOut, 
  KeyRound,
  FileCheck2,
  Lock
} from 'lucide-react';

export const TestDashboard: React.FC = () => {
  const { 
    user, 
    sectionProgress, 
    startSection, 
    logoutCandidate, 
    setCurrentView,
    isQaMode
  } = useTest();

  // Confirmation modal state for starting a section
  const [confirmingSection, setConfirmingSection] = useState<ModuleType | null>(null);

  const completedCount = Object.values(sectionProgress).filter(
    s => s.status === 'COMPLETED' || s.status === 'AUTO_SUBMITTED'
  ).length;

  const sectionsConfig: Array<{
    type: ModuleType;
    title: string;
    description: string;
    icon: any;
    color: string;
    lightColor: string;
  }> = [
    {
      type: 'reading',
      title: 'Reading',
      description: isQaMode ? 'QA Mode: Questions 1-5 only' : '3 Academic Texts, 40 Questions (Passage 1, 2, 3)',
      icon: BookOpen,
      color: 'text-blue-600',
      lightColor: 'bg-blue-50'
    },
    {
      type: 'listening',
      title: 'Listening',
      description: isQaMode ? 'QA Mode: Questions 1-5 only' : '4 Audio Tracks, 40 Questions (Part 1, 2, 3, 4)',
      icon: Headphones,
      color: 'text-indigo-600',
      lightColor: 'bg-indigo-50'
    },
    {
      type: 'writing',
      title: 'Writing',
      description: 'Task 1 Report (150 words) & Task 2 Essay (250 words)',
      icon: PenTool,
      color: 'text-blue-600',
      lightColor: 'bg-blue-50'
    },
    {
      type: 'speaking',
      title: 'Speaking',
      description: isQaMode ? 'QA Mode: 5 saved responses with audio setup' : '3 Voice Recording Parts (Interview, Cue Card, Discussion)',
      icon: Mic,
      color: 'text-red-500',
      lightColor: 'bg-red-50'
    }
  ];

  const handleCardClick = (secType: ModuleType) => {
    const status = sectionProgress[secType].status;
    if (status === 'COMPLETED' || status === 'AUTO_SUBMITTED') {
      return; // Locked
    }
    if (status === 'IN_PROGRESS') {
      // Direct continue
      startSection(secType);
    } else {
      // Show confirmation modal before starting fresh 60-min timer
      setConfirmingSection(secType);
    }
  };

  const handleConfirmStart = () => {
    if (confirmingSection) {
      startSection(confirmingSection);
      setConfirmingSection(null);
    }
  };

  const getStatusBadge = (status: SectionState) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>COMPLETED</span>
          </span>
        );
      case 'AUTO_SUBMITTED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>SUBMITTED (AUTO)</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>IN PROGRESS</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-200">
            <span>NOT STARTED</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      
      {/* Top Welcome & Progress Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e6eaf2] shadow-soft space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">
              {isQaMode ? 'QA Mode - 5 Questions' : 'Candidate Diagnostic Portal'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#08245c] tracking-tight">
              IELTS Simulation Test
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Selamat datang, <strong className="text-slate-800">{user?.fullName || 'Candidate'}</strong> (Result ID: <span className="font-mono text-blue-600 font-bold">{user?.resultId}</span>)
            </p>
            {isQaMode && (
              <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                QA cepat aktif: Reading dan Listening hanya Q1-Q5. Writing dan Speaking tetap memakai alur normal.
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center">
            <button
              onClick={() => setCurrentView('access-info')}
              className="bg-[#f8fbff] hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-[#e6eaf2] text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              <span>Lihat Access Code</span>
            </button>

            <button
              onClick={logoutCandidate}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-all"
              title="Ganti Perangkat / Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Overall Progress Tracker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="text-slate-600">Overall Test Progress</span>
            <span className="text-blue-700 bg-blue-50 px-3 py-1 rounded-full font-mono">
              {completedCount} / 4 Sections Completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/60">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / 4) * 100}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 font-medium pt-0.5">
            Kamu bebas memilih section mana pun terlebih dahulu dan menyelesaikan section lain di hari yang berbeda.
          </p>
        </div>

      </div>

      {/* 4 SECTION CARDS (FREEDOM OF CHOICE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sectionsConfig.map((sec) => {
          const itemProgress = sectionProgress[sec.type];
          const status = itemProgress.status;
          const isDone = status === 'COMPLETED' || status === 'AUTO_SUBMITTED';
          const isInProgress = status === 'IN_PROGRESS';
          const IconComp = sec.icon;

          return (
            <div
              key={sec.type}
              className={`bg-white rounded-3xl p-6 sm:p-7 border transition-all flex flex-col justify-between space-y-5 relative shadow-soft ${
                isDone
                  ? 'border-slate-200 opacity-90'
                  : isInProgress
                  ? 'border-blue-400 ring-2 ring-blue-100 shadow-md'
                  : 'border-[#e6eaf2] hover:border-blue-300 hover:shadow-soft-lg'
              }`}
            >
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 rounded-2xl ${sec.lightColor} ${sec.color} flex items-center justify-center`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  {getStatusBadge(status)}
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#08245c]">
                    {sec.title} Section
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {sec.description}
                  </p>
                </div>
              </div>

              {/* Meta & CTA Button */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duration: 60 Minutes</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Independent Timer</span>
                </div>

                {isDone ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-xs font-extrabold flex items-center justify-center space-x-1.5 cursor-not-allowed border border-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Section Completed ✓</span>
                  </button>
                ) : isInProgress ? (
                  <button
                    onClick={() => handleCardClick(sec.type)}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-btn transition-all active:scale-[0.98]"
                  >
                    <span>Continue Section</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleCardClick(sec.type)}
                    className="w-full py-3 rounded-2xl bg-[#f8fbff] hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-extrabold flex items-center justify-center space-x-1.5 border border-[#e6eaf2] transition-all group active:scale-[0.98]"
                  >
                    <span>Start Section</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* START SECTION CONFIRMATION MODAL (Part L Standard) */}
      {/* ========================================================================= */}
      {confirmingSection && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-[#e6eaf2] shadow-2xl text-center space-y-6">
            
            <button
              onClick={() => setConfirmingSection(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto ring-4 ring-blue-50">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-[#08245c]">
                Start {confirmingSection.toUpperCase()} Section?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                You will have <strong>60 minutes</strong> to complete this section.
              </p>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-semibold text-left">
                ⚠️ Once started, the timer will continue even if you close this browser or change tabs.
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-1">
              <button
                onClick={() => setConfirmingSection(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmStart}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all shadow-btn"
              >
                Start {confirmingSection.charAt(0).toUpperCase() + confirmingSection.slice(1)}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
