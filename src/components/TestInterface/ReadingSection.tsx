import React from 'react';
import { useTest } from '../../context/TestContext';
import { readingPassages, readingQuestions } from '../../data/readingQuestions';
import { 
  Check, 
  Flag, 
  PenTool, 
  Send, 
  BookOpen, 
  Bookmark 
} from 'lucide-react';

interface ReadingSectionProps {
  onSubmitRequest: () => void;
}

export const ReadingSection: React.FC<ReadingSectionProps> = ({ onSubmitRequest }) => {
  const { answers, updateReadingAnswer, toggleFlagQuestion, isQaMode, qaQuestionLimit } = useTest();

  const flaggedList = answers.readingFlagged || [];
  const visibleQuestions = qaQuestionLimit ? readingQuestions.filter(q => q.id <= qaQuestionLimit) : readingQuestions;
  const visiblePassages = readingPassages.filter(passage => visibleQuestions.some(q => q.passageId === passage.id));
  const questionTotal = visibleQuestions.length;

  const scrollToQuestion = (qNum: number) => {
    const el = document.getElementById(`reading-q-${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 pb-28">
      
      {/* Centered Vertical One-Page Container */}
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* STICKY COMPACT QUESTION NAVIGATOR (Part Q: 1..40 with Answered/Unanswered/Flagged states) */}
        <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-[#e6eaf2] shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-600 border-b border-slate-100 pb-2">
            <span className="flex items-center space-x-1.5 text-[#08245c]">
              <Bookmark className="w-3.5 h-3.5 text-blue-600" />
              <span>{isQaMode ? 'QA Mode: Questions 1-5 Navigator' : 'Questions 1-40 Navigator'}</span>
            </span>
            
            <div className="flex items-center space-x-3 text-[11px] font-bold">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-600" />
                <span className="text-slate-600">Answered ({visibleQuestions.filter(q => !!answers.reading[q.id]).length}/{questionTotal})</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                <span className="text-slate-600">Flagged ({flaggedList.length})</span>
              </span>
            </div>
          </div>

          {/* Quick-Jump Grid */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-0.5">
            {visibleQuestions.map((q) => {
              const hasAns = !!answers.reading[q.id];
              const isFlagged = flaggedList.includes(q.id);

              return (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(q.id)}
                  className={`w-7 h-7 rounded-lg text-xs font-extrabold flex-shrink-0 transition-all flex items-center justify-center relative ${
                    isFlagged
                      ? 'bg-amber-100 text-amber-900 border border-amber-400'
                      : hasAns
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={`Jump to Question ${q.id}`}
                >
                  <span>{q.id}</span>
                  {isFlagged && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PASSAGES & QUESTIONS IN ONE CONTINUOUS VERTICAL STACK (Part P) */}
        {/* ========================================================================= */}
        {visiblePassages.map((passage) => {
          const passageQuestions = visibleQuestions.filter(q => q.passageId === passage.id);

          return (
            <div key={passage.id} className="space-y-6">
              
              {/* 1. FULL PASSAGE TEXT CARD (ON TOP) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e6eaf2] shadow-soft space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                    Passage {passage.id} of 3
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#08245c] tracking-tight mt-2">
                    {passage.title}
                  </h2>
                  {passage.subtitle && (
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                      {passage.subtitle}
                    </p>
                  )}
                </div>

                {/* Verbatim Paragraphs */}
                <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
                  {passage.content.map((para, pIdx) => (
                    <div key={pIdx} className="flex items-start space-x-3">
                      <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-0.5 select-none flex-shrink-0">
                        {String.fromCharCode(65 + pIdx)}
                      </span>
                      <p className="flex-1 text-slate-700 leading-relaxed font-normal">
                        {para}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. QUESTIONS FOR THIS PASSAGE */}
              <div className="space-y-5">
                <div className="flex items-center space-x-2 px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Questions for Passage {passage.id} (Q{passageQuestions[0]?.id} – Q{passageQuestions[passageQuestions.length - 1]?.id}):
                  </span>
                </div>

                {passageQuestions.map((q) => {
                  const selectedAnswer = answers.reading[q.id] || '';
                  const isFlagged = flaggedList.includes(q.id);

                  return (
                    <div
                      key={q.id}
                      id={`reading-q-${q.id}`}
                      className={`bg-white rounded-3xl p-7 sm:p-8 border transition-all shadow-soft space-y-5 ${
                        isFlagged ? 'border-amber-300 ring-2 ring-amber-100' : 'border-[#e6eaf2]'
                      }`}
                    >
                      {/* Question Header & Flag Toggle */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                            Question {q.id}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            {q.instruction || (q.type === 'true-false-not-given' ? 'True / False / Not Given' : 'Answer Question')}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleFlagQuestion('reading', q.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                            isFlagged
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-600 text-amber-600' : 'text-slate-400'}`} />
                          <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
                        </button>
                      </div>

                      {/* Question Prompt */}
                      <h4 className="text-base sm:text-lg font-extrabold text-[#08245c] leading-relaxed">
                        {q.question}
                      </h4>

                      {/* Answer Input Controls */}
                      <div className="pt-1">
                        
                        {/* A. TRUE / FALSE / NOT GIVEN (LARGE ROUNDED BUTTONS) */}
                        {q.type === 'true-false-not-given' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            
                            {/* TRUE */}
                            <button
                              onClick={() => updateReadingAnswer(q.id, 'TRUE')}
                              className={`py-3.5 px-4 rounded-2xl border-2 font-black text-sm tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-sm ${
                                selectedAnswer.toUpperCase() === 'TRUE'
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md ring-4 ring-emerald-100 scale-[1.01]'
                                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              <span>TRUE</span>
                              {selectedAnswer.toUpperCase() === 'TRUE' && <Check className="w-4 h-4 stroke-[3]" />}
                            </button>

                            {/* FALSE */}
                            <button
                              onClick={() => updateReadingAnswer(q.id, 'FALSE')}
                              className={`py-3.5 px-4 rounded-2xl border-2 font-black text-sm tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-sm ${
                                selectedAnswer.toUpperCase() === 'FALSE'
                                  ? 'bg-rose-600 border-rose-600 text-white shadow-md ring-4 ring-rose-100 scale-[1.01]'
                                  : 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100'
                              }`}
                            >
                              <span>FALSE</span>
                              {selectedAnswer.toUpperCase() === 'FALSE' && <Check className="w-4 h-4 stroke-[3]" />}
                            </button>

                            {/* NOT GIVEN */}
                            <button
                              onClick={() => updateReadingAnswer(q.id, 'NOT GIVEN')}
                              className={`py-3.5 px-4 rounded-2xl border-2 font-black text-sm tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-sm ${
                                selectedAnswer.toUpperCase() === 'NOT GIVEN'
                                  ? 'bg-amber-500 border-amber-500 text-white shadow-md ring-4 ring-amber-100 scale-[1.01]'
                                  : 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100'
                              }`}
                            >
                              <span>NOT GIVEN</span>
                              {selectedAnswer.toUpperCase() === 'NOT GIVEN' && <Check className="w-4 h-4 stroke-[3]" />}
                            </button>

                          </div>
                        ) : q.options && q.options.length > 0 ? (
                          /* B. MULTIPLE CHOICE / MATCHING OPTIONS */
                          <div className="space-y-2.5">
                            {q.options.map((option) => {
                              const isSelected = selectedAnswer.toUpperCase() === option.label.toUpperCase();

                              return (
                                <button
                                  key={option.label}
                                  onClick={() => updateReadingAnswer(q.id, option.label)}
                                  className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start space-x-3 group ${
                                    isSelected
                                      ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600 shadow-sm'
                                      : 'bg-white border-[#e6eaf2] hover:border-blue-300 hover:bg-[#f8fbff]'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700'
                                  }`}>
                                    {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : option.label}
                                  </div>
                                  <div className="flex-1 text-xs sm:text-sm font-semibold text-slate-800 leading-snug pt-0.5">
                                    {option.text}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* C. SENTENCE / SUMMARY COMPLETION (ONE-WORD INPUT) */
                          <div className="relative">
                            <input
                              type="text"
                              value={selectedAnswer}
                              onChange={(e) => updateReadingAnswer(q.id, e.target.value)}
                              className="w-full p-3.5 pl-10 rounded-xl bg-[#f8fbff] border border-[#e6eaf2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-900 text-sm"
                            />
                            <PenTool className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}

        {/* BOTTOM SUBMIT SECTION ACTION */}
        <div className="pt-6 pb-12 flex items-center justify-center">
          <button
            onClick={onSubmitRequest}
            className="w-full max-w-md h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-base rounded-full shadow-btn hover:shadow-soft-lg transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <Send className="w-5 h-5" />
            <span>Submit Reading Section</span>
          </button>
        </div>

      </div>

    </div>
  );
};
