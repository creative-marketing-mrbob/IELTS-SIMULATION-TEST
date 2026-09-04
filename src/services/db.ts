// Supabase-backed persistence service for Mr.BOB IELTS Simulation Test.
// Browser storage is limited to the current opaque session reference.

import { StudentStatus, TargetBand, TestEvaluation } from '../types/ielts';

export type SectionType = 'reading' | 'listening' | 'writing' | 'speaking';
export type SectionState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'AUTO_SUBMITTED';
export type SubmissionType = 'MANUAL' | 'AUTO_TIMEOUT';

export interface DBCandidate {
  candidate_id: string;
  name: string;
  whatsapp: string;
  age: string;
  current_status: StudentStatus;
  target_band: TargetBand;
  result_id: string;
  access_code_hash: string;
  raw_access_code?: string;
  is_qa?: boolean;
  isQa?: boolean;
  created_at: string;
  last_access_at: string;
}

export interface DBSectionProgress {
  candidate_id: string;
  section_type: SectionType;
  status: SectionState;
  started_at?: string;
  deadline_at?: string;
  submitted_at?: string;
  submission_type?: SubmissionType;
}

export interface DBCandidateAnswers {
  candidate_id: string;
  reading: Record<number, string>;
  listening: Record<number, string>;
  reading_flagged: number[];
  listening_flagged: number[];
  writing: {
    task1: string;
    task2: string;
    word_count_task1: number;
    word_count_task2: number;
    saved_at: string;
  };
  speaking: {
    part1Audio?: string;
    part2Audio?: string;
    part3Audio?: string;
    part1Duration?: number;
    part2Duration?: number;
    part3Duration?: number;
    part1MimeType?: string;
    part2MimeType?: string;
    part3MimeType?: string;
    part1FileSize?: number;
    part2FileSize?: number;
    part3FileSize?: number;
    part1Transcript?: string;
    part2Transcript?: string;
    part3Transcript?: string;
    part1_q1_audio?: string;
    part1_q1_duration?: number;
    part1_q1_transcript?: string;
    part1_q1_mime_type?: string;
    part1_q1_file_size?: number;
    part1_q2_audio?: string;
    part1_q2_duration?: number;
    part1_q2_transcript?: string;
    part1_q2_mime_type?: string;
    part1_q2_file_size?: number;
    part2_audio?: string;
    part2_duration?: number;
    part2_transcript?: string;
    part2_mime_type?: string;
    part2_file_size?: number;
    part3_q1_audio?: string;
    part3_q1_duration?: number;
    part3_q1_transcript?: string;
    part3_q1_mime_type?: string;
    part3_q1_file_size?: number;
    part3_q2_audio?: string;
    part3_q2_duration?: number;
    part3_q2_transcript?: string;
    part3_q2_mime_type?: string;
    part3_q2_file_size?: number;
    saved_at?: string;
  };
}

export interface DBCandidateData {
  candidate: DBCandidate;
  progress: Record<SectionType, DBSectionProgress>;
  answers: DBCandidateAnswers;
  evaluation?: TestEvaluation;
}

export function normalizeWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `legacy_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

const CURRENT_SESSION_TOKEN_KEY = 'mrbob_ielts_curr_session_token_v4';

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const sessionToken = localStorage.getItem(CURRENT_SESSION_TOKEN_KEY);
  const response = await fetch(`/api/supabase${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'X-Session-Token': sessionToken } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Supabase API request failed (${response.status}).`);
  }
  return payload?.data ?? payload;
}

class DatabaseService {
  public async getBackendStatus(): Promise<{ connected: boolean }> {
    return api<{ connected: boolean }>('/status');
  }

  public async getAllCandidates(): Promise<Record<string, DBCandidateData>> {
    return api<Record<string, DBCandidateData>>('/candidates');
  }

  public async getTutorCandidates(): Promise<Record<string, DBCandidateData>> {
    return api<Record<string, DBCandidateData>>('/tutor/candidates');
  }

  public async getCandidateData(candidateId: string): Promise<DBCandidateData | null> {
    const all = await this.getAllCandidates();
    return all[candidateId] || null;
  }

  public async saveCandidateData(data: DBCandidateData): Promise<void> {
    await api('/candidates/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async registerCandidate(profile: {
    fullName: string;
    whatsapp: string;
    age: string;
    currentStatus: StudentStatus;
    targetScore: TargetBand;
    is_qa?: boolean;
    isQa?: boolean;
  }): Promise<{ candidate: DBCandidate; accessCode: string; sessionToken: string }> {
    const result = await api<{ candidate: DBCandidate; accessCode: string; sessionToken: string }>('/candidates/register', {
      method: 'POST',
      body: JSON.stringify(profile)
    });
    localStorage.setItem(CURRENT_SESSION_TOKEN_KEY, result.sessionToken);
    return result;
  }

  public async resumeCurrentSession(): Promise<DBCandidateData | null> {
    const sessionToken = localStorage.getItem(CURRENT_SESSION_TOKEN_KEY);
    if (!sessionToken) return null;
    const data = await api<DBCandidateData | null>('/session/resume-current', {
      method: 'POST',
      body: JSON.stringify({ sessionToken })
    });
    return data;
  }

  public async resumeWithAccessCode(
    whatsappInput: string,
    accessCodeInput: string
  ): Promise<{ success: boolean; data?: DBCandidateData; error?: string }> {
    try {
      const result = await fetch('/api/supabase/session/resume-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: whatsappInput, accessCode: accessCodeInput })
      });
      const payload = await result.json();
      if (!result.ok || !payload.success) {
        return { success: false, error: payload.error || 'Nomor WhatsApp atau Access Code tidak cocok.' };
      }
      if (payload.sessionToken) {
        localStorage.setItem(CURRENT_SESSION_TOKEN_KEY, payload.sessionToken);
      }
      return { success: true, data: payload.data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Supabase resume failed.' };
    }
  }

  public async clearCurrentSession(): Promise<void> {
    localStorage.removeItem(CURRENT_SESSION_TOKEN_KEY);
  }

  public async deleteSubmission(resultId: string): Promise<void> {
    await api('/candidates/delete', {
      method: 'POST',
      body: JSON.stringify({ resultId })
    });
  }

  public async saveTutorAssessment(resultId: string, updatedFields: Partial<TestEvaluation>): Promise<TestEvaluation> {
    return api<TestEvaluation>('/tutor/assessment', {
      method: 'POST',
      body: JSON.stringify({ resultId, updatedFields })
    });
  }

  public async triggerAutoAiEvaluation(
    resultId: string,
    section: 'writing' | 'speaking'
  ): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
    return api<{ success: boolean; skipped?: boolean; error?: string }>('/ai/auto-evaluate', {
      method: 'POST',
      body: JSON.stringify({ resultId, section })
    });
  }
}

export const dbService = new DatabaseService();
