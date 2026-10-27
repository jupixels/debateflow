import Fuse from 'fuse.js';
import type { Argument, BankResponse } from '../types';

export interface SearchHit {
  response: BankResponse;
  argument?: Argument;
  score: number;
}

interface Doc {
  response: BankResponse;
  argument?: Argument;
  argTitle: string;
}

/**
 * Fuzzy search over bank responses. Responses linked to `preferArgumentId`
 * are ranked ahead of equally good matches elsewhere, and are the default
 * list when the query is empty.
 */
export function searchResponses(
  responses: BankResponse[],
  args: Argument[],
  query: string,
  preferArgumentId?: string,
  limit = 12,
): SearchHit[] {
  const byId = new Map(args.map((a) => [a.id, a]));
  const docs: Doc[] = responses.map((r) => {
    const argument = byId.get(r.argumentId);
    return { response: r, argument, argTitle: argument?.title ?? '' };
  });
  const q = query.trim();
  let hits: SearchHit[];
  if (!q) {
    hits = docs
      .filter((d) => !preferArgumentId || d.response.argumentId === preferArgumentId)
      .map((d) => ({ response: d.response, argument: d.argument, score: 0 }))
      .sort((a, b) => b.response.strength - a.response.strength || b.response.timesUsed - a.response.timesUsed);
  } else {
    const fuse = new Fuse(docs, {
      includeScore: true,
      ignoreLocation: true,
      threshold: 0.4,
      keys: [
        { name: 'response.tag', weight: 3 },
        { name: 'argTitle', weight: 2 },
        { name: 'response.cite', weight: 1 },
        { name: 'response.text', weight: 1 },
      ],
    });
    hits = fuse
      .search(q)
      .map((r) => ({
        response: r.item.response,
        argument: r.item.argument,
        score: (r.score ?? 1) - (r.item.response.argumentId === preferArgumentId ? 0.25 : 0),
      }))
      .sort((a, b) => a.score - b.score);
  }
  return hits.slice(0, limit);
}
