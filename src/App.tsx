import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AppHeader } from './components/AppHeader';
import { BankView } from './components/BankView';
import { FlowView } from './components/FlowView';
import { RoundsView } from './components/RoundsView';
import { SettingsPanel } from './components/SettingsPanel';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { ConfirmDialog, Toaster } from './components/ui';
import { applyTheme } from './lib/theme';
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

/** Never reload mid-round on its own: offer the update and let the user pick the moment. */
function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="card animate-pop fixed bottom-4 left-4 z-[60] flex items-center gap-3 px-4 py-3 text-sm shadow-pop">
      <span>A new version is ready.</span>
      <button className="btn btn-primary btn-sm" onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
