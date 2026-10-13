import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Lang, Translate, TranslateList } from '../types';
import { makeList, makeT } from '../i18n';

export interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
  list: TranslateList;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export interface LanguageProviderProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  children: ReactNode;
}

export function LanguageProvider({ lang, setLang, children }: LanguageProviderProps) {
  const value = useMemo<LanguageValue>(() => ({ lang, setLang, t: makeT(lang), list: makeList(lang) }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return value;
}
