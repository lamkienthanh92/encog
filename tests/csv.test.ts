import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDelimiter, parseCSV, toCSV } from '../src/core/csv';

test('semicolon CSV with BOM, quotes and CRLF', () => {
  const p = parseCSV('\uFEFFid;VCI;note\r\nA1;85;"có dấu ; và ""ngoặc"""\r\nA2;90;\r\n\r\n');
  assert.equal(p.delimiter, ';');
  assert.deepEqual(p.headers, ['id', 'VCI', 'note']);
  assert.equal(p.rows.length, 2);
  assert.equal(p.rows[0].values.note, 'có dấu ; và "ngoặc"');
  assert.equal(p.rows[1].line, 3);
});

test('delimiter detection ignores delimiters inside quotes', () => assert.equal(detectDelimiter('"a;b",c,d\n'), ','));

test('round trip', () => {
  const p = parseCSV(toCSV(['a', 'b'], [{ a: 'x,y', b: 2 }]));
  assert.equal(p.rows[0].values.a, 'x,y');
  assert.equal(p.rows[0].values.b, '2');
});
