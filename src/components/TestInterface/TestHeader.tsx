import React, { useState, useEffect } from 'react';
import { useTest } from '../../context/TestContext';
import { 
  Clock, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic, 
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Send
} from 'lucide-react';
import { ModuleType } from '../../types/ielts';

interface TestHeaderProps {
  onSubmitRequest: () => void;
}

export const TestHeader: React.FC<TestHeaderProps> = ({ onSubmitRequest }) => {
  const { 
    activeSectionType, 
    setCurrentView, 
    getSectionRemainingSeconds, 
    autoTimeoutSection,
    isSaving,
    isQaMode
  } = useTest();

  const secType: ModuleType = activeSectionType || 'reading';
  const [remainingSec, setRemainingSec] = useState<number>(() => getSectionRemainingSeconds(secType));

  // 1-second interval ticker synchronized with server deadline (Part M)
  useEffect(() => {
    const updateTime = () => {
      const remaining = getSectionRemainingSeconds(secType);
      setRemainingSec(remaining);
      if (remaining <= 0) {
        // Automatically timeout & submit (Part N)
        autoTimeoutSection(secType);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [secType, getSectionRemainingSeconds, autoTimeoutSection]);

  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const isUrgent = remainingSec <= 300; // Less than 5 minutes

  const getModuleMeta = () => {
    switch (secType) {
      case 'reading':
        return {
          title: 'Reading Section',
          subtitle: isQaMode ? 'QA Mode: Cambridge 17 Q1-Q5' : 'Cambridge 17 Academic Test 4 (40 Questions)',
          icon: BookOpen,
          color: 'text-blue-600',
          bg: 'bg-blue-50'
        };
      case 'listening':
        return {
          title: 'Listening Section',
          subtitle: isQaMode ? 'QA Mode: Cambridge 18 Q1-Q5' : 'Cambridge 18 Audio Test 4 (40 Questions)',
          icon: Headphones,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50'
        };
      case 'writing':
        return {
          title: 'Writing Section',
          subtitle: 'Task 1 (150 words) & Task 2 (250 words)',
          icon: PenTool,
          color: 'text-blue-600',
          bg: 'bg-blue-50'
        };
      case 'speaking':
        return {
          title: 'Speaking Section',
          subtitle: isQaMode ? 'QA Mode: 5 speaking responses' : 'Cambridge 18 Speaking Test 4 (Parts 1, 2, 3)',
          icon: Mic,
          color: 'text-red-500',
          bg: 'bg-red-50'
        };
    }
  };

  const meta = getModuleMeta();
  const Icon = meta.icon;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e6eaf2] shadow-sm select-none">
      <div className="max-w-5xl mx-auto px-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 sm:h-18 sm:flex-nowrap sm:py-0">
          
          {/* Left: Exit to Dashboard & Section Meta */}
          <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="h-10 shrink-0 rounded-xl bg-[#f8fbff] px-2 hover:bg-slate-100 text-slate-600 border border-[#e6eaf2] transition-all flex items-center space-x-1"
              title="Kembali ke Test Dashboard (Jawaban tersimpan otomatis)"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold hidden sm:inline">Dashboard</span>
            </button>

            <div className="flex items-center space-x-2.5">
              <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center border border-slate-100`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-sm sm:text-base font-extrabold text-[#08245c] tracking-tight">
                  {meta.title}
                </h2>
                <span className="line-clamp-2 text-[11px] font-medium text-slate-400 block -mt-0.5 sm:line-clamp-none">
                  {meta.subtitle}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Autosave Indicator, Countdown Timer, Submit CTA */}
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            
            {/* Autosave Status Pill */}
            <div className="hidden sm:flex items-center space-x-1 text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              {isSaving ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Saved ✓</span>
                </>
              )}
            </div>

            {/* Independent 60-Minute Countdown Timer Pill */}
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-bold font-mono shadow-sm transition-colors ${
              isUrgent
                ? 'bg-red-50 text-red-700 border-red-300 animate-pulse ring-2 ring-red-100'
                : 'bg-white text-[#08245c] border-[#cfe0ff]'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
              <span>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            {/* Submit Section Button */}
            <button
              onClick={onSubmitRequest}
              className="h-10 shrink-0 px-4 sm:px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-sm transition-all flex items-center space-x-1.5 active:scale-95 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="sm:hidden">Submit</span>
              <span className="hidden sm:inline">Submit Section</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
