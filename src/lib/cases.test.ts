import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import {
  addSection,
  createCase,
  createQuestion,
  createResolution,
  createRound,
  deleteCase,
  deleteSection,
  duplicateCase,
  moveSection,
  saveResponse,
  sectionsOf,
  updateSection,
} from './repo';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

async function setup() {
  const res = await createResolution('Res');
  const c = await createCase(res.id, 'PRO', 'Main case');
  return { res, c };
}

describe('cases', () => {
  it('starts with an intro and a contention backed by an own-case bank argument', async () => {
    const { c } = await setup();
    const sections = await sectionsOf(c.id);
    expect(sections.map((s) => s.type)).toEqual(['text', 'contention']);
    const arg = await db.args.get(sections[1].argumentId!);
    expect(arg).toMatchObject({ side: 'PRO', caseId: c.id, title: 'Contention 1' });
  });

  it('keeps the argument title in sync and reorders sections', async () => {
    const { c } = await setup();
    const added = await addSection(c.id, 'contention');
    expect(added.title).toBe('Contention 2');
    await updateSection(added.id, { title: 'C2: Jobs' });
    expect((await db.args.get(added.argumentId!))?.title).toBe('C2: Jobs');
    await moveSection(added.id, -1);
    expect((await sectionsOf(c.id)).map((s) => s.title)).toEqual(['Intro', 'C2: Jobs', 'Contention 1']);
  });

  it('shares prep between duplicates and only deletes it when no case uses it', async () => {
    const { c } = await setup();
    const contention = (await sectionsOf(c.id))[1];
    await saveResponse({ argumentId: contention.argumentId!, kind: 'OTHER', isCard: false, tag: 'FL', text: '', strength: 2, against: 'Their NU' });
    await createQuestion(contention.argumentId!, 'Q?');
    const copy = (await duplicateCase(c.id, 'Lay version'))!;
    expect((await sectionsOf(copy.id))[1].argumentId).toBe(contention.argumentId);

    await deleteCase(c.id);
    expect(await db.responses.count()).toBe(1);
    await deleteSection((await sectionsOf(copy.id))[1].id);
    expect(await db.responses.count()).toBe(0);
    expect(await db.questions.count()).toBe(0);
    expect(await db.args.count()).toBe(0);
  });

  it('seeds the our-case sheet from the case when a round starts', async () => {
    const { res, c } = await setup();
    await addSection(c.id, 'contention');
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
      caseId: c.id,
    });
    const rows = await db.rows.where({ roundId: round.id, sheet: 'PRO' }).sortBy('order');
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.argumentId)).toBe(true);
    const cells = await db.cells.where('roundId').equals(round.id).toArray();
    expect(cells.map((x) => [x.speech, x.text]).sort()).toEqual([
      ['PC', 'Contention 1'],
      ['PC', 'Contention 2'],
    ]);
    // Their sheet still starts with one empty row.
    expect(await db.rows.where({ roundId: round.id, sheet: 'CON' }).count()).toBe(1);
  });
});
