import { jsPDF } from 'jspdf';
import autoTableModule from 'jspdf-autotable';
import type { TestEvaluation } from '../types/ielts';

const autoTable = (
  (autoTableModule as unknown as { default?: typeof autoTableModule }).default ?? autoTableModule
) as typeof autoTableModule;

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

function renderPDFHeader(
  doc: jsPDF,
  sectionTitle: string,
  subtitle: string,
  evaluation: TestEvaluation,
  logoData: string | null,
  bandLabel: string,
  bandValue: string | number
) {
  const margin = 12;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');

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
  doc.line(margin, 39, 198, 39);

  doc.setTextColor(7, 23, 54);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(sectionTitle.toUpperCase(), 14, 49);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(101, 112, 132);
  doc.text(subtitle, 14, 55);

  const identityField = (label: string, value: string, x: number, y: number, width: number) => {
    doc.setFillColor(249, 250, 252);
    doc.setDrawColor(147, 156, 171);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, width, 14, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(83, 91, 107);
    doc.text(label.toUpperCase(), x + 3, y + 4.5);
    doc.setFontSize(8.5);
    doc.setTextColor(20, 28, 45);
    let fontSize = 8.5;
    doc.setFontSize(fontSize);
    while (fontSize > 6 && doc.getTextWidth(value || '-') > width - 6) {
      fontSize -= 0.25;
      doc.setFontSize(fontSize);
    }
    doc.text(value || '-', x + 3, y + 10.5);
  };

  identityField('Full Name', evaluation.user.fullName, 14, 62, 77);
  identityField('WhatsApp', evaluation.user.whatsapp, 94, 62, 53);
  identityField('Current Status', evaluation.user.currentStatus || '-', 14, 78, 77);
  identityField('Age', String(evaluation.user.age ?? '-'), 94, 78, 53);

  doc.setFillColor(7, 23, 54);
  doc.setDrawColor(7, 23, 54);
  doc.roundedRect(151, 62, 45, 30, 1.5, 1.5, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(`${bandLabel.toUpperCase()} BAND`, 155, 81.5);
  const bandDisplay = typeof bandValue === 'number'
    ? bandValue.toFixed(1)
    : String(bandValue || 'Pending').replace(/\s+Evaluation$/i, '');
  doc.setFontSize(typeof bandValue === 'number' ? 20 : 7.5);
  doc.text(bandDisplay.toUpperCase(), 192, 81.5, { align: 'right' });
}

function renderPDFFooter(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(7, 23, 54);
  doc.rect(0, pageHeight - 18, 210, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('mrbobacademia.com | 0821-3195-3578', 105, pageHeight - 8.5, { align: 'center' });
}

// 1. READING REPORT PDF
export async function downloadReadingPDF(evalData: TestEvaluation) {
  const doc = new jsPDF();
  const logoData = await loadMrBobLogoData();
  renderPDFHeader(doc, "IELTS Reading Diagnostic Report", "Cambridge 17 Academic Reading Test 4 Evaluation", evalData, logoData, 'Reading', reportBand(evalData, 'reading'));

  autoTable(doc, {
    startY: 102,
    head: [['Kategori Evaluasi', 'Status / Skor', 'Feedback Diagnostik']],
    body: [
      ['Akurasi Jawaban Objektif', `${evalData.reading.rawScore || 0} / ${evalData.reading.totalQuestions || 12}`, 'Dihitung secara deterministik berdasarkan kunci Cambridge 17.'],
      ['Passage 1: Bats to the rescue', 'True / False / Not Given', 'Akurasi dalam membedakan kontradiksi teks dan informasi yang tidak dibahas.'],
      ['Passage 2: Education & Growth', 'Multiple Choice', 'Pemahaman scanning paragraf sejarah ekonomi dan inferensi.'],
      ['Passage 3: Blindfold Chess', 'Technical Terminology', 'Kemampuan menangkap detail kognitif dan metode memori.']
    ],
    theme: 'striped',
    headStyles: { fillColor: [7, 23, 54], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(249, 250, 252);
  doc.setDrawColor(147, 156, 171);
  doc.roundedRect(14, nextY, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(7, 23, 54);
  doc.text("Strengths & Observations:", 20, nextY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.reading.strengths.forEach((s, idx) => {
    doc.text(`• ${s}`, 20, nextY + 13 + (idx * 5));
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(7, 23, 54);
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
export async function downloadListeningPDF(evalData: TestEvaluation) {
  const doc = new jsPDF();
  const logoData = await loadMrBobLogoData();
  renderPDFHeader(doc, "IELTS Listening Diagnostic Report", "Cambridge 18 Listening Test 4 Audio Evaluation", evalData, logoData, 'Listening', reportBand(evalData, 'listening'));

  autoTable(doc, {
    startY: 102,
    head: [['Part Listening', 'Item Evaluasi', 'Feedback Diagnostik']],
    body: [
      ['Part 1: Job Enquiry', 'Job details / Medical clinic', 'Menangkap peran pekerjaan, tugas utama, dan kualifikasi yang dicari.'],
      ['Part 2: Museum Tour', 'Harbour Museum building', 'Navigasi informasi sejarah gedung dan fasilitas lantai atas.'],
      ['Part 3: Origami Study', 'Psychology Research', 'Memahami angka persentase peningkatan penalaran spasial anak.']
    ],
    theme: 'striped',
    headStyles: { fillColor: [7, 23, 54], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 45 },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(249, 250, 252);
  doc.setDrawColor(147, 156, 171);
  doc.roundedRect(14, nextY, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(7, 23, 54);
  doc.text("Strengths & Observations:", 20, nextY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.listening.strengths.forEach((s, idx) => {
    doc.text(`• ${s}`, 20, nextY + 13 + (idx * 5));
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(7, 23, 54);
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
export async function downloadWritingPDF(evalData: TestEvaluation) {
  const doc = new jsPDF();
  const logoData = await loadMrBobLogoData();
  renderPDFHeader(doc, "IELTS Writing Diagnostic Report", "Cambridge 18 Academic Writing Test 4 Assessment", evalData, logoData, 'Writing', reportBand(evalData, 'writing'));

  const wDetail = evalData.writing.writingDetail;

  autoTable(doc, {
    startY: 102,
    head: [['IELTS Rubric Criterion', 'Score', 'Examiner Assessment & Evidence']],
    body: [
      ['Task 1: Task Achievement (TA)', `Band ${wDetail?.task1.criterion1.score.toFixed(1) || '6.0'}`, wDetail?.task1.criterion1.feedback || 'Presentasi overview tren harga metal 2014.'],
      ['Task 2: Task Response (TR)', `Band ${wDetail?.task2.criterion1.score.toFixed(1) || '6.0'}`, wDetail?.task2.criterion1.feedback || 'Pengembangan argumen ageing population.'],
      ['Coherence & Cohesion (CC)', `Band ${(((wDetail?.task1.cc.score || 6) + (wDetail?.task2.cc.score || 6)) / 2).toFixed(1)}`, 'Struktur paragraf, alur transisi, dan linking devices.'],
      ['Lexical Resource (LR)', `Band ${(((wDetail?.task1.lr.score || 6) + (wDetail?.task2.lr.score || 6)) / 2).toFixed(1)}`, 'Variasi kosakata akademik dan ketepatan formal register.'],
      ['Grammar Range & Accuracy (GRA)', `Band ${(((wDetail?.task1.gra.score || 5.5) + (wDetail?.task2.gra.score || 5.5)) / 2).toFixed(1)}`, 'Variasi klausa kompleks, kalimat pasif, dan ketepatan preposisi.']
    ],
    theme: 'striped',
    headStyles: { fillColor: [7, 23, 54], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(249, 250, 252);
  doc.setDrawColor(147, 156, 171);
  doc.roundedRect(14, nextY, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(7, 23, 54);
  doc.text("Candidate Strengths:", 20, nextY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.writing.strengths.forEach((s, idx) => {
    doc.text(`• ${s}`, 20, nextY + 13 + (idx * 5));
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(7, 23, 54);
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
export async function downloadSpeakingPDF(evalData: TestEvaluation) {
  const doc = new jsPDF();
  const logoData = await loadMrBobLogoData();
  renderPDFHeader(doc, "IELTS Speaking Diagnostic Report", "Cambridge 18 Speaking Practice Test 4 Rubric Evaluation", evalData, logoData, 'Speaking', reportBand(evalData, 'speaking'));

  const spDetail = evalData.speaking.speakingDetail;

  autoTable(doc, {
    startY: 102,
    head: [['IELTS Speaking Criterion', 'Score', 'Rubric Match & Diagnostic Feedback']],
    body: [
      ['Fluency and Coherence (FC)', `Band ${spDetail?.fc.score.toFixed(1) || '6.0'}`, spDetail?.fc.feedback || 'Kelancaran bicara tanpa jeda panjang.'],
      ['Lexical Resource (LR)', `Band ${spDetail?.lr.score.toFixed(1) || '6.0'}`, spDetail?.lr.feedback || 'Rentang kosakata dan frasa idiomatik.'],
      ['Grammar Range & Accuracy (GRA)', `Band ${spDetail?.gra.score.toFixed(1) || '5.5'}`, spDetail?.gra.feedback || 'Struktur kalimat kompleks dan ketepatan tenses.'],
      ['Pronunciation (PRO)', `Band ${spDetail?.pro.score.toFixed(1) || '6.0'}`, spDetail?.pro.feedback || 'Kejelasan artikulasi, intonasi, dan word stress.']
    ],
    theme: 'striped',
    headStyles: { fillColor: [7, 23, 54], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(249, 250, 252);
  doc.setDrawColor(147, 156, 171);
  doc.roundedRect(14, nextY, 182, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(7, 23, 54);
  doc.text("Speaking Strengths:", 20, nextY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  evalData.speaking.strengths.forEach((s, idx) => {
    doc.text(`• ${s}`, 20, nextY + 13 + (idx * 5));
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(7, 23, 54);
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

  const fitSingleLineText = (value: string, maxWidth: number, preferredSize: number, minimumSize = 6) => {
    const text = value || '-';
    let fontSize = preferredSize;
    doc.setFontSize(fontSize);
    while (fontSize > minimumSize && doc.getTextWidth(text) > maxWidth) {
      fontSize = Math.max(minimumSize, fontSize - 0.25);
      doc.setFontSize(fontSize);
    }

    if (doc.getTextWidth(text) <= maxWidth) return { text, fontSize };

    let shortened = text;
    while (shortened.length > 1 && doc.getTextWidth(`${shortened}...`) > maxWidth) {
      shortened = shortened.slice(0, -1);
    }
    return { text: `${shortened}...`, fontSize };
  };

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
    doc.setTextColor(20, 28, 45);
    const fitted = fitSingleLineText(value || '-', width - 5, 8.5);
    doc.setFontSize(fitted.fontSize);
    doc.text(fitted.text, x + 2.5, y + 6.5);
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
    const fittedScore = fitSingleLineText(score, scoreWidth - 4, 12, 6.5);
    doc.setFontSize(fittedScore.fontSize);
    doc.text(fittedScore.text, x + scoreWidth / 2, 156, { align: 'center' });
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
  doc.setFontSize(8);
  doc.text('mrbobacademia.com | 0821-3195-3578', pageWidth / 2, 285, { align: 'center' });

  doc.save(`IELTS_Simulation_Test_Report_${evalData.resultId}.pdf`);
}
