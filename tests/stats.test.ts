import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describe, fisherExact, histogram, quantile, wilson } from '../src/core/stats';

const close = (a: number | null, b: number, tol = 1e-3) => assert.ok(a !== null && Math.abs(a - b) < tol, `${a} vs ${b}`);

test('Wilson interval', () => {
  const ci = wilson(15, 32);
  close(ci.p, 0.46875, 1e-9);
  close(ci.lo, 0.3087, 0.002);
  close(ci.hi, 0.6355, 0.002);
  assert.equal(wilson(0, 0).p, null);
});

test('Fisher exact test, two-sided', () => {
  close(fisherExact(3, 1, 1, 3), 0.4857);
  close(fisherExact(1, 9, 11, 3), 0.002759, 1e-4);
  close(fisherExact(5, 0, 0, 5), 0.007937, 1e-5);
});

test('descriptives and quantiles (type 7)', () => {
  const d = describe([1, 2, 3, 4, 100, null, NaN]);
  assert.equal(d.n, 5);
  assert.equal(d.median, 3);
  assert.equal(quantile([1, 2, 3, 4], 0.25), 1.75);
});

test('histogram bins', () => {
  const h = histogram([45, 69, 70, 159]);
  assert.equal(h.length, 12);
  assert.deepEqual([h[0].count, h[2].count, h[3].count, h[11].count], [1, 1, 1, 1]);
});
