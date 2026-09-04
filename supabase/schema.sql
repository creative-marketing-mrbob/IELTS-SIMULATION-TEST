-- Supabase production schema for Mr.BOB IELTS Simulation Test.
-- Apply in Supabase SQL editor or via Supabase CLI before production use.

create extension if not exists pgcrypto;

create table if not exists public.candidates (
  candidate_id text primary key,
  name text not null,
  whatsapp text not null,
  age text not null,
  current_status text not null,
  target_band text not null,
  result_id text not null unique,
  access_code_hash text not null,
  is_qa boolean not null default false,
  created_at timestamptz not null default now(),
  last_access_at timestamptz not null default now()
);

alter table public.candidates add column if not exists is_qa boolean not null default false;

create table if not exists public.test_sessions (
  session_id uuid primary key default gen_random_uuid(),
  candidate_id text not null references public.candidates(candidate_id) on delete cascade,
  session_token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

create table if not exists public.section_progress (
  candidate_id text not null references public.candidates(candidate_id) on delete cascade,
  section_type text not null check (section_type in ('reading', 'listening', 'writing', 'speaking')),
  status text not null check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'AUTO_SUBMITTED')),
  started_at timestamptz,
  deadline_at timestamptz,
  submitted_at timestamptz,
  submission_type text check (submission_type in ('MANUAL', 'AUTO_TIMEOUT')),
  primary key (candidate_id, section_type)
);

create table if not exists public.reading_answers (
  candidate_id text not null references public.candidates(candidate_id) on delete cascade,
  result_id text,
  section text not null default 'reading',
  question_number integer not null,
  question_id text,
  candidate_answer text,
  answer text not null default '',
  flagged boolean not null default false,
  saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  is_qa boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (candidate_id, question_number)
);

alter table public.reading_answers add column if not exists result_id text;
alter table public.reading_answers add column if not exists section text not null default 'reading';
alter table public.reading_answers add column if not exists question_id text;
alter table public.reading_answers add column if not exists candidate_answer text;
alter table public.reading_answers add column if not exists saved_at timestamptz not null default now();
alter table public.reading_answers add column if not exists submitted_at timestamptz;
alter table public.reading_answers add column if not exists is_qa boolean not null default false;

create table if not exists public.listening_answers (
  candidate_id text not null references public.candidates(candidate_id) on delete cascade,
  result_id text,
  section text not null default 'listening',
  question_number integer not null,
  question_id text,
  candidate_answer text,
  answer text not null default '',
  flagged boolean not null default false,
  saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  is_qa boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (candidate_id, question_number)
);

alter table public.listening_answers add column if not exists result_id text;
alter table public.listening_answers add column if not exists section text not null default 'listening';
alter table public.listening_answers add column if not exists question_id text;
alter table public.listening_answers add column if not exists candidate_answer text;
alter table public.listening_answers add column if not exists saved_at timestamptz not null default now();
alter table public.listening_answers add column if not exists submitted_at timestamptz;
alter table public.listening_answers add column if not exists is_qa boolean not null default false;

create table if not exists public.writing_responses (
  candidate_id text primary key references public.candidates(candidate_id) on delete cascade,
  result_id text,
  is_qa boolean not null default false,
  task1 text not null default '',
  task2 text not null default '',
  word_count_task1 integer not null default 0,
  word_count_task2 integer not null default 0,
  saved_at timestamptz not null default now()
);

alter table public.writing_responses add column if not exists result_id text;
alter table public.writing_responses add column if not exists is_qa boolean not null default false;

create table if not exists public.speaking_metadata (
  candidate_id text not null references public.candidates(candidate_id) on delete cascade,
  result_id text,
  is_qa boolean not null default false,
  part integer not null check (part in (1, 2, 3)),
  question_id text not null,
  audio_storage_path text,
  duration integer,
  transcript text,
  saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  primary key (candidate_id, question_id)
);

alter table public.speaking_metadata drop column if exists audio_url;
alter table public.speaking_metadata add column if not exists result_id text;
alter table public.speaking_metadata add column if not exists is_qa boolean not null default false;
alter table public.speaking_metadata add column if not exists submitted_at timestamptz;
alter table public.speaking_metadata add column if not exists mime_type text;
alter table public.speaking_metadata add column if not exists file_size integer;
alter table public.speaking_metadata drop constraint if exists speaking_metadata_pkey;
alter table public.speaking_metadata add primary key (candidate_id, question_id);

create table if not exists public.ai_assessments (
  evaluation_id text primary key,
  candidate_id text not null references public.candidates(candidate_id) on delete cascade,
  result_id text not null,
  section text not null check (section in ('writing', 'speaking')),
  provider text not null,
  model_name text not null,
  model_version text not null,
  rubric_version text not null,
  prompt_version text,
  evaluation_timestamp timestamptz not null default now(),
  input_hash text,
  criterion_scores jsonb not null default '{}'::jsonb,
  criterion_evidence jsonb not null default '{}'::jsonb,
  confidence text not null,
  calculated_band jsonb,
  raw_model_response jsonb not null default '{}'::jsonb,
  status text not null,
  is_active boolean not null default false
);

create table if not exists public.tutor_assessments (
  result_id text primary key,
  candidate_id text not null references public.candidates(candidate_id) on delete cascade,
  assessment_json jsonb not null default '{}'::jsonb,
  tutor_overall_band numeric,
  evaluator_name text,
  checked_at timestamptz,
  is_approved boolean not null default false
);

create table if not exists public.final_diagnostic_results (
  result_id text primary key,
  candidate_id text not null references public.candidates(candidate_id) on delete cascade,
  completed_at timestamptz,
  overall_band jsonb,
  status text not null default 'Pending Evaluation',
  evaluation_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.qa_calibration_records (
  result_id text primary key,
  candidate_id text not null references public.candidates(candidate_id) on delete cascade,
  writing_ai_band numeric,
  writing_tutor_band numeric,
  speaking_ai_band numeric,
  speaking_tutor_band numeric,
  calibration_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('speaking-recordings', 'speaking-recordings', false)
on conflict (id) do nothing;

alter table public.candidates enable row level security;
alter table public.test_sessions enable row level security;
alter table public.section_progress enable row level security;
alter table public.reading_answers enable row level security;
alter table public.listening_answers enable row level security;
alter table public.writing_responses enable row level security;
alter table public.speaking_metadata enable row level security;
alter table public.ai_assessments enable row level security;
alter table public.tutor_assessments enable row level security;
alter table public.final_diagnostic_results enable row level security;
alter table public.qa_calibration_records enable row level security;

-- No anon/authenticated broad access policies are created here.
-- Production access goes through the secure backend using SUPABASE_SERVICE_ROLE_KEY.
-- The service role bypasses RLS; browser clients must never receive it.

drop policy if exists "No browser reads candidates" on public.candidates;
create policy "No browser reads candidates" on public.candidates for select using (false);

drop policy if exists "No browser writes candidates" on public.candidates;
create policy "No browser writes candidates" on public.candidates for all using (false) with check (false);

drop policy if exists "No browser reads test_sessions" on public.test_sessions;
create policy "No browser reads test_sessions" on public.test_sessions for select using (false);

drop policy if exists "No browser writes test_sessions" on public.test_sessions;
create policy "No browser writes test_sessions" on public.test_sessions for all using (false) with check (false);

drop policy if exists "No browser reads section_progress" on public.section_progress;
create policy "No browser reads section_progress" on public.section_progress for select using (false);

drop policy if exists "No browser writes section_progress" on public.section_progress;
create policy "No browser writes section_progress" on public.section_progress for all using (false) with check (false);

drop policy if exists "No browser reads reading_answers" on public.reading_answers;
create policy "No browser reads reading_answers" on public.reading_answers for select using (false);

drop policy if exists "No browser writes reading_answers" on public.reading_answers;
create policy "No browser writes reading_answers" on public.reading_answers for all using (false) with check (false);

drop policy if exists "No browser reads listening_answers" on public.listening_answers;
create policy "No browser reads listening_answers" on public.listening_answers for select using (false);

drop policy if exists "No browser writes listening_answers" on public.listening_answers;
create policy "No browser writes listening_answers" on public.listening_answers for all using (false) with check (false);

drop policy if exists "No browser reads writing_responses" on public.writing_responses;
create policy "No browser reads writing_responses" on public.writing_responses for select using (false);

drop policy if exists "No browser writes writing_responses" on public.writing_responses;
create policy "No browser writes writing_responses" on public.writing_responses for all using (false) with check (false);

drop policy if exists "No browser reads speaking_metadata" on public.speaking_metadata;
create policy "No browser reads speaking_metadata" on public.speaking_metadata for select using (false);

drop policy if exists "No browser writes speaking_metadata" on public.speaking_metadata;
create policy "No browser writes speaking_metadata" on public.speaking_metadata for all using (false) with check (false);

drop policy if exists "No browser reads ai_assessments" on public.ai_assessments;
create policy "No browser reads ai_assessments" on public.ai_assessments for select using (false);

drop policy if exists "No browser writes ai_assessments" on public.ai_assessments;
create policy "No browser writes ai_assessments" on public.ai_assessments for all using (false) with check (false);

drop policy if exists "No browser reads tutor_assessments" on public.tutor_assessments;
create policy "No browser reads tutor_assessments" on public.tutor_assessments for select using (false);

drop policy if exists "No browser writes tutor_assessments" on public.tutor_assessments;
create policy "No browser writes tutor_assessments" on public.tutor_assessments for all using (false) with check (false);

drop policy if exists "No browser reads final_diagnostic_results" on public.final_diagnostic_results;
create policy "No browser reads final_diagnostic_results" on public.final_diagnostic_results for select using (false);

drop policy if exists "No browser writes final_diagnostic_results" on public.final_diagnostic_results;
create policy "No browser writes final_diagnostic_results" on public.final_diagnostic_results for all using (false) with check (false);

drop policy if exists "No browser reads qa_calibration_records" on public.qa_calibration_records;
create policy "No browser reads qa_calibration_records" on public.qa_calibration_records for select using (false);

drop policy if exists "No browser writes qa_calibration_records" on public.qa_calibration_records;
create policy "No browser writes qa_calibration_records" on public.qa_calibration_records for all using (false) with check (false);
