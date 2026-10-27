import { describe, expect, it } from 'vitest';
import { parseCard } from './cardParser';

describe('parseCard', () => {
  it('splits tag, cite, url and text', () => {
    const p = parseCard(
      'Tariffs do not raise prices\nSmith 23, Professor of Economics at MIT, https://example.com/paper\nThe evidence shows...\nMore text.',
    );
    expect(p).toEqual({
      tag: 'Tariffs do not raise prices',
      cite: 'Smith 23, Professor of Economics at MIT, https://example.com/paper',
      url: 'https://example.com/paper',
      text: 'The evidence shows...\nMore text.',
      isCard: true,
    });
  });

  it('handles blank lines and CRLF', () => {
    const p = parseCard('\r\n  Tag here \r\n\r\nJones 2021 [Brookings]\r\nBody');
    expect(p.tag).toBe('Tag here');
    expect(p.cite).toBe('Jones 2021 [Brookings]');
    expect(p.text).toBe('Body');
    expect(p.isCard).toBe(true);
  });

  it('treats text without a cite line as an analytic', () => {
    const p = parseCard('Their link is non-unique\nThe status quo already does this.');
    expect(p.isCard).toBe(false);
    expect(p.tag).toBe('Their link is non-unique');
    expect(p.text).toBe('The status quo already does this.');
  });

  it('uses the first sentence as tag for a single paragraph', () => {
    const p = parseCard('No warrant for their impact. They never explain why it escalates.');
    expect(p.tag).toBe('No warrant for their impact.');
    expect(p.text).toBe('No warrant for their impact. They never explain why it escalates.');
  });

  it('returns empty for blank input', () => {
    expect(parseCard('  \n ')).toEqual({ tag: '', text: '', isCard: false });
  });
});
