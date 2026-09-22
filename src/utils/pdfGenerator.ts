import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TestEvaluation } from '../types/ielts';

let mrBobLogoDataPromise: Promise<string | null> | null = null;

function loadMrBobLogoData(): Promise<string | null> {
  if (!mrBobLogoDataPromise) {
    mrBobLogoDataPromise = fetch('/logo-mrbob.png')
      .then(response => {
        if (!response.ok) throw new Error('Mr.BOB logo could not be loaded.');
        return response.blob();
      })
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      }))
      .catch(() => null);
  }
  return mrBobLogoDataPromise;
}

function printableBand(value: string | number | undefined) {
  return typeof value === 'number' ? value.toFixed(1) : String(value ?? 'Pending');
}

function reportBand(evalData: TestEvaluation, section: 'reading' | 'listening' | 'writing' | 'speaking') {
  const status = evalData.manualChecks?.sectionStatuses?.[section]?.status;
  const tutorBand = evalData.manualChecks?.[section]?.tutorBand;
  if (status === 'SUBMITTED' && typeof tutorBand === 'number') return tutorBand;
  return evalData[section].band;
}

function reportOverallBand(evalData: TestEvaluation) {
  if (evalData.manualChecks?.isApproved && typeof evalData.manualChecks.tutorOverallBand === 'number') {
    return evalData.manualChecks.tutorOverallBand;
  }
  return evalData.overallBand;
}

export function estimatedCefr(value: string | number) {
  const band = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(band) || band < 1 || band > 9) return '-';
  if (band >= 8.5) return 'C2';
  if (band >= 7) return 'C1';
  if (band >= 6) return 'B2';
  if (band >= 4.5) return 'B1';
  if (band >= 3) return 'A2';
  return 'A1';
}

function renderPDFHeader(doc: jsPDF, sectionTitle: string, subtitle: string, evaluation: TestEvaluation) {
  // Top Brand Banner
  doc.setFillColor(31, 92, 255); // #1F5CFF Brand Blue
  doc.rect(0, 0, 210, 24, 'F');

  // Red accent line
  doc.setFillColor(233, 54, 63); // #E9363F Coral Red
  doc.rect(0, 24, 210, 1.5, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text("Mr.BOB IELTS ACADEMY", 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text("Official IELTS Diagnostic & Cambridge Simulation Report", 14, 17);

  // Result ID on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`ID: ${evaluation.resultId}`, 196, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(new Date(evaluation.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), 196, 17, { align: 'right' });

  // Section Title
  doc.setTextColor(8, 36, 92); // #08245C Dark Blue
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(sectionTitle.toUpperCase(), 14, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(101, 112, 132);
  doc.text(subtitle, 14, 40);

  // Candidate Information Card
  doc.setFillColor(248, 251, 255);
  doc.setDrawColor(230, 234, 242);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 45, 182, 24, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);

  // Left column in card
  doc.setFont('helvetica', 'bold');
  doc.text("Candidate Name:", 20, 52);
  doc.text("WhatsApp Number:", 20, 58);
  doc.text("Target Band Score:", 20, 64);

  doc.setFont('helvetica', 'normal');
  doc.text(evaluation.user.fullName, 55, 52);
  doc.text(evaluation.user.whatsapp, 55, 58);
  doc.text(evaluation.user.targetScore, 55, 64);

  // Right column in card
  doc.setFont('helvetica', 'bold');
  doc.text("Current Status:", 118, 52);
  doc.text("Age:", 118, 58);
  doc.text("Diagnostic Status:", 118, 64);

  doc.setFont('helvetica', 'normal');
  doc.text(evaluation.user.currentStatus, 150, 52);
  doc.text(String(evaluation.user.age), 150, 58);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 92, 255);
  doc.text(evaluation.status, 150, 64);
}

function renderScoreBandBox(doc: jsPDF, startY: number, bandValue: string | number, subLabel: string, rawScoreInfo?: string) {
  doc.setFillColor(234, 242, 255);
  doc.setDrawColor(180, 206, 255);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, startY, 182, 26, 2, 2, 'FD');

  doc.setTextColor(31, 92, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(subLabel.toUpperCase(), 22, startY + 9);

  doc.setFontSize(18);
  doc.setTextColor(8, 36, 92);
  const displayBand = typeof bandValue === 'number' ? bandValue.toFixed(1) : String(bandValue);
  doc.text(displayBand, 22, startY + 21);

  if (rawScoreInfo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(rawScoreInfo, 90, startY + 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Hubungi mentor Mr.BOB di WhatsApp untuk sesi bedah jawaban", 90, startY + 19);
  }

  return startY + 30;
}

function renderPDFFooter(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(230, 234, 242);
  doc.line(14, pageHeight - 14, 196, pageHeight - 14);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Mr.BOB IELTS Academy — Diagnostic & Cambridge Simulation Report", 14, pageHeight - 9);
  doc.text("Konsultasi WhatsApp: +62 822-1234-5678", 196, pageHeight - 9, { align: 'right' });
}

// 1. READING REPORT PDF
export function downloadReadingPDF(evalData: TestEvaluation) {
  const doc = new jsPDF();
  renderPDFHeader(doc, "IELTS Reading Diagnostic Report", "Cambridge 17 Academic Reading Test 4 Evaluation", evalData);

  const tableStartY = renderScoreBandBox(
    doc,
    73,
    evalData.reading.band,
    "Estimated Reading Band",
    `Raw Score: ${evalData.reading.rawScore || 0} / ${evalData.reading.totalQuestions || 12} Benar (${evalData.reading.correctPercentage || 0}%)`
  );

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['Kategori Evaluasi', 'Status / Skor', 'Feedback Diagnostik']],
    body: [
      ['Akurasi Jawaban Objektif', `${evalData.reading.rawScore || 0} / ${evalData.reading.totalQuestions || 12}`, 'Dihitung secara deterministik berdasarkan kunci Cambridge 17.'],
      ['Passage 1: Bats to the rescue', 'True / False / Not Given', 'Akurasi dalam membedakan kontradiksi teks dan informasi yang tidak dibahas.'],
      ['Passage 2: Education & Growth', 'Multiple Choice', 'Pemahaman scanning paragraf sejarah ekonomi dan inferensi.'],
      ['Passage 3: Blindfold Chess', 'Technical Terminology', 'Kemampuan menangkap detail kognitif dan metode memori.']
    ],
    theme: 'striped',
    headStyles: { fillColor: [31, 92, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(248, 251, 255);
  doc.setDrawColor(230, 234, 242);
  doc.roundedRect(14, nextY, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(8, 36, 92);
  doc.text("Strengths & Observations:", 20, nextY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.reading.strengths.forEach((s, idx) => {
    doc.text(`• ${s}`, 20, nextY + 13 + (idx * 5));
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(8, 36, 92);
  doc.text("Actionable Recommendations:", 20, nextY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.reading.recommendations.forEach((r, idx) => {
    doc.text(`• ${r}`, 20, nextY + 30 + (idx * 5));
  });

  renderPDFFooter(doc);
  doc.save(`Reading_Report_${evalData.resultId}.pdf`);
}

// 2. LISTENING REPORT PDF
export function downloadListeningPDF(evalData: TestEvaluation) {
  const doc = new jsPDF();
  renderPDFHeader(doc, "IELTS Listening Diagnostic Report", "Cambridge 18 Listening Test 4 Audio Evaluation", evalData);

  const tableStartY = renderScoreBandBox(
    doc,
    73,
    evalData.listening.band,
    "Estimated Listening Band",
    `Raw Score: ${evalData.listening.rawScore || 0} / ${evalData.listening.totalQuestions || 7} Benar (${evalData.listening.correctPercentage || 0}%)`
  );

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['Part Listening', 'Item Evaluasi', 'Feedback Diagnostik']],
    body: [
      ['Part 1: Job Enquiry', 'Job details / Medical clinic', 'Menangkap peran pekerjaan, tugas utama, dan kualifikasi yang dicari.'],
      ['Part 2: Museum Tour', 'Harbour Museum building', 'Navigasi informasi sejarah gedung dan fasilitas lantai atas.'],
      ['Part 3: Origami Study', 'Psychology Research', 'Memahami angka persentase peningkatan penalaran spasial anak.']
    ],
    theme: 'striped',
    headStyles: { fillColor: [31, 92, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 45 },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(248, 251, 255);
  doc.setDrawColor(230, 234, 242);
  doc.roundedRect(14, nextY, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(8, 36, 92);
  doc.text("Strengths & Observations:", 20, nextY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.listening.strengths.forEach((s, idx) => {
    doc.text(`• ${s}`, 20, nextY + 13 + (idx * 5));
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(8, 36, 92);
  doc.text("Actionable Recommendations:", 20, nextY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.listening.recommendations.forEach((r, idx) => {
    doc.text(`• ${r}`, 20, nextY + 30 + (idx * 5));
  });

  renderPDFFooter(doc);
  doc.save(`Listening_Report_${evalData.resultId}.pdf`);
}

// 3. WRITING REPORT PDF (Detailed Rubric Breakdown for Task 1 & 2)
export function downloadWritingPDF(evalData: TestEvaluation) {
  const doc = new jsPDF();
  renderPDFHeader(doc, "IELTS Writing Diagnostic Report", "Cambridge 18 Academic Writing Test 4 Assessment", evalData);

  const wDetail = evalData.writing.writingDetail;
  const tableStartY = renderScoreBandBox(
    doc,
    73,
    evalData.writing.band,
    "Estimated Writing Band",
    `Total Kata: ${evalData.writing.wordCount || 0} kata (Task 1: ${wDetail?.wordCountTask1 || 0} w, Task 2: ${wDetail?.wordCountTask2 || 0} w)`
  );

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['IELTS Rubric Criterion', 'Score', 'Examiner Assessment & Evidence']],
    body: [
      ['Task 1: Task Achievement (TA)', `Band ${wDetail?.task1.criterion1.score.toFixed(1) || '6.0'}`, wDetail?.task1.criterion1.feedback || 'Presentasi overview tren harga metal 2014.'],
      ['Task 2: Task Response (TR)', `Band ${wDetail?.task2.criterion1.score.toFixed(1) || '6.0'}`, wDetail?.task2.criterion1.feedback || 'Pengembangan argumen ageing population.'],
      ['Coherence & Cohesion (CC)', `Band ${(((wDetail?.task1.cc.score || 6) + (wDetail?.task2.cc.score || 6)) / 2).toFixed(1)}`, 'Struktur paragraf, alur transisi, dan linking devices.'],
      ['Lexical Resource (LR)', `Band ${(((wDetail?.task1.lr.score || 6) + (wDetail?.task2.lr.score || 6)) / 2).toFixed(1)}`, 'Variasi kosakata akademik dan ketepatan formal register.'],
      ['Grammar Range & Accuracy (GRA)', `Band ${(((wDetail?.task1.gra.score || 5.5) + (wDetail?.task2.gra.score || 5.5)) / 2).toFixed(1)}`, 'Variasi klausa kompleks, kalimat pasif, dan ketepatan preposisi.']
    ],
    theme: 'striped',
    headStyles: { fillColor: [31, 92, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(248, 251, 255);
  doc.setDrawColor(230, 234, 242);
  doc.roundedRect(14, nextY, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(8, 36, 92);
  doc.text("Candidate Strengths:", 20, nextY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.writing.strengths.forEach((s, idx) => {
    doc.text(`• ${s}`, 20, nextY + 13 + (idx * 5));
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(8, 36, 92);
  doc.text("Priority Improvement Focus:", 20, nextY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.writing.recommendations.forEach((r, idx) => {
    doc.text(`• ${r}`, 20, nextY + 30 + (idx * 5));
  });

  renderPDFFooter(doc);
  doc.save(`Writing_Report_${evalData.resultId}.pdf`);
}

// 4. SPEAKING REPORT PDF (Detailed 4-Criteria Breakdown)
export function downloadSpeakingPDF(evalData: TestEvaluation) {
  const doc = new jsPDF();
  renderPDFHeader(doc, "IELTS Speaking Diagnostic Report", "Cambridge 18 Speaking Practice Test 4 Rubric Evaluation", evalData);

  const spDetail = evalData.speaking.speakingDetail;
  const tableStartY = renderScoreBandBox(
    doc,
    73,
    evalData.speaking.band,
    "Estimated Speaking Band",
    "Evaluasi Menyeluruh: Part 1 Sleep, Part 2 Friend Cue Card, Part 3 Discussion"
  );

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['IELTS Speaking Criterion', 'Score', 'Rubric Match & Diagnostic Feedback']],
    body: [
      ['Fluency and Coherence (FC)', `Band ${spDetail?.fc.score.toFixed(1) || '6.0'}`, spDetail?.fc.feedback || 'Kelancaran bicara tanpa jeda panjang.'],
      ['Lexical Resource (LR)', `Band ${spDetail?.lr.score.toFixed(1) || '6.0'}`, spDetail?.lr.feedback || 'Rentang kosakata dan frasa idiomatik.'],
      ['Grammar Range & Accuracy (GRA)', `Band ${spDetail?.gra.score.toFixed(1) || '5.5'}`, spDetail?.gra.feedback || 'Struktur kalimat kompleks dan ketepatan tenses.'],
      ['Pronunciation (PRO)', `Band ${spDetail?.pro.score.toFixed(1) || '6.0'}`, spDetail?.pro.feedback || 'Kejelasan artikulasi, intonasi, dan word stress.']
    ],
    theme: 'striped',
    headStyles: { fillColor: [31, 92, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(248, 251, 255);
  doc.setDrawColor(230, 234, 242);
  doc.roundedRect(14, nextY, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(8, 36, 92);
  doc.text("Speaking Strengths:", 20, nextY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.speaking.strengths.forEach((s, idx) => {
    doc.text(`• ${s}`, 20, nextY + 13 + (idx * 5));
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(8, 36, 92);
  doc.text("Priority Improvement Focus:", 20, nextY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.speaking.recommendations.forEach((r, idx) => {
    doc.text(`• ${r}`, 20, nextY + 30 + (idx * 5));
  });

  renderPDFFooter(doc);
  doc.save(`Speaking_Report_${evalData.resultId}.pdf`);
}

// 5. IELTS SIMULATION TEST REPORT FORM
export async function downloadComprehensivePDF(evalData: TestEvaluation) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoData = await loadMrBobLogoData();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const completedDate = new Date(evalData.completedAt);
  const dateLabel = Number.isNaN(completedDate.getTime())
    ? '-'
    : completedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const readingBand = reportBand(evalData, 'reading');
  const listeningBand = reportBand(evalData, 'listening');
  const writingBand = reportBand(evalData, 'writing');
  const speakingBand = reportBand(evalData, 'speaking');
  const overallBand = reportOverallBand(evalData);
  const overallDisplay = printableBand(overallBand);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, 'F');
  doc.setDrawColor(20, 28, 45);
  doc.setLineWidth(0.45);

  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, 10, 24, 24, undefined, 'FAST');
  } else {
    doc.setFillColor(239, 29, 39);
    doc.roundedRect(margin, 10, 24, 24, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Mr.BOB', margin + 12, 23, { align: 'center' });
  }

  doc.setTextColor(7, 23, 54);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.text('IELTS', 41, 23);
  doc.setFontSize(15);
  doc.text('SIMULATION TEST', 41, 33);

  doc.setDrawColor(224, 53, 63);
  doc.setLineWidth(1.3);
  doc.line(margin, 39, pageWidth - margin, 39);

  const field = (label: string, value: string, x: number, y: number, width: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.7);
    doc.setTextColor(83, 91, 107);
    doc.text(label.toUpperCase(), x, y - 2);
    doc.setFillColor(249, 250, 252);
    doc.setDrawColor(147, 156, 171);
    doc.setLineWidth(0.25);
    doc.rect(x, y, width, 10, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 28, 45);
    const fitted = doc.splitTextToSize(value || '-', width - 5)[0] || '-';
    doc.text(fitted, x + 2.5, y + 6.5);
  };

  field('Centre ID', 'MRBOB-KI', margin, 48, 36);
  field('Test Date', dateLabel, 53, 48, 47);
  field('Candidate Number', evalData.resultId, 105, 48, 93);

  doc.setTextColor(7, 23, 54);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Candidate Details', margin, 68);
  doc.setLineWidth(0.35);
  doc.setDrawColor(20, 28, 45);
  doc.line(margin, 71, pageWidth - margin, 71);

  field('Full Name', evalData.user.fullName, margin, 77, contentWidth);
  field('Candidate ID', evalData.user.candidateId || evalData.resultId, margin, 93, contentWidth);
  field('Age', String(evalData.user.age ?? '-'), margin, 109, 30);
  field('Current Status', evalData.user.currentStatus || '-', 47, 109, 90);
  field('WhatsApp', evalData.user.whatsapp || '-', 142, 109, 56);

  doc.setTextColor(7, 23, 54);
  doc.setFontSize(10.5);
  doc.text('Test Results', margin, 132);
  doc.setDrawColor(20, 28, 45);
  doc.line(margin, 135, pageWidth - margin, 135);

  const scoreItems = [
    ['Listening', printableBand(listeningBand)],
    ['Reading', printableBand(readingBand)],
    ['Writing', printableBand(writingBand)],
    ['Speaking', printableBand(speakingBand)],
    ['Overall Band', overallDisplay],
    ['CEFR Level', estimatedCefr(overallBand)]
  ];
  const scoreGap = 3;
  const scoreWidth = (contentWidth - scoreGap * 5) / 6;
  scoreItems.forEach(([label, score], index) => {
    const x = margin + index * (scoreWidth + scoreGap);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(20, 28, 45);
    doc.text(label, x + scoreWidth / 2, 142, { align: 'center' });
    doc.setFillColor(index === 4 ? 7 : 239, index === 4 ? 37 : 242, index === 4 ? 92 : 246);
    doc.setDrawColor(90, 100, 116);
    doc.rect(x, 145, scoreWidth, 17, 'FD');
    doc.setTextColor(index === 4 ? 255 : 20, index === 4 ? 255 : 28, index === 4 ? 255 : 45);
    doc.setFontSize(12);
    doc.text(score, x + scoreWidth / 2, 156, { align: 'center' });
  });

  doc.setTextColor(7, 23, 54);
  doc.setFontSize(10.5);
  doc.text('Academic Team Comments', margin, 174);
  doc.setDrawColor(20, 28, 45);
  doc.line(margin, 177, pageWidth - margin, 177);
  doc.setFillColor(250, 251, 253);
  doc.setDrawColor(147, 156, 171);
  doc.rect(margin, 182, 119, 48, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 70, 86);
  const recommendations = [
    ...(evalData.adminNotes ? [evalData.adminNotes] : []),
    ...(evalData.writing.recommendations || []),
    ...(evalData.speaking.recommendations || [])
  ].filter(Boolean).slice(0, 3);
  const comment = recommendations.length
    ? recommendations.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : `Keep practising all four skills consistently. Use Result ID ${evalData.resultId} when discussing this report with the Mr.BOB academic team.`;
  doc.text(doc.splitTextToSize(comment, 111).slice(0, 9), margin + 4, 188);

  doc.setFillColor(250, 251, 253);
  doc.rect(136, 182, 62, 48, 'FD');
  if (logoData) doc.addImage(logoData, 'PNG', 155, 187, 24, 24, undefined, 'FAST');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(20, 28, 45);
  doc.text('MR.BOB ACADEMIC TEAM', 167, 220, { align: 'center' });

  field('Date Issued', dateLabel, margin, 242, 48);
  field('Report Number', evalData.resultId, 65, 242, 91);
  field('Module', 'ACADEMIC', 161, 242, 37);

  doc.setFillColor(7, 23, 54);
  doc.rect(0, 273, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Mr.BOB Kampung Inggris - IELTS Simulation Test', margin, 285);
  doc.text(`Result ID: ${evalData.resultId}`, pageWidth - margin, 285, { align: 'right' });

  doc.save(`IELTS_Simulation_Test_Report_${evalData.resultId}.pdf`);
}
