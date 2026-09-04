export type SectionType = 'reading' | 'listening' | 'writing' | 'speaking';

export type QuestionType = 
  | 'multiple-choice' 
  | 'true-false-not-given' 
  | 'sentence-completion' 
  | 'summary-completion' 
  | 'matching' 
  | 'cue-card' 
  | 'essay';

export interface QuestionOption {
  label: string; // 'A', 'B', 'C', 'D', 'TRUE', 'FALSE', 'NOT GIVEN', etc.
  text: string;
}

export interface IELTSQuestion {
  question_number: number;
  question_type: QuestionType;
  instruction?: string;
  prompt: string;
  options?: QuestionOption[];
  correct_answer: string;
  acceptable_answers?: string[];
  case_sensitive?: boolean;
  max_answers?: number;
  order: number;
  explanation?: string;
}

export interface IELTSPassageOrPart {
  id: number;
  title: string;
  subtitle?: string;
  content?: string[] | string;
  media?: {
    audio_url?: string;
    transcript?: string;
    audioDurationSeconds?: number;
    speakerPrompt?: string;
    chart_url?: string;
    chart_type?: 'bar' | 'pie' | 'line' | 'table';
    chart_data_desc?: string;
  };
  order: number;
  questions: IELTSQuestion[];
}

export interface IELTSSection {
  section_id: string;
  section_type: SectionType;
  order: number;
  title: string;
  instructions: string;
  time_limit_minutes: number;
  parts: IELTSPassageOrPart[];
}

export interface IELTSTest {
  test_id: string;
  title: string;
  type: 'Academic' | 'General Training';
  version: string;
  sections: IELTSSection[];
}

// Band conversion rule for objective sections (Reading & Listening)
export interface BandConversionRule {
  minScore: number;
  maxScore: number;
  band: number;
}

export interface BandConversionTable {
  reading: BandConversionRule[];
  listening: BandConversionRule[];
}
