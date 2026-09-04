import { cambridgeOfficialTest } from './cambridgeTestBank';
import { SpeakingTaskData } from '../types/ielts';

const speakingSection = cambridgeOfficialTest.sections.find(s => s.section_type === 'speaking')!;

export const speakingTasks: SpeakingTaskData[] = speakingSection.parts.map(part => ({
  ...part,
  partId: (part.id === 1 ? 1 : part.id === 2 ? 2 : 3) as 1 | 2 | 3,
  instructions: part.subtitle || part.title,
  bulletPoints: Array.isArray(part.content) ? part.content : typeof part.content === 'string' ? part.content.split('\n') : [],
  recordTimeSeconds: part.media?.audioDurationSeconds || 120
}));
