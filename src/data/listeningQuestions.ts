import { cambridgeOfficialTest } from './cambridgeTestBank';
import { ListeningSectionData } from '../types/ielts';

const listeningSection = cambridgeOfficialTest.sections.find(s => s.section_type === 'listening')!;

export const listeningSections: ListeningSectionData[] = listeningSection.parts.map(part => ({
  ...part,
  context: part.subtitle || '',
  audioDurationSeconds: part.media?.audioDurationSeconds || 60,
  transcript: part.media?.transcript || '',
  speakerPrompt: part.media?.speakerPrompt || ''
}));

// Sanitized question objects for candidate test view (Section 9: Answer Key Security)
export const listeningQuestions = listeningSection.parts.flatMap(part => 
  part.questions.map(q => ({
    id: q.question_number,
    sectionId: part.id,
    type: q.question_type,
    question: q.prompt,
    options: q.options,
    instruction: q.instruction,
    question_number: q.question_number
  }))
);
