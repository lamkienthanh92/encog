// Independent verification of ENCOG 0.4.0 decision logic (requested in peer review).
// The reference implementation below is written separately from src/core/wisc.ts and compared exhaustively.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectSummaryIndex, analyzeScores, scoreError, toScore, classify } from '../src/core/wisc';
import { timingChecks, parseDate, toISO } from '../src/core/followup';

type K = 'FSIQ' | 'GAI' | 'CPI' | 'NONE';
function reference(v: number, p: number, w: number, s: number, t = 23, cpi = false): K {
  const hi = Math.max(v, p, w, s), lo = Math.min(v, p, w, s);
  if (hi - lo <= t - 1) return 'FSIQ';
  if (Math.abs(v - p) <= t - 1) return 'GAI';
  if (cpi && Math.abs(w - s) <= t - 1) return 'CPI';
  return 'NONE';
}
const sel = (v: number, p: number, w: number, s: number, t?: number, cpi = false) => selectSummaryIndex({ VCI: v, PRI: p, WMI: w, PSI: s }, t, cpi).type;

test('V1 exhaustive grid (step 3, 41^4 = 2.8 M profiles) agrees with reference', () => {
  let n = 0;
  for (let v = 40; v <= 160; v += 3) for (let p = 40; p <= 160; p += 3) for (let w = 40; w <= 160; w += 3) for (let s = 40; s <= 160; s += 3) {
    n++;
    if (sel(v, p, w, s) !== reference(v, p, w, s)) assert.fail(`mismatch ${v},${p},${w},${s}`);
    if (sel(v, p, w, s, 23, true) !== reference(v, p, w, s, 23, true)) assert.fail(`legacy mismatch ${v},${p},${w},${s}`);
  }
  assert.ok(n > 2_800_000);
});

test('V2 every integer profile around the 22/23 boundaries agrees with reference', () => {
  let n = 0;
  for (let base = 40; base <= 137; base++) for (const d1 of [0, 21, 22, 23, 24]) for (const d2 of [0, 21, 22, 23, 24]) for (const d3 of [0, 21, 22, 23, 24]) {
    const prof = [base, base + d1, Math.min(160, base + d2), Math.min(160, base + d3)];
    for (const [v, p, w, s] of [prof, [prof[1], prof[0], prof[3], prof[2]], [prof[2], prof[3], prof[0], prof[1]]]) {
      n++; assert.equal(sel(v, p, w, s), reference(v, p, w, s), `${v},${p},${w},${s}`);
      assert.equal(sel(v, p, w, s, 23, true), reference(v, p, w, s, 23, true));
    }
  }
  assert.ok(n > 30_000);
});

test('V3 1,000,000 random integer profiles agree with reference (seeded)', () => {
  let x = 20261028; const r = () => { x = (x * 1103515245 + 12345) % 2147483648; return 40 + (x % 121); };
  for (let i = 0; i < 1_000_000; i++) { const a = [r(), r(), r(), r()]; assert.equal(sel(a[0], a[1], a[2], a[3]), reference(a[0], a[1], a[2], a[3])); }
});

test('V4 each branch reached and exact boundary values', () => {
  assert.equal(sel(100, 100, 100, 122), 'FSIQ'); // spread 22
  assert.equal(sel(100, 100, 100, 123), 'GAI');  // spread 23
  assert.equal(sel(100, 122, 77, 80), 'GAI');    // |VCI-PRI| 22
  assert.equal(sel(100, 123, 77, 80), 'NONE');   // |VCI-PRI| 23: no summary by default
  assert.equal(sel(100, 123, 77, 80, 23, true), 'CPI');    // legacy rule
  assert.equal(sel(100, 123, 77, 99, 23, true), 'CPI');    // |WMI-PSI| 22
  assert.equal(sel(100, 123, 77, 100, 23, true), 'NONE');  // |WMI-PSI| 23
  assert.equal(selectSummaryIndex({ VCI: 100, PRI: 123, WMI: 77, PSI: 99 }).cpiUnitary, true);
  assert.equal(selectSummaryIndex({ VCI: 100, PRI: 123, WMI: 77, PSI: 100 }).cpiUnitary, false);
  assert.equal(sel(40, 160, 40, 160), 'NONE');   // extremes
  assert.equal(sel(40, 40, 40, 40), 'FSIQ');
  assert.equal(sel(160, 160, 160, 160), 'FSIQ');
});

test('V5 invalid inputs are rejected and never produce a summary', () => {
  for (const bad of ['', '-', 'abc', '39', '161', '-5', '1e9', 'NaN', 'Infinity', '85.5', null, undefined, NaN, Infinity]) {
    const a = analyzeScores({ VCI: bad as never, PRI: 90, WMI: 90, PSI: 90, FSIQ: 90 });
    assert.equal(a.complete, false, `input ${String(bad)}`);
  }
  assert.equal(scoreError(toScore('85,0')), null); // Vietnamese decimal comma accepted
  assert.equal(scoreError(toScore(' 85 ')), null);
});

test('V6 composite is never computed: missing composite stays missing for every branch', () => {
  for (const [v, p, w, s] of [[90, 95, 92, 98], [70, 110, 80, 85], [60, 100, 70, 75], [50, 110, 60, 120]]) {
    const a = analyzeScores({ VCI: v, PRI: p, WMI: w, PSI: s });
    assert.equal(a.complete, true);
    if (a.complete) assert.equal(a.summary.value, null);
  }
});

test('V7 band cut-offs at every boundary', () => {
  const cases: [number, string][] = [[69, 'extremelyLow'], [70, 'borderline'], [79, 'borderline'], [80, 'lowAverage'], [89, 'lowAverage'], [90, 'average'], [109, 'average'], [110, 'highAverage'], [119, 'highAverage'], [120, 'high'], [129, 'high'], [130, 'veryHigh']];
  for (const [s, b] of cases) assert.equal(classify(s), b, String(s));
});

test('V8 re-assessment date: 18-month default visit vs 12-month fallback at the 12-month retest boundary', () => {
  const an = analyzeScores({ VCI: 70, PRI: 72, WMI: 68, PSI: 71, FSIQ: 66 });
  const due = (dis: string, ass: string) => toISO(timingChecks({ birth: '2014-01-01', discharge: dis, assessment: ass }, an).nextDue);
  assert.equal(due('2025-01-15', '2025-07-15'), '2026-07-15'); // exactly 12 m before the 18-m visit -> visit kept
  assert.equal(due('2025-01-15', '2025-07-16'), '2026-07-16'); // 1 day later -> 12 m after the test
  assert.equal(due('2025-01-15', '2026-01-15'), '2027-01-15'); // tested at 12 m -> 12 m later
  const normal = analyzeScores({ VCI: 100, PRI: 102, WMI: 98, PSI: 101, FSIQ: 100 });
  assert.equal(timingChecks({ birth: '2014-01-01', discharge: '2025-01-15', assessment: '2025-07-15' }, normal).nextDue, null);
  assert.ok(!parseDate('31/02/2025') || Number.isNaN(parseDate('31/02/2025')!.getTime()));
});
