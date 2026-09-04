import { TestEvaluation } from '../types/ielts';

export interface ConsultationResult {
  feedback: string;
  whatsappMessage: string;
  focusArea: string;
  strength: string;
  mainGap: string;
  scoreGap: string;
}

export function parseBandNumber(band: string | number): number {
  if (typeof band === 'number') return band;
  const match = band.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 5.5;
}

export function calculateScoreGap(currentBand: number, targetScoreStr: string): string {
  const targetBandNum = parseBandNumber(targetScoreStr);
  const diff = targetBandNum - currentBand;
  if (diff > 0) {
    return `${diff.toFixed(1)} band`;
  }
  return `0.5 band untuk mengamankan band maksimal`;
}

// 1. READING CONSULTATION (Indonesian Dynamic Structure)
export function getReadingConsultation(
  name: string, 
  bandInput: string | number, 
  targetScore: string = 'Band 6.5',
  incorrectList?: number[]
): ConsultationResult {
  const scoreNum = parseBandNumber(bandInput);
  const scoreStr = typeof bandInput === 'number' ? bandInput.toFixed(1) : String(bandInput);
  const gapStr = calculateScoreGap(scoreNum, targetScore);

  let strength = "Memahami ide pokok dan skimming paragraf umum dengan baik";
  let mainGap = "Kecepatan scanning keyword spesifik dan akurasi soal True / False / Not Given";
  let focusArea = "True/False/Not Given Scanning & Time Management";

  if (scoreNum >= 7.0) {
    strength = "Akurasi tinggi dalam memahami teks akademik kompleks dan detail teknis";
    mainGap = "Mempertahankan konsistensi kecepatan pada Passage 3 dan zero-error strategy";
    focusArea = "High-Band Consistency";
  } else if (scoreNum <= 5.0) {
    strength = "Mampu mengenali topik umum pada Passage 1";
    mainGap = "Kosakata akademik formal dan pembagian waktu 20 menit per passage";
    focusArea = "Academic Vocabulary & Reading Speed";
  }

  if (incorrectList && incorrectList.length > 0) {
    mainGap += ` (perlu evaluasi nomor: #${incorrectList.slice(0, 3).join(', #')})`;
  }

  const whatsappMessage = `Hi ${name} 👋

Hasil READING-mu sudah kami cek.

Estimated Band:
Band ${scoreStr}

Target kamu:
${targetScore}

Dari hasil test, bagian yang sudah cukup kuat adalah:
${strength}

Yang paling perlu dikejar sekarang:
${mainGap}

Kalau targetmu ${targetScore}, bagian ini sebaiknya jadi prioritas latihan karena masih ada gap sekitar ${gapStr}.

Aku juga bisa bantu jelasin strategi belajarnya berdasarkan hasil ini ya.`;

  return {
    feedback: mainGap,
    whatsappMessage,
    focusArea,
    strength,
    mainGap,
    scoreGap: gapStr
  };
}

// 2. LISTENING CONSULTATION (Indonesian Dynamic Structure)
export function getListeningConsultation(
  name: string, 
  bandInput: string | number, 
  targetScore: string = 'Band 6.5',
  incorrectList?: number[]
): ConsultationResult {
  const scoreNum = parseBandNumber(bandInput);
  const scoreStr = typeof bandInput === 'number' ? bandInput.toFixed(1) : String(bandInput);
  const gapStr = calculateScoreGap(scoreNum, targetScore);

  let strength = "Menangkap informasi angka dan nama pada percakapan Part 1";
  let mainGap = "Menghindari jebakan (distractors) dan menangkap detail cepat pada percakapan multi-speaker";
  let focusArea = "Audio Distractor Navigation & Spelling";

  if (scoreNum >= 7.0) {
    strength = "Pemahaman audio monologue akademik Part 4 sangat tajam";
    mainGap = "Ketelitian ejaan kata kunci (spelling) dan konsentrasi konsisten";
    focusArea = "Zero-Error Spelling & Detail Precision";
  } else if (scoreNum <= 5.0) {
    strength = "Mampu menangkap kata kunci dasar saat audio berkecepatan lambat";
    mainGap = "Adaptasi aksen British/Australian dan kecepatan menangkap poin sebelum pembicara beralih";
    focusArea = "Accent Adaptation & Keyword Catching";
  }

  if (incorrectList && incorrectList.length > 0) {
    mainGap += ` (review soal: #${incorrectList.slice(0, 3).join(', #')})`;
  }

  const whatsappMessage = `Hi ${name} 👋

Hasil LISTENING-mu sudah kami cek.

Estimated Band:
Band ${scoreStr}

Target kamu:
${targetScore}

Dari hasil test, bagian yang sudah cukup kuat adalah:
${strength}

Yang paling perlu dikejar sekarang:
${mainGap}

Kalau targetmu ${targetScore}, bagian ini sebaiknya jadi prioritas latihan karena masih ada gap sekitar ${gapStr}.

Aku juga bisa bantu jelasin strategi belajarnya berdasarkan hasil ini ya.`;

  return {
    feedback: mainGap,
    whatsappMessage,
    focusArea,
    strength,
    mainGap,
    scoreGap: gapStr
  };
}

// 3. WRITING CONSULTATION (Indonesian Dynamic Structure with Criterion Weakness)
export function getWritingConsultation(
  name: string, 
  bandInput: string | number, 
  targetScore: string = 'Band 6.5',
  evalDetail?: TestEvaluation['writing']['writingDetail']
): ConsultationResult {
  const scoreNum = parseBandNumber(bandInput);
  const scoreStr = typeof bandInput === 'number' ? bandInput.toFixed(1) : String(bandInput);
  const gapStr = calculateScoreGap(scoreNum, targetScore);

  let strength = "Mampu menyampaikan ide esai dan menyusun paragraf terstruktur";
  let lowestCriterionName = "Grammatical Range & Accuracy (variasi kalimat kompleks dan akurasi tenses)";
  let lowestScore = 5.5;

  if (evalDetail) {
    const scores = [
      { name: "Task Achievement (Task 1 Overview dan detail perbandingan)", score: evalDetail.task1.criterion1.score },
      { name: "Task Response (Task 2 Pengembangan argumen dan contoh)", score: evalDetail.task2.criterion1.score },
      { name: "Coherence & Cohesion (Transisi antar paragraf dan linking words)", score: (evalDetail.task1.cc.score + evalDetail.task2.cc.score) / 2 },
      { name: "Lexical Resource (Kosakata akademik formal & collocations)", score: (evalDetail.task1.lr.score + evalDetail.task2.lr.score) / 2 },
      { name: "Grammatical Accuracy (Variasi klausa kompleks & ketepatan struktur)", score: (evalDetail.task1.gra.score + evalDetail.task2.gra.score) / 2 },
    ];
    scores.sort((a, b) => a.score - b.score);
    lowestCriterionName = scores[0].name;
    lowestScore = scores[0].score;
  }

  const mainGap = `${lowestCriterionName} (Skor kriteria: Band ${lowestScore.toFixed(1)})`;

  const whatsappMessage = `Hi ${name} 👋

Hasil WRITING-mu sudah kami cek.

Estimated Band:
Band ${scoreStr}

Target kamu:
${targetScore}

Dari hasil test, bagian yang sudah cukup kuat adalah:
${strength}

Yang paling perlu dikejar sekarang:
${mainGap}

Kalau targetmu ${targetScore}, bagian ini sebaiknya jadi prioritas latihan karena masih ada gap sekitar ${gapStr}.

Aku juga bisa bantu jelasin strategi belajarnya berdasarkan hasil ini ya.`;

  return {
    feedback: mainGap,
    whatsappMessage,
    focusArea: lowestCriterionName,
    strength,
    mainGap,
    scoreGap: gapStr
  };
}

// 4. SPEAKING CONSULTATION (Indonesian Dynamic Structure with Criterion Weakness)
export function getSpeakingConsultation(
  name: string, 
  bandInput: string | number, 
  targetScore: string = 'Band 6.5',
  evalDetail?: TestEvaluation['speaking']['speakingDetail']
): ConsultationResult {
  const scoreNum = parseBandNumber(bandInput);
  const scoreStr = typeof bandInput === 'number' ? bandInput.toFixed(1) : String(bandInput);
  const gapStr = calculateScoreGap(scoreNum, targetScore);

  let strength = "Keberanian berbicara dan kelancaran menjawab pertanyaan Part 1 & 2";
  let lowestCriterionName = "Grammatical Range & Accuracy (penggunaan kalimat kompleks & tenses)";
  let lowestScore = 5.0;

  if (evalDetail) {
    const scores = [
      { name: "Fluency & Coherence (Kelancaran alur bicara tanpa jeda panjang)", score: evalDetail.fc.score },
      { name: "Lexical Resource (Variasi kosakata & frasa idiomatik natural)", score: evalDetail.lr.score },
      { name: "Grammatical Range (Akurasi grammar dalam kalimat kompleks)", score: evalDetail.gra.score },
      { name: "Pronunciation (Intonasi, word stress, dan kejelasan artikulasi)", score: evalDetail.pro.score },
    ];
    scores.sort((a, b) => a.score - b.score);
    lowestCriterionName = scores[0].name;
    lowestScore = scores[0].score;
  }

  const mainGap = `${lowestCriterionName} (Skor kriteria: Band ${lowestScore.toFixed(1)})`;

  const whatsappMessage = `Hi ${name} 👋

Hasil SPEAKING-mu sudah kami cek.

Estimated Band:
Band ${scoreStr}

Target kamu:
${targetScore}

Dari hasil test, bagian yang sudah cukup kuat adalah:
${strength}

Yang paling perlu dikejar sekarang:
${mainGap}

Kalau targetmu ${targetScore}, bagian ini sebaiknya jadi prioritas latihan karena masih ada gap sekitar ${gapStr}.

Aku juga bisa bantu jelasin strategi belajarnya berdasarkan hasil ini ya.`;

  return {
    feedback: mainGap,
    whatsappMessage,
    focusArea: lowestCriterionName,
    strength,
    mainGap,
    scoreGap: gapStr
  };
}
