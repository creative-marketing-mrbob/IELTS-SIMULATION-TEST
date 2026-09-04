import React, { useState } from 'react';
import { useTest } from '../context/TestContext';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  MessageCircle, 
  ArrowRight, 
  ShieldCheck, 
  RotateCcw
} from 'lucide-react';

export const ResultPage: React.FC = () => {
  const { user, evaluation, resetAll, setCurrentView } = useTest();
  const [copied, setCopied] = useState(false);

  const resultId = evaluation?.resultId || user?.resultId || 'IELTS-2026-BAYU969';
  const fullName = user?.fullName || 'Candidate';

  const handleCopyId = () => {
    navigator.clipboard.writeText(resultId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // WhatsApp prefilled message matching Part AE specification
  const whatsappMessage = `Halo Admin Mr.BOB 👋

Saya sudah menyelesaikan semua section IELTS Simulation Test.

Nama:
${fullName}

Result ID:
${resultId}

Saya ingin meminta hasil IELTS Simulation saya.`;

  const whatsappUrl = `https://wa.me/6282212345678?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 py-12">
      
      {/* Completion Card matching reference style */}
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-10 border border-[#e6eaf2] shadow-soft-xl text-center space-y-7 relative overflow-hidden">
        
        {/* Top Header */}
        <div className="space-y-3 pt-2">
          
          <div className="w-16 h-16 bg-blue-50 rounded-2xl text-blue-600 flex items-center justify-center mx-auto ring-8 ring-blue-50/60 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-blue-600" />
          </div>

          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3.5 py-1 rounded-full text-xs font-bold border border-emerald-200">
            <span>Submission Successful</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#08245c] tracking-tight leading-tight">
            IELTS Simulation Completed
          </h1>

          <p className="text-sm sm:text-base font-bold text-slate-700">
            Your answers have been submitted successfully.
          </p>

          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Your IELTS diagnostic result is being prepared. Please contact our admin via WhatsApp to receive your detailed section reports.
          </p>

        </div>

        {/* Result ID Box */}
        <div className="bg-[#f8fbff] border border-[#cfe0ff] rounded-2xl p-5 sm:p-6 space-y-2.5">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            YOUR RESULT ID
          </div>

          <div className="flex items-center justify-center gap-2.5">
            <div className="font-mono text-xl sm:text-2xl font-black text-blue-700 tracking-wider bg-white px-5 py-2.5 rounded-xl border border-[#e6eaf2] shadow-sm">
              {resultId}
            </div>

            <button
              onClick={handleCopyId}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-blue-600" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Kandidat: <strong className="text-slate-700">{fullName}</strong>
          </p>
        </div>

        {/* PRIMARY CTA: GET MY RESULT VIA WHATSAPP */}
        <div className="space-y-3 pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full h-14 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-base sm:text-lg rounded-full shadow-btn hover:shadow-soft-lg transition-all flex items-center justify-center space-x-2.5 group active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5 fill-white" />
            <span>Get My Result via WhatsApp</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>

          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Klik tombol di atas untuk membuka chat WhatsApp resmi Mr.BOB IELTS Team dengan pesan terformat otomatis.
          </p>
        </div>

        {/* Footer Navigation */}
        <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <button
            onClick={() => setCurrentView('admin')}
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Result Portal</span>
          </button>

          <button
            onClick={resetAll}
            className="text-slate-400 hover:text-slate-600 flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Start a New Simulation</span>
          </button>
        </div>

      </div>

    </div>
  );
};
