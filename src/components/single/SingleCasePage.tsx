import { useEffect, useMemo, useState } from 'react';
import type { CaseForm, ReportDoc, ReportKind } from '../../types';
import { DEFAULT_THRESHOLD, INDEXES, analyzeScores } from '../../core/wisc';
import { timingChecks } from '../../core/followup';
import { buildReport } from '../../core/report';
import { useLanguage } from '../../context/LanguageContext';
import { downloadText, printReport } from '../../utils/download';
import { VERSION } from '../../version';
import { Button, Callout, EmptyState } from '../common/ui';
import { IconChart, IconWand } from '../common/icons';
import { ReportView } from '../report/ReportView';
import { CaseFormPanel } from './CaseFormPanel';
import { ResultPanel } from './ResultPanel';

export const EMPTY_FORM: CaseForm = {
  code: '', birth: '', discharge: '', assessment: '',
  VCI: '', PRI: '', WMI: '', PSI: '', FSIQ: '', GAI: '', CPI: '', los: '', threshold: String(DEFAULT_THRESHOLD),
};

/** Synthetic example, not a real child. */
export const EXAMPLE_FORM: CaseForm = {
  ...EMPTY_FORM, code: 'EX-01', birth: '2014-03-02', discharge: '2025-03-01', assessment: '2025-10-01',
  VCI: '75', PRI: '88', WMI: '58', PSI: '72', GAI: '79', los: '4',
};

interface SavedRecord {
  app: 'ENCOG';
  version: string;
  saved: string;
  form: CaseForm;
}

function isSavedRecord(v: unknown): v is SavedRecord {
  return typeof v === 'object' && v !== null && (v as { app?: unknown }).app === 'ENCOG' && typeof (v as { form?: unknown }).form === 'object';
}

function clampThreshold(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 10 && n <= 40 ? Math.round(n) : DEFAULT_THRESHOLD;
}

export function SingleCasePage() {
  const { t, list, lang } = useLanguage();
  const [form, setForm] = useState<CaseForm>(EMPTY_FORM);
  const [report, setReport] = useState<ReportDoc | null>(null);
  const [printToken, setPrintToken] = useState<number>(0);
  const [fileError, setFileError] = useState<string>('');

  const threshold = clampThreshold(form.threshold);
  const analysis = useMemo(() => analyzeScores(form, threshold), [form, threshold]);
  const timing = useMemo(() => timingChecks(form, analysis), [form, analysis]);
  const anyIndex = INDEXES.some((k) => form[k].trim() !== '');

  useEffect(() => {
    if (printToken > 0) printReport();
  }, [printToken]);

  const handlePrint = (kind: ReportKind): void => {
    if (!analysis.complete) return;
    setReport(buildReport(kind, { t, list, lang, form, analysis, timing }));
    setPrintToken((n) => n + 1);
  };

  const handleSave = (): void => {
    const record: SavedRecord = { app: 'ENCOG', version: VERSION, saved: new Date().toISOString(), form };
    downloadText(`encog-${form.code || 'record'}-${form.assessment || 'undated'}.json`, JSON.stringify(record, null, 2), 'application/json');
  };

  const handleOpen = (file: File): void => {
    file.text().then((text) => {
      try {
        const data: unknown = JSON.parse(text);
        if (!isSavedRecord(data)) throw new Error('format');
        setForm({ ...EMPTY_FORM, ...data.form });
        setFileError('');
      } catch {
        setFileError(t('form.openError'));
      }
    }).catch(() => setFileError(t('form.openError')));
  };

  return (
    <div className="single-layout">
      <aside className="no-print">
        <CaseFormPanel
          form={form} analysis={analysis} timing={timing} fileError={fileError}
          onChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
          onExample={() => setForm(EXAMPLE_FORM)}
          onClear={() => setForm(EMPTY_FORM)}
          onSave={handleSave}
          onOpen={handleOpen}
        />
      </aside>
      <div className="single-main" aria-live="polite">
        {!anyIndex && (
          <EmptyState
            icon={<IconChart size={28} />}
            title={t('result.emptyTitle')}
            text={t('result.emptyText')}
            action={<Button variant="primary" icon={<IconWand />} onClick={() => setForm(EXAMPLE_FORM)}>{t('form.example')}</Button>}
          />
        )}
        {anyIndex && !analysis.complete && <Callout tone="warning">{t('result.blocked')}</Callout>}
        {anyIndex && analysis.complete && <ResultPanel form={form} analysis={analysis} timing={timing} onPrint={handlePrint} />}
      </div>
      <div className="print-area">{report && <ReportView report={report} />}</div>
    </div>
  );
}
