import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TestEvaluation } from '../types/ielts';

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

// 5. COMPREHENSIVE 4-SKILLS DIAGNOSTIC SUMMARY
export function downloadComprehensivePDF(evalData: TestEvaluation) {
  const doc = new jsPDF();
  renderPDFHeader(doc, "IELTS 4-Skills Diagnostic Summary", "Complete Academic Diagnostic & Cambridge Simulation Report", evalData);

  const tableStartY = renderScoreBandBox(
    doc,
    73,
    evalData.overallBand,
    "Overall Estimated IELTS Band",
    `Target Skor: ${evalData.user.targetScore} • Evaluasi Komprehensif 4 Keterampilan`
  );

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['Section Module', 'Estimated Band', 'Hasil Simulasi', 'Fokus Konsultasi Mentor']],
    body: [
      ['Reading', typeof evalData.reading.band === 'number' ? evalData.reading.band.toFixed(1) : String(evalData.reading.band), `${evalData.reading.rawScore || 0}/${evalData.reading.totalQuestions || 12} benar`, 'Review True/False scanning di WhatsApp'],
      ['Listening', typeof evalData.listening.band === 'number' ? evalData.listening.band.toFixed(1) : String(evalData.listening.band), `${evalData.listening.rawScore || 0}/${evalData.listening.totalQuestions || 7} benar`, 'Latihan audio detail & distractor recognition'],
      ['Writing', typeof evalData.writing.band === 'number' ? evalData.writing.band.toFixed(1) : String(evalData.writing.band), `${evalData.writing.wordCount || 0} total kata`, 'Sesi feedback Task 1 chart & Task 2 essay'],
      ['Speaking', typeof evalData.speaking.band === 'number' ? evalData.speaking.band.toFixed(1) : String(evalData.speaking.band), 'Part 1, 2, 3 Siap', '1-on-1 WhatsApp pronunciation & fluency review']
    ],
    theme: 'grid',
    headStyles: { fillColor: [31, 92, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 30 },
      2: { cellWidth: 45 },
      3: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFillColor(248, 251, 255);
  doc.setDrawColor(230, 234, 242);
  doc.roundedRect(14, nextY, 182, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(8, 36, 92);
  doc.text("Langkah Konsultasi Bersama Mr.BOB IELTS Team:", 20, nextY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`1. Hubungi mentor senior Mr.BOB di WhatsApp: +62 822-1234-5678.`, 20, nextY + 14);
  doc.text(`2. Sertakan Result ID (${evalData.resultId}) untuk meminta bedah skor per skill.`, 20, nextY + 20);
  doc.text(`3. Susun rencana belajar terstruktur untuk mencapai target ${evalData.user.targetScore}.`, 20, nextY + 26);

  renderPDFFooter(doc);
  doc.save(`IELTS_Diagnostic_Summary_${evalData.resultId}.pdf`);
}
