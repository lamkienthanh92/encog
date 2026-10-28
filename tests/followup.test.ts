import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, ageYM, isValidDate, parseDate, timingChecks, toISO } from '../src/core/followup';
import { analyzeScores } from '../src/core/wisc';

test('date formats', () => {
  assert.equal(toISO(parseDate('2025-03-07')), '2025-03-07');
  assert.equal(toISO(parseDate('7/3/2025')), '2025-03-07');
  assert.equal(toISO(parseDate('07.03.2025')), '2025-03-07');
  assert.equal(isValidDate(parseDate('31/02/2025')), false);
  assert.equal(parseDate(''), null);
});

test('addMonths clamps to month end', () => assert.equal(toISO(addMonths(parseDate('2025-08-31'), 6)), '2026-02-28'));

test('age in years and months', () => {
  assert.deepEqual(ageYM(parseDate('2015-05-20'), parseDate('2026-05-19')), { years: 10, months: 11, totalMonths: 131 });
});

test('assessment earlier than 6 months after discharge is flagged', () => {
  assert.ok(timingChecks({ discharge: '2025-07-20', assessment: '2026-01-18' }).warnings.some((w) => w.code === 'earlyAssessment'));
  assert.equal(timingChecks({ discharge: '2025-07-20', assessment: '2026-01-20' }).warnings.length, 0);
});

test('age outside 6:0–16:11 is flagged', () => {
  assert.ok(timingChecks({ birth: '2009-12-01', assessment: '2026-12-01' }).warnings.some((w) => w.code === 'ageOutOfRange'));
});

test('date order errors', () => {
  const t = timingChecks({ birth: '2015-01-01', discharge: '2025-05-01', assessment: '2025-04-01' });
  assert.ok(t.errors.some((e) => e.code === 'assessmentBeforeDischarge'));
});

test('re-assessment at the 18-month default visit when it is at least 12 months after the test', () => {
  const a = analyzeScores({ VCI: 72, PRI: 75, WMI: 70, PSI: 78, FSIQ: 71 });
  const t = timingChecks({ discharge: '2025-03-01', assessment: '2025-09-01' }, a);
  assert.equal(toISO(t.nextDue), '2026-09-01');
  assert.equal(toISO(timingChecks({ discharge: '2025-03-01', assessment: '2025-10-01' }, a).nextDue), '2026-10-01');
  assert.equal(t.recheckReason, 'lowSummary');
});

test('re-assessment 12 months later when the 18-month visit is too close or past', () => {
  const a = analyzeScores({ VCI: 72, PRI: 75, WMI: 70, PSI: 78, FSIQ: 71 });
  assert.equal(toISO(timingChecks({ discharge: '2025-03-01', assessment: '2026-07-01' }, a).nextDue), '2027-07-01');
  assert.equal(toISO(timingChecks({ assessment: '2025-10-01' }, a).nextDue), '2026-10-01');
});
