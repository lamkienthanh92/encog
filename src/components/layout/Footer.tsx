import { useLanguage } from '../../context/LanguageContext';
import { VERSION } from '../../version';

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <p>{t('disclaimer.notAffiliated')}</p>
      <p>{t('footer.version', { version: VERSION })}</p>
    </footer>
  );
}
