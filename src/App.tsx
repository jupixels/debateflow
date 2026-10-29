import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AppHeader } from './components/AppHeader';
import { BankView } from './components/BankView';
import { CaseView } from './components/CaseView';
import { PracticeView } from './components/PracticeView';
import { FlowView } from './components/FlowView';
import { RoundsView } from './components/RoundsView';
import { SettingsPanel } from './components/SettingsPanel';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { ConfirmDialog, Toaster } from './components/ui';
import { applyTheme } from './lib/theme';
import { isRunning } from './lib/timer';
import { shouldAutoUpdate } from './lib/update';
import { useApp } from './store';

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable="true"]');

export default function App() {
  const { view, themeMode, accent, flowFontSize } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    applyTheme(themeMode, accent, flowFontSize);
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(themeMode, accent, flowFontSize);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeMode, accent, flowFontSize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !isTyping(e.target) && !document.querySelector('[role="dialog"]')) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <AppHeader onSettings={() => setSettingsOpen(true)} onShortcuts={() => setShortcutsOpen(true)} />
      <main className="min-h-0 flex-1">
        {view === 'bank' && <BankView />}
        {view === 'case' && <CaseView />}
        {view === 'practice' && <PracticeView />}
        {view === 'rounds' && <RoundsView />}
        {view === 'flow' && <FlowView onShortcuts={() => setShortcutsOpen(true)} />}
      </main>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      <ConfirmDialog />
      <Toaster />
      <UpdateBanner />
    </div>
  );
}

const CHECK_EVERY_MS = 30 * 60 * 1000;

/**
 * Updates: right after the app opens they apply on their own (nothing to interrupt).
 * Later, never reload mid-round on its own: show a banner and let the user pick the moment.
 * A plain browser refresh can't pick up a new version while the old one is cached, so the
 * app checks on open, when it comes back to the foreground, and every 30 minutes.
 */
function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      setInterval(() => reg.update().catch(() => {}), CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    const { speech, prep } = useApp.getState().timers;
    const clockRunning = isRunning(speech) || isRunning(prep.PRO) || isRunning(prep.CON);
    if (shouldAutoUpdate(performance.now(), clockRunning)) void updateServiceWorker(true);
  }, [needRefresh, updateServiceWorker]);

  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="card animate-pop fixed top-16 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 border-accent px-4 py-2.5 text-sm shadow-pop"
    >
      <span>
        <b>Update ready.</b> Reload to get the newest version.
      </span>
      <button className="btn btn-primary btn-sm" onClick={() => updateServiceWorker(true)}>
        Reload now
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
