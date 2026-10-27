import { Download, Laptop, Moon, MonitorSmartphone, RotateCcw, Sun, Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { downloadJson, exportAll, exportBank, importAll, parseExport } from '../lib/data';
import { isIos, promptInstall, useInstall } from '../lib/install';
import { ACCENT_PRESETS, accentCss } from '../lib/theme';
import { DEFAULT_ACCENT, type ThemeMode, toast, useApp } from '../store';
import { ColorWheel } from './ColorWheel';

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Laptop },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const { prompt, installed } = useInstall();
  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const onImport = async (f: File) => {
    try {
      const { counts } = await importAll(parseExport(await f.text()));
      toast(`Imported ${counts.responses} responses, ${counts.args} arguments and ${counts.rounds} rounds.`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed.', 'error');
    }
  };

  return (
    <div className="animate-fade fixed inset-0 z-50 bg-black/30" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-label="Settings"
        className="animate-slide absolute top-0 right-0 flex h-full w-[23rem] max-w-full flex-col border-l border-line bg-surface shadow-pop"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-center border-b border-line px-5 py-3.5">
          <h2 className="flex-1 font-semibold">Settings</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close settings">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 space-y-7 overflow-auto px-5 py-5">
          <section>
            <h3 className="eyebrow mb-2.5">Appearance</h3>
            <div className="seg w-full">
              {MODES.map(({ id, label, icon: Icon }) => (
                <button key={id} aria-pressed={s.themeMode === id} onClick={() => s.setThemeMode(id)}>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon size={14} /> {label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-start gap-4">
              <ColorWheel value={s.accent} onChange={s.setAccent} size={150} />
              <div className="min-w-0 flex-1">
                <div className="label">Theme color</div>
                <div className="grid grid-cols-4 gap-2">
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      title={p.name}
                      aria-label={`${p.name} theme`}
                      onClick={() => s.setAccent(p.accent)}
                      className={`size-7 rounded-full shadow-card ring-offset-2 ring-offset-surface transition-transform hover:scale-110 ${
                        p.accent.h === s.accent.h && p.accent.c === s.accent.c ? 'ring-2 ring-fg' : ''
                      }`}
                      style={{ background: accentCss(p.accent) }}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">Drag on the wheel: around the edge changes the color, toward the center makes it softer.</p>
                <button className="btn btn-ghost btn-sm mt-1 -ml-2" onClick={() => s.setAccent(DEFAULT_ACCENT)}>
                  <RotateCcw size={12} /> Default
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="eyebrow mb-2.5">Side names</h3>
            <div className="seg w-full">
              <button aria-pressed={s.sideLabels === 'procon'} onClick={() => s.setSideLabels('procon')}>
                Pro / Con
              </button>
              <button aria-pressed={s.sideLabels === 'affneg'} onClick={() => s.setSideLabels('affneg')}>
                Aff / Neg
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Changes the wording everywhere, including speech names (PC → AC, CFF → NFF). Your saved data isn’t changed.
            </p>
          </section>

          <section>
            <h3 className="eyebrow mb-2.5">Flow</h3>
            <label className="label flex justify-between" htmlFor="fontSize">
              <span>Text size</span>
              <span className="font-mono text-fg">{s.flowFontSize}px</span>
            </label>
            <input
              id="fontSize"
              type="range"
              min={11}
              max={22}
              value={s.flowFontSize}
              onChange={(e) => s.setFlowFontSize(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                Open crossfire panel automatically
                <span className="block text-xs text-muted">When the timer moves to a crossfire</span>
              </span>
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={s.cxAuto} onChange={(e) => s.setCxAuto(e.target.checked)} />
            </label>
            <button
              className="btn mt-4 w-full"
              onClick={() => {
                s.resetColWidths();
                toast('Column widths reset.');
              }}
            >
              <RotateCcw size={14} /> Reset column widths
            </button>
          </section>

          <section>
            <h3 className="eyebrow mb-2.5">Your data</h3>
            <p className="mb-3 text-xs text-muted">
              Everything is saved on this device. Export a backup regularly, and share your bank with a partner by sending them the bank file.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn" onClick={async () => downloadJson(await exportAll(), `rebuttal-flow-backup-${today}.json`)}>
                <Download size={14} /> Backup all
              </button>
              <button className="btn" onClick={async () => downloadJson(await exportBank(), `rebuttal-flow-bank-${today}.json`)}>
                <Download size={14} /> Bank only
              </button>
              <button className="btn col-span-2" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Import a file…
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = '';
              }}
            />
          </section>

          <section>
            <h3 className="eyebrow mb-2.5">Install</h3>
            {installed ? (
              <p className="text-sm text-muted">Running as an installed app. It works offline.</p>
            ) : prompt ? (
              <button className="btn btn-primary w-full" onClick={promptInstall}>
                <MonitorSmartphone size={15} /> Install Rebuttal Flow
              </button>
            ) : isIos() ? (
              <p className="text-sm text-muted">In Safari, tap Share, then <b>Add to Home Screen</b>.</p>
            ) : (
              <p className="text-sm text-muted">
                Use your browser’s install button (the icon at the right end of the address bar in Chrome or Edge), or the menu’s{' '}
                <b>Install app</b> option. Once installed it opens in its own window and works offline.
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
