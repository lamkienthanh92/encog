import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeScores } from '../src/core/wisc';
import { timingChecks } from '../src/core/followup';
import { buildReport } from '../src/core/report';
import { makeList, makeT } from '../src/i18n';
import type { Lang, ReportKind } from '../src/types';

const form = { code: 'VD-01', birth: '2014-03-02', discharge: '2025-03-01', assessment: '2025-10-01', los: '4' };
const analysis = analyzeScores({ VCI: 75, PRI: 88, WMI: 58, PSI: 72, GAI: 79 });
if (!analysis.complete) throw new Error('fixture should be complete');
const timing = timingChecks(form, analysis);

for (const lang of ['vi', 'en'] as Lang[]) {
  for (const kind of ['parent', 'school', 'clinician'] as ReportKind[]) {
    test(`${kind} report in ${lang} has no unresolved keys`, () => {
      const r = buildReport(kind, { t: makeT(lang), list: makeList(lang), lang, form, analysis, timing, today: new Date('2025-10-02') });
      const text = JSON.stringify(r);
      assert.ok(r.title && r.sections.length > 0);
      assert.ok(!/\{\w+\}/.test(text), 'unfilled placeholder');
      assert.ok(!/"(report|result|index|band|recs|form)\.[\w.]+"/.test(text), 'raw key leaked');
    });
  }
}

test('school report never prints scores', () => {
  const r = buildReport('school', { t: makeT('vi'), list: makeList('vi'), lang: 'vi', form, analysis, timing });
  assert.ok(!/\b(75|88|58|72|79)\b/.test(JSON.stringify(r.sections)));
});
