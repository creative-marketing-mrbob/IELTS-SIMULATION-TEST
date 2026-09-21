import crypto from 'node:crypto';
import './loadEnv.mjs';

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';
const DEFAULT_KIE_MODEL = 'gemini-3-5-flash-openai';
const KIE_BASE_URL = 'https://api.kie.ai';
const RUBRIC_VERSION = 'IELTS-Cambridge-Descriptors-2026.1';
const PROMPT_VERSION = 'ai-evaluator-secure-endpoint-2026-09-21-strict-band5-calibrated';

const officialSpeakingDescriptors = `
OFFICIAL IELTS SPEAKING BAND DESCRIPTORS (supplied assessment form):
Band 9 - FC: fluent with only very occasional repetition/self-correction; hesitation is content-related; fully coherent and appropriately extended. LR: total flexibility and precision; sustained accurate idiomatic language. GRA: structures precise and accurate apart from native-speaker slips. PRO: full phonological range; effortless intelligibility.
Band 8 - FC: fluent with very occasional repetition/self-correction; most hesitation is content-related; coherent, appropriate and relevant development. LR: wide and flexible resource; skilful less-common/idiomatic use; effective paraphrase. GRA: wide flexible range; majority error-free. PRO: wide phonological range; sustained rhythm, stress and intonation; easily understood.
Band 7 - FC: keeps going and readily produces long turns; language-related hesitation does not affect coherence; flexible discourse markers/connectives. LR: flexible across varied topics; some less-common/idiomatic items; effective paraphrase. GRA: range used flexibly; frequent error-free sentences; simple and complex sentences effective despite some errors. PRO: all Band 6 positives plus some Band 8 positives.
Band 6 - FC: keeps going and is willing to produce long turns; coherence may be lost through hesitation/repetition/self-correction; uses a range of discourse markers/connectives though not always appropriately. LR: sufficient to discuss topics at length; inappropriate use may occur but meaning remains clear; generally paraphrases successfully. GRA: mix of short and complex forms with limited flexibility; frequent complex-structure errors rarely impede communication. PRO: range of features with variable control; generally appropriate chunking; some effective but unsustained stress/intonation; occasional clarity loss; generally understood without much effort.
Band 5 - FC: usually keeps going through repetition/self-correction and/or slow speech; frequent searches for basic lexis/grammar; complex speech causes disfluency. LR: sufficient for familiar and unfamiliar topics but limited flexibility; paraphrase attempts not always successful. GRA: basic forms fairly accurate; complex forms limited and nearly always erroneous, sometimes requiring reformulation. PRO: all Band 4 positives plus some, but not all, Band 6 positives.
Band 4 - FC: cannot keep going without noticeable pauses; slow/repetitive; frequent self-correction; links simple sentences repetitively with coherence breakdowns. LR: sufficient for familiar topics but only basic meaning on unfamiliar topics; frequent word-choice errors; rare paraphrase. GRA: basic forms with some error-free short utterances; rare subordinate clauses; repetitive structures and frequent errors. PRO: limited acceptable features; frequent rhythm lapses; limited stress/intonation; frequent mispronunciation; understanding requires effort.
Band 3 - FC: frequent or long word-search pauses; limited linking and limited ability beyond simple responses; often cannot convey the basic message. LR: simple vocabulary mainly for personal information; inadequate for unfamiliar topics. GRA: basic forms attempted but errors numerous. PRO: some Band 2 and some Band 4 features.
Band 2 - FC: lengthy pauses before nearly every word; isolated words with virtually no communicative significance. LR: isolated/memorised utterances with very little communication. GRA: no evidence of basic sentence forms. PRO: few acceptable features; connected speech impaired; often unintelligible.
Band 1 - FC: essentially none; totally incoherent. LR: only a few isolated words; no communication possible. GRA: no rateable language unless memorised. PRO: occasional recognisable words/phonemes but no overall meaning; unintelligible.
Band 0 - does not attend or complete the test.

MANDATORY FORM NOTES:
- A candidate must fully fit the positive features of a descriptor before receiving that band.
- Rate average performance across all parts of the test.
`;

const officialWritingDescriptorRules = `
OFFICIAL IELTS WRITING BAND DESCRIPTOR RULES (supplied May 2023 form):
- A script must fully fit the positive features of a descriptor at a particular level.
- Bold negative features in the form limit the rating.
- Task 1 Band 9: all requirements are fully and appropriately satisfied; only extremely rare content lapses. Band 8: all requirements are covered appropriately, relevantly and sufficiently; key features are skilfully selected, clearly presented, highlighted and illustrated, with only occasional omissions. Band 7: requirements are covered with relevant and accurate content; selected key features are clearly highlighted, a clear overview is presented, data are appropriately categorised, and main trends or differences are identified, though illustration or extension may be incomplete.
- Task 2 Band 9: the prompt is addressed and explored in depth; a clear, fully developed position directly answers it; ideas are relevant, fully extended and well supported. Band 8: the prompt is appropriately and sufficiently addressed; the position is clear and well developed; ideas are relevant, well extended and supported. Band 7: the main prompt parts are appropriately addressed; the position is clear and developed; main ideas are extended and supported, though support may be generalised or lack focus/precision.
- Coherence/Cohesion Band 9: message followed effortlessly, cohesion rarely attracts attention, minimal lapses, skilful paragraphing. Band 8: message followed with ease, logical sequencing, well-managed cohesion, sufficient appropriate paragraphing. Band 7: logical organisation and clear progression; flexible cohesive devices including reference/substitution, with some inaccuracies or over/under-use. Band 6: generally coherent arrangement and clear overall progression, but cohesion may be faulty/mechanical and referencing may repeat or lack clarity. Band 5: organisation is evident but not wholly logical; progression and fluent linking are limited; cohesion/reference may be repetitive or inaccurate. Band 4 or below: no clear progression, unclear relationships, minimal or inaccurate cohesive control.
- Lexical Resource Band 9: full flexibility and precision; wide, accurate, natural and sophisticated vocabulary, with extremely rare minor errors. Band 8: wide, fluent and flexible resource for precise meaning; skilful uncommon/idiomatic use; only occasional errors with minimal impact. Band 7: sufficient flexibility and precision; some less-common/idiomatic use and awareness of style/collocation; few errors that do not reduce clarity. Band 6: generally adequate and appropriate resource; generally clear meaning despite restricted range or imprecision; errors do not impede communication. Band 5: limited but minimally adequate resource; little variation, frequent simplification/repetition or inappropriate word choice; errors may cause difficulty. Band 4 or below: basic, repetitive, inadequate or task-unrelated resource; errors may impede or prevent meaning.
- Grammatical Range/Accuracy Band 9: wide structures with full flexibility/control; appropriate grammar and punctuation throughout; extremely rare minor errors. Band 8: wide, flexible, accurate structures; majority error-free; occasional non-systematic errors with minimal impact. Band 7: varied complex structures with some flexibility; frequent error-free sentences; a few persistent errors do not impede communication. Band 6: a mix of simple and complex forms with limited flexibility; complex forms are less accurate; errors rarely impede communication. Band 5: limited, repetitive structures; attempted complex sentences are faulty; frequent errors may cause difficulty. Band 4 or below: very limited structures, rare subordinate clauses, frequent or predominant errors that may impede or prevent meaning.
- Band 6 requires generally coherent progression; generally adequate task-appropriate vocabulary; a mix of simple and complex forms whose errors rarely impede communication. Task 1 must adequately highlight selected key features, attempt a relevant overview, and support information with figures/data. Task 2 must address the main prompt parts with a directly relevant position and relevant, though possibly insufficiently developed, ideas.
- Band 5 has incomplete or inadequate task coverage, limited development/flexibility, imperfect progression, repetitive language, limited structures, and frequent errors that may cause difficulty.
- Band 4 reflects an attempted but weak or partly irrelevant response, unclear progression, basic/repetitive or task-unrelated vocabulary, very limited structures, and frequent errors that may impede meaning.
- Band 3 reflects failure to address task requirements, largely irrelevant or very limited information, no apparent logical organisation, inadequate lexical control, and predominant grammatical errors preventing most meaning.
- Band 2 content barely relates to the task and may be wholly off-topic, with extremely limited language and little evidence of sentence forms.
- Responses of 20 words or fewer are Band 1; wholly unrelated content is Band 1. Band 0 is only for no attempt, non-English throughout, or proven total memorisation.
`;

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
Evaluate the candidate's IELTS Academic Writing Task 1 and Task 2 submissions with strict fidelity to the official IELTS Band Descriptors (Borang Penilaian Resmi).

${officialWritingDescriptorRules}

CRITICAL RULES FOR EXAMINER CALIBRATION (STRICT BORANG CONFORMANCE):
1. NEVER guess, inflate, or invent an overall band.
2. For EVERY criterion, assign an INTEGER band score from 1 to 9 (e.g. 4, 5, 6, 7, 8, 9). Do NOT assign decimals like 6.5 or 5.5.
3. BEWARE OF THE "CLEAN SIMPLE ESSAY" TRAP:
   - AI tools (like ChatGPT) frequently generate essays with 100% correct spelling, zero punctuation mistakes, and clean paragraphs, but using ONLY elementary vocabulary (A2/B1) and basic repetitive sentence structures ("They can...", "This means...", "Subject + verb").
   - ZERO GRAMMAR/SPELLING ERRORS DOES NOT EQUAL BAND 7 OR 8!
   - In IELTS Writing, Accuracy is only HALF the criterion; RANGE (variety of complex structures, sophisticated/less-common lexis, idiomatic collocations) is the mandatory requirement for Band 7+.
   - An essay with 100% grammatical accuracy using only simple and basic compound sentences has RESTRICTED RANGE and MUST be rated BAND 5 (or at most Band 6) in GRA.
   - An essay with 100% spelling accuracy using only elementary everyday vocabulary without less-common lexis MUST be rated BAND 5 in LR. Band 6 requires attempting less-common lexis; Band 7 requires a sufficient range of less-common lexical items.

4. CRITERIA CEILINGS (MANDATORY HARD LIMITS):
   - TASK 1 (TASK ACHIEVEMENT - TA):
     * Band 5: The overview is superficial, weak, or merely states the obvious (e.g. "Overall, the prices of the three metals changed during the year"); OR the body mechanically recounts numbers month-by-month without synthesizing trends or groupings. IF THE OVERVIEW MERELY SAYS "THINGS CHANGED" OR LISTS RAW DATA, CAP TA AT BAND 5.
     * Band 6: Presents a relevant overview that identifies clear general trends (e.g. overall upward/downward trajectory), but some key features are inadequately selected or details are mechanically listed.
     * Band 7: Requires a CLEAR, well-formulated overview of main trends/differences AND accurate, well-categorised key features. An essay with a simplistic "prices changed" overview CANNOT RECEIVE BAND 7 (cap at Band 5).

   - TASK 2 (TASK RESPONSE - TR):
     * Band 5: Position is stated, but development is limited, simplistic, or generic (e.g. 1-2 sentence cliché explanations like "grandparents can teach their grandchildren about life and give them useful advice", "spend money on hospitals and medicines"); main ideas are superficial or repetitive. CAP TR AT BAND 5.
     * Band 6: Addresses all parts of the prompt with a clear position, but arguments are not fully extended or some points lack depth.
     * Band 7: Ideas are thoroughly explored, logically extended, and supported with depth and nuance. Generic, superficial explanations CANNOT RECEIVE BAND 7.

   - COHERENCE & COHESION (CC):
     * Band 5: Heavy reliance on mechanical list markers ("Firstly, Secondly, First, Second, Another problem is, In conclusion") at the start of sentences; repetitive referencing without sophisticated substitution. CAP CC AT BAND 5.
     * Band 6: Clear overall progression, but cohesion between sentences is mechanical or formulaic.
     * Band 7: Flexible, natural cohesive devices woven into sentences; subtle referencing and substitution. Mechanical template list connectors CANNOT RECEIVE BAND 7.

   - LEXICAL RESOURCE (LR):
     * Band 5: Uses only everyday, basic vocabulary (A2/B1 level: "give benefits", "more experience", "lived for many years", "spend money", "health problems", "prices changed", "biggest change"). Little variation, repetitive phrasing, and ZERO attempt at less-common academic lexis or sophisticated collocations. EVEN IF 100% ERROR-FREE IN SPELLING, THIS IS STRICTLY BAND 5.
     * Band 6: Demonstrates an adequate range of topic-specific vocabulary and ATTEMPTS less-common words/collocations, even if slightly awkward. Note: If no less-common words are attempted, it cannot exceed Band 5!
     * Band 7: Uses a sufficient range with flexibility, precision, and natural less-common lexical items and collocations. Error-free basic English CANNOT RECEIVE BAND 7.

   - GRAMMATICAL RANGE & ACCURACY (GRA):
     * Band 5: Relies heavily on simple sentence forms and repetitive basic patterns (e.g., repeated "They can + verb", "This means...", "Subject + modal + verb", "X was Y% while A was B%"). Complex sentences are rare, basic (just "because" or "and"), or absent. High accuracy in basic sentences DOES NOT raise this above Band 5.
     * Band 6: Mix of simple and complex forms (e.g. some subordinate clauses), but limited flexibility or variety.
     * Band 7: VARIETY of complex structures (passive voice, non-defining relative clauses, participle clauses, conditionals, inversion) used flexibly. An essay consisting mostly of simple Subject-Verb frames with 1 or 2 basic "because/if" clauses CANNOT RECEIVE BAND 7.

5. BENCHMARK CALIBRATION FOR BAND 5 AI ESSAYS:
   When candidate text shows:
   - Task 1: "Overall, the prices of the three metals changed during the year. Nickel had the biggest change... In January nickel was 6%... In June it decreased to -3%... In December zinc was 2%..."
   - Task 2: "On the one hand, elderly people can give some benefits... Firstly, they have more experience... For example, grandparents can teach their grandchildren... On the other hand, an ageing population can create several problems... First, elderly people need more healthcare... Second, the government needs to provide pensions... Another problem is fewer young people... In conclusion..."
   -> THIS ESSAY DEMONSTRATES TEXTBOOK BAND 5.0 (TA/TR: 5, CC: 5, LR: 5, GRA: 5, overall band: 5.0).
   Evaluate it strictly as Band 5.0. Do NOT inflate scores to Band 6, 7, or 8!
6. If performance sits between descriptors, choose the LOWER fully supported descriptor. Never let neat formatting or candidate effort inflate a band.
7. In descriptorReason, write ONE cohesive explanation without Part A/B/C/D labels or separate section headings. In that single explanation, cover why the awarded band fits, what prevents the next higher band, what keeps it above the lower band, and cite exact evidence from the response.
8. Provide short, exact quote excerpts in positiveEvidence and limitingEvidence from the candidate text. Do NOT invent words the candidate did not write.
9. If the candidate response is empty or <= 20 words, assign Band 1 or 2 with an underlength warning.
10. Write descriptorReason and feedback in natural Indonesian using a friendly teacher-to-student voice and the word "kamu". Explain why the awarded band fits, why it cannot move to the next band, why it is not lower, and cite exact response evidence based strictly on the official borang. Stay warm, direct, professional, and evidence-based.

Return JSON only with task1.taskAchievement, task1.coherenceCohesion, task1.lexicalResource, task1.grammaticalRangeAccuracy, task2.taskResponse, task2.coherenceCohesion, task2.lexicalResource, task2.grammaticalRangeAccuracy. Each criterion must include band, positiveEvidence, limitingEvidence, descriptorReason, feedback, confidence.
`;

const speakingPrompt = `
You are a senior certified Cambridge IELTS Senior Examiner.
Evaluate the candidate's IELTS Speaking performance across the entire performance: Part 1 + Part 2 + Part 3.

${officialSpeakingDescriptors}

CRITICAL RULES:
1. Apply the official IELTS Speaking Band Descriptors strictly. A candidate must fully fit the positive features of a band before receiving that band.
2. Rate the average performance across all supplied parts, but penalize missing, extremely short, off-topic, memorised, or non-communicative responses.
   - Do not infer language ability from recording duration or from a note saying that a recording exists.
   - Assess only language you can actually hear in attached audio or read in an exact transcript.
   - Explicitly compare each response with its prompt. If a response is unrelated, state that in the evidence and reduce FC and LR accordingly.
3. Band 5 is NOT a default middle score. Only award Band 5+ when the candidate usually keeps going, produces more than isolated/simple responses, has enough vocabulary for the topic, and shows rateable sentence control.
   - Band 6 is not justified merely because meaning can sometimes be understood. Confirm every positive Band 6 feature for that criterion from the full performance; otherwise award Band 5 or lower.
   - For GRA Band 6, frequent errors may occur in complex structures, but basic sentence control must be evident and errors must rarely impede communication. Frequent basic subject-verb, tense, word-order, or fragment errors do not fully fit Band 6.
   - For LR Band 6, the transcript must show sufficient topic vocabulary at length and generally successful paraphrase. Basic repeated vocabulary without demonstrated paraphrase does not fully fit Band 6.
   - Never let politeness, effort, recording length, or the candidate's desired score raise a band.
4. If answers are mostly "I don't know", "no idea", unrelated words, repeated filler, silence, laughter/noise, or do not answer the prompt, treat the response as non-communicative and assign Band 1 for FC, LR, GRA, and Pronunciation.
5. If the whole performance is a few isolated words, wholly unrelated to the prompts, or has virtually no communicative meaning, assign Band 1 for all criteria.
6. Band 2 is only for isolated words or memorised utterances with at least a tiny amount of recognisable communication. If FC is totally incoherent or LR shows no communication possible, assign Band 1.
7. Pronunciation MUST ALWAYS be assigned an INTEGER band score from 1 to 9 with status = "AI_EVALUATED".
   - When Audio Evidence Supplied To Model is YES, use the verified audio-only observations supplied with each transcript for individual sound clarity (phonemes), word stress, sentence stress, rhythm, intonation, and intelligibility.
   - Never claim audio or phonological data is unavailable when verified audio observations are supplied.
   - When Audio Evidence Supplied To Model is NO or audio is unreadable, estimate pronunciation score based on speech tempo, fluency markers, and communication coherence with an explicit note in descriptorReason. NEVER return pronunciation.band = null or REQUIRES_TUTOR_EVALUATION.
8. In descriptorReason for EVERY criterion (fluencyCoherence, lexicalResource, grammaticalRangeAccuracy, pronunciation), write ONE cohesive explanation without Part A/B/C/D labels or separate section headings. In that single explanation, cover in order: why the awarded band fits, what prevents the next band, what keeps it above the lower band, and grounded evidence from the response or verified audio observations. Use short connected sentences, not a long winding paragraph.
   - Write in natural Indonesian using a friendly teacher-to-student voice and the word "kamu". Be warm, direct, and professional. Avoid stiff bureaucratic phrasing, exaggerated praise, slang, ridicule, or discouraging language.
9. For FC, LR, and GRA, every item in positiveEvidence and limitingEvidence MUST be one short, verbatim excerpt copied from the supplied verified transcript. Put one excerpt per array item. Do not combine quotes, paraphrase, correct grammar, or invent words. For Pronunciation, use concrete audio observations rather than lexical quotes.
10. Write feedback in the same friendly Indonesian teacher voice. Start by acknowledging one real ability, then give 2-3 concrete practice steps. Keep it honest and actionable.

Return partRelevance as an object keyed by every supplied part id. Each value must contain status exactly RELEVANT, PARTIALLY_RELEVANT, or OFF_TOPIC and a concise reason. Off-topic speech does not demonstrate sufficient topic vocabulary or coherent topic development.

Return JSON only with partRelevance, fluencyCoherence, lexicalResource, grammaticalRangeAccuracy, pronunciation. Each scored criterion must include band (integer 1-9), positiveEvidence, limitingEvidence, descriptorReason, feedback, confidence.
`;

function readJsonBody(req) {
  // Vercel parses JSON before invoking the function; local Node uses a stream.
  if (req.body !== undefined) {
    try {
      return Promise.resolve(typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? JSON.parse(req.body.toString() || '{}') : req.body);
    } catch {
      return Promise.reject(new Error('Invalid JSON request body.'));
    }
  }
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
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
  return [];
}

function requireText(value, label) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return `${label} evaluation recorded.`;
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
  const lowEffortPattern = /\b(i\s+don'?t\s+know|no\s+idea|skip|pass|nggak\s+tahu|tidak\s+tahu|ga\s+tahu|gak\s+tahu)\b/i;
  return {
    transcript,
    totalWords,
    totalDuration,
    answeredItems,
    hasLowEffortLanguage: totalWords <= 30 && lowEffortPattern.test(transcript)
  };
}

function capCriterion(evidence, maxScore, reason) {
  if (evidence.score <= maxScore) return evidence;
  return {
    ...evidence,
    score: maxScore,
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
  return /non[-\s]?communicative|virtually no communicative|no communicative|no communication possible|totally incoherent|speech is totally incoherent|no meaningful response|no rateable language|no resource|isolated words|i don'?t know|no idea/.test(text);
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

function dataUrlToGeminiPart(label, dataUrl, isKie = false) {
  if (typeof dataUrl !== 'string') return [];
  const match = dataUrl.match(/^data:([^;,]+)[^,]*;base64,(.+)$/);
  if (!match) return [];
  if (isKie && !match[1].includes('wav') && !match[1].includes('mp3') && !match[1].includes('mpeg')) return [];
  return [
    { text: `\n=== ${label.toUpperCase()} ===` },
    isKie
      ? { media_url: { url: dataUrl } }
      : { inline_data: { mime_type: match[1], data: match[2] } }
  ];
}

async function storagePathToGeminiPart(label, storagePath, isKie = false) {
  if (typeof storagePath !== 'string' || !storagePath.startsWith('speaking-recordings/')) return [];
  if (isKie && !storagePath.endsWith('.wav') && !storagePath.endsWith('.mp3')) return [];
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return [];

  const path = storagePath.replace(/^speaking-recordings\//, '');
  if (isKie) {
    const signResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/speaking-recordings/${path}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: 600 })
    });
    if (!signResponse.ok) return [];
    const signed = await signResponse.json();
    const signedPath = signed?.signedURL || signed?.signedUrl;
    if (!signedPath) return [];
    const signedUrl = /^https?:\/\//i.test(signedPath)
      ? signedPath
      : `${supabaseUrl}/storage/v1${signedPath.startsWith('/') ? '' : '/'}${signedPath}`;
    return [
      { text: `\n=== ${label.toUpperCase()} ===` },
      { media_url: { url: signedUrl } }
    ];
  }

  const response = await fetch(`${supabaseUrl}/storage/v1/object/speaking-recordings/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });
  if (!response.ok) return [];

  const arrayBuffer = await response.arrayBuffer();
  const rawContentType = response.headers.get('content-type') || '';
  const contentType = (rawContentType && rawContentType !== 'application/octet-stream')
    ? rawContentType
    : (path.endsWith('.wav') ? 'audio/wav' : 'audio/webm');
  return [
    { text: `\n=== ${label.toUpperCase()} ===` },
    { inline_data: { mime_type: contentType, data: Buffer.from(arrayBuffer).toString('base64') } }
  ];
}

function speakingAudioSpecs(answers = {}) {
  if (isQaSpeakingAnswers(answers)) {
    return qaSpeakingPromptItems.map(([label, key]) => ({
      id: key,
      label,
      transcriptKey: `${key}_transcript`,
      audio: answers[`${key}_audio`]
    }));
  }
  return [
    { id: 'part1', label: 'Part 1 interview audio', transcriptKey: 'part1Transcript', audio: answers.part1Audio },
    { id: 'part2', label: 'Part 2 cue card audio', transcriptKey: 'part2Transcript', audio: answers.part2Audio },
    { id: 'part3', label: 'Part 3 discussion audio', transcriptKey: 'part3Transcript', audio: answers.part3Audio }
  ];
}

async function loadCompleteSpeakingAudio(answers, isKie) {
  const allSpecs = speakingAudioSpecs(answers);
  const specs = allSpecs.filter(item => Boolean(item.audio));
  const missing = allSpecs.filter(item => !item.audio).map(item => item.label);

  if (!specs.length) {
    throw new Error('AI Speaking evaluation dibatalkan: Belum ada rekaman suara yang tersimpan untuk dinilai.');
  }

  const loaded = await Promise.all(specs.map(async item => {
    const parts = typeof item.audio === 'string' && item.audio.startsWith('data:')
      ? dataUrlToGeminiPart(item.label, item.audio, isKie)
      : await storagePathToGeminiPart(item.label, item.audio, isKie);
    return { ...item, parts };
  }));
  const unreadable = loaded
    .filter(item => !item.parts.some(part => part.inline_data || part.media_url?.url))
    .map(item => item.label);
  if (unreadable.length) {
    throw new Error(`AI Speaking evaluation dibatalkan karena rekaman tidak dapat dibaca atau formatnya tidak didukung: ${unreadable.join(', ')}.`);
  }
  return {
    specs: loaded.map(({ id, label, transcriptKey }) => ({ id, label, transcriptKey })),
    audioParts: loaded.flatMap(item => item.parts),
    missingLabels: missing
  };
}

function buildSpeakingTranscriptionPrompt(specs) {
  const expectedParts = specs.map(item => `- id: ${item.id}; label: ${item.label}`).join('\n');
  const responseShape = JSON.stringify({
    parts: specs.map(item => ({
      id: item.id,
      transcript: 'verbatim words only',
      rateable: true,
      audioAnalysis: {
        intelligibility: 'concrete observation from this recording',
        rhythm: 'concrete observation from this recording',
        stressIntonation: 'concrete observation from this recording',
        phonemeIssues: 'concrete observation or none clearly observed'
      }
    }))
  });
  return `Transcribe the attached IELTS Speaking recordings before any grading.

EXPECTED RECORDINGS:
${expectedParts}

STRICT TRANSCRIPTION RULES:
1. Transcribe only words actually audible in each recording. Do not use outside knowledge and do not infer answers.
2. Preserve the candidate's grammar mistakes, repeated words, fillers, false starts, and incomplete sentences.
3. Do not correct, paraphrase, summarise, translate, or improve the speech.
4. Use [inaudible] only where speech cannot be understood. Use an empty transcript for silence or noise without intelligible speech.
5. The IELTS questions are intentionally not supplied here. Never insert likely topic phrases.
6. Return every expected id exactly once and in the supplied order.
7. For each recording, analyse intelligibility, rhythm/chunking, word and sentence stress, intonation, and any concrete phoneme issues. Base every observation only on the audio.

Return JSON only in this exact shape:
${responseShape}`;
}

function validateVerifiedTranscripts(parsed, specs) {
  if (!Array.isArray(parsed?.parts)) {
    throw new Error('AI Speaking evaluation dibatalkan karena transkripsi rekaman tidak lengkap.');
  }

  const verified = specs.map(spec => {
    const matches = parsed.parts.filter(part => part?.id === spec.id);
    if (matches.length !== 1 || typeof matches[0].transcript !== 'string') {
      throw new Error(`AI Speaking evaluation dibatalkan karena transkrip terverifikasi tidak tersedia untuk ${spec.label}.`);
    }
    const transcript = matches[0].transcript.trim();
    const rateable = matches[0].rateable === true && countWords(transcript) > 0;
    const audioAnalysis = matches[0].audioAnalysis;
    if (rateable && (!audioAnalysis || typeof audioAnalysis !== 'object'
      || ['intelligibility', 'rhythm', 'stressIntonation', 'phonemeIssues']
        .some(key => typeof audioAnalysis[key] !== 'string' || !audioAnalysis[key].trim()))) {
      throw new Error(`AI Speaking evaluation dibatalkan karena analisis audio tidak lengkap untuk ${spec.label}.`);
    }
    return {
      id: spec.id,
      label: spec.label,
      transcript,
      rateable,
      audioAnalysis: rateable ? {
        intelligibility: audioAnalysis.intelligibility.trim(),
        rhythm: audioAnalysis.rhythm.trim(),
        stressIntonation: audioAnalysis.stressIntonation.trim(),
        phonemeIssues: audioAnalysis.phonemeIssues.trim()
      } : undefined
    };
  });

  if (!verified.some(item => item.rateable)) {
    throw new Error('AI Speaking evaluation dibatalkan karena provider tidak berhasil membaca suara dari rekaman. Tidak ada nilai yang disimpan; silakan coba lagi atau lakukan penilaian tutor.');
  }
  return verified;
}

function answersWithVerifiedTranscripts(answers, specs, verifiedTranscripts) {
  const enriched = { ...answers };
  enriched._verifiedAudioAnalysis = {};
  for (const spec of specs) {
    const verified = verifiedTranscripts.find(item => item.id === spec.id);
    enriched[spec.transcriptKey] = verified?.transcript || '';
    enriched._verifiedAudioAnalysis[spec.id] = verified?.audioAnalysis;
  }
  return enriched;
}

function inputHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify({
    rubricVersion: RUBRIC_VERSION,
    promptVersion: PROMPT_VERSION,
    ...payload
  })).digest('hex');
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
  // Part 2 field names are shared by old production data and QA data, so they
  // cannot identify the five-question QA format on their own.
  const qaOnlyKeys = ['part1_q1', 'part1_q2', 'part3_q1', 'part3_q2'];
  return qaOnlyKeys.some(key => (
    answers[`${key}_audio`] || answers[`${key}_duration`] || answers[`${key}_transcript`]
  ));
}

function formatSpeakingTranscript(transcript, duration) {
  if (transcript && typeof transcript === 'string' && transcript.trim().length > 0) {
    return transcript.trim();
  }
  const dur = Number(duration || 0);
  if (dur > 0) {
    return `[No transcript available. Evaluate the attached audio for this part. Recorded duration: ${dur} seconds. Duration is not evidence of language quality.]`;
  }
  return '(No recording or transcript submitted)';
}

function formatSpeakingAudioAnalysis(answers, id) {
  const analysis = answers?._verifiedAudioAnalysis?.[id];
  if (!analysis) return '(No verified phonological observations available for this part)';
  return [
    `Intelligibility: ${analysis.intelligibility}`,
    `Rhythm/chunking: ${analysis.rhythm}`,
    `Stress/intonation: ${analysis.stressIntonation}`,
    `Phoneme issues: ${analysis.phonemeIssues}`
  ].join('\n');
}

function buildSpeakingPrompt(user, answers, hasAudio, missingLabels = []) {
  const p1Dur = Number(answers.part1Duration || 0);
  const p2Dur = Number(answers.part2Duration || 0);
  const p3Dur = Number(answers.part3Duration || 0);
  const partsRecordedCount = (p1Dur > 0 ? 1 : 0) + (p2Dur > 0 ? 1 : 0) + (p3Dur > 0 ? 1 : 0);
  const missingNote = missingLabels?.length
    ? `\nPARTIAL COMPLETION NOTE: The candidate submitted audio recordings for only some parts. Missing/unrecorded parts: ${missingLabels.join(', ')}. In accordance with official IELTS Speaking Descriptors, evaluate the candidate based on the language produced in the supplied recordings, but appropriately penalize Fluency, Lexical Resource, and Grammatical Range for unrecorded/incomplete tasks (inability to sustain long turns or extended discussion restricts overall band).\n`
    : '';
  const multiPartNote = partsRecordedCount >= 2 && !missingLabels?.length
    ? `\nNOTE ON CANDIDATE COMPLETION: Candidate recorded spoken answers for multiple sections (Part 1: ${p1Dur}s, Part 2: ${p2Dur}s, Part 3: ${p3Dur}s). Do NOT claim or penalize candidate as having skipped or left parts empty when recorded duration is present. Evaluate overall English proficiency based on speech samples.\n`
    : '';

  if (isQaSpeakingAnswers(answers)) {
    const qaBlocks = qaSpeakingPromptItems.map(([label, key, prompt]) => `
=== SPEAKING ${label.toUpperCase()} ===
Prompt:
${prompt}
Duration: ${answers[`${key}_duration`] || 0} seconds
Transcript:
"""
${formatSpeakingTranscript(answers[`${key}_transcript`], answers[`${key}_duration`])}
"""
Verified audio-only phonological observations:
"""
${formatSpeakingAudioAnalysis(answers, key)}
"""`).join('\n');

    return `${speakingPrompt}

Candidate ID: ${user.candidateId}
Result ID: ${user.resultId}
Candidate Name: ${user.fullName}
Audio Evidence Supplied To Model: ${hasAudio ? 'YES' : 'NO'}${multiPartNote}${missingNote}
The transcripts and phonological observations below were produced in a separate audio-only pass. Treat transcripts as the only permitted source for FC/LR/GRA quotations and the verified observations as the source for Pronunciation.

${qaBlocks}`;
  }

  return `${speakingPrompt}

Candidate ID: ${user.candidateId}
Result ID: ${user.resultId}
Candidate Name: ${user.fullName}
Audio Evidence Supplied To Model: ${hasAudio ? 'YES' : 'NO'}${multiPartNote}${missingNote}
The transcripts and phonological observations below were produced in a separate audio-only pass. Treat transcripts as the only permitted source for FC/LR/GRA quotations and the verified observations as the source for Pronunciation.

=== SPEAKING PART 1 ===
Original prompts:
${speakingParts[1]}
Duration: ${answers.part1Duration || 0} seconds
Transcript:
"""
${formatSpeakingTranscript(answers.part1Transcript, answers.part1Duration)}
"""
Verified audio-only phonological observations:
"""
${formatSpeakingAudioAnalysis(answers, 'part1')}
"""

=== SPEAKING PART 2 ===
Original prompt:
${speakingParts[2]}
Duration: ${answers.part2Duration || 0} seconds
Transcript:
"""
${formatSpeakingTranscript(answers.part2Transcript, answers.part2Duration)}
"""
Verified audio-only phonological observations:
"""
${formatSpeakingAudioAnalysis(answers, 'part2')}
"""

=== SPEAKING PART 3 ===
Original prompts:
${speakingParts[3]}
Duration: ${answers.part3Duration || 0} seconds
Transcript:
"""
${formatSpeakingTranscript(answers.part3Transcript, answers.part3Duration)}
"""
Verified audio-only phonological observations:
"""
${formatSpeakingAudioAnalysis(answers, 'part3')}
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

function shouldUseKie(forceKie = false) {
  const providerOverride = process.env.AI_EVALUATOR_PROVIDER?.toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const hasNativeGoogleKey = looksLikeNativeGoogleApiKey(geminiKey);
  const hasKieCredential = Boolean(process.env.KIE_API_KEY || process.env.KIE_API_KEYS || (geminiKey && !hasNativeGoogleKey));
  return forceKie || providerOverride === 'kie' || (
    providerOverride !== 'google' && !hasNativeGoogleKey && hasKieCredential
  );
}

function kieContentFromParts(parts) {
  return parts.flatMap(part => {
    if (part.text) return [{ type: 'text', text: part.text }];
    if (part.media_url?.url) {
      return [{
        type: 'image_url',
        image_url: { url: part.media_url.url }
      }];
    }
    if (part.inline_data) {
      const mimeType = part.inline_data.mime_type || 'application/octet-stream';
      return [{
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${part.inline_data.data}` }
      }];
    }
    return [];
  });
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return text;
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(text);
  }
}

async function callKie(parts, apiKey, modelName) {
  const preferredModel = (!modelName || modelName === 'gemini-2.5-flash') ? 'gemini-3-5-flash-openai' : modelName;
  const fallbackModels = [
    preferredModel,
    'gemini-3-5-flash-openai',
    'gemini-2.5-pro'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);
  const hasMedia = parts.some(part => part.media_url?.url || part.inline_data);
  const candidateModels = hasMedia ? [preferredModel] : fallbackModels;

  let lastError = null;
  for (const targetModel of candidateModels) {
    try {
      const url = `${KIE_BASE_URL}/${targetModel}/v1/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(Number(process.env.KIE_REQUEST_TIMEOUT_MS || 45000)),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: kieContentFromParts(parts)
          }]
        })
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`KIE API Error: ${response.status} - ${text.slice(0, 500)}`);
      }

      const body = text ? JSON.parse(text) : {};
      if (body?.code && body.code !== 200) {
        throw new Error(`KIE API Error (${body.code}): ${body.msg || 'Provider error'}`);
      }
      const rawContent = body?.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error(body?.msg ? `KIE API Error: ${body.msg}` : 'KIE API returned an empty chat completion.');
      }
      return extractJson(rawContent);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('KIE API returned an empty chat completion.');
}

async function callEvaluatorModel(parts, forceKie) {
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const shouldTreatGeminiKeyAsKieKey = Boolean(geminiKey && !looksLikeNativeGoogleApiKey(geminiKey));
  const useKie = shouldUseKie(forceKie);
  const kieKeys = getKieApiKeys(useKie && shouldTreatGeminiKeyAsKieKey);

  if (useKie) {
    if (!kieKeys.length) {
      throw new Error('server KIE_API_KEY is not configured.');
    }
    const modelName = process.env.KIE_MODEL_NAME || DEFAULT_KIE_MODEL;
    let lastError = null;
    for (const kieKey of kieKeys) {
      try {
        const parsed = await callKie(parts, kieKey, modelName);
        return { parsed, modelName, provider: 'kie.ai' };
      } catch (error) {
        lastError = error;
      }
    }
    const detail = lastError instanceof Error ? lastError.message : 'Provider error';
    if (/500|maintain|maintenance/i.test(detail)) {
      throw new Error('Layanan AI KIE sedang maintenance. Penilaian lama tidak diubah; silakan coba Nilai Ulang AI beberapa saat lagi.');
    }
    throw lastError || new Error('KIE AI evaluation failed.');
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

function normalizeTranscriptEvidence(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/\[inaudible\]/g, ' ')
    .replace(/[“”‘’"'`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function validateGroundedCriterionEvidence(label, criterion, verifiedTranscripts) {
  const normalizedTranscripts = verifiedTranscripts
    .map(item => normalizeTranscriptEvidence(item.transcript))
    .filter(Boolean);

  if (!normalizedTranscripts.length) {
    if (criterion.score !== 1) {
      throw new Error(`AI Speaking evaluation rejected: ${label} must be Band 1 because no intelligible transcript evidence exists.`);
    }
    return;
  }

  if (!criterion.positiveEvidence.length || !criterion.limitingEvidence.length) {
    throw new Error(`AI Speaking evaluation rejected: ${label} must include positive and limiting verbatim transcript evidence.`);
  }

  for (const evidence of [...criterion.positiveEvidence, ...criterion.limitingEvidence]) {
    const normalizedEvidence = normalizeTranscriptEvidence(evidence);
    const grounded = normalizedEvidence.length > 0
      && normalizedTranscripts.some(transcript => transcript.includes(normalizedEvidence));
    if (!grounded) {
      throw new Error(`AI Speaking evaluation rejected because ${label} evidence was not found in the verified transcript: ${evidence}`);
    }
  }
}

function validatePartRelevance(value, verifiedTranscripts) {
  if (!value || typeof value !== 'object') {
    throw new Error('AI Speaking evaluation rejected: partRelevance is missing.');
  }
  const allowed = new Set(['RELEVANT', 'PARTIALLY_RELEVANT', 'OFF_TOPIC']);
  const normalizeId = input => String(input || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const entries = Array.isArray(value)
    ? value.map((item, index) => [item?.id || item?.part || item?.label || `index${index}`, item])
    : Object.entries(value);

  return Object.fromEntries(verifiedTranscripts.map((part, index) => {
    const wanted = normalizeId(part.id);
    const matched = entries.find(([key, item]) => {
      const candidates = [key, item?.id, item?.part, item?.label].map(normalizeId).filter(Boolean);
      return candidates.some(candidate => candidate === wanted || candidate.startsWith(wanted) || wanted.startsWith(candidate));
    });
    const item = matched?.[1] || (Array.isArray(value) ? value[index] : undefined);
    let status = String(item?.status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (status === 'ON_TOPIC') status = 'RELEVANT';
    if (status === 'PARTIAL' || status === 'PARTLY_RELEVANT') status = 'PARTIALLY_RELEVANT';
    if (status === 'IRRELEVANT') status = 'OFF_TOPIC';
    const reason = typeof item?.reason === 'string' ? item.reason : item?.explanation;
    if (!item || !allowed.has(status) || typeof reason !== 'string' || !reason.trim()) {
      throw new Error(`AI Speaking evaluation rejected: invalid relevance review for ${part.label}.`);
    }
    return [part.id, { status, reason: reason.trim() }];
  }));
}

function applySpeakingRelevanceCaps(criteria, partRelevance) {
  const entries = Object.values(partRelevance);
  const offTopicCount = entries.filter(item => item.status === 'OFF_TOPIC').length;
  if (!entries.length || offTopicCount < Math.ceil(entries.length / 2)) return criteria;

  const allOffTopic = offTopicCount === entries.length;
  const maxScore = allOffTopic ? 3 : 4;
  const reason = allOffTopic
    ? 'All supplied responses were judged off-topic, so topic development and topic vocabulary cannot support FC or LR above Band 3.'
    : 'Most supplied responses were judged off-topic, so topic development and topic vocabulary cannot support FC or LR above Band 4.';
  return {
    ...criteria,
    fc: capCriterion(criteria.fc, maxScore, reason),
    lr: capCriterion(criteria.lr, maxScore, reason)
  };
}

function applySpeakingBandSixGates(criteria, verifiedTranscripts) {
  const rateable = verifiedTranscripts.filter(item => item.rateable && item.audioAnalysis);
  const majority = Math.ceil(Math.max(rateable.length, 1) / 2);
  const severeFluencyPattern = /quite choppy|halting|significant paus|frequent hesitation|frequent paus|irregular.*(?:pause|chunk)|patah[-\s]?patah/i;
  const weakPhonologyPattern = /flat|monotone|narrow pitch|limited pitch|weak.*stress|lack.*stress|minimal.*pitch|intonation.*not.*sustain/i;
  const severeFluencyParts = rateable.filter(item => severeFluencyPattern.test(item.audioAnalysis.rhythm)).length;
  const weakPhonologyParts = rateable.filter(item => (
    weakPhonologyPattern.test(item.audioAnalysis.stressIntonation)
    || severeFluencyPattern.test(item.audioAnalysis.rhythm)
  )).length;

  let { fc, lr, gra, pro } = criteria;
  if (fc.score >= 6 && severeFluencyParts >= majority) {
    fc = capCriterion(fc, 5, 'Band 6 FC requires sustained long turns with only occasional coherence loss. Verified audio shows choppy or halting delivery with significant pausing in most parts, which fully fits Band 5 rather than Band 6.');
  }

  const lrReview = `${lr.descriptorMatch} ${lr.feedback}`;
  const demonstratesSuccessfulParaphrase = /generally (?:able to )?paraphras(?:e|ing) successfully|generally successful paraphras|parafrasa[^.]{0,80}(?:berhasil|sukses)|berhasil[^.]{0,40}parafrasa/i.test(lrReview);
  if (lr.score >= 6 && !demonstratesSuccessfulParaphrase) {
    lr = capCriterion(lr, 5, 'Band 6 LR requires generally successful paraphrase. The evaluation contains no grounded evidence that this positive feature was met, so Band 6 is not fully supported.');
  }

  if (pro.score >= 6 && weakPhonologyParts >= majority) {
    pro = capCriterion(pro, 5, 'Band 6 Pronunciation requires generally appropriate chunking and some effective, though unsustained, stress and intonation. Verified audio observations show flat or narrow intonation, weak stress, or irregular chunking in most parts, so Band 6 is not fully supported.');
  }

  return { fc, lr, gra, pro };
}

function validateSpeaking(user, answers, parsed, hash, modelName, provider, hasAudio, verifiedTranscripts) {
  let fc = criterionEvidence('Fluency and Coherence (FC)', parsed?.fluencyCoherence, 'fluencyCoherence');
  let lr = criterionEvidence('Lexical Resource (LR)', parsed?.lexicalResource, 'lexicalResource');
  let gra = criterionEvidence('Grammatical Range and Accuracy (GRA)', parsed?.grammaticalRangeAccuracy, 'grammaticalRangeAccuracy');
  const pronunciation = parsed?.pronunciation;

  let pro;
  if (pronunciation && typeof pronunciation === 'object' && pronunciation.band !== null && pronunciation.band !== undefined) {
    pro = criterionEvidence('Pronunciation (PRO)', pronunciation, 'pronunciation');
  } else {
    const fallbackScore = Math.max(1, Math.min(9, Math.round((fc.score + lr.score + gra.score) / 3)));
    pro = {
      criterion: 'Pronunciation (PRO)',
      score: fallbackScore,
      positiveEvidence: ['Artikulasi fonem dan ritme bicara secara umum selaras dengan tingkat kelancaran kandidat.'],
      limitingEvidence: ['Variasi intonasi atau ketegasan akhiran kata masih memerlukan latihan.'],
      descriptorMatch: pronunciation?.descriptorReason || `Diberikan Band ${fallbackScore} selaras dengan karakteristik kelancaran dan penyampaian lisan kandidat.`,
      feedback: pronunciation?.feedback || 'Fokus pada tekanan kata, intonasi alami, dan pengucapan fonem yang jelas.',
      confidence: 'Medium'
    };
  }

  validateGroundedCriterionEvidence('FC', fc, verifiedTranscripts);
  validateGroundedCriterionEvidence('LR', lr, verifiedTranscripts);
  validateGroundedCriterionEvidence('GRA', gra, verifiedTranscripts);
  const partRelevance = validatePartRelevance(parsed?.partRelevance, verifiedTranscripts);

  ({ fc, lr, gra, pro } = applySpeakingDescriptorCaps(answers, { fc, lr, gra, pro }));
  ({ fc, lr, gra, pro } = applySpeakingBandSixGates({ fc, lr, gra, pro }, verifiedTranscripts));
  ({ fc, lr, gra, pro } = applySpeakingRelevanceCaps({ fc, lr, gra, pro }, partRelevance));

  const rawAverage = (fc.score + lr.score + gra.score + pro.score) / 4;
  const estimatedBand = roundToNearestHalfBand(rawAverage);
  const tutorComparisonGuide = {
    version: 'teacher-friendly-rubric-comparison-v1',
    purpose: 'Membantu tutor membandingkan penilaian AI dengan borang resmi dan memberi alasan koreksi per kriteria.',
    status: 'AWAITING_TUTOR_COMPARISON',
    overall: {
      rawAverage,
      estimatedBand,
      calculation: `(${fc.score} + ${lr.score} + ${gra.score} + ${pro.score}) / 4 = ${rawAverage.toFixed(2)}`
    },
    criteria: Object.fromEntries([
      ['FC', fc], ['LR', lr], ['GRA', gra], ['PRO', pro]
    ].map(([key, item]) => [key, {
      aiBand: item.score,
      explanation: item.descriptorMatch,
      positiveEvidence: item.positiveEvidence,
      limitingEvidence: item.limitingEvidence,
      studentFeedback: item.feedback,
      tutorPrompt: `Apakah Band ${item.score} sudah sepenuhnya cocok dengan ciri positif borang? Jika tidak, tuliskan band tutor, alasan, dan feedback untuk murid.`
    }]))
  };

  const detail = {
    fc,
    lr,
    gra,
    pro,
    verifiedTranscripts,
    partRelevance,
    tutorComparisonGuide,
    rawAverage,
    estimatedBand
  };

  const auditedParsed = { ...parsed, verifiedTranscripts, partRelevance, tutorComparisonGuide };

  const report = {
    band: estimatedBand,
    assessmentStatus: 'AI Evaluated',
    speakingDetail: detail,
    feedbackCategories: [
      { category: 'Fluency & Coherence', score: `Band ${fc.score.toFixed(1)}`, feedback: fc.feedback },
      { category: 'Lexical Resource', score: `Band ${lr.score.toFixed(1)}`, feedback: lr.feedback },
      { category: 'Grammar Range & Accuracy', score: `Band ${gra.score.toFixed(1)}`, feedback: gra.feedback },
      { category: 'Pronunciation', score: `Band ${pro.score.toFixed(1)}`, feedback: pro.feedback }
    ],
    strengths: [...fc.positiveEvidence.slice(0, 1), ...pro.positiveEvidence.slice(0, 1)],
    weaknesses: [...gra.limitingEvidence.slice(0, 1), ...pro.limitingEvidence.slice(0, 1)],
    recommendations: [
      'Latih kelancaran berbicara dengan kalimat majemuk tanpa jeda ragu yang panjang.',
      'Perhatikan penekanan kata (word stress) dan ritme kalimat untuk meningkatkan kejelasan pengucapan.'
    ]
  };

  const assessment = {
    ...baseAssessment(user, 'speaking', auditedParsed, hash, modelName, provider),
    criterion_scores: { FC: fc.score, LR: lr.score, GRA: gra.score, PRO: pro.score },
    criterion_evidence: {
      FC: { positive: fc.positiveEvidence, limiting: fc.limitingEvidence, descriptorReason: fc.descriptorMatch, feedback: fc.feedback, tutorComparison: tutorComparisonGuide.criteria.FC },
      LR: { positive: lr.positiveEvidence, limiting: lr.limitingEvidence, descriptorReason: lr.descriptorMatch, feedback: lr.feedback, tutorComparison: tutorComparisonGuide.criteria.LR },
      GRA: { positive: gra.positiveEvidence, limiting: gra.limitingEvidence, descriptorReason: gra.descriptorMatch, feedback: gra.feedback, tutorComparison: tutorComparisonGuide.criteria.GRA },
      PRO: { positive: pro.positiveEvidence, limiting: pro.limitingEvidence, descriptorReason: pro.descriptorMatch, feedback: pro.feedback, tutorComparison: tutorComparisonGuide.criteria.PRO }
    },
    estimated_band: estimatedBand,
    calculated_band: estimatedBand,
    confidence: recordConfidence([fc, lr, gra, pro]),
    evaluation_status: 'AI EVALUATED',
    status: 'AI EVALUATED'
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

  const deactivateUrl = `${supabaseUrl}/rest/v1/ai_assessments?result_id=eq.${encodeURIComponent(assessment.result_id)}&section=eq.${encodeURIComponent(assessment.section)}&evaluation_id=neq.${encodeURIComponent(assessment.evaluation_id)}&is_active=eq.true`;
  const deactivateResponse = await fetch(deactivateUrl, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ is_active: false })
  });
  if (!deactivateResponse.ok) {
    const text = await deactivateResponse.text();
    throw new Error(`Old AI assessment deactivation failed: ${deactivateResponse.status} - ${text.slice(0, 500)}`);
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

  const isKie = shouldUseKie(forceKie);

  const { specs, audioParts, missingLabels } = await loadCompleteSpeakingAudio(answers, isKie);
  const hasAudio = true;
  const transcriptionPrompt = buildSpeakingTranscriptionPrompt(specs);
  const { parsed: transcription } = await callEvaluatorModel([{ text: transcriptionPrompt }, ...audioParts], forceKie);
  const verifiedTranscripts = validateVerifiedTranscripts(transcription, specs);
  const verifiedAnswers = answersWithVerifiedTranscripts(answers, specs, verifiedTranscripts);
  const prompt = buildSpeakingPrompt(user, verifiedAnswers, hasAudio, missingLabels);
  const { parsed, modelName, provider } = await callEvaluatorModel([{ text: prompt }], forceKie);
  return validateSpeaking(user, verifiedAnswers, parsed, hash, modelName, provider, hasAudio, verifiedTranscripts);
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
