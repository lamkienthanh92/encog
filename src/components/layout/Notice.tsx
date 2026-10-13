import { useLanguage } from '../../context/LanguageContext';
import { IconInfo } from '../common/icons';

/** Slim bar under the header: support-tool disclaimer and privacy note. */
export function Notice() {
  const { t } = useLanguage();
  return (
    <div className="notice no-print">
      <div className="notice-inner">
        <IconInfo size={16} />
        <span>{t('disclaimer.short')} {t('disclaimer.privacy')}</span>
      </div>
    </div>
  );
}
