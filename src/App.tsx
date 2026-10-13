import { useCallback, useEffect, useState } from 'react';
import type { Lang } from './types';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header, TABS, type TabKey } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Notice } from './components/layout/Notice';
import { SingleCasePage } from './components/single/SingleCasePage';
import { CohortPage } from './components/cohort/CohortPage';
import { MethodPage } from './components/method/MethodPage';

function tabFromHash(): TabKey {
  const h = window.location.hash.replace('#', '');
  return (TABS as readonly string[]).includes(h) ? (h as TabKey) : 'single';
}

function initialLang(): Lang {
  return new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'vi';
}

/** Root: owns the language state and provides it to everything below. */
export default function App() {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => setLangState(l), []);
  return (
    <LanguageProvider lang={lang} setLang={setLang}>
      <AppShell />
    </LanguageProvider>
  );
}

/** Layout and routing; reads language from context. */
function AppShell() {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState<TabKey>(tabFromHash);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `ENCOG – ${t('app.tagline')}`;
  }, [lang, t]);

  useEffect(() => {
    const onHash = (): void => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goTo = useCallback((k: TabKey): void => {
    setTab(k);
    try { window.history.replaceState(null, '', `#${k}`); } catch { /* some sandboxed viewers block history */ }
  }, []);

  return (
    <div className="app">
      <Header tab={tab} onTab={goTo} />
      <Notice />
      <main className="container">
        {tab === 'single' && <SingleCasePage />}
        {tab === 'cohort' && <CohortPage />}
        {tab === 'method' && <MethodPage />}
      </main>
      <div className="container"><Footer /></div>
    </div>
  );
}
