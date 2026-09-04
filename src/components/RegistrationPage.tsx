import React, { useState } from 'react';
import { useTest } from '../context/TestContext';
import { StudentStatus, TargetBand } from '../types/ielts';
import { 
  User, 
  Phone, 
  Calendar, 
  GraduationCap, 
  Target, 
  ArrowRight, 
  Clock, 
  Wifi, 
  MessageSquare,
  KeyRound,
  X,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const RegistrationPage: React.FC = () => {
  const { registerUser, resumeSessionWithCode } = useTest();

  const [formData, setFormData] = useState({
    fullName: '',
    whatsapp: '',
    age: '',
    currentStatus: 'University Student' as StudentStatus,
    targetScore: 'Band 6.5' as TargetBand
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Resume Modal State (Part H: Different Device Resume)
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeWhatsapp, setResumeWhatsapp] = useState('');
  const [resumeAccessCode, setResumeAccessCode] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [isResuming, setIsResuming] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = 'Nama lengkap wajib diisi';
    if (!formData.whatsapp.trim()) {
      errs.whatsapp = 'Nomor WhatsApp wajib diisi';
    } else if (!/^[0-9+ ]{8,16}$/.test(formData.whatsapp.trim())) {
      errs.whatsapp = 'Masukkan nomor WhatsApp yang valid (contoh: 08123456789)';
    }
    if (!formData.age.trim()) {
      errs.age = 'Usia wajib diisi';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await registerUser(formData);
  };

  const handleResumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResumeError('');
    if (!resumeWhatsapp.trim() || !resumeAccessCode.trim()) {
      setResumeError('Nomor WhatsApp dan Access Code wajib diisi.');
      return;
    }

    setIsResuming(true);
    const result = await resumeSessionWithCode(resumeWhatsapp, resumeAccessCode);
    setIsResuming(false);

    if (!result.success) {
      setResumeError(result.error || 'Akses ditolak. Periksa kembali nomor WhatsApp dan Access Code.');
    } else {
      setShowResumeModal(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 py-10">
      
      {/* Centered Registration Card matching reference visual language */}
      <div className="w-full max-w-[560px] bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-soft-xl relative overflow-hidden">
        
        {/* Top Brand Tag */}
        <div className="text-center space-y-2.5 mb-8">
          
          <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-600 px-3.5 py-1 rounded-full text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Diagnostic Level Test</span>
            <span className="text-slate-300">•</span>
            <span className="text-red-500 font-extrabold">4 Skills</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#08245c] tracking-tight">
            IELTS Simulation Test
          </h1>

          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Tes kemampuan IELTS-mu untuk mengetahui prediction IELTS Band kamu.
          </p>

        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#08245c] flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Full Name <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Bayu Aji"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              className={`w-full h-14 px-4 text-sm rounded-xl bg-[#f8fbff] border ${
                errors.fullName ? 'border-red-400 bg-red-50/30' : 'border-[#e6eaf2]'
              } focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-900`}
            />
            {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName}</p>}
          </div>

          {/* 2. WhatsApp Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#08245c] flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Number <span className="text-red-500">*</span></span>
            </label>
            <input
              type="tel"
              placeholder="08xxxxxxxxxx"
              value={formData.whatsapp}
              onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
              className={`w-full h-14 px-4 text-sm rounded-xl bg-[#f8fbff] border ${
                errors.whatsapp ? 'border-red-400 bg-red-50/30' : 'border-[#e6eaf2]'
              } focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-900`}
            />
            {errors.whatsapp && <p className="text-xs text-red-500 font-medium">{errors.whatsapp}</p>}
          </div>

          {/* 3 & 4. Current Status & Age (50/50 Equal Height) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Current Status */}
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-bold text-[#08245c] flex items-center space-x-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span>Current Status</span>
              </label>
              <select
                value={formData.currentStatus}
                onChange={e => setFormData({ ...formData, currentStatus: e.target.value as StudentStatus })}
                className="w-full h-14 px-4 text-sm rounded-xl bg-[#f8fbff] border border-[#e6eaf2] focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-900"
              >
                <option value="High School Student">High School Student</option>
                <option value="University Student">University Student</option>
                <option value="Fresh Graduate">Fresh Graduate</option>
                <option value="Working Professional">Working Professional</option>
              </select>
            </div>

            {/* Age */}
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-bold text-[#08245c] flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Age <span className="text-red-500">*</span></span>
              </label>
              <input
                type="number"
                min="12"
                max="80"
                placeholder="Contoh: 21"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
                className={`w-full h-14 px-4 text-sm rounded-xl bg-[#f8fbff] border ${
                  errors.age ? 'border-red-400 bg-red-50/30' : 'border-[#e6eaf2]'
                } focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-900`}
              />
              {errors.age && <p className="text-xs text-red-500 font-medium">{errors.age}</p>}
            </div>

          </div>

          {/* 5. IELTS Target Score */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#08245c] flex items-center space-x-1.5">
              <Target className="w-3.5 h-3.5 text-red-500" />
              <span>IELTS Target Score</span>
            </label>
            <select
              value={formData.targetScore}
              onChange={e => setFormData({ ...formData, targetScore: e.target.value as TargetBand })}
              className="w-full h-14 px-4 text-sm rounded-xl bg-[#f8fbff] border border-[#e6eaf2] focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-900"
            >
              <option value="Band 5.0">Band 5.0</option>
              <option value="Band 6.0">Band 6.0</option>
              <option value="Band 6.5">Band 6.5</option>
              <option value="Band 7.0+">Band 7.0+</option>
              <option value="Not Sure">Not Sure</option>
            </select>
          </div>

          {/* Main CTA Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-[#1f5cff] to-[#19a7ff] hover:from-[#1346e6] hover:to-[#1f5cff] text-white font-extrabold text-base rounded-full shadow-btn hover:shadow-soft-lg transition-all flex items-center justify-center space-x-2 group active:scale-[0.98]"
            >
              <span>Start IELTS Simulation</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </form>

        {/* Secondary Resume Entry Button (Part H) */}
        <div className="mt-5 p-4 rounded-2xl bg-[#f8fbff] border border-[#cfe0ff] text-center space-y-2">
          <p className="text-xs text-slate-600 font-bold">
            Sudah pernah mulai test sebelumnya?
          </p>
          <button
            type="button"
            onClick={() => setShowResumeModal(true)}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200 transition-all flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Lanjutkan IELTS Simulation (Pakai Access Code)</span>
          </button>
        </div>

        {/* Short Note Below */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>Setiap section memiliki timer mandiri 60 menit</span>
          </div>
          <div className="flex items-center space-x-2">
            <Wifi className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Progres otomatis tersimpan di cloud & bisa dilanjutkan kapan pun</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* RESUME PROGRESS MODAL (Part H: Different Browser / Device Resume) */}
      {/* ========================================================================= */}
      {showResumeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-[#e6eaf2] shadow-2xl space-y-5">
            
            <button
              onClick={() => {
                setShowResumeModal(false);
                setResumeError('');
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pr-6">
              <div className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Pemulihan Sesi Test</span>
              </div>
              <h3 className="text-xl font-extrabold text-[#08245c]">
                Lanjutkan IELTS Simulation
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Masukkan nomor WhatsApp dan Access Code yang kamu dapat saat pendaftaran awal.
              </p>
            </div>

            <form onSubmit={handleResumeSubmit} className="space-y-3.5">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nomor WhatsApp</label>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={resumeWhatsapp}
                  onChange={e => setResumeWhatsapp(e.target.value)}
                  className="w-full h-12 px-3.5 text-xs rounded-xl bg-[#f8fbff] border border-[#e6eaf2] focus:bg-white focus:outline-none focus:border-blue-600 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Access Code</label>
                <input
                  type="text"
                  placeholder="Contoh: X7KM-29PQ"
                  value={resumeAccessCode}
                  onChange={e => setResumeAccessCode(e.target.value.toUpperCase())}
                  className="w-full h-12 px-3.5 text-xs font-mono font-bold tracking-wider rounded-xl bg-[#f8fbff] border border-[#e6eaf2] focus:bg-white focus:outline-none focus:border-blue-600 uppercase"
                />
              </div>

              {resumeError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{resumeError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isResuming}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-full shadow-btn transition-all flex items-center justify-center space-x-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isResuming ? 'Memverifikasi...' : 'Continue Test'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
