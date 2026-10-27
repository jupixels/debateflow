import { useState } from 'react';
import { parseCard } from '../lib/cardParser';
import { saveResponse } from '../lib/repo';
import { type BankResponse, KIND_NAMES, RESPONSE_KINDS, type ResponseKind } from '../types';

interface Props {
  argumentId: string;
  initial?: Partial<BankResponse>;
  onDone: (saved?: BankResponse) => void;
}

export function ResponseEditor({ argumentId, initial, onDone }: Props) {
  const [kind, setKind] = useState<ResponseKind>(initial?.kind ?? 'NU');
  const [isCard, setIsCard] = useState(initial?.isCard ?? false);
  const [tag, setTag] = useState(initial?.tag ?? '');
  const [cite, setCite] = useState(initial?.cite ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [strength, setStrength] = useState<1 | 2 | 3>(initial?.strength ?? 2);
  const [paste, setPaste] = useState('');

  const applyPaste = (raw: string) => {
    const p = parseCard(raw);
    setTag(p.tag);
    setCite(p.cite ?? '');
    setUrl(p.url ?? '');
    setText(p.text);
    setIsCard(p.isCard);
    setPaste('');
  };

  const save = async () => {
    if (!tag.trim()) return;
    const saved = await saveResponse({
      ...(initial?.id ? { id: initial.id, createdAt: initial.createdAt, timesUsed: initial.timesUsed } : {}),
      argumentId: initial?.argumentId ?? argumentId,
      kind,
      isCard,
      tag,
      cite: cite.trim() || undefined,
      url: url.trim() || undefined,
      text,
      strength,
    });
    onDone(saved);
  };

  return (
    <form
      className="mb-3 space-y-2 rounded-md border border-sky-300 bg-sky-50/50 p-3 dark:border-sky-800 dark:bg-sky-950/30"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone();
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          save();
        }
      }}
    >
      {!initial?.id && (
        <div>
          <label className="label" htmlFor="paste">
            Paste a card (tag, cite, text) to auto-fill
          </label>
          <textarea
            id="paste"
            className="input h-16 font-mono text-xs"
            placeholder={'Tariffs don’t cause inflation\nSmith 23, Prof. of Econ at MIT, https://…\nThe evidence shows…'}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              applyPaste(e.clipboardData.getData('text'));
            }}
          />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <label className="label" htmlFor="tag">
            Tag
          </label>
          <input id="tag" autoFocus className="input" value={tag} onChange={(e) => setTag(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="kind">
            Type
          </label>
          <select id="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as ResponseKind)}>
            {RESPONSE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_NAMES[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="strength">
            Strength
          </label>
          <select
            id="strength"
            className="input"
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value) as 1 | 2 | 3)}
          >
            <option value={3}>★★★ go-to</option>
            <option value={2}>★★ solid</option>
            <option value={1}>★ backup</option>
          </select>
        </div>
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={!isCard} onChange={() => setIsCard(false)} /> Analytic
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={isCard} onChange={() => setIsCard(true)} /> Card
        </label>
      </div>
      {isCard && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cite">
              Cite
            </label>
            <input id="cite" className="input" value={cite} onChange={(e) => setCite(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="url">
              URL
            </label>
            <input id="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="text">
          {isCard ? 'Card text' : 'Analysis'}
        </label>
        <textarea id="text" className="input h-28" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={() => onDone()}>
          Cancel
        </button>
        <button className="btn btn-primary">
          Save <kbd>Ctrl+Enter</kbd>
        </button>
      </div>
    </form>
  );
}
