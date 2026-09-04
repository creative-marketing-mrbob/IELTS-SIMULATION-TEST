import crypto from 'node:crypto';
import './loadEnv.mjs';
import { evaluateCandidateSection, getStaffRole, isAdminSessionValid, isStaffSessionValid, persistAiAssessment } from './aiEvaluatorEndpoint.mjs';

const BUCKET = 'speaking-recordings';
const SESSION_DAYS = 30;

function envConfig() {
  return {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

export function isSupabaseConfigured() {
  const cfg = envConfig();
  return Boolean(cfg.url && cfg.serviceRoleKey);
}

function requireSupabase() {
  const cfg = envConfig();
  if (!cfg.url || !cfg.serviceRoleKey) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.');
  }
  return cfg;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 60 * 1024 * 1024) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeWhatsApp(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function secureHash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function generateAccessCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const pick = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${pick()}-${pick()}`;
}

function generateResultId(fullName = '', isQa = false) {
  const cleanName = fullName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'USER';
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  if (isQa) {
    return `IELTS-${year}-QA-${cleanName}${randomSuffix}`;
  }
  return `IELTS-${year}-${cleanName}${randomSuffix}`;
}

export function isQaCandidate(candidate = {}, evaluation = {}) {
  const resultId = String(candidate.result_id || candidate.resultId || evaluation.resultId || '');
  const name = String(candidate.name || candidate.fullName || evaluation.user?.fullName || '');
  return Boolean(
    candidate.is_qa ||
    candidate.isQa ||
    evaluation.is_qa ||
    evaluation.isQa ||
    resultId.includes('-QA-') ||
    resultId.includes('QA') ||
    /QA/i.test(name)
  );
}

const readingOfficialDisplayKeys = {
  1: 'FALSE', 2: 'FALSE', 3: 'NOT GIVEN', 4: 'TRUE', 5: 'NOT GIVEN', 6: 'TRUE',
  7: 'droppings', 8: 'coffee', 9: 'mosquitoes', 10: 'protein', 11: 'unclean', 12: 'culture', 13: 'houses',
  14: 'E', 15: 'A', 16: 'D', 17: 'F', 18: 'C',
  19: 'descendants', 20: 'sermon', 21: 'fine', 22: 'innovation',
  23: 'B / E (either order)', 24: 'B / E (either order)',
  25: 'B / D (either order)', 26: 'B / D (either order)',
  27: 'D', 28: 'E', 29: 'F', 30: 'B', 31: 'H', 32: 'E',
  33: 'FALSE', 34: 'NOT GIVEN', 35: 'NOT GIVEN', 36: 'TRUE',
  37: 'memory', 38: 'numbers', 39: 'communication', 40: 'visual'
};

const listeningOfficialDisplayKeys = {
  1: 'Receptionist', 2: 'Medical', 3: 'Chastons', 4: 'Appointments', 5: 'Database',
  6: 'Experience', 7: 'confident', 8: 'Temporary', 9: '1.15', 10: 'Parking',
  11: 'B', 12: 'A', 13: 'A', 14: 'C', 15: 'F', 16: 'G', 17: 'E', 18: 'A', 19: 'C', 20: 'B',
  21: 'B / D (either order)', 22: 'B / D (either order)',
  23: 'D', 24: 'A', 25: 'C', 26: 'G', 27: 'F', 28: 'A', 29: 'B', 30: 'C',
  31: 'Plot', 32: 'Poverty', 33: 'Europe', 34: 'Poetry', 35: 'Drawings', 36: 'Furniture',
  37: 'Lamps', 38: 'harbour / harbor', 39: 'Children', 40: 'Relatives'
};

async function supabaseFetch(path, options = {}) {
  const cfg = requireSupabase();
  const response = await fetch(`${cfg.url}${path}`, {
    ...options,
    headers: {
      apikey: cfg.serviceRoleKey,
      Authorization: `Bearer ${cfg.serviceRoleKey}`,
      ...(options.body && !(options.body instanceof Buffer) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(body?.message || body?.error || `Supabase request failed (${response.status}).`);
  }
  return body;
}

async function upsert(table, rows, onConflict) {
  const conflict = onConflict ? `&on_conflict=${encodeURIComponent(onConflict)}` : '';
  return supabaseFetch(`/rest/v1/${table}?${conflict}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
  });
}

async function select(table, query = '') {
  return supabaseFetch(`/rest/v1/${table}${query}`);
}

async function remove(table, query = '') {
  return supabaseFetch(`/rest/v1/${table}${query}`, { method: 'DELETE' });
}

function defaultProgress(candidateId) {
  return {
    reading: { candidate_id: candidateId, section_type: 'reading', status: 'NOT_STARTED' },
    listening: { candidate_id: candidateId, section_type: 'listening', status: 'NOT_STARTED' },
    writing: { candidate_id: candidateId, section_type: 'writing', status: 'NOT_STARTED' },
    speaking: { candidate_id: candidateId, section_type: 'speaking', status: 'NOT_STARTED' }
  };
}

function emptyAnswers(candidateId) {
  const now = new Date().toISOString();
  return {
    candidate_id: candidateId,
    reading: {},
    listening: {},
    reading_flagged: [],
    listening_flagged: [],
    writing: { task1: '', task2: '', word_count_task1: 0, word_count_task2: 0, saved_at: now },
    speaking: { saved_at: now }
  };
}

function rowToCandidate(row) {
  const isQa = isQaCandidate(row);
  return {
    candidate_id: row.candidate_id,
    name: row.name,
    whatsapp: row.whatsapp,
    age: row.age,
    current_status: row.current_status,
    target_band: row.target_band,
    result_id: row.result_id,
    access_code_hash: row.access_code_hash,
    raw_access_code: undefined,
    is_qa: isQa,
    isQa,
    created_at: row.created_at,
    last_access_at: row.last_access_at
  };
}

async function saveCandidateData(data) {
  const now = new Date().toISOString();
  const existingCandidateRows = await select('candidates', `?candidate_id=eq.${encodeURIComponent(data.candidate.candidate_id)}&select=access_code_hash&limit=1`);
  const preservedAccessCodeHash = data.candidate.access_code_hash || existingCandidateRows?.[0]?.access_code_hash;
  if (!preservedAccessCodeHash) {
    throw new Error('Candidate access record is incomplete. Please register or resume the candidate again.');
  }

  await upsert('candidates', {
    candidate_id: data.candidate.candidate_id,
    name: data.candidate.name,
    whatsapp: normalizeWhatsApp(data.candidate.whatsapp),
    age: data.candidate.age,
    current_status: data.candidate.current_status,
    target_band: data.candidate.target_band,
    result_id: data.candidate.result_id,
    access_code_hash: preservedAccessCodeHash,
    is_qa: isQaCandidate(data.candidate, data.evaluation),
    created_at: data.candidate.created_at,
    last_access_at: now
  }, 'candidate_id');

  const progressRows = Object.values(data.progress || {}).map(item => ({
    candidate_id: data.candidate.candidate_id,
    section_type: item.section_type,
    status: item.status,
    started_at: item.started_at || item.startedAt || null,
    deadline_at: item.deadline_at || item.deadlineAt || null,
    submitted_at: item.submitted_at || item.submittedAt || null,
    submission_type: item.submission_type || item.submissionType || null
  }));
  if (progressRows.length) await upsert('section_progress', progressRows, 'candidate_id,section_type');

  const answers = data.answers || emptyAnswers(data.candidate.candidate_id);
  await saveAnswers(data.candidate, answers, data.progress || {});

  if (data.evaluation) {
    await saveEvaluation(data);
  }
}

async function saveAnswers(candidate, answers, progress = {}) {
  const candidateId = candidate.candidate_id;
  const resultId = candidate.result_id;
  const isQa = isQaCandidate(candidate);
  const now = new Date().toISOString();
  const readingKeys = Object.keys(answers.reading || {});
  if (readingKeys.length > 0) {
    await remove('reading_answers', `?candidate_id=eq.${encodeURIComponent(candidateId)}`);
    const readingRows = Object.entries(answers.reading || {}).map(([question, answer]) => ({
      candidate_id: candidateId,
      result_id: resultId,
      section: 'reading',
      question_number: Number(question),
      question_id: `reading-q-${question}`,
      candidate_answer: String(answer),
      answer: String(answer),
      flagged: (answers.reading_flagged || []).includes(Number(question)),
      saved_at: now,
      submitted_at: progress.reading?.submitted_at || progress.reading?.submittedAt || null,
      is_qa: isQa,
      updated_at: now
    }));
    if (readingRows.length) await upsert('reading_answers', readingRows, 'candidate_id,question_number');
  }

  const listeningKeys = Object.keys(answers.listening || {});
  if (listeningKeys.length > 0) {
    await remove('listening_answers', `?candidate_id=eq.${encodeURIComponent(candidateId)}`);
    const listeningRows = Object.entries(answers.listening || {}).map(([question, answer]) => ({
      candidate_id: candidateId,
      result_id: resultId,
      section: 'listening',
      question_number: Number(question),
      question_id: `listening-q-${question}`,
      candidate_answer: String(answer),
      answer: String(answer),
      flagged: (answers.listening_flagged || []).includes(Number(question)),
      saved_at: now,
      submitted_at: progress.listening?.submitted_at || progress.listening?.submittedAt || null,
      is_qa: isQa,
      updated_at: now
    }));
    if (listeningRows.length) await upsert('listening_answers', listeningRows, 'candidate_id,question_number');
  }

  if (answers.writing && (answers.writing.task1 || answers.writing.task2 || answers.writing.saved_at || answers.writing.savedAt)) {
    await upsert('writing_responses', {
      candidate_id: candidateId,
      result_id: resultId,
      is_qa: isQa,
      task1: answers.writing.task1 || '',
      task2: answers.writing.task2 || '',
      word_count_task1: answers.writing.word_count_task1 ?? answers.writing.wordCountTask1 ?? 0,
      word_count_task2: answers.writing.word_count_task2 ?? answers.writing.wordCountTask2 ?? 0,
      saved_at: answers.writing.saved_at || answers.writing.savedAt || new Date().toISOString()
    }, 'candidate_id');
  }

  const speaking = answers.speaking || {};
  const speakingSource = isQa ? [
    { part: 1, audio: speaking.part1_q1_audio, duration: speaking.part1_q1_duration, transcript: speaking.part1_q1_transcript, qId: 'speaking-p1-q1', mimeType: speaking.part1_q1_mime_type, fileSize: speaking.part1_q1_file_size },
    { part: 1, audio: speaking.part1_q2_audio, duration: speaking.part1_q2_duration, transcript: speaking.part1_q2_transcript, qId: 'speaking-p1-q2', mimeType: speaking.part1_q2_mime_type, fileSize: speaking.part1_q2_file_size },
    { part: 2, audio: speaking.part2_audio, duration: speaking.part2_duration, transcript: speaking.part2_transcript, qId: 'speaking-part-2', mimeType: speaking.part2_mime_type, fileSize: speaking.part2_file_size },
    { part: 3, audio: speaking.part3_q1_audio, duration: speaking.part3_q1_duration, transcript: speaking.part3_q1_transcript, qId: 'speaking-p3-q1', mimeType: speaking.part3_q1_mime_type, fileSize: speaking.part3_q1_file_size },
    { part: 3, audio: speaking.part3_q2_audio, duration: speaking.part3_q2_duration, transcript: speaking.part3_q2_transcript, qId: 'speaking-p3-q2', mimeType: speaking.part3_q2_mime_type, fileSize: speaking.part3_q2_file_size }
  ] : [
    { part: 1, audio: speaking.part1Audio, duration: speaking.part1Duration, transcript: speaking.part1Transcript, qId: 'speaking-part-1', mimeType: speaking.part1MimeType, fileSize: speaking.part1FileSize },
    { part: 2, audio: speaking.part2Audio, duration: speaking.part2Duration, transcript: speaking.part2Transcript, qId: 'speaking-part-2', mimeType: speaking.part2MimeType, fileSize: speaking.part2FileSize },
    { part: 3, audio: speaking.part3Audio, duration: speaking.part3Duration, transcript: speaking.part3Transcript, qId: 'speaking-part-3', mimeType: speaking.part3MimeType, fileSize: speaking.part3FileSize }
  ];

  const speakingRows = speakingSource.map(({ part, audio, duration, transcript, qId, mimeType, fileSize }) => {
    return (audio || duration || transcript) ? {
      candidate_id: candidateId,
      result_id: resultId,
      is_qa: isQa,
      part,
      question_id: qId,
      audio_storage_path: audio && String(audio).startsWith('speaking-recordings/') ? audio : null,
      duration: typeof duration === 'number' ? Math.round(duration) : null,
      mime_type: mimeType || null,
      file_size: typeof fileSize === 'number' ? Math.round(fileSize) : null,
      transcript: transcript || null,
      saved_at: speaking.saved_at || speaking.savedAt || new Date().toISOString(),
      submitted_at: progress.speaking?.submitted_at || progress.speaking?.submittedAt || null
    } : null;
  }).filter(Boolean);

  if (speakingRows.length) await upsert('speaking_metadata', speakingRows, 'candidate_id,question_id');
}

async function saveEvaluation(data) {
  const evaluation = data.evaluation;
  await upsert('final_diagnostic_results', {
    result_id: evaluation.resultId,
    candidate_id: data.candidate.candidate_id,
    completed_at: evaluation.completedAt,
    overall_band: evaluation.overallBand,
    status: evaluation.status,
    evaluation_json: evaluation,
    updated_at: new Date().toISOString()
  }, 'result_id');

  const aiRows = Array.from(new Map([
    ...(evaluation.aiAssessmentHistory || []),
    ...(evaluation.aiAssessments?.writing ? [evaluation.aiAssessments.writing] : []),
    ...(evaluation.aiAssessments?.speaking ? [evaluation.aiAssessments.speaking] : [])
  ].filter(Boolean).map(item => [
    item.evaluation_id || `${item.result_id}-${item.section}-${item.input_hash || crypto.randomUUID()}`,
    item
  ])).values());

  if (aiRows.length) {
    await upsert('ai_assessments', aiRows.map(item => ({
      evaluation_id: item.evaluation_id || crypto.randomUUID(),
      candidate_id: item.candidate_id,
      result_id: item.result_id,
      section: item.section,
      provider: item.provider || 'google-gemini',
      model_name: item.model_name,
      model_version: item.model_version,
      rubric_version: item.rubric_version,
      prompt_version: item.prompt_version,
      evaluation_timestamp: item.evaluation_timestamp || item.created_at,
      input_hash: item.input_hash,
      criterion_scores: item.criterion_scores || {},
      criterion_evidence: item.criterion_evidence || {},
      confidence: item.confidence,
      calculated_band: item.calculated_band ?? item.estimated_band,
      raw_model_response: item.raw_ai_response || {},
      status: item.status || item.evaluation_status,
      is_active: Boolean(item.is_active)
    })), 'evaluation_id');
  }

  if (evaluation.manualChecks) {
    const existingTutorRows = await select('tutor_assessments', `?result_id=eq.${encodeURIComponent(evaluation.resultId)}&limit=1`);
    if (existingTutorRows?.[0]?.is_approved && !evaluation.manualChecks.isApproved && !evaluation.manualChecks.sectionStatuses) {
      throw new Error('Locked tutor assessment cannot be replaced by a draft.');
    }

    await upsert('tutor_assessments', {
      result_id: evaluation.resultId,
      candidate_id: data.candidate.candidate_id,
      assessment_json: evaluation.manualChecks,
      tutor_overall_band: evaluation.manualChecks.tutorOverallBand,
      evaluator_name: evaluation.manualChecks.evaluatorName,
      checked_at: evaluation.manualChecks.checkedAt,
      is_approved: evaluation.manualChecks.isApproved
    }, 'result_id');

    if (evaluation.manualChecks.isApproved) {
      await upsert('qa_calibration_records', {
        result_id: evaluation.resultId,
        candidate_id: data.candidate.candidate_id,
        writing_ai_band: typeof evaluation.dualComparison?.aiAssessment?.writingBand === 'number' ? evaluation.dualComparison.aiAssessment.writingBand : null,
        writing_tutor_band: evaluation.manualChecks.writing?.tutorBand ?? null,
        speaking_ai_band: typeof evaluation.dualComparison?.aiAssessment?.speakingBand === 'number' ? evaluation.dualComparison.aiAssessment.speakingBand : null,
        speaking_tutor_band: evaluation.manualChecks.speaking?.tutorBand ?? null,
        calibration_json: evaluation.dualComparison || {},
        created_at: new Date().toISOString()
      }, 'result_id');
    }
  }
}

async function createSession(candidateId) {
  const sessionToken = `sess_${crypto.randomUUID()}`;
  const sessionHash = secureHash(sessionToken);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await upsert('test_sessions', {
    session_id: crypto.randomUUID(),
    candidate_id: candidateId,
    session_token_hash: sessionHash,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
    last_seen_at: now.toISOString()
  }, 'session_token_hash');
  return sessionToken;
}

function buildInitialEvaluation(candidate, answers, progress) {
  const isQa = isQaCandidate(candidate);
  const readingMax = isQa ? 5 : 40;
  const listeningMax = isQa ? 5 : 40;

  const readingResponses = {};
  for (let q = 1; q <= readingMax; q++) {
    const candAns = answers.reading?.[q] || '';
    const official = readingOfficialDisplayKeys[q] || '';
    readingResponses[q] = {
      candidate_id: candidate.candidate_id,
      result_id: candidate.result_id,
      section: 'reading',
      question_number: q,
      question_id: `reading-q-${q}`,
      candidate_answer: candAns,
      official_answer: official,
      auto_is_correct: Boolean(candAns && candAns.trim().toUpperCase() === official.trim().toUpperCase()),
      is_qa: isQa,
      saved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString()
    };
  }

  const listeningResponses = {};
  for (let q = 1; q <= listeningMax; q++) {
    const candAns = answers.listening?.[q] || '';
    const official = listeningOfficialDisplayKeys[q] || '';
    listeningResponses[q] = {
      candidate_id: candidate.candidate_id,
      result_id: candidate.result_id,
      section: 'listening',
      question_number: q,
      question_id: `listening-q-${q}`,
      candidate_answer: candAns,
      official_answer: official,
      auto_is_correct: Boolean(candAns && candAns.trim().toUpperCase() === official.trim().toUpperCase()),
      is_qa: isQa,
      saved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString()
    };
  }

  const writingResponses = {
    candidate_id: candidate.candidate_id,
    result_id: candidate.result_id,
    task_1_response: answers.writing?.task1 || '',
    task_1_word_count: answers.writing?.word_count_task1 || 0,
    task_2_response: answers.writing?.task2 || '',
    task_2_word_count: answers.writing?.word_count_task2 || 0,
    is_qa: isQa,
    saved_at: answers.writing?.saved_at || new Date().toISOString(),
    submitted_at: new Date().toISOString()
  };

  const speakingResponses = {};
  if (isQa) {
    speakingResponses[1] = {
      candidate_id: candidate.candidate_id,
      result_id: candidate.result_id,
      part: 1,
      question_id: 'speaking-p1-q1',
      audio_storage_path: answers.speaking?.part1_q1_audio || answers.speaking?.part1Audio || '',
      duration: answers.speaking?.part1_q1_duration || answers.speaking?.part1Duration || null,
      transcript: answers.speaking?.part1_q1_transcript || answers.speaking?.part1Transcript || null,
      is_qa: isQa,
      saved_at: answers.speaking?.saved_at || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    };
    speakingResponses[2] = {
      candidate_id: candidate.candidate_id,
      result_id: candidate.result_id,
      part: 1,
      question_id: 'speaking-p1-q2',
      audio_storage_path: answers.speaking?.part1_q2_audio || '',
      duration: answers.speaking?.part1_q2_duration || null,
      transcript: answers.speaking?.part1_q2_transcript || null,
      is_qa: isQa,
      saved_at: answers.speaking?.saved_at || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    };
    speakingResponses[3] = {
      candidate_id: candidate.candidate_id,
      result_id: candidate.result_id,
      part: 2,
      question_id: 'speaking-part-2',
      audio_storage_path: answers.speaking?.part2_audio || answers.speaking?.part2Audio || '',
      duration: answers.speaking?.part2_duration || answers.speaking?.part2Duration || null,
      transcript: answers.speaking?.part2_transcript || answers.speaking?.part2Transcript || null,
      is_qa: isQa,
      saved_at: answers.speaking?.saved_at || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    };
    speakingResponses[4] = {
      candidate_id: candidate.candidate_id,
      result_id: candidate.result_id,
      part: 3,
      question_id: 'speaking-p3-q1',
      audio_storage_path: answers.speaking?.part3_q1_audio || answers.speaking?.part3Audio || '',
      duration: answers.speaking?.part3_q1_duration || answers.speaking?.part3Duration || null,
      transcript: answers.speaking?.part3_q1_transcript || answers.speaking?.part3Transcript || null,
      is_qa: isQa,
      saved_at: answers.speaking?.saved_at || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    };
    speakingResponses[5] = {
      candidate_id: candidate.candidate_id,
      result_id: candidate.result_id,
      part: 3,
      question_id: 'speaking-p3-q2',
      audio_storage_path: answers.speaking?.part3_q2_audio || '',
      duration: answers.speaking?.part3_q2_duration || null,
      transcript: answers.speaking?.part3_q2_transcript || null,
      is_qa: isQa,
      saved_at: answers.speaking?.saved_at || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    };
  } else {
    for (let part = 1; part <= 3; part++) {
      speakingResponses[part] = {
        candidate_id: candidate.candidate_id,
        result_id: candidate.result_id,
        part,
        question_id: `speaking-part-${part}`,
        audio_storage_path: answers.speaking?.[`part${part}Audio`] || '',
        duration: answers.speaking?.[`part${part}Duration`] || null,
        transcript: answers.speaking?.[`part${part}Transcript`] || null,
        is_qa: isQa,
        saved_at: answers.speaking?.saved_at || new Date().toISOString(),
        submitted_at: new Date().toISOString()
      };
    }
  }

  const manualChecksReading = {};
  for (let q = 1; q <= readingMax; q++) {
    manualChecksReading[q] = {
      questionNumber: q,
      candidateAnswer: readingResponses[q]?.candidate_answer || '',
      officialAnswer: readingResponses[q]?.official_answer || '',
      autoIsCorrect: readingResponses[q]?.auto_is_correct || false,
      tutorIsCorrect: false
    };
  }

  const manualChecksListening = {};
  for (let q = 1; q <= listeningMax; q++) {
    manualChecksListening[q] = {
      questionNumber: q,
      candidateAnswer: listeningResponses[q]?.candidate_answer || '',
      officialAnswer: listeningResponses[q]?.official_answer || '',
      autoIsCorrect: listeningResponses[q]?.auto_is_correct || false,
      tutorIsCorrect: false
    };
  }

  return {
    resultId: candidate.result_id,
    testId: 'CAMBRIDGE-IELTS-17-18-OFFICIAL',
    is_qa: isQa,
    isQa,
    user: {
      candidateId: candidate.candidate_id,
      fullName: candidate.name,
      whatsapp: candidate.whatsapp,
      age: candidate.age,
      currentStatus: candidate.current_status,
      targetScore: candidate.target_band,
      resultId: candidate.result_id,
      registeredAt: candidate.created_at
    },
    completedAt: new Date().toISOString(),
    overallBand: 'Pending Evaluation',
    reading: { band: 'Pending Evaluation', rawScore: 0, totalQuestions: readingMax },
    listening: { band: 'Pending Evaluation', rawScore: 0, totalQuestions: listeningMax },
    writing: { band: 'Pending Evaluation', assessmentStatus: 'Awaiting Evaluation' },
    speaking: { band: 'Pending Evaluation', assessmentStatus: 'Awaiting Evaluation' },
    answers,
    rawResponses: {
      reading: readingResponses,
      listening: listeningResponses,
      writing: writingResponses,
      speaking: speakingResponses
    },
    manualChecks: {
      reading: { checks: manualChecksReading, autoScore: 0, tutorScore: 0, matchCount: 0, matchPercentage: 0 },
      listening: { checks: manualChecksListening, autoScore: 0, tutorScore: 0, matchCount: 0, matchPercentage: 0 },
      writing: { task1: { ta: 6, cc: 6, lr: 6, gra: 6 }, task2: { tr: 6, cc: 6, lr: 6, gra: 6 } },
      speaking: { fc: 6, lr: 6, gra: 6, pro: 6 },
      tutorOverallBand: 6,
      evaluatorName: 'IELTS Tutor',
      checkedAt: new Date().toISOString(),
      isApproved: false
    },
    status: 'Pending Evaluation',
    dualComparison: {
      aiAssessment: undefined,
      tutorAssessment: undefined,
      activeMode: 'TUTOR',
      needsManualReview: true
    },
    auditTrail: []
  };
}

async function hydrateCandidate(candidateId) {
  const candidates = await select('candidates', `?candidate_id=eq.${encodeURIComponent(candidateId)}&limit=1`);
  const row = candidates?.[0];
  if (!row) return null;

  const [progressRows, readingRows, listeningRows, writingRows, speakingRows, resultRows, aiRows, tutorRows] = await Promise.all([
    select('section_progress', `?candidate_id=eq.${encodeURIComponent(candidateId)}`),
    select('reading_answers', `?candidate_id=eq.${encodeURIComponent(candidateId)}`),
    select('listening_answers', `?candidate_id=eq.${encodeURIComponent(candidateId)}`),
    select('writing_responses', `?candidate_id=eq.${encodeURIComponent(candidateId)}&limit=1`),
    select('speaking_metadata', `?candidate_id=eq.${encodeURIComponent(candidateId)}`),
    select('final_diagnostic_results', `?candidate_id=eq.${encodeURIComponent(candidateId)}&order=updated_at.desc&limit=1`),
    select('ai_assessments', `?candidate_id=eq.${encodeURIComponent(candidateId)}&order=evaluation_timestamp.asc`),
    select('tutor_assessments', `?result_id=eq.${encodeURIComponent(row.result_id)}&order=checked_at.desc&limit=1`)
  ]);

  const progress = defaultProgress(candidateId);
  for (const item of progressRows || []) {
    progress[item.section_type] = item;
  }

  const answers = emptyAnswers(candidateId);
  for (const item of readingRows || []) {
    answers.reading[item.question_number] = item.candidate_answer ?? item.answer ?? '';
    if (item.flagged) answers.reading_flagged.push(item.question_number);
  }
  for (const item of listeningRows || []) {
    answers.listening[item.question_number] = item.candidate_answer ?? item.answer ?? '';
    if (item.flagged) answers.listening_flagged.push(item.question_number);
  }

  const writing = writingRows?.[0];
  if (writing) {
    answers.writing = {
      task1: writing.task1 || '',
      task2: writing.task2 || '',
      word_count_task1: writing.word_count_task1 || 0,
      word_count_task2: writing.word_count_task2 || 0,
      saved_at: writing.saved_at
    };
  }

  for (const item of speakingRows || []) {
    const keyByQuestionId = {
      'speaking-p1-q1': 'part1_q1',
      'speaking-p1-q2': 'part1_q2',
      'speaking-part-2': 'part2',
      'speaking-p3-q1': 'part3_q1',
      'speaking-p3-q2': 'part3_q2'
    }[item.question_id];

    if (keyByQuestionId) {
      answers.speaking[`${keyByQuestionId}_audio`] = item.audio_storage_path;
      answers.speaking[`${keyByQuestionId}_duration`] = item.duration;
      answers.speaking[`${keyByQuestionId}_transcript`] = item.transcript;
      answers.speaking[`${keyByQuestionId}_mime_type`] = item.mime_type;
      answers.speaking[`${keyByQuestionId}_file_size`] = item.file_size;
    }

    if (!item.is_qa || !keyByQuestionId) {
      answers.speaking[`part${item.part}Audio`] = item.audio_storage_path;
      answers.speaking[`part${item.part}Duration`] = item.duration;
      answers.speaking[`part${item.part}Transcript`] = item.transcript;
      answers.speaking[`part${item.part}MimeType`] = item.mime_type;
      answers.speaking[`part${item.part}FileSize`] = item.file_size;
    }
    answers.speaking.saved_at = item.saved_at;
  }

  const candidateObj = rowToCandidate(row);
  const isQa = isQaCandidate(candidateObj);

  let evaluation = resultRows?.[0]?.evaluation_json || undefined;
  const tutorCheck = tutorRows?.[0]?.assessment_json || undefined;

  if (evaluation) {
    // Preserve and synchronize real candidate answers from database
    evaluation.answers = {
      ...evaluation.answers,
      reading: { ...(evaluation.answers?.reading || {}), ...answers.reading },
      listening: { ...(evaluation.answers?.listening || {}), ...answers.listening },
      writing: answers.writing.task1 || answers.writing.task2 ? answers.writing : (evaluation.answers?.writing || answers.writing),
      speaking: { ...(evaluation.answers?.speaking || {}), ...answers.speaking }
    };

    // If 5-question QA speaking recordings were saved in evaluation, bring them into answers.speaking
    if (evaluation.answers?.speaking) {
      Object.assign(answers.speaking, evaluation.answers.speaking);
    }

    if (tutorCheck) {
      evaluation.manualChecks = {
        ...(evaluation.manualChecks || {}),
        ...tutorCheck
      };
    }
  } else if (tutorCheck) {
    evaluation = buildInitialEvaluation(candidateObj, answers, progress);
    evaluation.manualChecks = {
      ...evaluation.manualChecks,
      ...tutorCheck
    };
  } else {
    evaluation = buildInitialEvaluation(candidateObj, answers, progress);
  }

  evaluation.is_qa = isQa;
  evaluation.isQa = isQa;

  if (evaluation && aiRows?.length) {
    evaluation.aiAssessmentHistory = aiRows.map(aiRow => ({
      candidate_id: aiRow.candidate_id,
      result_id: aiRow.result_id,
      section: aiRow.section,
      evaluation_id: aiRow.evaluation_id,
      provider: aiRow.provider,
      rubric_version: aiRow.rubric_version,
      prompt_version: aiRow.prompt_version,
      model_name: aiRow.model_name,
      model_version: aiRow.model_version,
      evaluation_timestamp: aiRow.evaluation_timestamp,
      input_hash: aiRow.input_hash,
      created_at: aiRow.evaluation_timestamp,
      raw_ai_response: aiRow.raw_model_response,
      criterion_scores: aiRow.criterion_scores,
      criterion_evidence: aiRow.criterion_evidence,
      estimated_band: aiRow.calculated_band,
      calculated_band: aiRow.calculated_band,
      confidence: aiRow.confidence,
      evaluation_status: aiRow.status,
      status: aiRow.status,
      is_active: aiRow.is_active
    }));
  }

  return {
    candidate: candidateObj,
    is_qa: isQa,
    progress,
    answers,
    evaluation
  };
}

async function registerCandidate(profile) {
  const now = new Date().toISOString();
  const candidateId = `cand_${crypto.randomUUID()}`;
  const isQa = Boolean(profile.is_qa || profile.isQa);
  const resultId = generateResultId(profile.fullName, isQa);
  const accessCode = generateAccessCode();
  const candidate = {
    candidate_id: candidateId,
    name: profile.fullName,
    whatsapp: normalizeWhatsApp(profile.whatsapp),
    age: profile.age,
    current_status: profile.currentStatus,
    target_band: profile.targetScore,
    result_id: resultId,
    access_code_hash: secureHash(accessCode),
    is_qa: isQa,
    created_at: now,
    last_access_at: now
  };

  await upsert('candidates', candidate, 'candidate_id');
  await upsert('section_progress', Object.values(defaultProgress(candidateId)), 'candidate_id,section_type');
  await upsert('writing_responses', {
    candidate_id: candidateId,
    task1: '',
    task2: '',
    word_count_task1: 0,
    word_count_task2: 0,
    saved_at: now
  }, 'candidate_id');

  const sessionToken = await createSession(candidateId);
  return {
    candidate: { ...rowToCandidate(candidate), raw_access_code: accessCode },
    accessCode,
    sessionToken
  };
}

async function resumeWithAccessCode(whatsapp, accessCode) {
  const rows = await select('candidates', `?whatsapp=eq.${encodeURIComponent(normalizeWhatsApp(whatsapp))}&access_code_hash=eq.${encodeURIComponent(secureHash(String(accessCode).trim().toUpperCase()))}&limit=1`);
  const candidate = rows?.[0];
  if (!candidate) {
    return { success: false, error: 'Nomor WhatsApp atau Access Code tidak cocok.' };
  }
  const sessionToken = await createSession(candidate.candidate_id);
  const data = await hydrateCandidate(candidate.candidate_id);
  return { success: true, data, sessionToken };
}

async function resumeSession(token) {
  if (!token) return null;
  const sessionHash = secureHash(token);
  const sessions = await select('test_sessions', `?session_token_hash=eq.${encodeURIComponent(sessionHash)}&limit=1`);
  const session = sessions?.[0];
  if (!session || new Date(session.expires_at).getTime() < Date.now()) return null;
  await upsert('test_sessions', {
    ...session,
    last_seen_at: new Date().toISOString()
  }, 'session_token_hash');
  return hydrateCandidate(session.candidate_id);
}

async function candidateIdForSessionToken(token) {
  if (!token) return null;
  const sessionHash = secureHash(token);
  const sessions = await select('test_sessions', `?session_token_hash=eq.${encodeURIComponent(sessionHash)}&limit=1`);
  const session = sessions?.[0];
  if (!session || new Date(session.expires_at).getTime() < Date.now()) return null;
  return session.candidate_id;
}

async function canAccessCandidate(req, candidateId) {
  if (isAdminSessionValid(req)) return true;
  const sessionCandidateId = await candidateIdForSessionToken(req.headers['x-session-token']);
  return Boolean(sessionCandidateId && sessionCandidateId === candidateId);
}

async function canAccessResult(req, resultId) {
  if (isAdminSessionValid(req)) return true;
  const rows = await select('candidates', `?result_id=eq.${encodeURIComponent(resultId)}&limit=1`);
  const candidate = rows?.[0];
  if (!candidate) return false;
  return canAccessCandidate(req, candidate.candidate_id);
}

async function getAllCandidates() {
  const rows = await select('candidates', '?order=created_at.desc');
  const hydrated = await Promise.all((rows || []).map(row => hydrateCandidate(row.candidate_id)));
  return Object.fromEntries(hydrated.filter(Boolean).map(data => [data.candidate.candidate_id, data]));
}

function stripAutoResults(rawResponses = {}) {
  const stripSection = section => Object.fromEntries(
    Object.entries(rawResponses?.[section] || {}).map(([questionNumber, row]) => [
      questionNumber,
      {
        question_number: row.question_number,
        section: row.section,
        candidate_answer: row.candidate_answer,
        official_answer: row.official_answer,
        is_acceptable: row.is_acceptable
      }
    ])
  );
  return {
    ...rawResponses,
    reading: stripSection('reading'),
    listening: stripSection('listening')
  };
}

function sanitizeTutorEvaluation(evaluation, isQa = false, answers = {}, candidate = {}) {
  if (!evaluation) return evaluation;
  const locked = Boolean(evaluation.manualChecks?.isApproved);

  const rawResponses = { ...(evaluation.rawResponses || {}) };
  const readingRaw = { ...(rawResponses.reading || {}) };
  const listeningRaw = { ...(rawResponses.listening || {}) };

  const readingMax = isQa ? 5 : 40;
  const listeningMax = isQa ? 5 : 40;

  const filteredReading = {};
  for (let q = 1; q <= readingMax; q++) {
    const candAns = answers.reading?.[q] || evaluation.answers?.reading?.[q] || readingRaw[q]?.candidate_answer || '';
    filteredReading[q] = {
      ...(readingRaw[q] || {}),
      question_number: q,
      section: 'reading',
      candidate_answer: candAns,
      official_answer: readingOfficialDisplayKeys[q] || readingRaw[q]?.official_answer || '',
      auto_is_correct: readingRaw[q]?.auto_is_correct ?? false
    };
  }

  const filteredListening = {};
  for (let q = 1; q <= listeningMax; q++) {
    const candAns = answers.listening?.[q] || evaluation.answers?.listening?.[q] || listeningRaw[q]?.candidate_answer || '';
    filteredListening[q] = {
      ...(listeningRaw[q] || {}),
      question_number: q,
      section: 'listening',
      candidate_answer: candAns,
      official_answer: listeningOfficialDisplayKeys[q] || listeningRaw[q]?.official_answer || '',
      auto_is_correct: listeningRaw[q]?.auto_is_correct ?? false
    };
  }

  if (locked) {
    return {
      ...evaluation,
      is_qa: isQa,
      isQa: isQa,
      rawResponses: {
        ...rawResponses,
        reading: filteredReading,
        listening: filteredListening
      }
    };
  }

  const {
    aiAssessments,
    aiAssessmentHistory,
    auditTrail,
    dualComparison,
    ...rest
  } = evaluation;

  return {
    ...rest,
    is_qa: isQa,
    isQa: isQa,
    reading: {
      ...rest.reading,
      rawScore: undefined,
      correctPercentage: undefined,
      correctAnswersList: undefined,
      incorrectAnswersList: undefined
    },
    listening: {
      ...rest.listening,
      rawScore: undefined,
      correctPercentage: undefined,
      correctAnswersList: undefined,
      incorrectAnswersList: undefined
    },
    writing: {
      band: 'Blind Review',
      assessmentStatus: 'Awaiting AI Evaluation',
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    speaking: {
      band: 'Blind Review',
      assessmentStatus: 'Awaiting AI Evaluation',
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    rawResponses: stripAutoResults({
      ...rawResponses,
      reading: filteredReading,
      listening: filteredListening
    }),
    dualComparison: dualComparison?.tutorAssessment ? {
      tutorAssessment: dualComparison.tutorAssessment,
      activeMode: 'TUTOR',
      needsManualReview: true
    } : undefined,
    auditTrail: (auditTrail || []).filter(item => item?.evaluation_mode === 'TUTOR')
  };
}

async function getTutorCandidates() {
  const rows = await select('candidates', '?order=created_at.desc');
  const hydrated = await Promise.all((rows || []).map(row => hydrateCandidate(row.candidate_id)));
  return Object.fromEntries(hydrated.filter(Boolean).map(data => {
    const isQa = isQaCandidate(data.candidate, data.evaluation);
    return [
      data.candidate.candidate_id,
      {
        ...data,
        is_qa: isQa,
        isQa: isQa,
        evaluation: sanitizeTutorEvaluation(data.evaluation, isQa, data.answers, data.candidate)
      }
    ];
  }));
}

async function updateTutorAssessment(body, role) {
  const resultId = body?.resultId;
  const updatedFields = body?.updatedFields;
  if (!resultId || !updatedFields?.manualChecks) {
    throw new Error('Tutor assessment update requires resultId and manualChecks.');
  }

  const rows = await select('candidates', `?result_id=eq.${encodeURIComponent(resultId)}&limit=1`);
  const candidate = rows?.[0];
  if (!candidate) throw new Error('Candidate result not found.');

  let existing = await hydrateCandidate(candidate.candidate_id);
  if (!existing) throw new Error('Candidate data could not be retrieved.');

  const isQa = isQaCandidate(candidate, existing.evaluation);

  if (!existing.evaluation) {
    existing.evaluation = buildInitialEvaluation(rowToCandidate(candidate), existing.answers || emptyAnswers(candidate.candidate_id), existing.progress);
  }

  const sectionStatuses = updatedFields.manualChecks.sectionStatuses || {};
  const submitAndLock = Object.values(sectionStatuses).some(item => item?.status === 'SUBMITTED') || Boolean(updatedFields.manualChecks.isApproved);

  if (submitAndLock) {
    const checks = updatedFields.manualChecks || {};
    if (sectionStatuses.writing?.status === 'SUBMITTED') {
      const w1 = checks.writing?.task1;
      const w2 = checks.writing?.task2;
      if (!w1 || typeof w1.ta !== 'number' || typeof w1.cc !== 'number' || typeof w1.lr !== 'number' || typeof w1.gra !== 'number') {
        throw new Error('Writing Task 1 belum dinilai.');
      }
      if (!w2 || typeof w2.tr !== 'number' || typeof w2.cc !== 'number' || typeof w2.lr !== 'number' || typeof w2.gra !== 'number') {
        throw new Error('Writing Task 2 belum dinilai.');
      }
    }

    if (sectionStatuses.speaking?.status === 'SUBMITTED') {
      const spk = checks.speaking || {};
      if (typeof spk.fc !== 'number') throw new Error('Speaking Fluency & Coherence belum dinilai.');
      if (typeof spk.lr !== 'number') throw new Error('Speaking Lexical Resource belum dinilai.');
      if (typeof spk.gra !== 'number') throw new Error('Speaking Grammar belum dinilai.');
      if (typeof spk.pro !== 'number') throw new Error('Speaking Pronunciation belum dinilai.');
    }

    const requiredObjectiveCount = isQa ? 5 : 40;
    if (sectionStatuses.reading?.status === 'SUBMITTED') {
      const readingChecks = checks.reading?.checks || {};
      for (let q = 1; q <= requiredObjectiveCount; q++) {
        const val = readingChecks[q];
        const verified = typeof val === 'boolean' || (val && typeof val.tutorIsCorrect === 'boolean');
        if (!verified) {
          throw new Error(`Reading QA Soal ${q} belum diverifikasi.`);
        }
      }
    }

    if (sectionStatuses.listening?.status === 'SUBMITTED') {
      const listeningChecks = checks.listening?.checks || {};
      for (let q = 1; q <= requiredObjectiveCount; q++) {
        const val = listeningChecks[q];
        const verified = typeof val === 'boolean' || (val && typeof val.tutorIsCorrect === 'boolean');
        if (!verified) {
          throw new Error(`Listening QA Soal ${q} belum diverifikasi.`);
        }
      }
    }
  }

  const existingAi = existing.evaluation.dualComparison?.aiAssessment;
  const mergedEvaluation = {
    ...existing.evaluation,
    is_qa: isQa,
    isQa: isQa,
    manualChecks: {
      ...updatedFields.manualChecks,
      evaluatorName: updatedFields.manualChecks.evaluatorName || role,
      checkedAt: updatedFields.manualChecks.checkedAt || new Date().toISOString()
    },
    auditTrail: [
      ...(existing.evaluation.auditTrail || []),
      ...(updatedFields.auditTrail || []).filter(item => item?.evaluation_mode === 'TUTOR')
    ]
  };

  if (submitAndLock) {
    mergedEvaluation.overallBand = updatedFields.overallBand;
    mergedEvaluation.writing = updatedFields.writing || existing.evaluation.writing;
    mergedEvaluation.speaking = updatedFields.speaking || existing.evaluation.speaking;
    mergedEvaluation.status = updatedFields.status || 'Evaluated';
    mergedEvaluation.dualComparison = {
      ...(updatedFields.dualComparison || {}),
      aiAssessment: existingAi,
      activeMode: 'TUTOR',
      needsManualReview: updatedFields.dualComparison?.needsManualReview ?? !updatedFields.manualChecks.isApproved
    };
  } else {
    mergedEvaluation.dualComparison = updatedFields.dualComparison || existing.evaluation.dualComparison;
  }

  await saveCandidateData({
    ...existing,
    evaluation: mergedEvaluation
  });

  return sanitizeTutorEvaluation(mergedEvaluation, isQa, existing.answers, candidate);
}

function candidateRowToUserProfile(candidate) {
  return {
    candidateId: candidate.candidate_id,
    fullName: candidate.name,
    whatsapp: candidate.whatsapp,
    age: candidate.age,
    currentStatus: candidate.current_status,
    targetScore: candidate.target_band,
    resultId: candidate.result_id,
    registeredAt: candidate.created_at
  };
}

function aiAssessmentToComparisonPatch(section, assessment, detail, existingComparison = {}) {
  const current = existingComparison.aiAssessment || {};
  return {
    ...existingComparison,
    aiAssessment: {
      readingBand: current.readingBand ?? 'Not Evaluated',
      listeningBand: current.listeningBand ?? 'Not Evaluated',
      writingBand: section === 'writing' ? assessment.estimated_band : current.writingBand ?? 'Not Evaluated',
      speakingBand: section === 'speaking' ? assessment.estimated_band : current.speakingBand ?? 'Not Evaluated',
      overallBand: current.overallBand ?? 'Not Evaluated',
      writingDetail: section === 'writing' ? detail : current.writingDetail,
      speakingDetail: section === 'speaking' ? detail : current.speakingDetail
    },
    activeMode: existingComparison.activeMode || 'AI',
    needsManualReview: true
  };
}

async function autoEvaluateSection(req, body) {
  const resultId = body?.resultId;
  const section = body?.section;
  if (!resultId || !['writing', 'speaking'].includes(section)) {
    throw new Error('Auto AI evaluation requires resultId and section.');
  }

  const rows = await select('candidates', `?result_id=eq.${encodeURIComponent(resultId)}&limit=1`);
  const candidate = rows?.[0];
  if (!candidate) throw new Error('Candidate result not found.');
  if (!(await canAccessCandidate(req, candidate.candidate_id))) {
    const error = new Error('Candidate session required.');
    error.statusCode = 403;
    throw error;
  }

  const existing = await hydrateCandidate(candidate.candidate_id);
  if (!existing) throw new Error('Candidate data could not be retrieved.');

  const user = candidateRowToUserProfile(candidate);
  const answers = section === 'writing'
    ? {
        task1: existing.answers?.writing?.task1 || '',
        task2: existing.answers?.writing?.task2 || ''
      }
    : existing.answers?.speaking || {};

  const latestActive = (await select('ai_assessments', `?result_id=eq.${encodeURIComponent(resultId)}&section=eq.${encodeURIComponent(section)}&is_active=eq.true&order=evaluation_timestamp.desc&limit=1`))?.[0];
  const currentHash = crypto.createHash('sha256').update(JSON.stringify({ section, user, answers })).digest('hex');
  if (latestActive?.input_hash === currentHash && latestActive.status === 'AI EVALUATED') {
    return { success: true, skipped: true, status: latestActive.status };
  }

  const payload = await evaluateCandidateSection(section, user, answers, false);
  if (!payload?.success || !payload.assessment) {
    throw new Error(payload?.error || 'AI evaluation did not return an assessment.');
  }
  await persistAiAssessment(payload.assessment);

  const baseEvaluation = existing.evaluation || buildInitialEvaluation(rowToCandidate(candidate), existing.answers || emptyAnswers(candidate.candidate_id), existing.progress);
  const mergedEvaluation = {
    ...baseEvaluation,
    aiAssessments: {
      ...(baseEvaluation.aiAssessments || {}),
      [section]: payload.assessment
    },
    aiAssessmentHistory: [
      ...(baseEvaluation.aiAssessmentHistory || []),
      payload.assessment
    ],
    dualComparison: aiAssessmentToComparisonPatch(section, payload.assessment, payload.detail, baseEvaluation.dualComparison),
    [section]: payload.report || baseEvaluation[section]
  };

  await saveCandidateData({
    ...existing,
    evaluation: mergedEvaluation
  });

  return { success: true, skipped: false, status: payload.assessment.status || payload.assessment.evaluation_status };
}

async function deleteCandidate(resultId) {
  const rows = await select('candidates', `?result_id=eq.${encodeURIComponent(resultId)}&limit=1`);
  const candidate = rows?.[0];
  if (!candidate) return;
  await remove('candidates', `?candidate_id=eq.${encodeURIComponent(candidate.candidate_id)}`);
}

async function uploadAudio(body) {
  const { resultId, partId, mimeType, base64, durationSec } = body;
  if (!resultId || !partId || !mimeType || !base64) throw new Error('Audio upload requires resultId, partId, mimeType, and base64.');
  if (!String(mimeType).startsWith('audio/')) throw new Error('Audio upload MIME type is invalid.');
  const cleanId = String(resultId).replace(/[^a-zA-Z0-9-_]/g, '');
  const normalizedMime = String(mimeType).split(';')[0].toLowerCase();
  const extension = normalizedMime.includes('mp4') || normalizedMime.includes('aac') || normalizedMime.includes('m4a')
    ? 'mp4'
    : normalizedMime.includes('ogg')
      ? 'ogg'
      : normalizedMime.includes('wav')
        ? 'wav'
        : 'webm';
  const storagePath = `${cleanId}/part-${partId}.${extension}`;
  const fileBuffer = Buffer.from(base64, 'base64');
  if (!fileBuffer.length) throw new Error('Audio upload was empty.');

  await supabaseFetch(`/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'x-upsert': 'true'
    },
    body: fileBuffer
  });

  const candidateRows = await select('candidates', `?result_id=eq.${encodeURIComponent(resultId)}&limit=1`);
  const candidate = candidateRows?.[0];
  if (candidate) {
    const partKey = String(partId);
    const qaMap = {
      part1_q1: { part: 1, question_id: 'speaking-p1-q1' },
      part1_q2: { part: 1, question_id: 'speaking-p1-q2' },
      part2: { part: 2, question_id: 'speaking-part-2' },
      part3_q1: { part: 3, question_id: 'speaking-p3-q1' },
      part3_q2: { part: 3, question_id: 'speaking-p3-q2' }
    };
    const productionMatch = partKey.match(/^part([123])$/);
    const target = qaMap[partKey] || (productionMatch ? {
      part: Number(productionMatch[1]),
      question_id: `speaking-part-${productionMatch[1]}`
    } : null);

    if (target) {
      await upsert('speaking_metadata', {
        candidate_id: candidate.candidate_id,
        result_id: candidate.result_id,
        is_qa: isQaCandidate(candidate),
        part: target.part,
        question_id: target.question_id,
        audio_storage_path: `${BUCKET}/${storagePath}`,
        duration: typeof durationSec === 'number' ? Math.max(1, Math.round(durationSec)) : null,
        mime_type: mimeType,
        file_size: fileBuffer.length,
        transcript: null,
        saved_at: new Date().toISOString()
      }, 'candidate_id,question_id');
    }
  }

  return {
    storagePath: `${BUCKET}/${storagePath}`,
    audioUrl: `${BUCKET}/${storagePath}`,
    mimeType,
    fileSize: fileBuffer.length
  };
}

async function createSignedAudioUrl(storagePath) {
  const path = String(storagePath || '').replace(/^speaking-recordings\//, '');
  const signed = await supabaseFetch(`/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: 'POST',
    body: JSON.stringify({ expiresIn: 3600 })
  });
  const cfg = requireSupabase();
  return `${cfg.url}/storage/v1${signed.signedURL}`;
}

export async function handleSupabaseApi(req, res) {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const route = url.pathname.replace(/^\/api\/supabase/, '');

    if (route === '/status') {
      sendJson(res, 200, { connected: isSupabaseConfigured() });
      return;
    }

    if (!isSupabaseConfigured()) {
      sendJson(res, 503, { success: false, error: 'Supabase is not configured on this server.' });
      return;
    }

    if (route === '/candidates' && req.method === 'GET') {
      if (!isAdminSessionValid(req)) {
        sendJson(res, 403, { success: false, error: 'Admin session required.' });
        return;
      }
      sendJson(res, 200, { success: true, data: await getAllCandidates() });
      return;
    }

    if (route === '/tutor/candidates' && req.method === 'GET') {
      if (!isStaffSessionValid(req)) {
        sendJson(res, 403, { success: false, error: 'Tutor or admin session required.' });
        return;
      }
      sendJson(res, 200, { success: true, data: await getTutorCandidates() });
      return;
    }

    if (route === '/tutor/assessment' && req.method === 'POST') {
      const role = getStaffRole(req);
      if (!role || !['ADMIN', 'TUTOR'].includes(role)) {
        sendJson(res, 403, { success: false, error: 'Tutor or admin session required.' });
        return;
      }
      sendJson(res, 200, { success: true, data: await updateTutorAssessment(await readJsonBody(req), role) });
      return;
    }

    if (route === '/ai/auto-evaluate' && req.method === 'POST') {
      sendJson(res, 200, { success: true, data: await autoEvaluateSection(req, await readJsonBody(req)) });
      return;
    }

    if (route === '/candidates/register' && req.method === 'POST') {
      sendJson(res, 200, { success: true, data: await registerCandidate(await readJsonBody(req)) });
      return;
    }

    if (route === '/candidates/save' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!(await canAccessCandidate(req, body.candidate?.candidate_id))) {
        sendJson(res, 403, { success: false, error: 'Candidate session required.' });
        return;
      }
      await saveCandidateData(body);
      sendJson(res, 200, { success: true });
      return;
    }

    if (route === '/candidates/delete' && req.method === 'POST') {
      if (!isAdminSessionValid(req)) {
        sendJson(res, 403, { success: false, error: 'Admin session required.' });
        return;
      }
      const body = await readJsonBody(req);
      await deleteCandidate(body.resultId);
      sendJson(res, 200, { success: true });
      return;
    }

    if (route === '/session/resume-current' && req.method === 'POST') {
      const body = await readJsonBody(req);
      sendJson(res, 200, { success: true, data: await resumeSession(body.sessionToken) });
      return;
    }

    if (route === '/session/resume-code' && req.method === 'POST') {
      const body = await readJsonBody(req);
      sendJson(res, 200, await resumeWithAccessCode(body.whatsapp, body.accessCode));
      return;
    }

    if (route === '/audio/upload' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!(await canAccessResult(req, body.resultId))) {
        sendJson(res, 403, { success: false, error: 'Candidate session required for audio upload.' });
        return;
      }
      sendJson(res, 200, { success: true, data: await uploadAudio(body) });
      return;
    }

    if (route === '/audio/signed-url' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const resultIdFromPath = String(body.storagePath || '').split('/')[1];
      if (!isStaffSessionValid(req) && !(await canAccessResult(req, resultIdFromPath))) {
        sendJson(res, 403, { success: false, error: 'Authorized session required for audio playback.' });
        return;
      }
      sendJson(res, 200, { success: true, data: { audioUrl: await createSignedAudioUrl(body.storagePath) } });
      return;
    }

    sendJson(res, 404, { success: false, error: 'Supabase API route not found.' });
  } catch (err) {
    sendJson(res, err?.statusCode || 500, { success: false, error: err instanceof Error ? err.message : 'Supabase API failed.' });
  }
}
