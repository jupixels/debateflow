import { describe, expect, it } from 'vitest';
import type { Argument, BankResponse } from '../types';
import { searchResponses } from './search';

const arg = (id: string, title: string): Argument => ({ id, resolutionId: 'r', side: 'PRO', title, createdAt: 0 });
const resp = (id: string, argumentId: string, tag: string, extra: Partial<BankResponse> = {}): BankResponse => ({
  id,
  argumentId,
  kind: 'NU',
  isCard: false,
  tag,
  text: '',
  strength: 2,
  timesUsed: 0,
  createdAt: 0,
  ...extra,
});

const args = [arg('a1', 'Economy'), arg('a2', 'Climate')];
const responses = [
  resp('r1', 'a1', 'Tariffs already high', { strength: 1 }),
  resp('r2', 'a1', 'Jobs are non-unique', { strength: 3 }),
  resp('r3', 'a2', 'Emissions tariffs backfire'),
];

describe('searchResponses', () => {
  it('lists the linked argument’s responses, strongest first, for an empty query', () => {
    expect(searchResponses(responses, args, '', 'a1').map((h) => h.response.id)).toEqual(['r2', 'r1']);
  });

  it('fuzzy matches tags across the bank', () => {
    const ids = searchResponses(responses, args, 'tarifs').map((h) => h.response.id);
    expect(ids).toContain('r1');
    expect(ids).toContain('r3');
  });

  it('ranks responses to the linked argument first', () => {
    expect(searchResponses(responses, args, 'tariffs', 'a2')[0].response.id).toBe('r3');
    expect(searchResponses(responses, args, 'tariffs', 'a1')[0].response.id).toBe('r1');
  });

  it('matches by argument title', () => {
    expect(searchResponses(responses, args, 'climate').map((h) => h.response.id)).toEqual(['r3']);
  });
});
