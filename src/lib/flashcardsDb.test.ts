import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { exportAll, exportBank, importAll, parseExport } from './data';
import { createArgument, createResolution, deleteArgument, deleteResolution, deleteResponse, recordReview, saveResponse } from './repo';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

async function seed() {
  const res = await createResolution('Res');
  const a = await createArgument(res.id, 'CON', 'Arg');
  const r = await saveResponse({ argumentId: a.id, kind: 'NU', isCard: false, tag: 'NU', text: '', strength: 2 });
  return { res, a, r };
}

describe('flashcard storage', () => {
  it('records progress and moves the card up', async () => {
    const { r } = await seed();
    await recordReview(r.id, 'good', 1000);
    const second = await recordReview(r.id, 'good', 2000);
    expect(second).toMatchObject({ id: r.id, box: 2, reps: 2 });
    expect(await db.reviews.count()).toBe(1);
  });

  it('removes progress with its response, argument or resolution', async () => {
    const { res, a, r } = await seed();
    await recordReview(r.id, 'good');
    await deleteResponse(r.id);
    expect(await db.reviews.count()).toBe(0);

    const r2 = await saveResponse({ argumentId: a.id, kind: 'NU', isCard: false, tag: 'x', text: '', strength: 2 });
    await recordReview(r2.id, 'good');
    await deleteArgument(a.id);
    expect(await db.reviews.count()).toBe(0);

    const a3 = await createArgument(res.id, 'PRO', 'Other');
    const r3 = await saveResponse({ argumentId: a3.id, kind: 'NU', isCard: false, tag: 'y', text: '', strength: 2 });
    await recordReview(r3.id, 'easy');
    await deleteResolution(res.id);
    expect(await db.reviews.count()).toBe(0);
  });

  it('backs progress up, but leaves it out of a shared bank', async () => {
    const { r } = await seed();
    await recordReview(r.id, 'good');
    expect((await exportAll()).reviews).toHaveLength(1);
    expect((await exportBank()).reviews).toHaveLength(0);
  });

  it('still imports a backup made before flashcards existed', async () => {
    await seed();
    const old = { ...(await exportAll()), version: 3 } as Record<string, unknown>;
    delete old.reviews;
    await Promise.all(db.tables.map((t) => t.clear()));
    const result = await importAll(parseExport(JSON.stringify(old)));
    expect(result.counts.responses).toBe(1);
    expect(result.counts.reviews).toBe(0);
  });
});
