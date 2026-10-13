import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { parseCSV, toCSV } from '../../core/csv';
import { associations, buildRecords, derivedHeaders, derivedTable, groupCandidates, summarize } from '../../core/cohort';
import { useLanguage } from '../../context/LanguageContext';
import { downloadText } from '../../utils/download';
import demoCsv from '../../data/demoCohort';
import templateCsv from '../../data/template';
import { Badge, Button, Callout, Card, EmptyState } from '../common/ui';
import { IconDownload, IconPrint, IconTable, IconUpload, IconWand } from '../common/icons';
import { CohortCharts } from './CohortCharts';
import { DataCheck } from './DataCheck';

interface Dataset {
  text: string;
  name: string;
  synthetic: boolean;
}

export function CohortPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<Dataset | null>(null);
  const [groupBy, setGroupBy] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const built = useMemo(() => (data ? buildRecords(parseCSV(data.text)) : null), [data]);
  const candidates = useMemo(() => (built ? groupCandidates(built.records, built.groupColumns) : []), [built]);
  const activeGroup = candidates.includes(groupBy) ? groupBy : candidates.includes('discharge_status') ? 'discharge_status' : candidates[0] ?? '';
  const ready = built !== null && built.missingRequired.length === 0;
  const summary = useMemo(() => (built && ready ? summarize(built.records, activeGroup || null) : null), [built, ready, activeGroup]);
  const assoc = useMemo(() => (built && ready ? associations(built.records, built.groupColumns, built.numericColumns) : null), [built, ready]);

  const loadDemo = (): void => setData({ text: demoCsv, name: 'demo-cohort-synthetic.csv', synthetic: true });
  const onFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) file.text().then((text) => setData({ text, name: file.name, synthetic: false })).catch(() => setData(null));
    e.target.value = '';
  };

  return (
    <div className="cohort">
      <Card
        className="toolbar-card no-print"
        title={t('cohort.title')}
        subtitle={t('cohort.intro')}
        actions={
          <div className="button-row">
            <Button variant="primary" icon={<IconUpload />} onClick={() => fileRef.current?.click()}>{t('cohort.upload')}</Button>
            <Button icon={<IconWand />} onClick={loadDemo}>{t('cohort.demo')}</Button>
            <Button variant="ghost" icon={<IconDownload />} onClick={() => downloadText('encog-template.csv', `\uFEFF${templateCsv}`, 'text/csv;charset=utf-8')}>{t('cohort.template')}</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          </div>
        }
      >
        {data && built ? (
          <div className="dataset-line">
            <IconTable />
            <span>{t('cohort.fileLoaded', { rows: built.records.length, name: data.name })}</span>
            {data.synthetic && <Badge tone="warning">{t('cohort.synthetic')}</Badge>}
            {ready && (
              <span className="dataset-actions">
                <Button variant="ghost" icon={<IconDownload />} onClick={() => downloadText('encog-derived.csv', toCSV(derivedHeaders(built.groupColumns, built.numericColumns), derivedTable(built.records)), 'text/csv;charset=utf-8')}>{t('cohort.exportDerived')}</Button>
                <Button variant="ghost" icon={<IconPrint />} onClick={() => window.print()}>{t('cohort.print')}</Button>
              </span>
            )}
          </div>
        ) : null}
      </Card>

      {!data && (
        <EmptyState
          icon={<IconTable size={28} />}
          title={t('cohort.emptyTitle')}
          text={t('cohort.emptyText')}
          action={<Button variant="primary" icon={<IconWand />} onClick={loadDemo}>{t('cohort.demo')}</Button>}
        />
      )}
      {built && !ready && <Callout tone="warning">{t('cohort.missingRequired', { cols: built.missingRequired.join(', ') })}</Callout>}
      {built && ready && summary && (
        <>
          <DataCheck built={built} summary={summary} candidates={candidates} />
          <CohortCharts summary={summary} assoc={assoc} candidates={candidates} groupBy={activeGroup} onGroupBy={setGroupBy} />
        </>
      )}
    </div>
  );
}
