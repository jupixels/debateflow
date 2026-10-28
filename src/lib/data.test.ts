import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { exportAll, exportBank, importAll, parseExport } from './data';
import { createArgument, createResolution, createRound, saveResponse } from './repo';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

async function seed() {
  const res = await createResolution('Res');
  const a = await createArgument(res.id, 'CON', 'Arg');
  await saveResponse({ argumentId: a.id, kind: 'NU', isCard: true, tag: 'Tag', cite: 'Smith 22', text: 'x', strength: 3 });
  await createRound({
    resolutionId: res.id,
    tournament: 't',
    roundName: 'r',
    ourSide: 'PRO',
    speakingOrder: 1,
    opponents: '',
    judge: '',
    judgeType: 'LAY',
    prepSeconds: 120,
  });
  return res;
}

describe('export / import', () => {
  it('round-trips everything and merges without duplicates', async () => {
    await seed();
    const json = JSON.stringify(await exportAll());
    await Promise.all(db.tables.map((t) => t.clear()));

    const file = parseExport(json);
    const result = await importAll(file);
    expect(result.counts).toMatchObject({ resolutions: 1, args: 1, responses: 1, rounds: 1, rows: 2 });
    await importAll(file);
    expect(await db.responses.count()).toBe(1);
    expect(await db.rows.count()).toBe(2);
  });

  it('bank export leaves rounds out', async () => {
    const res = await seed();
    const bank = await exportBank(res.id);
    expect(bank.responses).toHaveLength(1);
    expect(bank.rounds).toHaveLength(0);
  });

  it('rejects files that are not exports', () => {
    expect(() => parseExport('nope')).toThrow(/valid JSON/);
    expect(() => parseExport('{"foo":1}')).toThrow(/not a U Flow export/);
    expect(() => parseExport('{"app":"rebuttal-flow","version":99}')).toThrow(/newer version/);
    expect(() => parseExport('{"app":"rebuttal-flow","version":1,"responses":[{}]}')).toThrow(/malformed/);
  });
});
