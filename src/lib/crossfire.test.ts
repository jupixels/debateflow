import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { exportBank, importAll } from './data';
import {
  addCxEntry,
  createArgument,
  createQuestion,
  createResolution,
  createRound,
  deleteArgument,
  deleteRound,
  formatConcession,
} from './repo';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('crossfire data', () => {
  it('deletes prepared questions with their argument and the log with its round', async () => {
    const res = await createResolution('Res');
    const a = await createArgument(res.id, 'CON', 'Arg');
    await createQuestion(a.id, 'Why?');
    const round = await createRound({
      resolutionId: res.id,
      tournament: '',
      roundName: '',
      ourSide: 'PRO',
      speakingOrder: 1,
      opponents: '',
      judge: '',
      judgeType: 'FLOW',
      prepSeconds: 180,
    });
    await addCxEntry({ roundId: round.id, segment: 'CF1', asker: 'PRO', question: 'Q', answer: 'A', concession: true });

    await deleteArgument(a.id);
    expect(await db.questions.count()).toBe(0);
    await deleteRound(round.id);
    expect(await db.cx.count()).toBe(0);
  });

  it('includes questions in a bank export', async () => {
    const res = await createResolution('Res');
    const a = await createArgument(res.id, 'CON', 'Arg');
    await createQuestion(a.id, 'Why?');
    const file = await exportBank();
    expect(file.questions).toHaveLength(1);
    await db.questions.clear();
    await importAll(file);
    expect((await db.questions.toArray())[0].text).toBe('Why?');
  });

  it('formats a concession from its answer, falling back to the question', () => {
    const base = { id: '1', roundId: 'r', asker: 'PRO' as const, concession: true, createdAt: 0 };
    expect(formatConcession({ ...base, segment: 'CF2', question: 'Q?', answer: 'Yes, no warrant' })).toBe('[CX CF2] Yes, no warrant');
    expect(formatConcession({ ...base, segment: 'GCF', question: 'They conceded X', answer: '' })).toBe('[CX GCF] They conceded X');
  });
});
