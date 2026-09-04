import React, { useState, useEffect, useRef } from 'react';
import { useTest } from '../../context/TestContext';
import { listeningSections, listeningQuestions } from '../../data/listeningQuestions';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Headphones, 
  Check, 
  Flag, 
  PenTool, 
  Send,
  Bookmark
} from 'lucide-react';

interface ListeningSectionProps {
  onSubmitRequest: () => void;
}

export const ListeningSection: React.FC<ListeningSectionProps> = ({ onSubmitRequest }) => {
  const { answers, updateListeningAnswer, toggleFlagQuestion, isQaMode, qaQuestionLimit } = useTest();

  const flaggedList = answers.listeningFlagged || [];
  const realCambridgeAudioSrc = '/audio/Cambridge_IELTS_18_-_Listening_Test_4.mp3';
  const visibleQuestions = qaQuestionLimit ? listeningQuestions.filter(q => q.id <= qaQuestionLimit) : listeningQuestions;
  const visibleSections = listeningSections.filter(part => visibleQuestions.some(q => q.sectionId === part.id));
  const questionTotal = visibleQuestions.length;

  // Continuous Audio Player state across the entire 4-part Listening section
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [totalAudioDurationSec, setTotalAudioDurationSec] = useState(1800);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncTime = () => setCurrentTimeSec(audio.currentTime);
    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTotalAudioDurationSec(audio.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('loadedmetadata', syncDuration);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('loadedmetadata', syncDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio.currentTime >= totalAudioDurationSec) {
        audio.currentTime = 0;
      }
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const scrollToQuestion = (qNum: number) => {
    const el = document.getElementById(`listening-q-${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 pb-28">
      
      {/* Centered Vertical One-Page Container */}
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* 1. STICKY CONTINUOUS AUDIO PLAYER (Part R & S: Never restarts during scrolling) */}
        <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-[#e6eaf2] shadow-soft space-y-3">
          <audio ref={audioRef} src={realCambridgeAudioSrc} preload="metadata" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  Cambridge IELTS 18 Listening Test 4
                </span>
                <h3 className="text-sm font-extrabold text-[#08245c]">
                  Continuous Audio Track: Cambridge_IELTS_18_-_Listening_Test_4.mp3
                </h3>
              </div>
            </div>

            {/* Answered Counter */}
            <div className="text-[11px] font-bold text-slate-500 font-mono">
              Answered: <strong className="text-indigo-700">{visibleQuestions.filter(q => !!answers.listening[q.id]).length}/{questionTotal}</strong>
            </div>
          </div>

          {/* Audio Controls Bar */}
          <div className="bg-[#f8fbff] rounded-2xl p-3 sm:p-4 border border-[#e6eaf2] flex items-center space-x-3">
            <button
              onClick={handleTogglePlay}
              className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center flex-shrink-0 active:scale-95 transition-all shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                setCurrentTimeSec(0);
                setIsPlaying(false);
              }}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex-shrink-0"
              title="Restart Audio"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Timeline Progress */}
            <div className="flex-1 space-y-1">
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                  style={{ width: `${(currentTimeSec / totalAudioDurationSec) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-500">
                <span>{formatSec(currentTimeSec)}</span>
                <span>{formatSec(totalAudioDurationSec)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex-shrink-0"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Question Navigator Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pt-1">
            {visibleQuestions.map((q) => {
              const hasAns = !!answers.listening[q.id];
              const isFlagged = flaggedList.includes(q.id);

              return (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(q.id)}
                  className={`w-6 h-6 rounded-lg text-[10px] font-extrabold flex-shrink-0 transition-all flex items-center justify-center relative ${
                    isFlagged
                      ? 'bg-amber-100 text-amber-900 border border-amber-400'
                      : hasAns
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={`Jump to Question ${q.id}`}
                >
                  <span>{q.id}</span>
                  {isFlagged && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4 PARTS IN ONE CONTINUOUS VERTICAL STACK (Part R) */}
        {/* ========================================================================= */}
        {visibleSections.map((part) => {
          const partQuestions = visibleQuestions.filter(q => q.sectionId === part.id);

          return (
            <div key={part.id} className="space-y-5">
              
              {/* Part Header Card */}
              <div className="bg-white rounded-3xl p-6 border border-[#e6eaf2] shadow-soft space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md">
                    Part {part.id} of 4
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    Questions {partQuestions[0]?.id}–{partQuestions[partQuestions.length - 1]?.id}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#08245c]">
                  {part.title}
                </h3>
                {part.context && (
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    {part.context}
                  </p>
                )}
              </div>

              {/* Part Questions */}
              <div className="space-y-4">
                {partQuestions.map((q) => {
                  const selectedAnswer = answers.listening[q.id] || '';
                  const isFlagged = flaggedList.includes(q.id);

                  return (
                    <div
                      key={q.id}
                      id={`listening-q-${q.id}`}
                      className={`bg-white rounded-3xl p-7 sm:p-8 border transition-all shadow-soft space-y-5 ${
                        isFlagged ? 'border-amber-300 ring-2 ring-amber-100' : 'border-[#e6eaf2]'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                            Question {q.id}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            {q.instruction || `(Part ${part.id})`}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleFlagQuestion('listening', q.id)}
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

                      {/* Prompt */}
                      <h4 className="text-sm sm:text-base font-extrabold text-[#08245c] leading-relaxed">
                        {q.question}
                      </h4>

                      {/* Answer Input Controls */}
                      <div className="pt-1">
                        {q.options && q.options.length > 0 ? (
                          /* Multiple Choice / Matching Options */
                          <div className="space-y-2">
                            {q.options.map((option) => {
                              const isSelected = selectedAnswer.toUpperCase() === option.label.toUpperCase();

                              return (
                                <button
                                  key={option.label}
                                  onClick={() => updateListeningAnswer(q.id, option.label)}
                                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start space-x-3 group ${
                                    isSelected
                                      ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-600 shadow-sm'
                                      : 'bg-white border-[#e6eaf2] hover:border-indigo-300 hover:bg-[#f8fbff]'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-700'
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
                          /* Text Input for Sentence / Notes Completion (e.g. Part 1 & 4) */
                          <div className="relative">
                            <input
                              type="text"
                              value={selectedAnswer}
                              onChange={(e) => updateListeningAnswer(q.id, e.target.value)}
                              className="w-full p-3.5 pl-10 rounded-xl bg-[#f8fbff] border border-[#e6eaf2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-slate-900 text-sm"
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
            <span>Submit Listening Section</span>
          </button>
        </div>

      </div>

    </div>
  );
};
