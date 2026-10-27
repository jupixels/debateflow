export interface ParsedCard {
  tag: string;
  cite?: string;
  url?: string;
  text: string;
  isCard: boolean;
}

const URL_RE = /https?:\/\/[^\s)\]]+/i;
const YEAR_RE = /\b(19|20)\d{2}\b|['’]\d{2}\b/;

/** A line looks like a cite if it is short and has a year or URL, e.g. "Smith 22, Professor at MIT". */
export function looksLikeCite(line: string): boolean {
  if (line.length > 300) return false;
  return URL_RE.test(line) || YEAR_RE.test(line);
}

/**
 * Split a pasted card into tag / cite / body text.
 * Format expected (as in most PF/policy files):
 *   Tag line
 *   Author Year, qualifications, source, URL
 *   Card text ...
 * If no cite line is found, the paste is treated as an analytic.
 */
export function parseCard(raw: string): ParsedCard {
  const lines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  if (!lines.length) return { tag: '', text: '', isCard: false };

  const tag = lines[0];
  const rest = lines.slice(1);
  while (rest.length && !rest[0]) rest.shift();

  if (rest.length && looksLikeCite(rest[0]) && rest.length > 1) {
    const cite = rest[0];
    const url = cite.match(URL_RE)?.[0] ?? findUrl(rest.slice(1));
    const text = rest.slice(1).join('\n').trim();
    return { tag, cite, url, text, isCard: true };
  }

  // Single block of text with no separate tag line: use first sentence as tag.
  if (!rest.length) {
    return { tag: firstSentence(tag), text: tag, isCard: false };
  }
  return { tag, text: rest.join('\n').trim(), isCard: false };
}

function findUrl(lines: string[]): string | undefined {
  for (const l of lines) {
    const m = l.match(URL_RE);
    if (m) return m[0];
  }
  return undefined;
}

function firstSentence(s: string): string {
  const m = s.match(/^(.{1,120}?[.!?])(\s|$)/);
  return m ? m[1] : s.slice(0, 120);
}
