import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firthLogistic } from '../src/core/regression';
import { mannWhitney, ranks, spearman, tTwoSided, chi2Sf1 } from '../src/core/stats';

// Reference values computed with an independent Python implementation (Firth Newton–Raphson,
// profile penalized likelihood) and scipy.stats 1.18. Synthetic data only.
const Y = [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1];
const X1 = [1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1];
const X2 = [28.9, 11.4, 20.9, 22.1, 11.6, 4.0, 29.3, 11.8, 12.2, 27.2, 19.2, 16.3, 24.1, 4.8, 22.4, 13.7, 6.4, 21.2, 28.2, 9.4, 20.4, 11.8, 23.3, 22.8, 9.7, 25.6, 21.1, 21.8, 25.3, 15.1];
const close = (a: number | null, b: number, rel = 0.01): void => {
  assert.ok(a !== null && Math.abs(a - b) <= rel * Math.abs(b), `${a} vs ${b}`);
};

test('Firth logistic handles quasi-separation (all events in one group)', () => {
  const fit = firthLogistic(Y, [X1], ['x1']);
  assert.ok(fit);
  const t = fit.terms[0];
  close(t.or, 19.588);
  close(t.lo, 1.779);
  close(t.hi, 2709.8, 0.02);
  close(t.p, 0.01179, 0.02);
  assert.equal(fit.events, 4);
});

test('Firth logistic with two predictors', () => {
  const fit = firthLogistic(Y, [X1, X2], ['x1', 'x2']);
  assert.ok(fit);
  close(fit.terms[0].or, 19.184);
  close(fit.terms[1].or, 0.97449);
  close(fit.terms[1].lo, 0.84495);
  close(fit.terms[1].hi, 1.12148);
  close(fit.terms[1].p, 0.7045, 0.02);
});

test('Firth logistic drops incomplete rows and refuses degenerate data', () => {
  const y = [...Y.slice(0, 10), null];
  const fit = firthLogistic(y, [X1.slice(0, 11)], ['x1']);
  assert.equal(fit?.n ?? 0, 10);
  assert.equal(firthLogistic([0, 0, 0, 1], [[1, 2, 3, 4]], ['x']), null);
});

test('Mann–Whitney matches scipy (asymptotic, ties)', () => {
  const a = [94, 52, 75, 54, 91, 70, 64, 44, 95, 81, 81, 87, 75, 60];
  const b = [94, 52, 75, 60, 73, 77, 85, 91, 63, 56, 82, 100, 93, 85, 77, 86];
  close(mannWhitney(a, b).p, 0.441301, 0.001);
});

test('Spearman matches scipy', () => {
  const y = [94, 52, 75, 54, 91, 70, 64, 44, 95, 81, 81, 87, 75, 60, 94, 52, 75, 60, 73, 77, 85, 91, 63, 56, 82, 100, 93, 85, 77, 86];
  const r = spearman(X2, y);
  close(r.rho, 0.126197, 0.001);
  close(r.p, 0.506367, 0.002);
});

test('distribution helpers', () => {
  assert.deepEqual(ranks([3, 1, 3, 2]), [3.5, 1, 3.5, 2]);
  close(chi2Sf1(3.841458820694124), 0.05, 0.001);
  close(tTwoSided(2.048407, 28), 0.05, 0.001);
});
