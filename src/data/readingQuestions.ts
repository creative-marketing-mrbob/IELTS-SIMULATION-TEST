import { cambridgeOfficialTest } from './cambridgeTestBank';
import { ReadingPassage } from '../types/ielts';

const readingSection = cambridgeOfficialTest.sections.find(s => s.section_type === 'reading')!;

export const readingPassages: ReadingPassage[] = readingSection.parts.map(part => ({
  ...part,
  content: Array.isArray(part.content) ? part.content : [String(part.content)]
}));

// Sanitized question objects for candidate test view (Section 9: Answer Key Security)
export const readingQuestions = readingSection.parts.flatMap(part => 
  part.questions.map(q => ({
    id: q.question_number,
    passageId: part.id,
    type: q.question_type,
    question: q.prompt,
    options: q.options,
    instruction: q.instruction,
    question_number: q.question_number
  }))
);
