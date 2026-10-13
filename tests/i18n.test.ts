import { test } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../src/i18n/vi';
import en from '../src/i18n/en';
import { fmtNum, fmtP, levelLabel, makeList, makeT, varLabel } from '../src/i18n';

function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

test('Vietnamese and English dictionaries have the same keys', () => {
  const a = new Set(keys(vi));
  const b = new Set(keys(en));
  assert.deepEqual([...a].filter((k) => !b.has(k)), []);
  assert.deepEqual([...b].filter((k) => !a.has(k)), []);
});

test('placeholders, lists and number formats', () => {
  const t = makeT('vi');
  assert.equal(t('result.spread', { spread: 25 }), 'Chênh 25 điểm');
  assert.equal(t('no.such.key'), 'no.such.key');
  assert.equal(makeList('en')('recs.WMI').length, 3);
  assert.equal(fmtNum(12.345, 1, 'vi'), '12,3');
  assert.equal(fmtNum(12.345, 1, 'en'), '12.3');
});

test('variable and value labels follow the UI language; unknown columns keep their own name', () => {
  const en = makeT('en');
  const vi = makeT('vi');
  assert.equal(varLabel(en, 'discharge_status'), 'Discharge status');
  assert.equal(varLabel(vi, 'discharge_status'), 'Tình trạng xuất viện');
  assert.equal(levelLabel(en, 'discharge_status', 'sequelae'), 'Sequelae');
  assert.equal(levelLabel(vi, 'discharge_status', 'sequelae'), 'Còn di chứng');
  assert.equal(varLabel(en, 'discharge_date'), 'Discharge date');
  assert.equal(varLabel(en, 'my_column'), 'my_column');
  assert.equal(levelLabel(en, 'my_column', 'A'), 'A');
  assert.equal(fmtP(0.0181, 'en'), '0.018');
  assert.equal(fmtP(0.0181, 'vi'), '0,018');
  assert.equal(fmtP(0.0001, 'en'), '<0.001');
});
