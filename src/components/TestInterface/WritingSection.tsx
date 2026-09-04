import React from 'react';
import { useTest } from '../../context/TestContext';
import { writingTasks } from '../../data/writingQuestions';
import { 
  BarChart3, 
  FileText, 
  Send, 
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface WritingSectionProps {
  onSubmitRequest: () => void;
}

export const WritingSection: React.FC<WritingSectionProps> = ({ onSubmitRequest }) => {
  const { answers, updateWritingAnswer } = useTest();

  const task1 = writingTasks.find(t => t.taskId === 1) || writingTasks[0];
  const task2 = writingTasks.find(t => t.taskId === 2) || writingTasks[1];

  const task1Text = answers.writing.task1 || '';
  const task2Text = answers.writing.task2 || '';

  const words1 = task1Text.trim().split(/\s+/).filter(Boolean).length;
  const words2 = task2Text.trim().split(/\s+/).filter(Boolean).length;
  const totalWords = words1 + words2;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 pb-28">
      
      {/* Centered Vertical One-Page Container (Part T) */}
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Total Summary Status Banner */}
        <div className="bg-white rounded-2xl p-4 border border-[#e6eaf2] shadow-soft flex items-center justify-between text-xs font-extrabold text-slate-600">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-[#08245c]">Writing Section Tasks 1 & 2 (Continuous Single Page)</span>
          </div>

          <div className="flex items-center space-x-4 font-mono">
            <span>Task 1: <strong className={words1 >= 150 ? 'text-emerald-600' : 'text-slate-800'}>{words1} / 150 words</strong></span>
            <span className="text-slate-300">•</span>
            <span>Task 2: <strong className={words2 >= 250 ? 'text-emerald-600' : 'text-slate-800'}>{words2} / 250 words</strong></span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TASK 1: REPORT ON METAL PRICE CHANGES 2014 (ON TOP) */}
        {/* ========================================================================= */}
        <div className="space-y-5">
          
          {/* 1. TASK 1 INSTRUCTION & ORIGINAL CHART CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e6eaf2] shadow-soft space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                  Writing Task 1 (Report)
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-[#08245c] mt-2">
                  Average Monthly Change in Prices of Three Metals (Copper, Nickel, Zinc) in 2014
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold hidden sm:inline">
                Suggested: 20 mins (Min 150 words)
              </span>
            </div>

            <div className="bg-[#f8fbff] p-5 sm:p-6 rounded-2xl border border-[#e6eaf2] text-xs sm:text-sm text-slate-700 leading-7 font-medium whitespace-pre-line">
              {task1.prompt}
            </div>

            {/* Original Comparative Metal Percentage Graphic */}
            <div className="bg-[#f8fbff] p-5 rounded-2xl border border-[#e6eaf2] space-y-5">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Cambridge 18 Metal Percentage Change Graphic (2014)
              </span>

              {[
                { 
                  metal: 'Copper', 
                  jan: { val: 2.0, pct: 60, color: 'bg-amber-600', text: '+2.0%' },
                  jun: { val: 1.0, pct: 30, color: 'bg-amber-500', text: '+1.0%' },
                  dec: { val: 1.5, pct: 45, color: 'bg-amber-700', text: '+1.5%' }
                },
                { 
                  metal: 'Nickel', 
                  jan: { val: 6.0, pct: 90, color: 'bg-emerald-600', text: '+6.0%' },
                  jun: { val: -3.0, pct: 40, color: 'bg-rose-500', text: '-3.0%' },
                  dec: { val: 1.0, pct: 30, color: 'bg-emerald-500', text: '+1.0%' }
                },
                { 
                  metal: 'Zinc', 
                  jan: { val: 1.0, pct: 30, color: 'bg-blue-500', text: '+1.0%' },
                  jun: { val: -1.0, pct: 20, color: 'bg-rose-400', text: '-1.0%' },
                  dec: { val: 2.0, pct: 60, color: 'bg-blue-600', text: '+2.0%' }
                },
              ].map((row) => (
                <div key={row.metal} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="font-extrabold text-slate-900">{row.metal}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Jan: <strong>{row.jan.text}</strong> | Jun: <strong>{row.jun.text}</strong> | Dec: <strong>{row.dec.text}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-0.5">
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div className={`${row.jan.color} h-full rounded-full`} style={{ width: `${row.jan.pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500">Jan ({row.jan.text})</span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div className={`${row.jun.color} h-full rounded-full`} style={{ width: `${row.jun.pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500">Jun ({row.jun.text})</span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div className={`${row.dec.color} h-full rounded-full`} style={{ width: `${row.dec.pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500">Dec ({row.dec.text})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* 2. TASK 1 ESSAY TEXTAREA WITH LIVE WORD COUNT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                YOUR TASK 1 RESPONSE:
              </label>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                words1 >= 150 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
              }`}>
                Word Count: {words1} / 150 min
              </span>
            </div>

            <textarea
              rows={10}
              value={task1Text}
              onChange={(e) => updateWritingAnswer('task1', e.target.value)}
              placeholder="Type your Task 1 response here (minimum 150 words)..."
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="w-full p-5 rounded-3xl bg-white border border-[#e6eaf2] focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 text-slate-800 text-sm sm:text-base leading-relaxed font-sans resize-y shadow-soft transition-all"
            />
          </div>

        </div>

        {/* ========================================================================= */}
        {/* TASK 2: DISCURSIVE ESSAY ON AGEING POPULATION (BELOW TASK 1) */}
        {/* ========================================================================= */}
        <div className="space-y-5 pt-6 border-t border-slate-200">
          
          {/* 1. TASK 2 INSTRUCTION CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e6eaf2] shadow-soft space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                  Writing Task 2 (Discursive Essay)
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-[#08245c] mt-2">
                  Ageing Population — Advantages vs Disadvantages for Governments & Society
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold hidden sm:inline">
                Suggested: 40 mins (Min 250 words)
              </span>
            </div>

            <div className="bg-[#f8fbff] p-4.5 rounded-2xl border border-[#e6eaf2] text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
              {task2.prompt}
            </div>

          </div>

          {/* 2. TASK 2 ESSAY TEXTAREA WITH LIVE WORD COUNT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                YOUR TASK 2 RESPONSE:
              </label>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                words2 >= 250 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
              }`}>
                Word Count: {words2} / 250 min
              </span>
            </div>

            <textarea
              rows={12}
              value={task2Text}
              onChange={(e) => updateWritingAnswer('task2', e.target.value)}
              placeholder="Type your Task 2 response here (minimum 250 words)..."
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="w-full p-5 rounded-3xl bg-white border border-[#e6eaf2] focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 text-slate-800 text-sm sm:text-base leading-relaxed font-sans resize-y shadow-soft transition-all"
            />
          </div>

        </div>

        {/* BOTTOM SUBMIT SECTION ACTION */}
        <div className="pt-6 pb-12 flex items-center justify-center">
          <button
            onClick={onSubmitRequest}
            className="w-full max-w-md h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-base rounded-full shadow-btn hover:shadow-soft-lg transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <Send className="w-5 h-5" />
            <span>Submit Writing Section</span>
          </button>
        </div>

      </div>

    </div>
  );
};
