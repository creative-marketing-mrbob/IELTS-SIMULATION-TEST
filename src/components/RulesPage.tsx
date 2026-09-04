import React from 'react';
import { useTest } from '../context/TestContext';
import { 
  Clock, 
  ListOrdered, 
  CheckCircle2, 
  Mic, 
  FileText, 
  ArrowRight
} from 'lucide-react';

export const RulesPage: React.FC = () => {
  const { setCurrentView } = useTest();

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 py-10">
      
      {/* Centered Instructions Card */}
      <div className="w-full max-w-[620px] bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-soft-xl relative overflow-hidden space-y-7">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#08245c] tracking-tight">
            Before You Start
          </h1>

          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
            Read the instructions carefully before continuing to your Test Dashboard.
          </p>
        </div>

        {/* 5 Clean Instruction Blocks */}
        <div className="space-y-3">
          
          {/* 1. Independent 60-Minute Section Timers */}
          <div className="bg-[#f8fbff] p-4 sm:p-4.5 rounded-2xl border border-[#e6eaf2] flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#08245c] uppercase tracking-wider">
                1. Independent Section Timers
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
                Each section (Reading, Listening, Writing, Speaking) has an independent 60-minute timer.
              </p>
            </div>
          </div>

          {/* 2. Freedom of Section Order */}
          <div className="bg-[#f8fbff] p-4 sm:p-4.5 rounded-2xl border border-[#e6eaf2] flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#08245c] uppercase tracking-wider">
                2. Freedom of Choice & Multi-Day Testing
              </h3>
              <p className="text-xs sm:text-sm text-blue-600 mt-0.5 font-extrabold">
                You can choose any section first and continue other sections on different days.
              </p>
            </div>
          </div>

          {/* 3. Auto-Save & Cross-Device Resume */}
          <div className="bg-[#f8fbff] p-4 sm:p-4.5 rounded-2xl border border-[#e6eaf2] flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#08245c] uppercase tracking-wider">
                3. Auto-Save & Resume
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
                Answers and audio recordings are saved continuously and can be resumed with your Access Code.
              </p>
            </div>
          </div>

          {/* 4. Audio Requirement */}
          <div className="bg-[#f8fbff] p-4 sm:p-4.5 rounded-2xl border border-[#e6eaf2] flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#08245c] uppercase tracking-wider">
                4. Audio Requirement
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
                For Speaking, ensure your microphone is active and your voice is clear.
              </p>
            </div>
          </div>

          {/* 5. Result Information */}
          <div className="bg-[#f8fbff] p-4 sm:p-4.5 rounded-2xl border border-[#e6eaf2] flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#08245c] uppercase tracking-wider">
                5. Result Information
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
                Your score will not be shown directly. Contact admin via WhatsApp after completing all 4 sections to receive your diagnostic report.
              </p>
            </div>
          </div>

        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="w-full h-14 bg-gradient-to-r from-[#1f5cff] to-[#19a7ff] hover:from-[#1346e6] hover:to-[#1f5cff] text-white font-extrabold text-base rounded-full shadow-btn hover:shadow-soft-lg transition-all flex items-center justify-center space-x-2 group active:scale-[0.98]"
          >
            <span>Go to Test Dashboard</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>

    </div>
  );
};
