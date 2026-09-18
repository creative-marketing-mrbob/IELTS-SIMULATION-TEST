import React, { useState } from 'react';
import { TestEvaluation, CriterionEvidence } from '../../types/ielts';
import { 
  ChevronDown, 
  ChevronUp, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  Sparkles,
  BookOpen,
  Mic,
  PenTool
} from 'lucide-react';

interface AiEvaluationBreakdownProps {
  section: 'writing' | 'speaking';
  candidate: TestEvaluation;
  onReEvaluate?: () => Promise<void>;
}

interface NormalizedCriterion {
  key: string;
  name: string;
  score: number | string;
  descriptorReason: string;
  positiveEvidence: string[];
  limitingEvidence: string[];
  feedback?: string;
  tutorPrompt?: string;
}

export const AiEvaluationBreakdown: React.FC<AiEvaluationBreakdownProps> = ({ section, candidate, onReEvaluate }) => {
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({
    'fc': true,
    'pro': true,
    't1_ta': true,
    't2_tr': true
  });

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setExpandedKeys({
      'fc': true, 'lr': true, 'gra': true, 'pro': true,
      't1_ta': true, 't1_cc': true, 't1_lr': true, 't1_gra': true,
      't2_tr': true, 't2_cc': true, 't2_lr': true, 't2_gra': true
    });
  };

  const collapseAll = () => {
    setExpandedKeys({});
  };

  if (section === 'speaking') {
    const spDetail = candidate.dualComparison?.aiAssessment?.speakingDetail || candidate.speaking?.speakingDetail;
    const critEvidence = (candidate.dualComparison?.aiAssessment as any)?.criterion_evidence || (candidate as any).criterion_evidence;
    const critScores = (candidate.dualComparison?.aiAssessment as any)?.criterion_scores;
    const tutorComparisonGuide = spDetail?.tutorComparisonGuide;

    const getCriterion = (key: string, name: string, detailItem?: CriterionEvidence, evidenceKey?: string): NormalizedCriterion => {
      const fromEv = evidenceKey && critEvidence ? critEvidence[evidenceKey] : null;
      const score = detailItem?.score ?? critScores?.[evidenceKey || ''] ?? '-';
      const descriptorReason = detailItem?.descriptorMatch || fromEv?.descriptorReason || fromEv?.descriptorMatch || 'Belum ada catatan deskriptor.';
      const positiveEvidence = detailItem?.positiveEvidence?.length ? detailItem.positiveEvidence : (fromEv?.positive || []);
      const limitingEvidence = detailItem?.limitingEvidence?.length ? detailItem.limitingEvidence : (fromEv?.limiting || []);
      const feedback = detailItem?.feedback || fromEv?.feedback;

      return {
        key,
        name,
        score,
        descriptorReason,
        positiveEvidence,
        limitingEvidence,
        feedback,
        tutorPrompt: evidenceKey ? tutorComparisonGuide?.criteria?.[evidenceKey]?.tutorPrompt : undefined
      };
    };

    const criteria: NormalizedCriterion[] = [
      getCriterion('fc', 'Fluency & Coherence (FC)', spDetail?.fc, 'FC'),
      getCriterion('lr', 'Lexical Resource (LR)', spDetail?.lr, 'LR'),
      getCriterion('gra', 'Grammatical Range & Accuracy (GRA)', spDetail?.gra, 'GRA'),
      getCriterion('pro', 'Pronunciation (PRO)', spDetail?.pro, 'PRO')
    ];

    const overallBand = spDetail?.estimatedBand ?? candidate.speaking?.band ?? '-';
    const verifiedTranscripts = spDetail?.verifiedTranscripts || [];
    const partRelevance = spDetail?.partRelevance || {};

    return (
      <div className="space-y-4 rounded-3xl border border-blue-100 bg-[#f8fbff] p-5 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                  Full AI Rubric Evaluation
                </span>
                <span className="text-xs font-black text-slate-500">Cambridge Band Descriptors</span>
              </div>
              <h3 className="text-base font-extrabold text-[#08245c]">Rincian & Alasan Penilaian Speaking</h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onReEvaluate && (
              <button
                type="button"
                disabled={isReEvaluating}
                onClick={async () => {
                  setIsReEvaluating(true);
                  try {
                    await onReEvaluate();
                  } finally {
                    setIsReEvaluating(false);
                  }
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all disabled:opacity-50 mr-1"
                title="Jalankan evaluasi ulang AI untuk speaking"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isReEvaluating ? 'animate-spin' : ''}`} />
                <span>{isReEvaluating ? 'Menilai Ulang...' : '⚡ Nilai Ulang AI'}</span>
              </button>
            )}
            <span className="text-xs font-bold text-slate-500">Overall:</span>
            <span className="px-3 py-1 bg-red-500 text-white rounded-xl text-sm font-black shadow-sm">
              Band {typeof overallBand === 'number' ? overallBand.toFixed(1) : overallBand}
            </span>
            <div className="flex space-x-1 pl-2">
              <button
                type="button"
                onClick={expandAll}
                className="text-[11px] font-bold text-blue-600 hover:underline px-1.5"
              >
                Buka Semua
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[11px] font-bold text-slate-500 hover:underline px-1.5"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>

        {verifiedTranscripts.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Transkrip Terverifikasi yang Dipakai AI</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Bukti FC, LR, dan GRA harus berupa kutipan yang benar-benar ada di transkrip ini.
              </p>
            </div>
            <div className="space-y-2">
              {verifiedTranscripts.map(part => {
                const relevance = partRelevance[part.id];
                const relevanceLabel = relevance?.status === 'RELEVANT'
                  ? 'Relevan'
                  : relevance?.status === 'PARTIALLY_RELEVANT'
                    ? 'Sebagian relevan'
                    : relevance?.status === 'OFF_TOPIC'
                      ? 'Tidak relevan'
                      : 'Belum diperiksa';
                const relevanceStyle = relevance?.status === 'RELEVANT'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : relevance?.status === 'PARTIALLY_RELEVANT'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-700 border-red-200';
                return (
                  <div key={part.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-extrabold text-[#08245c]">{part.label}</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase ${relevanceStyle}`}>
                        {relevanceLabel}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {part.transcript || '[Tidak ada ucapan yang dapat dikenali]'}
                    </p>
                    {part.audioAnalysis && (
                      <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2 text-[11px] leading-relaxed text-slate-600">
                        <span className="font-extrabold text-blue-800">Analisis audio:</span>{' '}
                        {part.audioAnalysis.intelligibility} {part.audioAnalysis.rhythm}{' '}
                        {part.audioAnalysis.stressIntonation} {part.audioAnalysis.phonemeIssues}
                      </div>
                    )}
                    {relevance?.reason && (
                      <p className="text-[11px] text-slate-500 mt-1.5">Alasan relevansi: {relevance.reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {verifiedTranscripts.length === 0 && spDetail && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <span className="font-black">Penilaian lama belum memiliki verifikasi transkrip.</span>{' '}
            Kutipan dan band pada penilaian ini belum dapat dipastikan berasal dari rekaman. Jalankan Nilai Ulang AI untuk memakai sistem verifikasi baru.
          </div>
        )}

        {tutorComparisonGuide && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-violet-900">Panduan Komparasi Tutor</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{tutorComparisonGuide.purpose}</p>
              </div>
              <span className="rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-black text-violet-800">
                {tutorComparisonGuide.overall.calculation} → Band {tutorComparisonGuide.overall.estimatedBand.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {criteria.map(crit => renderCriterionCard(crit, expandedKeys[crit.key], () => toggleExpand(crit.key)))}
        </div>
      </div>
    );
  }

  // WRITING SECTION
  const wrDetail = candidate.dualComparison?.aiAssessment?.writingDetail || candidate.writing?.writingDetail;
  const critEvidence = (candidate.dualComparison?.aiAssessment as any)?.criterion_evidence || (candidate as any).criterion_evidence;
  const critScores = (candidate.dualComparison?.aiAssessment as any)?.criterion_scores;

  const getCriterion = (key: string, name: string, detailItem?: CriterionEvidence, evidenceKey?: string): NormalizedCriterion => {
    const fromEv = evidenceKey && critEvidence ? critEvidence[evidenceKey] : null;
    const score = detailItem?.score ?? critScores?.[evidenceKey || ''] ?? '-';
    const descriptorReason = detailItem?.descriptorMatch || fromEv?.descriptorReason || fromEv?.descriptorMatch || 'Belum ada catatan deskriptor.';
    const positiveEvidence = detailItem?.positiveEvidence?.length ? detailItem.positiveEvidence : (fromEv?.positive || []);
    const limitingEvidence = detailItem?.limitingEvidence?.length ? detailItem.limitingEvidence : (fromEv?.limiting || []);
    const feedback = detailItem?.feedback || fromEv?.feedback;

    return {
      key,
      name,
      score,
      descriptorReason,
      positiveEvidence,
      limitingEvidence,
      feedback
    };
  };

  const t1Criteria: NormalizedCriterion[] = [
    getCriterion('t1_ta', 'Task Achievement (TA)', wrDetail?.task1?.criterion1, 'T1_TA'),
    getCriterion('t1_cc', 'Coherence & Cohesion (CC)', wrDetail?.task1?.cc, 'T1_CC'),
    getCriterion('t1_lr', 'Lexical Resource (LR)', wrDetail?.task1?.lr, 'T1_LR'),
    getCriterion('t1_gra', 'Grammatical Range & Accuracy (GRA)', wrDetail?.task1?.gra, 'T1_GRA')
  ];

  const t2Criteria: NormalizedCriterion[] = [
    getCriterion('t2_tr', 'Task Response (TR)', wrDetail?.task2?.criterion1, 'T2_TR'),
    getCriterion('t2_cc', 'Coherence & Cohesion (CC)', wrDetail?.task2?.cc, 'T2_CC'),
    getCriterion('t2_lr', 'Lexical Resource (LR)', wrDetail?.task2?.lr, 'T2_LR'),
    getCriterion('t2_gra', 'Grammatical Range & Accuracy (GRA)', wrDetail?.task2?.gra, 'T2_GRA')
  ];

  const overallBand = wrDetail?.estimatedBand ?? candidate.writing?.band ?? '-';

  return (
    <div className="space-y-5 rounded-3xl border border-blue-100 bg-[#f8fbff] p-5 shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                Full AI Rubric Evaluation
              </span>
              <span className="text-xs font-black text-slate-500">Cambridge Band Descriptors</span>
            </div>
            <h3 className="text-base font-extrabold text-[#08245c]">Rincian & Alasan Penilaian Writing</h3>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {onReEvaluate && (
            <button
              type="button"
              disabled={isReEvaluating}
              onClick={async () => {
                setIsReEvaluating(true);
                try {
                  await onReEvaluate();
                } finally {
                  setIsReEvaluating(false);
                }
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all disabled:opacity-50 mr-1"
              title="Jalankan evaluasi ulang AI untuk writing"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isReEvaluating ? 'animate-spin' : ''}`} />
              <span>{isReEvaluating ? 'Menilai Ulang...' : '⚡ Nilai Ulang AI'}</span>
            </button>
          )}
          <span className="text-xs font-bold text-slate-500">Overall Writing:</span>
          <span className="px-3 py-1 bg-blue-600 text-white rounded-xl text-sm font-black shadow-sm">
            Band {typeof overallBand === 'number' ? overallBand.toFixed(1) : overallBand}
          </span>
          <div className="flex space-x-1 pl-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] font-bold text-blue-600 hover:underline px-1.5"
            >
              Buka Semua
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] font-bold text-slate-500 hover:underline px-1.5"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* TASK 1 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Task 1 (Report) — Bobot 1/3</span>
          </h4>
          {typeof wrDetail?.task1?.taskAverage === 'number' && (
            <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
              Rata-rata: Band {wrDetail.task1.taskAverage.toFixed(1)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {t1Criteria.map(crit => renderCriterionCard(crit, expandedKeys[crit.key], () => toggleExpand(crit.key)))}
        </div>
      </div>

      {/* TASK 2 */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Task 2 (Essay) — Bobot 2/3</span>
          </h4>
          {typeof wrDetail?.task2?.taskAverage === 'number' && (
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
              Rata-rata: Band {wrDetail.task2.taskAverage.toFixed(1)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {t2Criteria.map(crit => renderCriterionCard(crit, expandedKeys[crit.key], () => toggleExpand(crit.key)))}
        </div>
      </div>
    </div>
  );
};

function renderCriterionCard(crit: NormalizedCriterion, isExpanded: boolean, onToggle: () => void) {
  const scoreNum = typeof crit.score === 'number' ? crit.score : Number(crit.score);
  const isValidScore = !isNaN(scoreNum) && scoreNum >= 1 && scoreNum <= 9;

  return (
    <div key={crit.key} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:border-blue-300">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3.5 text-left bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
            isValidScore
              ? scoreNum >= 6 ? 'bg-emerald-100 text-emerald-800' : scoreNum >= 5 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {isValidScore ? scoreNum.toFixed(1) : '-'}
          </span>
          <div>
            <div className="font-extrabold text-[#08245c] text-sm leading-tight">{crit.name}</div>
            <div className="text-[11px] text-slate-400 font-medium">Klik untuk melihat alasan dan evaluasi detail</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black text-slate-700 font-mono">
            {isValidScore ? `Band ${scoreNum.toFixed(1)}` : 'N/A'}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-1 space-y-3.5 border-t border-slate-100 bg-[#fcfdff] text-xs">
          {/* ALASAN PENILAIAN (DESCRIPTOR REASON) - POINT BY POINT */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 font-black text-blue-900 text-[11px] uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>Alasan Penilaian AI (Cambridge Rubric Descriptors)</span>
            </div>
            <div className="space-y-2">
              {parseDescriptorReason(crit.descriptorReason, crit.score).map((sec, secIdx) => (
                <div
                  key={secIdx}
                  className={`rounded-2xl border p-3.5 transition-all ${
                    sec.type === 'award'
                      ? 'border-blue-200 bg-[#f0f6ff]'
                      : sec.type === 'limiting'
                      ? 'border-amber-200 bg-[#fffbeb]'
                      : 'border-slate-200 bg-[#f8fafc]'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        sec.type === 'award'
                          ? 'bg-blue-600 text-white'
                          : sec.type === 'limiting'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {sec.type === 'award' ? '✓ Dasar Penilaian' : sec.type === 'limiting' ? '⚠ Faktor Pembatas' : sec.badge}
                    </span>
                    <span className="font-extrabold text-slate-800 text-xs">
                      {sec.title}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {sec.points.map((pt, ptIdx) => (
                      <li key={ptIdx} className="flex items-start space-x-2 text-slate-800 font-medium leading-relaxed">
                        <span
                          className={`font-black mt-0.5 select-none ${
                            sec.type === 'award'
                              ? 'text-blue-600'
                              : sec.type === 'limiting'
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          •
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* BUKTI POSITIF & PEMBATAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Positive Evidence */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
              <div className="flex items-center space-x-1.5 font-black text-emerald-800 mb-2 text-[11px] uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bukti Positif dari Respons</span>
              </div>
              {crit.positiveEvidence.length > 0 ? (
                <ul className="space-y-1.5 text-slate-700 font-medium">
                  {crit.positiveEvidence.flatMap(item => splitTextIntoBulletPoints(item)).map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-emerald-600 font-black mt-0.5 select-none">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic">Belum ada bukti positif spesifik.</p>
              )}
            </div>

            {/* Limiting Evidence */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5">
              <div className="flex items-center space-x-1.5 font-black text-amber-900 mb-2 text-[11px] uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Faktor Pembatas / Kesalahan</span>
              </div>
              {crit.limitingEvidence.length > 0 ? (
                <ul className="space-y-1.5 text-slate-700 font-medium">
                  {crit.limitingEvidence.flatMap(item => splitTextIntoBulletPoints(item)).map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-amber-600 font-black mt-0.5 select-none">•</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic">Tidak ada pembatas kritis.</p>
              )}
            </div>
          </div>

          {/* FEEDBACK / REKOMENDASI */}
          {crit.feedback && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5">
              <div className="flex items-center space-x-1.5 font-black text-indigo-900 mb-2 text-[11px] uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                <span>Saran Peningkatan (Feedback)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-800 font-medium">
                {splitTextIntoBulletPoints(crit.feedback).map((pt, idx) => (
                  <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-indigo-600 font-bold mt-0.5 select-none">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {crit.tutorPrompt && (
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3.5">
              <div className="font-black text-violet-900 mb-1.5 text-[11px] uppercase tracking-wider">Pertanyaan Kalibrasi untuk Tutor</div>
              <p className="text-xs leading-relaxed text-slate-700 font-medium">{crit.tutorPrompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ParsedReasonSection {
  title: string;
  badge: string;
  type: 'award' | 'limiting' | 'general';
  points: string[];
}

export function splitTextIntoBulletPoints(text?: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const clean = text.trim();
  if (!clean) return [];

  const rawLines = clean
    .split(/\r?\n|(?:\s*•\s*)|\s*;\s*|(?<=[.!?])\s+(?=[A-Z0-9\(\[])/g)
    .map(line => line.trim())
    .map(line => line.replace(/^[-*•\d+.\)]\s*/, '').trim())
    .filter(line => line.length > 2);

  if (rawLines.length > 0) return rawLines;
  return [clean];
}

export function parseDescriptorReason(rawReason: string, score: number | string): ParsedReasonSection[] {
  if (!rawReason || !rawReason.trim()) {
    return [{
      title: 'Catatan Deskriptor',
      badge: 'Umum',
      type: 'general',
      points: ['Belum ada catatan deskriptor.']
    }];
  }

  const text = rawReason.trim();

  // Pattern 1: Part A (Alasan Pemberian Band) & Part B (Faktor Pembatas / Alasan Belum Mencapai Band Lebih Tinggi)
  const partAPattern = /(?:Part\s*A[^\:]*:\s*)([\s\S]*?)(?=(?:Part\s*[BCD][^\:]*:)|$)/i;
  const partBPattern = /(?:Part\s*B[^\:]*:\s*)([\s\S]*?)(?=(?:Part\s*[CD][^\:]*:)|$)/i;
  const partCPattern = /(?:Part\s*C[^\:]*:\s*)([\s\S]*?)(?=(?:Part\s*D[^\:]*:)|$)/i;
  const partDPattern = /(?:Part\s*D[^\:]*:\s*)([\s\S]*)$/i;

  const matchA = text.match(partAPattern);
  const matchB = text.match(partBPattern);
  const matchC = text.match(partCPattern);
  const matchD = text.match(partDPattern);

  if (matchA || matchB || matchC || matchD) {
    const sections: ParsedReasonSection[] = [];
    if (matchA && matchA[1]?.trim()) {
      sections.push({
        title: `Alasan Pemberian Band ${score !== '-' ? score : ''}`.trim(),
        badge: 'Dasar Penilaian',
        type: 'award',
        points: splitTextIntoBulletPoints(matchA[1])
      });
    }
    if (matchB && matchB[1]?.trim()) {
      sections.push({
        title: 'Faktor Pembatas (Belum Mencapai Band Lebih Tinggi)',
        badge: 'Faktor Pembatas',
        type: 'limiting',
        points: splitTextIntoBulletPoints(matchB[1])
      });
    }
    if (matchC && matchC[1]?.trim()) {
      sections.push({
        title: 'Kenapa Nilainya Tidak Lebih Rendah',
        badge: 'Kemampuan yang Sudah Terlihat',
        type: 'award',
        points: splitTextIntoBulletPoints(matchC[1])
      });
    }
    if (matchD && matchD[1]?.trim()) {
      sections.push({
        title: 'Bukti dari Jawaban Kamu',
        badge: 'Bukti Respons',
        type: 'general',
        points: splitTextIntoBulletPoints(matchD[1])
      });
    }
    if (sections.length > 0) return sections;
  }

  // Pattern 2: Supported Band X because... Not Band Y because...
  const suppPattern = /(Supported\s+Band\s+\d+[^.]*\..*?)(?=(?:Not\s+Band|\bBelum\s+mencapai\b)|$)/is;
  const notPattern = /((?:Not\s+Band|Belum\s+mencapai\s+Band)\s+\d+[\s\S]*)$/is;
  const matchSupp = text.match(suppPattern);
  const matchNot = text.match(notPattern);

  if (matchSupp || matchNot) {
    const sections: ParsedReasonSection[] = [];
    if (matchSupp && matchSupp[1]?.trim()) {
      sections.push({
        title: `Kesesuaian Band ${score !== '-' ? score : ''}`.trim(),
        badge: 'Dasar Penilaian',
        type: 'award',
        points: splitTextIntoBulletPoints(matchSupp[1])
      });
    }
    if (matchNot && matchNot[1]?.trim()) {
      sections.push({
        title: 'Syarat / Batasan Naik Band',
        badge: 'Faktor Pembatas',
        type: 'limiting',
        points: splitTextIntoBulletPoints(matchNot[1])
      });
    }
    if (sections.length > 0) return sections;
  }

  // Fallback: Split by sentences/bullets
  return [{
    title: `Poin Penilaian (Band ${score !== '-' ? score : ''})`.trim(),
    badge: 'Kriteria Rubrik',
    type: 'general',
    points: splitTextIntoBulletPoints(text)
  }];
}
