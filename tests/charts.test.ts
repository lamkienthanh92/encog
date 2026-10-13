import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxStats } from '../src/core/stats';
import { countTicks, jitter, scoreDomainMax, scoreTicks } from '../src/components/charts/scale';

test('Tukey box statistics with outliers', () => {
  const b = boxStats([60, 62, 64, 66, 68, 70, 72, 74, 120]);
  assert.ok(b);
  assert.equal(b.median, 68);
  assert.equal(b.q1, 64);
  assert.equal(b.q3, 72);
  assert.equal(b.upperWhisker, 74);      // 120 is beyond Q3 + 1.5 × IQR = 84
  assert.equal(b.lowerWhisker, 60);
  assert.deepEqual(b.outliers, [120]);
  assert.equal(boxStats([]), null);
});

test('score axis grows with the data but stays within 100–160', () => {
  assert.equal(scoreDomainMax([116]), 130);
  assert.equal(scoreDomainMax([111]), 115);
  assert.equal(scoreDomainMax([70, 80]), 100);
  assert.equal(scoreDomainMax([158]), 160);
  assert.equal(scoreDomainMax([]), 160);
  assert.deepEqual(scoreTicks(130), [40, 55, 70, 85, 100, 115, 130]);
});

test('count ticks and jitter stay in range', () => {
  assert.deepEqual(countTicks(16), [0, 5, 10, 15, 20]);
  for (let i = 0; i < 200; i++) assert.ok(Math.abs(jitter(i, 40)) <= 20);
});
