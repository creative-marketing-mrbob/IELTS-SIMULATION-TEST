import React from 'react';
import { Bookmark } from 'lucide-react';

interface QuestionPaletteProps {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<number, any>;
  flaggedQuestions: Set<number>;
  onSelect: (index: number) => void;
  onToggleFlag: (qId: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  totalQuestions,
  currentIndex,
  answers,
  flaggedQuestions,
  onSelect,
  onToggleFlag
}) => {
  return (
    <div className="bg-white border-t border-slate-200 py-3 px-4 sm:px-6 shadow-sm select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Flag Action & Legend */}
        <div className="flex items-center space-x-4 text-xs font-semibold text-slate-500">
          <button
            onClick={() => onToggleFlag(currentIndex + 1)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-all ${
              flaggedQuestions.has(currentIndex + 1)
                ? 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${flaggedQuestions.has(currentIndex + 1) ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{flaggedQuestions.has(currentIndex + 1) ? 'Flagged for Review' : 'Flag Question'}</span>
          </button>

          <div className="hidden md:flex items-center space-x-3 text-[11px]">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded bg-blue-600" />
              <span>Answered</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
              <span>Unanswered</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded bg-amber-400" />
              <span>Review Flag</span>
            </div>
          </div>
        </div>

        {/* Question Numbers Grid / Row */}
        <div className="flex items-center space-x-2 overflow-x-auto max-w-full py-1">
          {Array.from({ length: totalQuestions }, (_, i) => {
            const qId = i + 1;
            const isAnswered = !!answers[qId];
            const isCurrent = i === currentIndex;
            const isFlagged = flaggedQuestions.has(qId);

            return (
              <button
                key={qId}
                onClick={() => onSelect(i)}
                className={`relative w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center flex-shrink-0 ${
                  isCurrent
                    ? 'ring-2 ring-blue-600 ring-offset-2 bg-blue-600 text-white font-extrabold shadow-sm'
                    : isAnswered
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{qId}</span>
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
