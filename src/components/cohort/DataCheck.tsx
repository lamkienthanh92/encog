import { useMemo, useState } from 'react';
import type { BuildResult, CohortSummary, Issue } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { fmtNum, varLabel } from '../../i18n';
import { Badge, Button, Card } from '../common/ui';

export interface DataCheckProps {
  built: BuildResult;
  summary: CohortSummary;
  candidates: readonly string[];
}

interface RowIssue extends Issue {
  line: number;
  id: string;
}

const DATE_FIELD_KEYS: Record<string, string> = { birth: 'form.birth', discharge: 'form.discharge', assessment: 'form.assessment' };
const PAGE = 8;

/** Row-level validation results and recognised columns. */
export function DataCheck({ built, summary, candidates }: DataCheckProps) {
  const { t, lang } = useLanguage();
  const [showAll, setShowAll] = useState<boolean>(false);
  const issues = useMemo<RowIssue[]>(() => built.records
    .flatMap((r) => r.issues.map((i) => ({ ...i, line: r.line, id: r.id })))
    .sort((a, b) => (a.level === b.level ? a.line - b.line : a.level === 'error' ? -1 : 1)), [built]);
  const shown = showAll ? issues : issues.slice(0, PAGE);

  /** Picks the singular key ("…One") when n is 1. */
  const plural = (key: string, n: number): string => t(n === 1 ? `${key}One` : key, { n });
  const mappingLine = (key: string): string => {
    const label = varLabel(t, key);
    return label === key ? '' : ` (${key})`;
  };

  const describeIssue = (i: RowIssue): string => {
    const p = i.params ?? {};
    const field = i.field ? (DATE_FIELD_KEYS[i.field] ? t(DATE_FIELD_KEYS[i.field]) : varLabel(t, i.field)) : '';
    const months = typeof p.months === 'number' ? p.months : null;
    return t(`cohort.issue.${i.code}`, {
      ...p,
      field,
      months: i.code === 'earlyAssessment' && months !== null ? fmtNum(months, 1, lang) : months ?? '',
      mos: months ?? '',
    });
  };

  return (
    <Card
      title={t('cohort.issuesTitle')}
      actions={
        <div className="chips">
          <Badge tone="error">{plural('cohort.errorsChip', summary.issueCounts.errors)}</Badge>
          <Badge tone="warning">{plural('cohort.warningsChip', summary.issueCounts.warnings)}</Badge>
          <span className="muted small">{plural('cohort.rowsChip', summary.issueCounts.rowsWithIssues)}</span>
        </div>
      }
    >
      <details className="mapping">
        <summary>{t('cohort.mapping')}</summary>
        <ul className="mapping-list">
          {Object.entries(built.mapping).map(([field, header]) => (
            <li key={field}><b>{varLabel(t, field)}</b><span className="muted">{mappingLine(field)}</span> ← “{header}”</li>
          ))}
          {[...built.groupColumns, ...built.numericColumns].filter((c) => c.known).map((c) => (
            <li key={c.key}><b>{varLabel(t, c.key)}</b><span className="muted">{mappingLine(c.key)}</span> ← “{c.header}”</li>
          ))}
        </ul>
        {candidates.length > 0 && <p><b>{t('cohort.groupCols')}:</b> {candidates.map((c) => varLabel(t, c)).join('; ')}</p>}
      </details>
      {issues.length === 0 ? <p className="muted">{t('cohort.noIssues')}</p> : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>{t('cohort.colLine')}</th><th>{t('cohort.colId')}</th><th>{t('cohort.colLevel')}</th><th>{t('cohort.colProblem')}</th></tr>
              </thead>
              <tbody>
                {shown.map((i, k) => (
                  <tr key={`${i.line}-${i.code}-${k}`}>
                    <td className="num">{i.line}</td>
                    <td>{i.id}</td>
                    <td><Badge tone={i.level}>{t(`cohort.${i.level}`)}</Badge></td>
                    <td>{describeIssue(i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {issues.length > PAGE && (
            <Button variant="ghost" className="no-print" onClick={() => setShowAll((v) => !v)}>
              {showAll ? t('cohort.showFewerIssues') : t('cohort.showAllIssues', { n: issues.length })}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
