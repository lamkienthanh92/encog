import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../src/core/csv';
import { associations, buildRecords, derivedHeaders, derivedTable, groupCandidates, mapHeaders, summarize } from '../src/core/cohort';

const CSV = `Mã trẻ,Ngày sinh,Ngày xuất viện,Ngày đánh giá,VCI,PRI,WMI,PSI,FSIQ,GAI,CPI,Loại chỉ số,LOS,nhom
SIM-1,2014-02-01,2025-03-01,2025-09-15,62,66,60,70,58,,,FSIQ,3,A
SIM-2,2013-06-10,2025-04-10,2025-11-02,90,100,84,107,,95,,GAI,5,B
SIM-3,2016-01-05,2025-05-20,2025-12-01,57,71,7,88,,,,GAI,4,A
SIM-1,2014-02-01,2025-03-01,2026-09-20,70,72,68,75,69,,,FSIQ,4,A
SIM-2,2013-06-10,2025-04-10,2025-11-02,90,100,84,107,,95,,GAI,5,B
SIM-4,2015-01-01,2025-06-01,2025-12-20,70,95,88,92,,,85,FSIQ,9,B`;

test('Vietnamese headers are mapped', () => {
  const { mapping, groupColumns } = mapHeaders(parseCSV(CSV).headers);
  assert.equal(mapping.id, 'Mã trẻ');
  assert.equal(mapping.discharge_date, 'Ngày xuất viện');
  assert.equal(mapping.reported_type, 'Loại chỉ số');
  assert.deepEqual(groupColumns, [{ key: 'nhom', header: 'nhom', known: false }]);
});

test('row-level issues', () => {
  const { records } = buildRecords(parseCSV(CSV));
  const byLine = new Map(records.map((r) => [r.line, r]));
  assert.ok(byLine.get(4)?.issues.some((i) => i.code === 'outOfRange' && i.field === 'WMI'));
  assert.ok(byLine.get(6)?.issues.some((i) => i.code === 'duplicate'));
  assert.ok(byLine.get(7)?.issues.some((i) => i.code === 'typeMismatch'));
  assert.ok(byLine.get(7)?.issues.some((i) => i.code === 'losRange'));
});

test('default 0.4.0 rule: the CPI child has no single summary index', () => {
  const s = summarize(buildRecords(parseCSV(CSV)).records, 'nhom');
  assert.equal(s.withSummary, 2);
  assert.equal(s.typeCounts.CPI, 0);
  assert.equal(s.typeCounts.NONE, 1);
});

test('summary uses the first assessment of each child (legacy CPI rule)', () => {
  const { records, groupColumns } = buildRecords(parseCSV(CSV), 23, true);
  const s = summarize(records, 'nhom');
  assert.equal(s.children, 3);
  assert.equal(s.withSummary, 3);
  assert.equal(s.below70.k, 1);
  assert.equal(s.typeCounts.CPI, 1);
  assert.equal(s.trajectories.length, 1);
  assert.equal(s.trajectories[0].points[0].value, 58);
  assert.equal(s.groups?.items.length, 2);
  assert.equal(typeof s.groups?.fisherP, 'number');
  assert.deepEqual(groupCandidates(records, groupColumns), ['nhom']);
});

test('derived table for statistics software', () => {
  const t = derivedTable(buildRecords(parseCSV(CSV)).records);
  assert.equal(t[0].rule_index, 'FSIQ');
  assert.equal(t[0].summary_below_70, 1);
  assert.equal(t[5].rule_matches_reported, 0);
});

const CSV_VI = `id,VCI,PRI,WMI,PSI,Tình trạng xuất viện,Giới tính,Nhóm căn nguyên
A,80,85,82,84,Hồi phục hoàn toàn,Nam,Tự miễn
B,60,62,58,61,Còn di chứng,Nữ,Nhiễm trùng
C,90,92,88,95,full_recovery,female,unknown
D,70,72,69,71,Không rõ,Nam,Tự miễn`;

test('Vietnamese headers and values are stored as canonical English codes', () => {
  const { records, groupColumns } = buildRecords(parseCSV(CSV_VI));
  assert.deepEqual(groupColumns.map((c) => [c.key, c.known]), [['discharge_status', true], ['sex', true], ['etiology_group', true]]);
  assert.deepEqual(records[0].groups, { discharge_status: 'full_recovery', sex: 'male', etiology_group: 'autoimmune' });
  assert.deepEqual(records[1].groups, { discharge_status: 'sequelae', sex: 'female', etiology_group: 'infectious' });
  assert.deepEqual(records[2].groups, { discharge_status: 'full_recovery', sex: 'female', etiology_group: 'unknown' });
  assert.ok(records[3].issues.some((i) => i.code === 'unknownLevel' && i.field === 'discharge_status'));
});

test('derived export uses English variable names and codes', () => {
  const { records, groupColumns } = buildRecords(parseCSV(CSV_VI));
  const headers = derivedHeaders(groupColumns);
  assert.deepEqual(headers.slice(-3), ['discharge_status', 'sex', 'etiology_group']);
  assert.equal(derivedTable(records)[1].discharge_status, 'sequelae');
});

const CLIN = `id,discharge_date,assessment_date,VCI,PRI,WMI,PSI,FSIQ,GAI,CPI,Nơi cư trú,Số cơn co giật,fever_days,extra_score
C1,2024-01-01,2024-07-15,60,62,58,61,55,,,TP.HCM,4,12,10
C2,2024-01-01,2024-08-01,64,66,60,63,59,,,Tỉnh khác,6,14,11
C3,2024-01-01,2024-07-20,68,66,62,64,62,,,Tỉnh khác,3,9,12
C4,2024-01-01,2025-06-01,90,92,88,94,90,,,TP.HCM,0,6,13
C5,2024-01-01,2025-08-01,85,88,82,80,82,,,TP.HCM,1,7,14
C6,2024-01-01,2025-07-01,78,80,76,74,75,,,Tỉnh khác,2,8,15
C7,2024-01-01,2024-09-01,66,70,64,62,63,,,Tỉnh khác,5,11,x
C8,2024-01-01,2025-09-01,95,90,92,96,93,,,TP.HCM,abc,5,17
C9,2024-01-01,2024-08-15,72,74,70,71,70,,,Tỉnh khác,2,10,18
C10,2024-01-01,2025-04-01,58,90,62,64,,,63,TP.HCM,1,7,19`;

test('numeric clinical columns are recognised, validated and exported', () => {
  const b = buildRecords(parseCSV(CLIN));
  assert.deepEqual(b.numericColumns.map((c) => c.key), ['n_seizures', 'fever_days', 'extra_score']);
  assert.ok(b.groupColumns.some((c) => c.key === 'residence' && c.known));
  const c8 = b.records.find((r) => r.id === 'C8');
  assert.equal(c8?.numeric.n_seizures, null);
  assert.ok(c8?.issues.some((i) => i.code === 'numericNotNumber' && i.field === 'n_seizures'));
  assert.equal(b.records.find((r) => r.id === 'C1')?.groups.residence, 'hcmc');
  const headers = derivedHeaders(b.groupColumns, b.numericColumns);
  assert.ok(headers.includes('n_seizures') && headers.includes('residence'));
});

test('timing summary, CPI sensitivity and group profiles (legacy CPI rule)', () => {
  const b = buildRecords(parseCSV(CLIN), 23, true);
  const s = summarize(b.records, 'residence');
  assert.ok(s.timing);
  assert.equal(s.timing.points.length, 10);
  assert.ok((s.timing.below.median as number) < (s.timing.above.median as number));
  assert.ok((s.timing.rho as number) > 0.5);
  assert.equal(s.excludingCpi?.n, 9);
  assert.equal(s.profiles.length, 2);
  assert.equal(s.profiles.find((p) => p.level === 'hcmc')?.n, 5);
});

test('associations: crude and interval-adjusted Firth models', () => {
  const b = buildRecords(parseCSV(CLIN));
  const a = associations(b.records, b.groupColumns, b.numericColumns);
  const keys = a.rows.map((r) => r.key);
  assert.ok(keys.includes('residence') && keys.includes('n_seizures') && keys.includes('months_since_discharge'));
  const res = a.rows.find((r) => r.key === 'residence');
  assert.equal(res?.reference, 'hcmc');
  assert.equal(res?.level, 'other_province');
  assert.ok(res?.crude && res.crude.or > 1);
  assert.ok(res?.adjusted);
  const interval = a.rows.find((r) => r.kind === 'interval');
  assert.equal(interval?.adjusted, null);
  assert.ok(interval?.crude && interval.crude.or < 1);
});
