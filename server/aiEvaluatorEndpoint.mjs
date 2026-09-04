import crypto from 'node:crypto';
import './loadEnv.mjs';

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';
const DEFAULT_KIE_MODEL = 'gemini-2.5-flash';
const KIE_BASE_URL = 'https://api.kie.ai';
const RUBRIC_VERSION = 'IELTS-Cambridge-Descriptors-2026.1';
const PROMPT_VERSION = 'ai-evaluator-secure-endpoint-2026-09-04-strict-descriptors';

const writingTask1 = {
  content: `The chart below shows the average monthly change in the prices of three metals (copper, nickel, and zinc) during 2014.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
  chartData: `• Copper: January (+2.0%), June (+1.0%), December (+1.5%)
• Nickel: January (+6.0%), June (-3.0%), December (+1.0%)
• Zinc: January (+1.0%), June (-1.0%), December (+2.0%)`
};

const writingTask2 = {
  content: `In many countries, people are now living longer than ever before. Some people say an ageing population creates problems for governments. Other people think there are benefits if society has more elderly people.

To what extent do the advantages of having an ageing population outweigh the disadvantages?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`
};

const speakingParts = {
  1: `• How many hours do you usually sleep at night?
• Do you sometimes sleep during the day? (Why/Why not?)
• What do you do if you can't get to sleep at night? (Why?)
• Do you ever remember the dreams you've had while you were asleep?`,
  2: `Describe a time when you met someone who you became good friends with.

You should say:
• Who you met
• When and where you met this person
• What you thought about this person when you first met
• And explain why you think you became good friends with this person.`,
  3: `Friends at school:
• How important is it for children to have lots of friends at school?
• Do you think it is wrong for parents to influence which friends their children have?
• Why do you think children often choose different friends as they get older?

Making new friends:
• If a person is moving to a new town, what is a good way for them to make friends?
• Can you think of any disadvantages of making new friends online?
• Would you say it is harder for people to make new friends as they get older?`
};

const writingPrompt = `
You are a senior certified Cambridge IELTS Senior Examiner.
Evaluate the candidate's IELTS Academic Writing Task 1 and Task 2 submissions with strict fidelity to the official IELTS Band Descriptors.

CRITICAL RULES:
1. NEVER guess or invent an overall band.
2. For EVERY criterion, assign an INTEGER band score from 1 to 9. Do NOT assign decimals like 6.3 or 5.8.
3. Select the HIGHEST band whose positive characteristics are sufficiently supported by actual candidate response evidence.
4. If performance sits between descriptors, choose the lower fully supported descriptor.
5. In descriptorReason, explicitly state what prevents the response from reaching the next band.
6. Provide short, exact quote excerpts in positiveEvidence and limitingEvidence from the candidate text. Do NOT invent sentences the candidate did not write.
7. If the candidate response is empty or <= 20 words, assign Band 1 or 2 with an underlength warning.

Return JSON only with task1.taskAchievement, task1.coherenceCohesion, task1.lexicalResource, task1.grammaticalRangeAccuracy, task2.taskResponse, task2.coherenceCohesion, task2.lexicalResource, task2.grammaticalRangeAccuracy. Each criterion must include band, positiveEvidence, limitingEvidence, descriptorReason, feedback, confidence.
`;

const speakingPrompt = `
You are a senior certified Cambridge IELTS Senior Examiner.
Evaluate the candidate's IELTS Speaking performance across the entire performance: Part 1 + Part 2 + Part 3.

CRITICAL RULES:
1. Apply the official IELTS Speaking Band Descriptors strictly. A candidate must fully fit the positive features of a band before receiving that band.
2. Rate the average performance across all supplied parts, but penalize missing, extremely short, off-topic, memorised, or non-communicative responses.
3. Band 5 is NOT a default middle score. Only award Band 5+ when the candidate usually keeps going, produces more than isolated/simple responses, has enough vocabulary for the topic, and shows rateable sentence control.
4. If answers are mostly "I don't know", "no idea", unrelated words, repeated filler, silence, laughter/noise, or do not answer the prompt, treat the response as non-communicative and assign Band 1 for FC, LR, GRA, and Pronunciation.
5. If the whole performance is a few isolated words, wholly unrelated to the prompts, or has virtually no communicative meaning, assign Band 1 for all criteria.
6. Band 2 is only for isolated words or memorised utterances with at least a tiny amount of recognisable communication. If FC is totally incoherent or LR shows no communication possible, assign Band 1.
7. Pronunciation must be based on the supplied audio evidence. When Audio Evidence Supplied To Model is YES, you MUST assign pronunciation.band as an INTEGER band score from 1 to 9 and include pronunciation.status = "AI_EVALUATED".
8. Only return pronunciation.status = "REQUIRES_TUTOR_EVALUATION" and pronunciation.band = null when Audio Evidence Supplied To Model is NO.
9. Do not infer pronunciation from transcript alone.
10. In descriptorReason, explain why the descriptor was selected and what prevents reaching the next band.
11. Quote short excerpts from the transcript for non-pronunciation criteria.

Return JSON only with fluencyCoherence, lexicalResource, grammaticalRangeAccuracy, pronunciation. Each scored criterion must include band, positiveEvidence, limitingEvidence, descriptorReason, feedback, confidence.
`;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 50 * 1024 * 1024) {
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

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map(part => {
      const [key, ...value] = part.trim().split('=');
      return [key, decodeURIComponent(value.join('='))];
    }).filter(([key]) => key)
  );
}

function signAdminSession() {
  const secret = process.env.ADMIN_EVALUATOR_TOKEN || '';
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${expires}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function signStaffSession(role) {
  const secret = process.env.ADMIN_EVALUATOR_TOKEN || '';
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const safeRole = role === 'TUTOR' ? 'TUTOR' : 'ADMIN';
  const payload = `${safeRole}.${expires}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function isAdminSessionValid(req) {
  const secret = process.env.ADMIN_EVALUATOR_TOKEN || '';
  const cookie = parseCookies(req.headers.cookie || '').mrbob_admin_eval;
  if (!secret || !cookie) return false;
  const [expiresRaw, signature] = cookie.split('.');
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const expected = crypto.createHmac('sha256', secret).update(expiresRaw).digest('hex');
  if (!signature || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected));
}

export function getStaffRole(req) {
  if (isAdminSessionValid(req)) return 'ADMIN';
  const secret = process.env.ADMIN_EVALUATOR_TOKEN || '';
  const cookie = parseCookies(req.headers.cookie || '').mrbob_staff_eval;
  if (!secret || !cookie) return null;
  const parts = cookie.split('.');
  if (parts.length !== 3) return null;
  const [role, expiresRaw, signature] = parts;
  if (!['ADMIN', 'TUTOR'].includes(role)) return null;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  const payload = `${role}.${expiresRaw}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (!signature || signature.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected)) ? role : null;
}

export function isStaffSessionValid(req) {
  return Boolean(getStaffRole(req));
}

export async function handleAdminEvaluatorLogin(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { success: false, error: 'Method not allowed.' });
    return;
  }

  const configuredToken = process.env.ADMIN_EVALUATOR_TOKEN;
  if (!configuredToken) {
    sendJson(res, 503, { success: false, error: 'Admin evaluator token is not configured on the server.' });
    return;
  }

  const body = await readJsonBody(req);
  if (body.token !== configuredToken) {
    sendJson(res, 403, { success: false, error: 'Invalid admin evaluator token.' });
    return;
  }

  res.setHeader('Set-Cookie', [
    `mrbob_admin_eval=${encodeURIComponent(signAdminSession())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
    `mrbob_staff_eval=${encodeURIComponent(signStaffSession('ADMIN'))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`
  ]);
  sendJson(res, 200, { success: true, role: 'ADMIN' });
}

export async function handleStaffEvaluatorLogin(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { success: false, error: 'Method not allowed.' });
    return;
  }

  const adminToken = process.env.ADMIN_EVALUATOR_TOKEN;
  const tutorToken = process.env.TUTOR_EVALUATOR_TOKEN || adminToken;
  if (!adminToken) {
    sendJson(res, 503, { success: false, error: 'Evaluator token is not configured on the server.' });
    return;
  }

  const body = await readJsonBody(req);
  if (body.token === adminToken) {
    res.setHeader('Set-Cookie', [
      `mrbob_admin_eval=${encodeURIComponent(signAdminSession())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
      `mrbob_staff_eval=${encodeURIComponent(signStaffSession('ADMIN'))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`
    ]);
    sendJson(res, 200, { success: true, role: 'ADMIN' });
    return;
  }

  if (body.token === tutorToken) {
    res.setHeader('Set-Cookie', `mrbob_staff_eval=${encodeURIComponent(signStaffSession('TUTOR'))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
    sendJson(res, 200, { success: true, role: 'TUTOR' });
    return;
  }

  sendJson(res, 403, { success: false, error: 'Invalid evaluator token.' });
}

function roundToNearestHalfBand(rawScore) {
  if (rawScore <= 0) return 0;
  return Math.min(9, Math.max(1, Math.round(rawScore * 2) / 2));
}

function wordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function parseWholeBand(value, label) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 9) {
    throw new Error(`${label} must be an integer band from 1 to 9.`);
  }
  return numeric;
}

function stringArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.filter(item => typeof item === 'string');
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function normalizeConfidence(value) {
  if (typeof value === 'string' && value.toUpperCase() === 'LOW') return 'Low';
  if (typeof value === 'string' && value.toUpperCase() === 'MEDIUM') return 'Medium';
  return 'High';
}

function recordConfidence(criteria) {
  if (criteria.some(c => c.confidence === 'Low')) return 'LOW';
  if (criteria.some(c => c.confidence === 'Medium')) return 'MEDIUM';
  return 'HIGH';
}

function criterionEvidence(criterion, payload, label, requireBand = true) {
  if (!payload || typeof payload !== 'object') throw new Error(`Missing ${label}.`);
  return {
    criterion,
    score: requireBand ? parseWholeBand(payload.band, `${label}.band`) : 0,
    positiveEvidence: stringArray(payload.positiveEvidence || [], `${label}.positiveEvidence`),
    limitingEvidence: stringArray(payload.limitingEvidence || [], `${label}.limitingEvidence`),
    descriptorMatch: requireText(payload.descriptorReason, `${label}.descriptorReason`),
    feedback: requireText(payload.feedback, `${label}.feedback`),
    confidence: normalizeConfidence(payload.confidence)
  };
}

function countWords(text = '') {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function speakingStats(answers = {}) {
  const items = isQaSpeakingAnswers(answers)
    ? qaSpeakingPromptItems.map(([, key]) => ({
        transcript: answers[`${key}_transcript`] || '',
        duration: Number(answers[`${key}_duration`] || 0),
        audio: answers[`${key}_audio`]
      }))
    : [
        { transcript: answers.part1Transcript || '', duration: Number(answers.part1Duration || 0), audio: answers.part1Audio },
        { transcript: answers.part2Transcript || '', duration: Number(answers.part2Duration || 0), audio: answers.part2Audio },
        { transcript: answers.part3Transcript || '', duration: Number(answers.part3Duration || 0), audio: answers.part3Audio }
      ];
  const transcript = items.map(item => item.transcript).join(' ').trim();
  const totalWords = countWords(transcript);
  const totalDuration = items.reduce((sum, item) => sum + (Number.isFinite(item.duration) ? item.duration : 0), 0);
  const answeredItems = items.filter(item => item.audio || item.duration > 0 || countWords(item.transcript) > 0).length;
  const lowEffortPattern = /\b(i\s+don'?t\s+know|no\s+idea|nothing|maybe|whatever|skip|pass|nggak\s+tahu|tidak\s+tahu|ga\s+tahu|gak\s+tahu)\b/i;
  return {
    transcript,
    totalWords,
    totalDuration,
    answeredItems,
    hasLowEffortLanguage: lowEffortPattern.test(transcript)
  };
}

function capCriterion(evidence, maxScore, reason) {
  if (evidence.score <= maxScore) return evidence;
  return {
    ...evidence,
    score: maxScore,
    limitingEvidence: [...evidence.limitingEvidence, reason],
    descriptorMatch: `${evidence.descriptorMatch} Descriptor cap applied: ${reason}`,
    feedback: `${evidence.feedback} ${reason}`,
    confidence: evidence.confidence === 'Low' ? evidence.confidence : 'Medium'
  };
}

function modelFlagsNonCommunicative(criteria) {
  const text = Object.values(criteria)
    .flatMap(item => [
      item.descriptorMatch,
      item.feedback,
      ...item.positiveEvidence,
      ...item.limitingEvidence
    ])
    .join(' ')
    .toLowerCase();
  return /non[-\s]?communicative|virtually no communicative|no communicative|no communication possible|totally incoherent|speech is totally incoherent|off[-\s]?topic|wholly unrelated|unrelated to the prompt|unrelated to the question|does not answer|did not answer|no meaningful response|no rateable language|no resource|isolated words|i don'?t know|no idea|random|nonsense|ngawur/.test(text);
}

function applySpeakingDescriptorCaps(answers, criteria) {
  const stats = speakingStats(answers);
  let cap = null;
  let reason = '';

  if (modelFlagsNonCommunicative(criteria)) {
    cap = { language: 1, pronunciation: 1 };
    reason = 'The model evidence describes the response as non-communicative, off-topic, isolated, or meaningless; this fits Band 1, not Band 3-5.';
  } else if (criteria.fc.score <= 2 || criteria.lr.score <= 2) {
    cap = { language: 1, pronunciation: 1 };
    reason = 'Fluency/coherence or lexical resource is at Band 1-2 level, indicating no meaningful communication for this QA assessment; the speaking result is capped at Band 1.';
  } else if ([criteria.fc.score, criteria.lr.score, criteria.gra.score].filter(score => score <= 2).length >= 2) {
    cap = { language: 1, pronunciation: 1 };
    reason = 'Most language criteria are at Band 1-2 level, so the response is not rateable as a communicative IELTS Speaking performance.';
  } else if (stats.answeredItems === 0 || (stats.totalWords === 0 && stats.totalDuration === 0)) {
    cap = { language: 1, pronunciation: 1 };
    reason = 'No rateable speaking response was submitted.';
  } else if (stats.totalWords > 0 && (stats.totalWords <= 10 || stats.hasLowEffortLanguage)) {
    cap = { language: 1, pronunciation: 1 };
    reason = 'Response contains only isolated, low-effort, or non-communicative language; this fits Band 1 in the IELTS descriptor.';
  } else if (stats.totalWords > 0 && stats.totalWords <= 25) {
    cap = { language: 1, pronunciation: 1 };
    reason = 'Response is extremely short and does not provide enough communicative evidence; this fits Band 1 for this QA assessment.';
  } else if (stats.totalDuration > 0 && stats.totalDuration < 20) {
    cap = { language: 1, pronunciation: 1 };
    reason = 'Total recorded speaking time is too short to provide meaningful communicative evidence.';
  } else if (stats.totalDuration > 0 && stats.totalDuration < 45) {
    cap = { language: 2, pronunciation: 2 };
    reason = 'Total recorded speaking time is limited; it cannot demonstrate sustained speaking performance.';
  }

  if (!cap) return criteria;
  return {
    fc: capCriterion(criteria.fc, cap.language, reason),
    lr: capCriterion(criteria.lr, cap.language, reason),
    gra: capCriterion(criteria.gra, cap.language, reason),
    pro: capCriterion(criteria.pro, cap.pronunciation, reason)
  };
}

function dataUrlToGeminiPart(label, dataUrl) {
  if (typeof dataUrl !== 'string') return [];
  const match = dataUrl.match(/^data:([^;,]+)[^,]*;base64,(.+)$/);
  if (!match) return [];
  return [
    { text: `\n=== ${label.toUpperCase()} ===` },
    { inline_data: { mime_type: match[1], data: match[2] } }
  ];
}

async function storagePathToGeminiPart(label, storagePath) {
  if (typeof storagePath !== 'string' || !storagePath.startsWith('speaking-recordings/')) return [];
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return [];

  const path = storagePath.replace(/^speaking-recordings\//, '');
  const response = await fetch(`${supabaseUrl}/storage/v1/object/speaking-recordings/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });
  if (!response.ok) return [];

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'audio/webm';
  return [
    { text: `\n=== ${label.toUpperCase()} ===` },
    { inline_data: { mime_type: contentType, data: Buffer.from(arrayBuffer).toString('base64') } }
  ];
}

function inputHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function baseAssessment(user, section, parsed, hash, modelName, provider = 'google-gemini') {
  const now = new Date().toISOString();
  return {
    candidate_id: user.candidateId,
    result_id: user.resultId,
    section,
    evaluation_id: crypto.randomUUID(),
    provider,
    rubric_version: RUBRIC_VERSION,
    prompt_version: PROMPT_VERSION,
    model_name: modelName,
    model_version: modelName,
    evaluation_timestamp: now,
    created_at: now,
    input_hash: hash,
    raw_ai_response: parsed,
    is_active: true
  };
}

function buildWritingPrompt(user, answers) {
  const words1 = wordCount(answers.task1);
  const words2 = wordCount(answers.task2);
  return `${writingPrompt}

Candidate ID: ${user.candidateId}
Result ID: ${user.resultId}
Candidate Name: ${user.fullName}
Target Band: ${user.targetScore}

=== WRITING TASK 1 ===
Exact Task 1 question:
${writingTask1.content}
Original chart context/data:
${writingTask1.chartData}
Candidate Word Count: ${words1}
Underlength Warning: ${words1 === 0 ? 'EMPTY RESPONSE' : words1 <= 20 ? '20 WORDS OR FEWER' : 'NONE'}
Candidate full response:
"""
${answers.task1 || '(No Task 1 response submitted)'}
"""

=== WRITING TASK 2 ===
Exact Task 2 question:
${writingTask2.content}
Candidate Word Count: ${words2}
Underlength Warning: ${words2 === 0 ? 'EMPTY RESPONSE' : words2 <= 20 ? '20 WORDS OR FEWER' : 'NONE'}
Candidate full response:
"""
${answers.task2 || '(No Task 2 response submitted)'}
"""`;
}

const qaSpeakingPromptItems = [
  ['Part 1 Question 1', 'part1_q1', 'How many hours do you usually sleep at night?'],
  ['Part 1 Question 2', 'part1_q2', 'Do you sometimes sleep during the day? Why / why not?'],
  ['Part 2 Cue Card', 'part2', speakingParts[2]],
  ['Part 3 Question 1', 'part3_q1', 'How important is it for children to have lots of friends at school?'],
  ['Part 3 Question 2', 'part3_q2', 'Do you think it is wrong for parents to influence which friends their children have?']
];

function isQaSpeakingAnswers(answers = {}) {
  return qaSpeakingPromptItems.some(([, key]) => answers[`${key}_audio`] || answers[`${key}_duration`] || answers[`${key}_transcript`]);
}

function buildSpeakingPrompt(user, answers, hasAudio) {
  if (isQaSpeakingAnswers(answers)) {
    const qaBlocks = qaSpeakingPromptItems.map(([label, key, prompt]) => `
=== SPEAKING ${label.toUpperCase()} ===
Prompt:
${prompt}
Duration: ${answers[`${key}_duration`] || 0} seconds
Transcript:
"""
${answers[`${key}_transcript`] || '(Transcript unavailable)'}
"""`).join('\n');

    return `${speakingPrompt}

Candidate ID: ${user.candidateId}
Result ID: ${user.resultId}
Candidate Name: ${user.fullName}
Target Band: ${user.targetScore}
Audio Evidence Supplied To Model: ${hasAudio ? 'YES' : 'NO'}

${qaBlocks}`;
  }

  return `${speakingPrompt}

Candidate ID: ${user.candidateId}
Result ID: ${user.resultId}
Candidate Name: ${user.fullName}
Target Band: ${user.targetScore}
Audio Evidence Supplied To Model: ${hasAudio ? 'YES' : 'NO'}

=== SPEAKING PART 1 ===
Original prompts:
${speakingParts[1]}
Duration: ${answers.part1Duration || 0} seconds
Transcript:
"""
${answers.part1Transcript || '(Transcript unavailable)'}
"""

=== SPEAKING PART 2 ===
Original prompt:
${speakingParts[2]}
Duration: ${answers.part2Duration || 0} seconds
Transcript:
"""
${answers.part2Transcript || '(Transcript unavailable)'}
"""

=== SPEAKING PART 3 ===
Original prompts:
${speakingParts[3]}
Duration: ${answers.part3Duration || 0} seconds
Transcript:
"""
${answers.part3Transcript || '(Transcript unavailable)'}
"""`;
}

async function callGemini(parts, apiKey, modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response returned by AI provider.');
  return JSON.parse(rawText);
}

function getKieApiKeys(includeGeminiKeyAlias = false) {
  return `${process.env.KIE_API_KEYS || ''}\n${process.env.KIE_API_KEY || ''}\n${includeGeminiKeyAlias ? process.env.GEMINI_API_KEY || '' : ''}`
    .split(/[\n,;]/)
    .map(key => key.trim())
    .filter((key, index, list) => key && list.indexOf(key) === index);
}

function looksLikeNativeGoogleApiKey(key = '') {
  return String(key).trim().startsWith('AIza');
}

function audioFormatFromMimeType(mimeType = '') {
  const type = String(mimeType).toLowerCase();
  if (type.includes('wav')) return 'wav';
  if (type.includes('mp3') || type.includes('mpeg')) return 'mp3';
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'mp4';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('webm')) return 'webm';
  return 'wav';
}

function kieContentFromParts(parts) {
  return parts.flatMap(part => {
    if (part.text) return [{ type: 'text', text: part.text }];
    if (part.inline_data) {
      return [{
        type: 'input_audio',
        input_audio: {
          data: part.inline_data.data,
          format: audioFormatFromMimeType(part.inline_data.mime_type)
        }
      }];
    }
    return [];
  });
}

async function callKie(parts, apiKey, modelName) {
  const url = `${KIE_BASE_URL}/${modelName}/v1/chat/completions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [{
        role: 'user',
        content: kieContentFromParts(parts)
      }],
      temperature: 0.05,
      response_format: { type: 'json_object' }
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`KIE API Error: ${response.status} - ${text.slice(0, 1000)}`);
  }

  const body = text ? JSON.parse(text) : {};
  const rawContent = body?.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error('KIE API returned an empty chat completion.');
  return typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
}

async function callEvaluatorModel(parts, forceKie) {
  const providerOverride = process.env.AI_EVALUATOR_PROVIDER?.toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const hasDedicatedKieKey = Boolean(process.env.KIE_API_KEY || process.env.KIE_API_KEYS);
  const shouldTreatGeminiKeyAsKieKey = Boolean(geminiKey && !looksLikeNativeGoogleApiKey(geminiKey));
  const useKie = forceKie || providerOverride === 'kie' || hasDedicatedKieKey || shouldTreatGeminiKeyAsKieKey;
  const kieKeys = getKieApiKeys(useKie && shouldTreatGeminiKeyAsKieKey);

  if (useKie) {
    if (!kieKeys.length) {
      throw new Error('server KIE_API_KEY is not configured.');
    }
    const modelName = process.env.KIE_MODEL_NAME || DEFAULT_KIE_MODEL;
    const parsed = await callKie(parts, kieKeys[0], modelName);
    return { parsed, modelName, provider: 'kie.ai' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('server GEMINI_API_KEY is not configured.');
  }
  const modelName = process.env.GEMINI_MODEL_NAME || DEFAULT_GEMINI_MODEL;
  const parsed = await callGemini(parts, apiKey, modelName);
  return { parsed, modelName, provider: 'google-gemini' };
}

function validateWriting(user, answers, parsed, hash, modelName, provider) {
  const t1TA = criterionEvidence('Task Achievement (TA)', parsed?.task1?.taskAchievement, 'task1.taskAchievement');
  const t1CC = criterionEvidence('Coherence & Cohesion (CC)', parsed?.task1?.coherenceCohesion, 'task1.coherenceCohesion');
  const t1LR = criterionEvidence('Lexical Resource (LR)', parsed?.task1?.lexicalResource, 'task1.lexicalResource');
  const t1GRA = criterionEvidence('Grammatical Range & Accuracy (GRA)', parsed?.task1?.grammaticalRangeAccuracy, 'task1.grammaticalRangeAccuracy');
  const t2TR = criterionEvidence('Task Response (TR)', parsed?.task2?.taskResponse, 'task2.taskResponse');
  const t2CC = criterionEvidence('Coherence & Cohesion (CC)', parsed?.task2?.coherenceCohesion, 'task2.coherenceCohesion');
  const t2LR = criterionEvidence('Lexical Resource (LR)', parsed?.task2?.lexicalResource, 'task2.lexicalResource');
  const t2GRA = criterionEvidence('Grammatical Range & Accuracy (GRA)', parsed?.task2?.grammaticalRangeAccuracy, 'task2.grammaticalRangeAccuracy');

  const t1Avg = (t1TA.score + t1CC.score + t1LR.score + t1GRA.score) / 4;
  const t2Avg = (t2TR.score + t2CC.score + t2LR.score + t2GRA.score) / 4;
  const rawWeightedScore = (t1Avg + 2 * t2Avg) / 3;
  const estimatedBand = roundToNearestHalfBand(rawWeightedScore);
  const allCriteria = [t1TA, t1CC, t1LR, t1GRA, t2TR, t2CC, t2LR, t2GRA];
  const words1 = wordCount(answers.task1);
  const words2 = wordCount(answers.task2);

  const detail = {
    task1: { taskNumber: 1, criterion1: t1TA, cc: t1CC, lr: t1LR, gra: t1GRA, taskAverage: t1Avg },
    task2: { taskNumber: 2, criterion1: t2TR, cc: t2CC, lr: t2LR, gra: t2GRA, taskAverage: t2Avg },
    wordCountTask1: words1,
    wordCountTask2: words2,
    totalWords: words1 + words2,
    rawWeightedScore,
    estimatedBand
  };

  const report = {
    band: estimatedBand,
    wordCount: words1 + words2,
    assessmentStatus: 'AI Evaluated',
    writingDetail: detail,
    feedbackCategories: [
      { category: 'Task 1 (Report)', score: `Band ${t1Avg.toFixed(1)}`, feedback: t1TA.feedback },
      { category: 'Task 2 (Essay)', score: `Band ${t2Avg.toFixed(1)}`, feedback: t2TR.feedback },
      { category: 'Coherence & Cohesion', score: `Band ${((t1CC.score + t2CC.score) / 2).toFixed(1)}`, feedback: t2CC.feedback },
      { category: 'Lexical Resource', score: `Band ${((t1LR.score + t2LR.score) / 2).toFixed(1)}`, feedback: t2LR.feedback },
      { category: 'Grammatical Accuracy', score: `Band ${((t1GRA.score + t2GRA.score) / 2).toFixed(1)}`, feedback: t2GRA.feedback }
    ],
    strengths: [...t1TA.positiveEvidence.slice(0, 2), ...t2TR.positiveEvidence.slice(0, 2)],
    weaknesses: [...t1TA.limitingEvidence.slice(0, 1), ...t2TR.limitingEvidence.slice(0, 1)],
    recommendations: [
      'Include a clear overview paragraph without specific data points in Task 1.',
      'Strengthen central topic sentences and concrete real-world evidence in Task 2.'
    ]
  };

  const assessment = {
    ...baseAssessment(user, 'writing', parsed, hash, modelName, provider),
    criterion_scores: {
      T1_TA: t1TA.score, T1_CC: t1CC.score, T1_LR: t1LR.score, T1_GRA: t1GRA.score,
      T2_TR: t2TR.score, T2_CC: t2CC.score, T2_LR: t2LR.score, T2_GRA: t2GRA.score
    },
    criterion_evidence: {
      T1_TA: { positive: t1TA.positiveEvidence, limiting: t1TA.limitingEvidence, descriptorReason: t1TA.descriptorMatch, feedback: t1TA.feedback },
      T1_CC: { positive: t1CC.positiveEvidence, limiting: t1CC.limitingEvidence, descriptorReason: t1CC.descriptorMatch, feedback: t1CC.feedback },
      T1_LR: { positive: t1LR.positiveEvidence, limiting: t1LR.limitingEvidence, descriptorReason: t1LR.descriptorMatch, feedback: t1LR.feedback },
      T1_GRA: { positive: t1GRA.positiveEvidence, limiting: t1GRA.limitingEvidence, descriptorReason: t1GRA.descriptorMatch, feedback: t1GRA.feedback },
      T2_TR: { positive: t2TR.positiveEvidence, limiting: t2TR.limitingEvidence, descriptorReason: t2TR.descriptorMatch, feedback: t2TR.feedback },
      T2_CC: { positive: t2CC.positiveEvidence, limiting: t2CC.limitingEvidence, descriptorReason: t2CC.descriptorMatch, feedback: t2CC.feedback },
      T2_LR: { positive: t2LR.positiveEvidence, limiting: t2LR.limitingEvidence, descriptorReason: t2LR.descriptorMatch, feedback: t2LR.feedback },
      T2_GRA: { positive: t2GRA.positiveEvidence, limiting: t2GRA.limitingEvidence, descriptorReason: t2GRA.descriptorMatch, feedback: t2GRA.feedback }
    },
    estimated_band: estimatedBand,
    calculated_band: estimatedBand,
    confidence: recordConfidence(allCriteria),
    evaluation_status: 'AI EVALUATED',
    status: 'AI EVALUATED'
  };

  return { success: true, assessment, detail, report };
}

function validateSpeaking(user, answers, parsed, hash, modelName, provider, hasAudio) {
  let fc = criterionEvidence('Fluency and Coherence (FC)', parsed?.fluencyCoherence, 'fluencyCoherence');
  let lr = criterionEvidence('Lexical Resource (LR)', parsed?.lexicalResource, 'lexicalResource');
  let gra = criterionEvidence('Grammatical Range and Accuracy (GRA)', parsed?.grammaticalRangeAccuracy, 'grammaticalRangeAccuracy');
  const pronunciation = parsed?.pronunciation;
  const requiresTutor = !hasAudio || pronunciation?.status === 'REQUIRES_TUTOR_EVALUATION' || pronunciation?.band === null || pronunciation?.band === undefined;
  let pro = requiresTutor
    ? {
        criterion: 'Pronunciation (PRO)',
        score: 0,
        positiveEvidence: [],
        limitingEvidence: ['Acoustic audio review required for phonemes, stress, rhythm, intonation, and connected speech.'],
        descriptorMatch: requireText(pronunciation?.descriptorReason || 'Pronunciation requires tutor audio evaluation.', 'pronunciation.descriptorReason'),
        feedback: requireText(pronunciation?.feedback || 'Pronunciation will be verified by a qualified IELTS tutor.', 'pronunciation.feedback'),
        confidence: 'Low'
      }
    : criterionEvidence('Pronunciation (PRO)', pronunciation, 'pronunciation');

  if (!requiresTutor) {
    ({ fc, lr, gra, pro } = applySpeakingDescriptorCaps(answers, { fc, lr, gra, pro }));
  }

  const estimatedBand = requiresTutor ? 'PARTIALLY EVALUATED' : roundToNearestHalfBand((fc.score + lr.score + gra.score + pro.score) / 4);
  const detail = {
    fc,
    lr,
    gra,
    pro,
    rawAverage: requiresTutor ? 0 : (fc.score + lr.score + gra.score + pro.score) / 4,
    estimatedBand: typeof estimatedBand === 'number' ? estimatedBand : 0
  };

  const report = {
    band: estimatedBand,
    assessmentStatus: requiresTutor ? 'Partially Evaluated' : 'AI Evaluated',
    speakingDetail: detail,
    feedbackCategories: [
      { category: 'Fluency & Coherence', score: `Band ${fc.score.toFixed(1)}`, feedback: fc.feedback },
      { category: 'Lexical Resource', score: `Band ${lr.score.toFixed(1)}`, feedback: lr.feedback },
      { category: 'Grammar Range & Accuracy', score: `Band ${gra.score.toFixed(1)}`, feedback: gra.feedback },
      { category: 'Pronunciation', score: requiresTutor ? 'Requires Tutor Audio Review' : `Band ${pro.score.toFixed(1)}`, feedback: pro.feedback }
    ],
    strengths: fc.positiveEvidence.slice(0, 2),
    weaknesses: [...gra.limitingEvidence.slice(0, 1), ...(requiresTutor ? ['Pronunciation remains pending until tutor audio review.'] : pro.limitingEvidence.slice(0, 1))],
    recommendations: [
      'Practice speaking with connected discourse without long hesitations.',
      'Ensure pronunciation rhythm and stress are reviewed by your tutor.'
    ]
  };

  const assessment = {
    ...baseAssessment(user, 'speaking', parsed, hash, modelName, provider),
    criterion_scores: { FC: fc.score, LR: lr.score, GRA: gra.score, PRO: requiresTutor ? null : pro.score },
    criterion_evidence: {
      FC: { positive: fc.positiveEvidence, limiting: fc.limitingEvidence, descriptorReason: fc.descriptorMatch, feedback: fc.feedback },
      LR: { positive: lr.positiveEvidence, limiting: lr.limitingEvidence, descriptorReason: lr.descriptorMatch, feedback: lr.feedback },
      GRA: { positive: gra.positiveEvidence, limiting: gra.limitingEvidence, descriptorReason: gra.descriptorMatch, feedback: gra.feedback },
      PRO: { positive: pro.positiveEvidence, limiting: pro.limitingEvidence, descriptorReason: pro.descriptorMatch, feedback: pro.feedback }
    },
    estimated_band: estimatedBand,
    calculated_band: estimatedBand,
    confidence: recordConfidence([fc, lr, gra, pro]),
    evaluation_status: requiresTutor ? 'PARTIALLY EVALUATED' : 'AI EVALUATED',
    status: requiresTutor ? 'PARTIALLY EVALUATED' : 'AI EVALUATED'
  };

  return { success: true, assessment, detail, report };
}

function validateRequest(body) {
  if (!body || (body.section !== 'writing' && body.section !== 'speaking')) {
    throw new Error('Invalid section.');
  }
  if (!body.user?.candidateId || !body.user?.resultId) {
    throw new Error('Candidate identity is required.');
  }
  if (!body.answers || typeof body.answers !== 'object') {
    throw new Error('Candidate answers are required.');
  }
}

export async function persistAiAssessment(assessment) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  const row = {
    evaluation_id: assessment.evaluation_id,
    candidate_id: assessment.candidate_id,
    result_id: assessment.result_id,
    section: assessment.section,
    provider: assessment.provider,
    model_name: assessment.model_name,
    model_version: assessment.model_version,
    rubric_version: assessment.rubric_version,
    prompt_version: assessment.prompt_version,
    evaluation_timestamp: assessment.evaluation_timestamp,
    input_hash: assessment.input_hash,
    criterion_scores: assessment.criterion_scores || {},
    criterion_evidence: assessment.criterion_evidence || {},
    confidence: assessment.confidence,
    calculated_band: assessment.calculated_band ?? assessment.estimated_band,
    raw_model_response: assessment.raw_ai_response || {},
    status: assessment.status || assessment.evaluation_status,
    is_active: Boolean(assessment.is_active)
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/ai_assessments?on_conflict=evaluation_id`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify([row])
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI assessment Supabase persistence failed: ${response.status} - ${text.slice(0, 500)}`);
  }
}

export function aiInputHash(section, user, answers) {
  return inputHash({ section, user, answers });
}

export async function evaluateCandidateSection(section, user, answers, forceKie = false) {
  validateRequest({ section, user, answers });
  const hash = aiInputHash(section, user, answers);

  if (section === 'writing') {
    const prompt = buildWritingPrompt(user, answers);
    const { parsed, modelName, provider } = await callEvaluatorModel([{ text: prompt }], forceKie);
    return validateWriting(user, answers, parsed, hash, modelName, provider);
  }

  const qaAudioParts = qaSpeakingPromptItems.flatMap(([label, key]) => [
    ...dataUrlToGeminiPart(`${label} audio`, answers[`${key}_audio`])
  ]);
  const qaStorageAudioParts = (await Promise.all(qaSpeakingPromptItems.map(([label, key]) => (
    storagePathToGeminiPart(`${label} audio`, answers[`${key}_audio`])
  )))).flat();
  const productionAudioParts = [
    ...dataUrlToGeminiPart('Part 1 audio', answers.part1Audio),
    ...dataUrlToGeminiPart('Part 2 audio', answers.part2Audio),
    ...dataUrlToGeminiPart('Part 3 audio', answers.part3Audio),
    ...(await storagePathToGeminiPart('Part 1 audio', answers.part1Audio)),
    ...(await storagePathToGeminiPart('Part 2 audio', answers.part2Audio)),
    ...(await storagePathToGeminiPart('Part 3 audio', answers.part3Audio))
  ];
  const audioParts = isQaSpeakingAnswers(answers)
    ? [...qaAudioParts, ...qaStorageAudioParts]
    : productionAudioParts;
  const hasAudio = audioParts.some(part => part.inline_data);
  const prompt = buildSpeakingPrompt(user, answers, hasAudio);
  const { parsed, modelName, provider } = await callEvaluatorModel([{ text: prompt }, ...audioParts], forceKie);
  return validateSpeaking(user, answers, parsed, hash, modelName, provider, hasAudio);
}

async function sendPersistedAssessment(res, payload) {
  if (payload?.success && payload.assessment) {
    await persistAiAssessment(payload.assessment);
  }
  sendJson(res, 200, payload);
}

export async function handleAiEvaluate(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { success: false, error: 'Method not allowed.' });
    return;
  }

  const configuredToken = process.env.ADMIN_EVALUATOR_TOKEN;
  if (!configuredToken) {
    sendJson(res, 503, { success: false, error: 'AI Evaluation Failed: server ADMIN_EVALUATOR_TOKEN is not configured.' });
    return;
  }

  if (!isAdminSessionValid(req)) {
    sendJson(res, 403, { success: false, error: 'AI Evaluation Failed: unauthorized evaluator request.' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    validateRequest(body);

    const forceKie = (req.url || '').startsWith('/api/kie-evaluate');
    await sendPersistedAssessment(res, await evaluateCandidateSection(body.section, body.user, body.answers, forceKie));
  } catch (err) {
    sendJson(res, 422, {
      success: false,
      error: `AI Evaluation Failed: ${err instanceof Error ? err.message : 'Unknown error.'}`,
      status: 'AI EVALUATION FAILED'
    });
  }
}
