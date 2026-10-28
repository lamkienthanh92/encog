import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeScores, approxPercentile, classify, formatPercentile, scoreError, selectSummaryIndex, toScore } from '../src/core/wisc';

const sel = (VCI: number, PRI: number, WMI: number, PSI: number, t?: number, cpi = false) => selectSummaryIndex({ VCI, PRI, WMI, PSI }, t, cpi).type;

test('spread of 22 keeps FSIQ interpretable', () => assert.equal(sel(90, 100, 85, 107), 'FSIQ'));
test('spread of 23 with VCI–PRI < 23 moves to GAI', () => assert.equal(sel(90, 100, 84, 107), 'GAI'));
test('VCI–PRI ≥ 23 and WMI–PSI < 23 gives NONE by default (CPI is not a summary since 0.4.0)', () => assert.equal(sel(70, 95, 88, 92), 'NONE'));
test('legacy option reproduces the pre-0.4.0 CPI substitution', () => assert.equal(sel(70, 95, 88, 92, 23, true), 'CPI'));
test('both pairs discrepant gives NONE', () => assert.equal(sel(60, 90, 60, 95), 'NONE'));
test('threshold is configurable', () => assert.equal(sel(90, 100, 85, 107, 20), 'GAI'));

test('band boundaries follow the protocol cut-offs', () => {
  const cases: [number, string][] = [[69, 'extremelyLow'], [70, 'borderline'], [79, 'borderline'], [80, 'lowAverage'], [89, 'lowAverage'],
    [90, 'average'], [109, 'average'], [110, 'highAverage'], [119, 'highAverage'], [120, 'high'], [130, 'veryHigh']];
  for (const [s, k] of cases) assert.equal(classify(s), k, `score ${s}`);
  assert.equal(classify(null), null);
});

test('approximate percentile matches the normal distribution', () => {
  assert.ok(Math.abs((approxPercentile(100) as number) - 50) < 1e-6);
  assert.ok(Math.abs((approxPercentile(70) as number) - 2.275) < 0.01);
  assert.ok(Math.abs((approxPercentile(130) as number) - 97.725) < 0.01);
  assert.equal(formatPercentile(approxPercentile(49), 'en'), '<0.1');
  assert.equal(formatPercentile(approxPercentile(49), 'vi'), '<0,1');
  assert.equal(formatPercentile(0.55, 'en'), '0.6');
  assert.equal(formatPercentile(0.55, 'vi'), '0,6');
});

test('score parsing and validation', () => {
  assert.equal(toScore(' 85 '), 85);
  assert.equal(toScore('85,0'), 85);
  assert.equal(toScore(''), null);
  assert.ok(Number.isNaN(toScore('abc')));
  assert.equal(scoreError(toScore('7')), 'outOfRange');
  assert.equal(scoreError(85.5), 'notInteger');
  assert.equal(scoreError(null), 'missing');
  assert.equal(scoreError(null, false), null);
});

test('an impossible index (WMI = 7) blocks the analysis', () => {
  const a = analyzeScores({ VCI: 57, PRI: 71, WMI: 7, PSI: 88 });
  assert.equal(a.complete, false);
  assert.equal(a.errors.WMI, 'outOfRange');
});

test('a non-integer index blocks the analysis (0.4.0)', () => {
  assert.equal(analyzeScores({ VCI: 85.5, PRI: 90, WMI: 90, PSI: 90 }).complete, false);
});

test('analysis uses the entered composite that the rule selects', () => {
  const a = analyzeScores({ VCI: 75, PRI: 88, WMI: 58, PSI: 72, GAI: 79 });
  assert.ok(a.complete);
  assert.equal(a.selection.type, 'GAI');
  assert.equal(a.summary.value, 79);
  assert.equal(a.summary.band, 'borderline');
  assert.equal(a.uneven, true);
  assert.deepEqual(a.focus, ['WMI', 'PSI', 'VCI']);
});

test('missing composite is flagged, not invented', () => {
  const a = analyzeScores({ VCI: 75, PRI: 88, WMI: 58, PSI: 72 });
  assert.ok(a.complete);
  assert.equal(a.summary.value, null);
  assert.equal(a.summary.missing, true);
});

test('cautions for CPI and for a summary below 70', () => {
  const c = analyzeScores({ VCI: 70, PRI: 95, WMI: 88, PSI: 92, CPI: 89 });
  assert.ok(c.complete && c.selection.type === 'NONE' && c.summary.value === null);
  assert.ok(c.complete && c.cautions.includes('noSummary') && c.cautions.includes('cpiSupplementary'));
  const legacy = analyzeScores({ VCI: 70, PRI: 95, WMI: 88, PSI: 92, CPI: 89 }, 23, { allowCpiSummary: true });
  assert.ok(legacy.complete && legacy.cautions.includes('cpiCaution') && legacy.summary.value === 89);
  const low = analyzeScores({ VCI: 62, PRI: 66, WMI: 60, PSI: 70, FSIQ: 58 });
  assert.ok(low.complete && low.cautions.includes('adaptiveBehaviour'));
});
