import React, { useState } from 'react';
import { useTest } from '../context/TestContext';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  MessageCircle, 
  ArrowRight, 
  KeyRound, 
  BookmarkCheck 
} from 'lucide-react';

export const AccessInfoScreen: React.FC = () => {
  const { user, setCurrentView } = useTest();
  const [copied, setCopied] = useState(false);

  const resultId = user?.resultId || 'IELTS-2026-USER001';
  const accessCode = user?.accessCode || 'XXXX-XXXX';
  const fullName = user?.fullName || 'Candidate';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappMessage = `Halo ${fullName} 👋

Ini akses IELTS Simulation kamu.

Result ID:
${resultId}

Access Code:
${accessCode}

Simpan kode ini untuk melanjutkan IELTS Simulation kapan pun.`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 py-12">
      
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-10 border border-[#e6eaf2] shadow-soft-xl text-center space-y-7 relative overflow-hidden">
        
        {/* Top Header */}
        <div className="space-y-3 pt-2">
          
          <div className="w-16 h-16 bg-blue-50 rounded-2xl text-blue-600 flex items-center justify-center mx-auto ring-8 ring-blue-50/60 shadow-sm">
            <KeyRound className="w-8 h-8 text-blue-600" />
          </div>

          <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3.5 py-1 rounded-full text-xs font-bold border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Akses Test Dibuat</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#08245c] tracking-tight leading-tight">
            Simpan Akses Test Kamu
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Simpan kode ini supaya kamu bisa melanjutkan IELTS Simulation kapan pun, termasuk dari perangkat lain.
          </p>

        </div>

        {/* Credentials Card */}
        <div className="bg-[#f8fbff] border border-[#cfe0ff] rounded-2xl p-5 sm:p-6 space-y-4 text-left">
          
          {/* Result ID */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Result ID
              </span>
              <strong className="font-mono text-base sm:text-lg text-slate-800">
                {resultId}
              </strong>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-bold">
              ID Pelaporan
            </span>
          </div>

          {/* Access Code */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">
                Access Code (Kode Masuk)
              </span>
              <strong className="font-mono text-xl sm:text-2xl font-black text-blue-700 tracking-wider">
                {accessCode}
              </strong>
            </div>

            <button
              onClick={handleCopyCode}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-blue-600" />}
              <span>{copied ? 'Tersalin' : 'Copy Access Code'}</span>
            </button>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-1">
          
          {/* Send Access to WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-sm transition-all flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Send Access to WhatsApp</span>
          </a>

          {/* Continue to Test Dashboard */}
          <button
            onClick={() => setCurrentView('dashboard')}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-base rounded-full shadow-btn hover:shadow-soft-lg transition-all flex items-center justify-center space-x-2 group active:scale-[0.98]"
          >
            <span>Continue to Test Dashboard</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Pada perangkat dan browser yang sama, sesi kamu akan tersimpan otomatis.
          </p>

        </div>

      </div>

    </div>
  );
};
