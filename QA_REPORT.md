# QA Report — Mr.BOB IELTS Simulation Test

==================================================
TEST EXECUTION SUMMARY
==================================================

Date: 2026-09-03
Environment: Production Build + Local Diagnostic Environment
Target App: Mr.BOB IELTS Simulation Test Platform (Cambridge 17/18 Official)
Architecture: Resumable Candidate Sessions + Freedom of Section Order + Independent 60-Min Server Timers + One-Page Vertical Section Layouts + Hardened Object Storage + Blind Tutor QA + Answer Key Security

==================================================
DETAILED QA RESULTS
==================================================

REGISTRATION:
PASS
- Candidate stored in persistent database with candidate_id, normalized WhatsApp (+62), age, status, target score.
- Unique Result ID (e.g. `IELTS-2026-BAYU969`) and secure Access Code (e.g. `X7KM-29PQ`) generated.

ACCESS CODE:
PASS
- Access Code generated in format `XXXX-XXXX`.
- Hashed using secure pseudo-digest in storage.
- Displayed clearly on "Simpan Akses Test Kamu" screen with Copy button and Send to WhatsApp action.

SAME DEVICE RESUME:
PASS
- Active session token stored locally.
- On browser reload/return, candidate session restored automatically into Test Dashboard without reprompting credentials.

CROSS DEVICE RESUME:
FAIL
- "Sudah pernah mulai test? Lanjutkan IELTS Simulation" now validates normalized WhatsApp + Access Code through the Supabase server endpoint.
- A Browser A/B or incognito resume was not executed against a live Supabase project because Supabase credentials are not configured in this environment.

SESSION PERSISTENCE:
NOT LIVE VERIFIED
- Same-browser session resume uses an opaque local session reference.
- Database-backed persistence is implemented through Supabase endpoints, but survival across devices was not verified against a connected Supabase project.

SECTION SELECTION:
PASS
- Old mandatory sequential lock removed.
- Candidate can select and complete any section in any order (e.g. Speaking -> Reading -> Writing -> Listening) over multiple days.

READING TIMER:
PASS
- Independent 60-minute countdown initialized on section start (`started_at` & `deadline_at`).
- Dynamic remaining calculation: `deadline_at - now`.

LISTENING TIMER:
PASS
- Independent 60-minute countdown initialized on section start.
- Page reload or tab switch preserves accurate remaining time.

WRITING TIMER:
PASS
- Independent 60-minute countdown initialized on section start.
- Does not interfere with other sections.

SPEAKING TIMER:
PASS
- Independent 60-minute countdown initialized on section start.

TIMEOUT AUTO SUBMIT:
PASS
- When remaining seconds reach 0, latest responses are locked and saved, and section status is marked `AUTO_SUBMITTED` / `AUTO_TIMEOUT`.

READING ONE PAGE:
PASS
- All 3 passages and 40 questions rendered in one continuous vertically scrollable page.
- Zero pagination or "Next Question" buttons.

LISTENING ONE PAGE:
PASS
- All 4 parts (Q1–40) rendered in one continuous vertically scrollable page.
- Sticky audio player plays continuous Cambridge audio track without interruption while scrolling or answering.

WRITING ONE PAGE:
PASS
- Task 1 (prompt + Cambridge 2014 metal price chart + textarea + live word count) and Task 2 (essay prompt + textarea + live word count) on the same page.

SPEAKING ONE PAGE:
PASS
- Part 1 (Sleep), Part 2 (Friend cue card), Part 3 (Discussion) all on one scrollable page.

AUTOSAVE:
PASS
- Objective Reading and Listening answers saved immediately on change.
- Writing drafts autosaved while typing and on blur.
- Speaking voice recordings saved immediately after recording stop.

SPEAKING OBJECT STORAGE:
FAIL
- Dedicated `AudioStorageService` now uploads voice recordings as binary WebM files under `speaking-recordings/[result_id]/part-[partId].webm`.
- Database rows store only metadata (`candidate_id`, `part`, `question_id`, `audio_storage_path`, `duration`, `transcript`, `saved_at`); no audio URL or Base64 field is stored.
- A real Supabase Storage upload was not verified because Supabase credentials are not configured in this environment.

SPEAKING WAVEFORM:
PASS
- Web Audio API AnalyserNode connects directly to microphone MediaStream to produce real-time dynamic frequency amplitudes.

READING SCORING:
PASS
- Cambridge 17 Reading Test 4 (Q1–40) deterministic scoring passes 40/40, 0/40, and blank tests.
- Paired questions Q23–24 (B+E) and Q25–26 (B+D) evaluated accurately in either order.

LISTENING SCORING:
PASS
- Cambridge 18 Listening Test 4 (Q1–40) deterministic scoring passes 40/40 and 0/40 tests.
- Verified answer keys: Q3 *Chastons*, Q7 *confident*, Q38 *harbour*/*harbor*, Q21–22 (B+D).

WRITING CONTENT:
PASS
- Cambridge 18 Academic Writing Test 4 prompts and comparative chart graphic verified.

SPEAKING CONTENT:
PASS
- Cambridge 18 Speaking Test 4 Parts 1, 2, 3 prompts verified.

SUBMISSION LOCK:
PASS
- Confirmation modal shows Answered vs Unanswered summary before submitting.
- Submitted/expired sections permanently locked from candidate editing with `Completed ✓`.

ADMIN:
PASS
- Admin CRM candidate table opens centered popup modal with 6 tabs: Candidate Info, Test Responses, Manual Checking (Blind QA), Evaluation & Rubric, PDF Reports, Follow Up.

BLIND READING QA:
PASS
- In Blind QA mode, answer keys, auto-results, and score banners are hidden.
- Tutor verifies Q1–40 independently with `[ Correct ✓ ]` and `[ Incorrect ✗ ]` buttons.

BLIND LISTENING QA:
PASS
- In Blind QA mode, official keys and auto results are hidden.
- Comparison, auto-score vs tutor-score agreement %, and discrepancy highlights appear only after tutor clicks `[ Submit Blind QA ]`.

BLIND WRITING QA:
PASS
- Tutor reviews untruncated candidate essays with prompts and criteria without seeing any AI scores.
- Selects Task 1 (TA, CC, LR, GRA) and Task 2 (TR, CC, LR, GRA) criteria; band calculated using official formula.

BLIND SPEAKING QA:
PASS
- Tutor listens to permanent audio recordings with transcripts without bias from automated scores.
- Evaluates FC, LR, GRA, PRO criteria; band calculated using official formula.

GEMINI API KEY SECURITY:
PASS
- Gemini calls were removed from candidate-facing React code.
- No Gemini API key is read from `VITE_*`, hardcoded source, or browser `localStorage`.
- Browser calls only `/api/ai-evaluate`; `GEMINI_API_KEY` is read by the Node server endpoint only.

AI ENDPOINT AUTHORIZATION:
PASS
- `/api/ai-evaluate` requires a server-created HttpOnly admin evaluator session cookie.
- Local probe failed safely with HTTP 503 because `ADMIN_EVALUATOR_TOKEN` is not configured on the server.
- Candidate flow has no AI evaluation trigger.

WRITING REAL INPUT:
FAIL
- Not executed in this environment because no live `GEMINI_API_KEY` / `ADMIN_EVALUATOR_TOKEN` pair was configured.
- Code path now sends candidate ID, exact Task 1 prompt, chart context, Task 1 response and word count, exact Task 2 prompt, Task 2 response and word count to the secure endpoint.

WRITING STRUCTURED OUTPUT:
PASS
- Server validates Task 1 TA/CC/LR/GRA and Task 2 TR/CC/LR/GRA before returning a saved assessment.
- Missing criteria, missing required fields, null bands, or decimal bands are rejected with `AI Evaluation Failed`.
- No missing field is invented by frontend fallback logic.

WRITING BAND CALCULATION:
PASS
- Server calculates Task 1 average, Task 2 average, weighted Writing score `(Task1 + 2 × Task2) / 3`, then rounds via the existing half-band method.
- Gemini does not control the final Writing band directly.

SPEAKING REAL INPUT:
FAIL
- Not executed in this environment because no live Gemini credentials and controlled real recordings were available.
- Code path sends candidate ID, exact Speaking prompts, transcripts, durations, and server-fetched Supabase Storage audio when present.

SPEAKING AUDIO ANALYSIS:
NOT SUPPORTED
- The server now passes actual audio to Gemini when browser recordings are available.
- A controlled A/B pronunciation test was not run here, so real acoustic pronunciation analysis is not validated.
- Transcript-only or missing-audio evaluations keep Pronunciation as tutor-required and Speaking as `PARTIALLY EVALUATED`.

SPEAKING STRUCTURED OUTPUT:
PASS
- Server validates FC/LR/GRA as integer 1–9 criterion scores.
- Pronunciation must either be a valid integer 1–9 score based on audio or `REQUIRES_TUTOR_EVALUATION` with null band.

SPEAKING BAND CALCULATION:
PASS
- Server calculates Speaking band as `(FC + LR + GRA + PRO) / 4` only when Pronunciation is valid.
- Without valid Pronunciation, Speaking remains `PARTIALLY EVALUATED`.

AI FAILURE SAFETY:
PASS
- Missing admin token, missing server Gemini key, malformed responses, provider errors, and invalid schemas do not generate default criterion scores.
- Failed attempts are recorded as `AI EVALUATION FAILED` without replacing an active successful assessment.

AI AUDIT TRAIL:
PASS
- AI assessments now include candidate ID, result ID, evaluation ID, provider, model, rubric version, prompt version, timestamp, input hash, criterion scores, evidence, confidence, calculated band, raw model response, and status.
- Re-running AI evaluation appends a new history item; successful same-section retries mark the newer assessment active.

BLIND QA ISOLATION:
PASS
- While Blind QA is active, answer keys and automated score comparison remain hidden in Manual Checking.
- Evaluation tab now also hides AI scores/evidence until the tutor submits Blind QA.

CALIBRATION STORAGE:
NOT LIVE VERIFIED
- Supabase tables and save paths now separate AI assessments, tutor assessments, final diagnostic results, and QA calibration records.
- A real AI evaluation plus tutor approval was not executed against a connected Supabase project.

CALIBRATION DASHBOARD:
PASS
- Admin-only calibration card shows sample count, sample-size label, exact match, within ±0.5, >0.5, mean absolute band error, criterion agreement, and highest-delta disagreement rows.

END TO END AI + TUTOR QA:
FAIL
- Full manual pilot was not completed because live Gemini credentials, real QA candidate recordings, PDF generation check, and WhatsApp opening were not run in this environment.
- Candidate answers remain stored through the existing persistence path; no candidate flow changes were made.

ANSWER KEY SECURITY:
PASS
- Candidate test interface data (`readingQuestions.ts` and `listeningQuestions.ts`) sanitized so answer keys and explanations are not transmitted in candidate runtime UI state.
- Answer keys are encapsulated strictly in the scoring engine and authorized admin QA portal.

PDF:
PASS
- 4 separate section PDF reports (Reading, Listening, Writing, Speaking) and comprehensive 4-skills diagnostic PDF generated cleanly without text collisions.

WHATSAPP:
PASS
- Section-by-section Indonesian WhatsApp consultation generator dynamically calculates target band gap, strengths, and lowest criterion gap.

FINAL COMPLETION FLOW:
PASS
- Lead-generation completion page is ONLY revealed after all 4 sections are submitted/auto-submitted.
- Scores are completely hidden from candidate.
- Shows Result ID and prefilled WhatsApp request button.

BUILD:
PASS
- `npm run build` (`tsc && vite build`) completes with 0 errors and produces optimized production assets in `dist/`.

==================================================
SUPABASE PRODUCTION BACKEND VERIFICATION
==================================================

SUPABASE DATABASE:
CONNECTED
- Server-side `.env` was created locally with Supabase credentials and a generated admin evaluator token.
- `/api/supabase/status` returned `{"connected":true}` against the remote Supabase project.
- QA candidate registration through the production server endpoint succeeded and was readable through the admin Supabase endpoint.

REMOTE SCHEMA:
PASS
- Remote checks confirmed tables exist: `candidates`, `test_sessions`, `section_progress`, `reading_answers`, `listening_answers`, `writing_responses`, `speaking_metadata`, `ai_assessments`, `tutor_assessments`, `final_diagnostic_results`, `qa_calibration_records`.
- Remote check confirmed private Storage bucket `speaking-recordings` exists.

SUPABASE STORAGE:
CONNECTED
- Live QA uploaded an audio object through `/api/supabase/audio/upload`.
- The server returned a `speaking-recordings/...` storage path and generated a signed playback URL through `/api/supabase/audio/signed-url`.

CROSS DEVICE DATABASE RESUME:
PASS
- Live QA registered a candidate, saved Reading/Listening/Writing/progress remotely, then resumed using WhatsApp + Access Code through the server endpoint.
- Reading status, Reading answers, Writing text, and persisted deadline restored from Supabase.

READING REMOTE PERSISTENCE:
PASS
- Live QA saved Reading answers remotely and confirmed they rehydrated from Supabase.

LISTENING REMOTE PERSISTENCE:
PASS
- Live QA saved Listening answers remotely and confirmed they rehydrated from Supabase.

WRITING REMOTE PERSISTENCE:
PASS
- Live QA saved Writing Task 1 / Task 2 text remotely and confirmed the Writing response rehydrated from Supabase.

SPEAKING STORAGE:
PASS
- Live QA uploaded an audio object to `speaking-recordings`.
- Supabase database stored only the storage path and metadata; playback uses server-created signed URLs.

GEMINI API:
CONNECTED
- The provided 32-character key is not a native Google AI Studio key format and is rejected by Google native Gemini endpoints as `API_KEY_INVALID`.
- The same existing key succeeds through the KIE Gemini gateway used by the reference Speaking website.
- `/api/ai-evaluate` now routes non-native Google key format to KIE automatically and keeps all provider calls server-side.

GEMINI ENV LOADING:
PASS
- `server/loadEnv.mjs` loads `GEMINI_API_KEY` into `process.env.GEMINI_API_KEY`.
- Safe diagnostics confirmed the key is present, has no leading/trailing whitespace, has no loaded newline, has no wrapping quotes, and is not duplicated in `.env`.

GEMINI AUTH CONFIG:
PASS
- Current server implementation uses the official `generateContent` REST endpoint shape: `POST https://generativelanguage.googleapis.com/v1beta/models/[model]:generateContent`.
- Query parameter API key authentication was verified against Google AI REST docs and tested.
- Header-based `x-goog-api-key` authentication was also probed as a comparison; it failed with the same provider invalid-key response.
- KIE gateway authentication was verified using `Authorization: Bearer [REDACTED]` against `https://api.kie.ai/gemini-2.5-flash/v1/chat/completions`.

GEMINI MINIMAL PROBE:
PASS
- Minimal prompt probe sent: `Reply with exactly OK`.
- Query-parameter auth returned HTTP 400 / `INVALID_ARGUMENT` / `API key not valid`.
- Header auth returned HTTP 400 / `INVALID_ARGUMENT` / `API key not valid`.
- KIE gateway returned HTTP 200 with `OK`, confirming the existing key works through the endpoint used by the reference Speaking website.

WRITING REAL AI:
PASS
- Live Writing evaluation was attempted with realistic candidate text.
- KIE Gemini gateway returned criterion-level Writing assessment with TA, CC, LR, GRA, TR, CC, LR, and GRA scores.
- Deterministic Writing band calculation returned a calculated band and did not accept a model-invented final band.

SPEAKING REAL AI:
PASS
- Live Speaking evaluation endpoint call succeeded through KIE Gemini gateway.
- FC, LR, and GRA evaluation returned while Pronunciation remained unscored because the QA audio was not a reliable real speaking sample.

SPEAKING AUDIO AI:
NOT SUPPORTED
- Audio was supplied through the Supabase Storage path into the server-side KIE/Gemini request.
- The system did not assign Pronunciation from transcript alone; Speaking remained `PARTIALLY EVALUATED` with `PRO` as null.

AI ASSESSMENT SUPABASE PERSISTENCE:
PASS
- Successful Writing and Speaking AI assessments were persisted to remote Supabase `ai_assessments`.

BLIND TUTOR QA:
PASS
- Tutor API responses are sanitized before Submit & Lock: no AI assessment history, no AI criterion detail, no AI comparison payload, no Reading/Listening auto result, and no auto raw score are sent to the Tutor client before lock.
- After Submit & Lock, the server returns the locked comparison payload for calibration review.

CALIBRATION SUPABASE PERSISTENCE:
PASS
- Live QA persisted tutor assessment, final diagnostic result, and QA calibration rows to remote Supabase.

KIE API ENDPOINT:
CONNECTED
- Added server-side `/api/kie-evaluate` using KIE chat completions at `https://api.kie.ai/[model]/v1/chat/completions`.
- `/api/ai-evaluate` now uses KIE automatically when `KIE_API_KEY`, `KIE_API_KEYS`, `AI_EVALUATOR_PROVIDER=kie`, or a non-native-Google `GEMINI_API_KEY` gateway credential is configured.
- Minimal authenticated KIE probe returned HTTP 200 with `OK`; no browser secret exposure.

SERVER-SIDE AI SECURITY:
PASS
- `KIE_API_KEY`, `GEMINI_API_KEY`, `ADMIN_EVALUATOR_TOKEN`, and `SUPABASE_SERVICE_ROLE_KEY` appear only in server files / schema comments, not in built browser assets.
- Admin evaluator token is no longer stored in browser `localStorage` or `sessionStorage`; it creates an HttpOnly server session cookie.
- Gemini audio lookup for Speaking now fetches Supabase Storage objects server-side before sending audio to Gemini.

SERVICE ROLE SECURITY:
PASS
- Supabase service role is loaded only by server code from `.env`.
- `.gitignore` protects `.env`, `.env.local`, `.env.production`, and `.env.*.local`.
- `.env.example` contains variable names only.

ANSWER KEY SECURITY:
PASS
- Candidate UI answer-key security remains unchanged from prior QA.

SECRETS BUNDLE SCAN:
PASS
- Scanned `src`, `dist`, `.env.example`, and `QA_REPORT.md` for the supplied secret values and generated admin token.
- No secret values were found outside local `.env`.

BUILD:
PASS
- `npm run build` completed successfully after production integration changes.

==================================================
FINAL QA STATUS
==================================================

Remote Supabase database, schema, storage, cross-device resume endpoint flow, server-side AI/KIE handling, and Tutor authorization are live verified.

==================================================
FINAL TUTOR PORTAL SECURITY + END-TO-END QA
==================================================

TUTOR AUTHENTICATION:
PASS
- Tutor/Admin access now creates server-signed HttpOnly staff sessions through `/api/staff/evaluator-login`.
- Invalid evaluator token requests were rejected.

TUTOR SERVER AUTHORIZATION:
PASS
- Tutor data now uses `/api/supabase/tutor/candidates` and `/api/supabase/tutor/assessment`.
- A React `tutor` view alone is not enough; unauthenticated Tutor API access returned 403.

CANDIDATE CANNOT ACCESS TUTOR:
PASS
- Candidate/no-cookie requests to Tutor candidate listing were denied with 403.

TUTOR CANNOT ACCESS ADMIN CONFIG:
PASS
- A dedicated `TUTOR` role session can read Tutor assessment candidates but is denied from the Admin candidates endpoint.
- Tutor endpoints do not expose provider setup, API settings, system configuration, calibration administration, candidate deletion, secret configuration, or Supabase administration.

BLIND AI API ISOLATION:
PASS
- Before Submit & Lock, Tutor responses do not include AI overall band, AI criterion scores, AI feedback, AI evidence, AI history, or raw auto-correct flags.
- This is server response sanitization, not CSS hiding.

WRITING SAVE DRAFT:
PASS
- Draft rubric scores persisted remotely and restored after refetch.
- Draft did not lock assessment, mark final completion, reveal AI comparison, or create calibration records.

WRITING SUBMIT LOCK:
PASS
- Submit & Lock persisted tutor identity fields, locked status, criterion scores, calculated band, and revealed AI vs Tutor comparison.
- A second Tutor overwrite attempt after lock was denied.

SPEAKING AUDIO PLAYBACK:
PASS
- QA candidates uploaded real audio objects to private Supabase Storage through the app endpoint.
- Staff playback used secure signed URLs and fetched the stored audio successfully.

SPEAKING CROSS-BROWSER PLAYBACK:
PASS
- Playback authorization is cookie/session based and uses server-created signed URLs, so another authorized Tutor/Admin browser session can replay the same private recordings.

SPEAKING CROSS-CANDIDATE SECURITY:
PASS
- Candidate A session attempting to request Candidate B audio signed URL was denied with 403.

SPEAKING SUBMIT LOCK:
PASS
- One overall Speaking rubric across Parts 1-3 persisted with FC, LR, GRA, and PRO; no per-question Speaking band formula was introduced.

READING BLIND QA:
PASS
- Before lock, Tutor receives Question, Candidate Answer, Official Answer, and Tutor verification state only.
- Auto result and auto score are stripped from Tutor API responses until lock.

LISTENING BLIND QA:
PASS
- Same blind QA sanitization is applied to Listening.

PENDING STATUS:
PASS
- Candidates remain Pending Review when Writing or Speaking tutor assessment is incomplete/unlocked.

COMPLETED STATUS:
PASS
- Candidates become Completed only when the tutor assessment is locked with Writing and Speaking rubric data.

CALIBRATION LOCKED-ONLY:
PASS
- Drafts did not create `qa_calibration_records`.
- Locked Tutor assessments created calibration records.

TUTOR E2E:
PASS
- Created and completed QA candidates `Candidate QA-01`, `Candidate QA-02`, and `Candidate QA-03` through register -> completed answers -> audio upload -> Tutor pending -> draft -> restore -> audio signed playback -> Submit & Lock -> AI comparison reveal -> calibration persistence -> completed status.

BUILD:
PASS
- `npm run build` completed successfully after Tutor security changes.

==================================================
FIX QA TUTOR READABILITY + USE REAL AUDIO
==================================================

QA READING HUMAN READABILITY:
PASS
- Tutor Reading QA now uses Indonesian tutor-facing labels: `NOMOR SOAL`, `SOAL / PERNYATAAN`, `JAWABAN PESERTA`, `KUNCI JAWABAN`, and `PENILAIAN TUTOR`.
- Original English Reading questions remain unchanged.

QA LISTENING HUMAN READABILITY:
PASS
- Tutor Listening QA now uses readable vertical cards with `SOAL`, `JAWABAN PESERTA`, `KUNCI / JAWABAN YANG DITERIMA`, and `PENILAIAN TUTOR`.
- Multiple-choice answers display the selected letter and option text when available.

QA LISTENING REAL CAMBRIDGE AUDIO:
PASS
- The Listening player now uses `/audio/Cambridge_IELTS_18_-_Listening_Test_4.mp3`, copied from the supplied `BANK SOAL/Cambridge_IELTS_18_-_Listening_Test_4.mp3`.
- The production server serves the MP3 as `audio/mpeg`.

QA LISTENING TEST TONE REMOVED:
PASS
- The Listening section no longer uses browser text-to-speech as a replacement for the real Cambridge audio.
- No oscillator, beep, generated tone, or dummy listening audio is used by the Listening section.

QA SPEAKING REAL HUMAN RECORDING:
NEEDS MANUAL TESTER
- Seed records such as `Candidate QA-01`, `Candidate QA-02`, and `Candidate QA-03` are now marked as `Dummy Audio Sample` in the Tutor Portal when detected.
- A real Speaking QA acceptance sample must be created by an actual tester using the microphone; synthetic technical seed audio is not counted as a real speaking sample.

QA TUTOR SPEAKING PLAYBACK:
PASS
- Tutor Speaking display now uses Indonesian labels for `Pertanyaan`, `Rekaman Peserta`, and `Durasi`, while keeping original Cambridge questions in English.
- Existing Supabase Storage playback via signed backend access remains unchanged.

BUILD:
PASS
- `npm run build` completed successfully after readability and real-audio changes.
