import React, { useState } from 'react';
import { useTest } from '../../context/TestContext';
import { TestHeader } from './TestHeader';
import { ReadingSection } from './ReadingSection';
import { ListeningSection } from './ListeningSection';
import { WritingSection } from './WritingSection';
import { SpeakingSection } from './SpeakingSection';
import { 
  X, 
  Send, 
  AlertCircle, 
  HelpCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { ModuleType } from '../../types/ielts';

export const TestInterface: React.FC = () => {
  const { 
    activeSectionType, 
    submitSectionAsync, 
    answers,
    isQaMode,
    isSubmittingSection
  } = useTest();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Submission confirmation modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const secType: ModuleType = activeSectionType || 'reading';

  // Calculate answered vs unanswered breakdown for the confirmation modal (Part Z)
  const getCounts = () => {
    switch (secType) {
      case 'reading': {
        const total = isQaMode ? 5 : 40;
        const answered = Object.keys(answers.reading).filter(k => Number(k) <= total && !!answers.reading[Number(k)]?.trim()).length;
        return { answered, unanswered: total - answered, total, label: 'Reading Section' };
      }
      case 'listening': {
        const total = isQaMode ? 5 : 40;
        const answered = Object.keys(answers.listening).filter(k => Number(k) <= total && !!answers.listening[Number(k)]?.trim()).length;
        return { answered, unanswered: total - answered, total, label: 'Listening Section' };
      }
      case 'writing': {
        const total = 2;
        let answered = 0;
        if (answers.writing.task1?.trim()) answered++;
        if (answers.writing.task2?.trim()) answered++;
        return { answered, unanswered: total - answered, total, label: 'Writing Section' };
      }
      case 'speaking': {
        const total = isQaMode ? 5 : 3;
        const qaKeys = ['part1_q1_audio', 'part1_q2_audio', 'part2_audio', 'part3_q1_audio', 'part3_q2_audio'] as const;
        const answered = isQaMode
          ? qaKeys.filter(key => Boolean(answers.speaking[key])).length
          : [answers.speaking.part1Audio, answers.speaking.part2Audio, answers.speaking.part3Audio].filter(Boolean).length;
        return { answered, unanswered: total - answered, total, label: 'Speaking Section' };
      }
    }
  };

  const counts = getCounts();

  const handleConfirmSubmit = async () => {
    setSubmitError(null);
    const result = await submitSectionAsync(secType);
    if (result.success) {
      setShowSubmitModal(false);
    } else {
      setSubmitError(result.error || 'Beberapa jawaban belum berhasil disimpan. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbff] flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Sticky Test Header */}
      <TestHeader onSubmitRequest={() => setShowSubmitModal(true)} />

      {/* Main Single-Page Section Layout */}
      <main className="flex-1">
        {secType === 'reading' && <ReadingSection onSubmitRequest={() => setShowSubmitModal(true)} />}
        {secType === 'listening' && <ListeningSection onSubmitRequest={() => setShowSubmitModal(true)} />}
        {secType === 'writing' && <WritingSection onSubmitRequest={() => setShowSubmitModal(true)} />}
        {secType === 'speaking' && <SpeakingSection onSubmitRequest={() => setShowSubmitModal(true)} />}
      </main>

      {/* ========================================================================= */}
      {/* SECTION SUBMIT CONFIRMATION MODAL (Part Z Standard) */}
      {/* ========================================================================= */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-[#e6eaf2] shadow-2xl text-center space-y-5">
            
            <button
              onClick={() => setShowSubmitModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-4 ring-emerald-50">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-[#08245c]">
                Submit {counts.label}?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                After submitting this section, your answers cannot be changed.
              </p>
            </div>

            {/* Answered vs Unanswered Summary Box */}
            <div className="bg-[#f8fbff] rounded-2xl p-4 border border-[#e6eaf2] grid grid-cols-2 gap-3 text-left">
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block">Answered</span>
                <strong className="text-emerald-700 text-base font-extrabold font-mono">
                  {counts.answered} / {counts.total}
                </strong>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block">Unanswered</span>
                <strong className={`text-base font-extrabold font-mono ${counts.unanswered > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {counts.unanswered}
                </strong>
              </div>
            </div>

            {submitError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left text-xs font-bold leading-relaxed text-rose-700 whitespace-pre-line">
                {submitError}
              </div>
            )}

            <div className="flex items-center space-x-3 pt-1">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmittingSection}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Go Back
              </button>

              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmittingSection}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold transition-all shadow-btn"
              >
                {isSubmittingSection ? 'Submitting...' : `Submit ${secType.charAt(0).toUpperCase() + secType.slice(1)}`}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
