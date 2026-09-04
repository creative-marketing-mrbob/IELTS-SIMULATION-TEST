import { cambridgeOfficialTest } from './cambridgeTestBank';
import { WritingTaskData } from '../types/ielts';

const writingSection = cambridgeOfficialTest.sections.find(s => s.section_type === 'writing')!;

export const writingTasks: WritingTaskData[] = writingSection.parts.map(part => ({
  ...part,
  taskId: (part.id === 1 ? 1 : 2) as 1 | 2,
  prompt: typeof part.content === 'string' ? part.content : part.content?.join('\n\n') || '',
  chartType: part.media?.chart_type,
  chartDataDesc: part.media?.chart_data_desc,
  minWords: part.id === 1 ? 150 : 250,
  recommendedMinutes: part.id === 1 ? 20 : 40,
  criteriaTips: [
    part.id === 1 ? "Task Achievement: Present clear overview and key metal trends." : "Task Response: Address both sides of the ageing population debate.",
    "Coherence & Cohesion: Structure logically with smooth transitions.",
    "Lexical Resource: Employ precise academic vocabulary and collocations.",
    "Grammatical Range & Accuracy: Form varied complex and compound sentence structures."
  ]
}));
