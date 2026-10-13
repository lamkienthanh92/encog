import type { Lang } from '../../types';
import { LANGS } from '../../i18n';
import { useLanguage } from '../../context/LanguageContext';

export type TabKey = 'single' | 'cohort' | 'method';
export const TABS: readonly TabKey[] = ['single', 'cohort', 'method'];

export interface HeaderProps {
  tab: TabKey;
  onTab: (tab: TabKey) => void;
}

const LANG_LABEL: Record<Lang, string> = { vi: 'VI', en: 'EN' };

export function Header({ tab, onTab }: HeaderProps) {
  const { t, lang, setLang } = useLanguage();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="8" /><path d="M8 21 13 15l4 3 7-8" /></svg>
          </span>
          <div>
            <p className="brand-name">ENCOG</p>
            <p className="brand-tagline">{t('app.tagline')}</p>
          </div>
        </div>
        <nav className="tabs no-print" aria-label="ENCOG">
          {TABS.map((k) => (
            <button key={k} type="button" className={tab === k ? 'tab is-active' : 'tab'} aria-current={tab === k ? 'page' : undefined} onClick={() => onTab(k)}>
              {t(`nav.${k}`)}
            </button>
          ))}
        </nav>
        <div className="lang no-print" role="group" aria-label={t('language.label')}>
          {LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>{LANG_LABEL[l]}</button>
          ))}
        </div>
      </div>
    </header>
  );
}
