// ENCOG – canonical (English) variable names and coded values for known categorical columns.
// Data are stored and exported with English codes; the UI translates them for display.
// Vietnamese headers and values in uploaded files are accepted and mapped to the codes.

export interface CategoricalLevel {
  /** Canonical English code stored in the data and exported. */
  code: string;
  /** Accepted spellings, already normalised with normalizeKey (lower case, no accents, "_" separators). */
  aliases: readonly string[];
}

export interface CategoricalVariable {
  /** Canonical English variable name. */
  key: string;
  /** Accepted column headers, normalised. */
  headers: readonly string[];
  levels: readonly CategoricalLevel[];
}

/** Lower-case, strip Vietnamese accents (including đ), non-alphanumerics to "_". */
export function normalizeKey(s: string): string {
  return s.replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export const CATEGORICAL_VARIABLES: readonly CategoricalVariable[] = [
  {
    key: 'discharge_status',
    headers: ['discharge_status', 'status_at_discharge', 'tinh_trang_xuat_vien', 'tinh_trang_xv', 'ket_qua_xuat_vien'],
    levels: [
      { code: 'full_recovery', aliases: ['full_recovery', 'recovered', 'hoi_phuc_hoan_toan', 'hoi_phuc', 'hpht'] },
      { code: 'sequelae', aliases: ['sequelae', 'with_sequelae', 'con_di_chung', 'di_chung'] },
    ],
  },
  {
    key: 'etiology_group',
    headers: ['etiology_group', 'etiology', 'aetiology', 'nhom_can_nguyen', 'can_nguyen', 'nhom_tac_nhan', 'tac_nhan'],
    levels: [
      { code: 'autoimmune', aliases: ['autoimmune', 'immune_mediated', 'tu_mien'] },
      { code: 'infectious', aliases: ['infectious', 'infection', 'nhiem_trung'] },
      { code: 'unknown', aliases: ['unknown', 'undetermined', 'khong_xac_dinh', 'chua_xac_dinh'] },
    ],
  },
  {
    key: 'residence',
    headers: ['residence', 'residence_group', 'noi_cu_tru', 'noi_o', 'cu_tru', 'dia_chi_nhom'],
    levels: [
      { code: 'hcmc', aliases: ['hcmc', 'ho_chi_minh_city', 'ho_chi_minh', 'tp_hcm', 'tphcm', 'tp_ho_chi_minh', 'sai_gon', 'city'] },
      { code: 'other_province', aliases: ['other_province', 'outside', 'outside_hcmc', 'province', 'tinh_khac', 'ngoai_tinh', 'ngoai_tp_hcm', 'tinh'] },
    ],
  },
  {
    key: 'sex',
    headers: ['sex', 'gender', 'gioi', 'gioi_tinh'],
    levels: [
      { code: 'male', aliases: ['male', 'm', 'nam'] },
      { code: 'female', aliases: ['female', 'f', 'nu'] },
    ],
  },
];

/** The known categorical variable a column header refers to, if any. */
export function matchCategorical(header: string): CategoricalVariable | null {
  const h = normalizeKey(header);
  return CATEGORICAL_VARIABLES.find((v) => v.headers.includes(h)) ?? null;
}

/** Canonical code for a raw value, or null when the value is not recognised. */
export function toLevelCode(variable: CategoricalVariable, raw: string): string | null {
  const v = normalizeKey(raw);
  if (!v) return null;
  const level = variable.levels.find((l) => l.aliases.includes(v));
  return level ? level.code : null;
}

/** Known numeric clinical variables (used as exposures in the association analysis). */
export interface NumericVariable {
  key: string;
  headers: readonly string[];
  /** Plausible range; values outside raise a warning. */
  min: number;
  max: number;
}

export const NUMERIC_VARIABLES: readonly NumericVariable[] = [
  { key: 'n_seizures', headers: ['n_seizures', 'seizure_count', 'number_of_seizures', 'so_con_co_giat', 'so_con_giat'], min: 0, max: 500 },
  { key: 'fever_days', headers: ['fever_days', 'fever_duration', 'so_ngay_sot', 'thoi_gian_sot'], min: 0, max: 120 },
  { key: 'gcs_admission', headers: ['gcs_admission', 'gcs', 'admission_gcs', 'gcs_nhap_vien', 'gcs_luc_nhap_vien'], min: 3, max: 15 },
  { key: 'ventilation_days', headers: ['ventilation_days', 'mv_days', 'mechanical_ventilation_days', 'so_ngay_tho_may'], min: 0, max: 365 },
  { key: 'icu_days', headers: ['icu_days', 'icu_los', 'so_ngay_nam_icu', 'thoi_gian_nam_icu', 'so_ngay_hoi_suc'], min: 0, max: 365 },
  { key: 'hospital_days', headers: ['hospital_days', 'hospital_los', 'length_of_stay', 'so_ngay_nam_vien', 'thoi_gian_nam_vien'], min: 0, max: 730 },
];

export function matchNumeric(header: string): NumericVariable | null {
  const h = normalizeKey(header);
  return NUMERIC_VARIABLES.find((v) => v.headers.includes(h)) ?? null;
}
