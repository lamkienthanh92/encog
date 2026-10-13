// Generates the SYNTHETIC demo cohort used by ENCOG (no real patient data).
// Usage: npm run synthetic   (deterministic: fixed seed)
import { writeFileSync } from 'node:fs';
import { selectSummaryIndex } from '../src/core/wisc';
import { toCSV } from '../src/core/csv';
import { TEMPLATE_HEADERS } from '../src/core/cohort';

type Row = Record<string, string | number>;

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261012);
const normal = (m = 0, s = 1): number => m + s * Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
function pick<T>(items: readonly T[], probs: readonly number[]): T {
  let u = rand();
  for (let i = 0; i < items.length; i++) { u -= probs[i]; if (u < 0) return items[i]; }
  return items[items.length - 1];
}
const clamp = (x: number): number => Math.max(40, Math.min(160, Math.round(x)));
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * 86400000);
const composite = (vals: number[], r: number): number =>
  clamp(100 + (15 * vals.reduce((a, v) => a + (v - 100) / 15, 0)) / Math.sqrt(vals.length + vals.length * (vals.length - 1) * r));

const N = 60;
const rows: Row[] = [];
for (let i = 1; i <= N; i++) {
  const id = `SIM-${String(i).padStart(3, '0')}`;
  // Coded values use the canonical English codes of src/core/variables.ts.
  const etiology = pick(['autoimmune', 'infectious', 'unknown'], [0.3, 0.25, 0.45]);
  const status = pick(['full_recovery', 'sequelae'], [0.55, 0.45]);
  const sex = pick(['male', 'female'], [0.6, 0.4]);
  const residence = pick(['hcmc', 'other_province'], [0.35, 0.65]);
  const nSeizures = Math.floor(-Math.log(1 - rand()) * 2.2);
  const feverDays = Math.max(2, Math.round(6 + -Math.log(1 - rand()) * 5));
  const gcs = Math.max(4, Math.min(15, Math.round(normal(11.5, 2.2))));
  const ventDays = Math.max(2, Math.round(5 + -Math.log(1 - rand()) * 6));
  const icuDays = ventDays + Math.max(1, Math.round(normal(5, 3)));
  const hospitalDays = icuDays + Math.max(2, Math.round(normal(9, 6) + (etiology === 'autoimmune' ? 14 : 0)));
  // First assessment 6–24 months after discharge; scores recover with time, so earlier tests read lower.
  const firstGap = 186 + Math.floor(rand() ** 1.6 * 540);
  const recovery = 1.1 * (firstGap / 30.4375 - 6);
  const g0 = normal(status === 'full_recovery' ? 79 : 70, 10) + recovery + (residence === 'other_province' ? -9 : 0) - 1.2 * nSeizures;
  const discharge = addDays(new Date(Date.UTC(2023, 0, 5)), Math.floor(rand() * 420));
  const ageAtAssess = 6.3 + rand() * 9.5;
  const birth = addDays(addDays(discharge, firstGap), -Math.round(ageAtAssess * 365.25));
  const visits = [{ gap: firstGap, g: g0 }];
  if (rand() < 0.35 && addDays(discharge, firstGap + 365) < new Date(Date.UTC(2026, 8, 30))) visits.push({ gap: firstGap + 365, g: g0 + normal(etiology === 'autoimmune' ? 6 : 3, 4) });
  // Child-specific profile (stable across visits) plus small visit-to-visit noise.
  const off = { VCI: -2 + normal(0, 9), PRI: 3 + normal(0, 9), WMI: -5 + normal(0, 10), PSI: -3 + normal(0, 10) };
  for (const v of visits) {
    const s = {
      VCI: clamp(v.g + off.VCI + normal(0, 4)),
      PRI: clamp(v.g + off.PRI + normal(0, 4)),
      WMI: clamp(v.g + off.WMI + normal(0, 4)),
      PSI: clamp(v.g + off.PSI + normal(0, 4)),
    };
    const vals = [s.VCI, s.PRI, s.WMI, s.PSI];
    rows.push({
      id, birth_date: iso(birth), discharge_date: iso(discharge), assessment_date: iso(addDays(discharge, v.gap)),
      ...s,
      FSIQ: composite(vals, 0.55), GAI: composite([s.VCI, s.PRI], 0.6), CPI: composite([s.WMI, s.PSI], 0.45),
      reported_type: selectSummaryIndex(s).type,
      los: rand() < 0.85 ? Math.max(2, Math.min(5, Math.round((v.g - 40) / 14 + normal(0, 0.6)))) : '',
      mrs: etiology === 'autoimmune' ? Math.max(0, Math.min(5, Math.round((95 - v.g) / 15 + normal(0, 0.7)))) : '',
      etiology_group: etiology, discharge_status: status, sex, residence,
      n_seizures: nSeizures, fever_days: feverDays, gcs_admission: gcs,
      ventilation_days: ventDays, icu_days: icuDays, hospital_days: hospitalDays,
    });
  }
}

// Deliberate problems so the data check has something to show.
const byId = (id: string): Row => rows.find((r) => r.id === id) as Row;
rows[12].WMI = 7;
const r27 = byId('SIM-027');
r27.assessment_date = iso(addDays(new Date(String(r27.discharge_date)), 160));
const r41 = byId('SIM-041');
r41.reported_type = r41.reported_type === 'FSIQ' ? 'GAI' : 'FSIQ';
byId('SIM-050').GAI = '';

const csv = toCSV(TEMPLATE_HEADERS, rows);
const tmpl = toCSV(TEMPLATE_HEADERS, [rows[0]]);
const out = (p: string): URL => new URL(p, import.meta.url);
writeFileSync(out('../public/demo-cohort-synthetic.csv'), csv);
writeFileSync(out('../public/template.csv'), tmpl);
writeFileSync(out('../src/data/demoCohort.ts'),
  `// AUTO-GENERATED by scripts/make-synthetic.ts – SYNTHETIC data, not real patients.\nconst demoCohort: string = ${JSON.stringify(csv.replace(/^\uFEFF/, ''))};\nexport default demoCohort;\n`);
writeFileSync(out('../src/data/template.ts'),
  `// AUTO-GENERATED by scripts/make-synthetic.ts\nconst template: string = ${JSON.stringify(tmpl.replace(/^\uFEFF/, ''))};\nexport default template;\n`);
console.log(`Wrote ${rows.length} synthetic rows for ${N} children.`);
