# Từ điển dữ liệu (file CSV nhóm) / Data dictionary

Mỗi dòng là **một lần đánh giá**. Một trẻ có nhiều lần đánh giá thì có nhiều dòng cùng mã. Tên cột không phân biệt hoa thường và dấu tiếng Việt; có thể dùng tên tiếng Việt trong cột "Tên khác".

Each row is **one assessment**. Column names are case- and accent-insensitive; Vietnamese aliases are accepted.

| Cột | Tên khác được nhận | Bắt buộc | Định dạng | Ý nghĩa |
|---|---|---|---|---|
| `id` | `ma`, `ma_tre`, `ma_so`, `child_id`, `code` | Nên có | Văn bản | Mã trẻ, **không dùng họ tên** |
| `birth_date` | `ngay_sinh`, `dob` | Không | YYYY-MM-DD hoặc DD/MM/YYYY | Ngày sinh |
| `discharge_date` | `ngay_xuat_vien` | Không | như trên | Ngày xuất viện |
| `assessment_date` | `ngay_danh_gia`, `test_date` | Không | như trên | Ngày đánh giá WISC-IV |
| `VCI`, `PRI`, `WMI`, `PSI` | – | **Có** | Số nguyên 40–160 | Bốn chỉ số |
| `FSIQ`, `GAI`, `CPI` | – | Không | Số nguyên 40–160 | Chỉ số tổng ghi trên phiếu kết quả |
| `reported_type` | `loai_chi_so`, `index_type` | Không | FSIQ / GAI / CPI / NONE | Loại chỉ số tổng bác sĩ tâm lý đã báo cáo |
| `los` | `liverpool` | Không | 1–5 | Liverpool Outcome Score |
| `mrs` | `rankin` | Không | 0–6 | Modified Rankin Scale |
| `discharge_status` | `tinh_trang_xuat_vien` | Không | Mã (bảng dưới) | Tình trạng lúc xuất viện |
| `etiology_group` | `nhom_can_nguyen`, `nhom_tac_nhan`, `etiology` | Không | Mã (bảng dưới) | Nhóm căn nguyên |
| `sex` | `gioi_tinh`, `gender` | Không | Mã (bảng dưới) | Giới tính |
| `residence` | `noi_cu_tru`, `noi_o` | Không | Mã (bảng dưới) | Nơi cư trú |
| `n_seizures` | `so_con_co_giat`, `seizure_count` | Không | Số 0–500 | Số cơn co giật trong đợt bệnh |
| `fever_days` | `so_ngay_sot`, `fever_duration` | Không | Số 0–120 | Số ngày sốt |
| `gcs_admission` | `gcs`, `gcs_nhap_vien` | Không | Số 3–15 | GCS lúc nhập viện |
| `ventilation_days` | `so_ngay_tho_may`, `mv_days` | Không | Số 0–365 | Số ngày thở máy |
| `icu_days` | `so_ngay_nam_icu`, `icu_los` | Không | Số 0–365 | Số ngày nằm hồi sức |
| `hospital_days` | `so_ngay_nam_vien`, `hospital_los` | Không | Số 0–730 | Số ngày nằm viện |
| *các cột khác* | – | Không | Văn bản hoặc số | Văn bản: dùng để chia nhóm nếu có 2–8 giá trị khác nhau. Số (≥ 90% giá trị là số, ≥ 3 giá trị khác nhau): dùng trong phân tích yếu tố liên quan. Tên cột được giữ nguyên |

## Mã hóa biến phân loại / Coded values

ENCOG **ưu tiên tiếng Anh**: dữ liệu được lưu và xuất bằng mã tiếng Anh; giao diện hiển thị nhãn theo ngôn ngữ đang chọn. File ghi giá trị tiếng Việt (có hoặc không dấu) vẫn đọc được và được quy đổi sang mã. Giá trị không nhận diện được giữ nguyên và có cảnh báo `unknownLevel`.

ENCOG is **English-first**: values are stored and exported as English codes and translated only for display.

| Biến | Mã (lưu và xuất) | Nhãn tiếng Anh | Nhãn tiếng Việt | Giá trị tiếng Việt được chấp nhận |
|---|---|---|---|---|
| `discharge_status` | `full_recovery` | Full recovery | Hồi phục hoàn toàn | Hồi phục hoàn toàn, Hồi phục, HPHT |
| | `sequelae` | Sequelae | Còn di chứng | Còn di chứng, Di chứng |
| `etiology_group` | `autoimmune` | Autoimmune | Tự miễn | Tự miễn |
| | `infectious` | Infectious | Nhiễm trùng | Nhiễm trùng |
| | `unknown` | Unknown | Không xác định | Không xác định, Chưa xác định |
| `residence` | `hcmc` | Ho Chi Minh City | TP. Hồ Chí Minh | TP.HCM, TPHCM, Hồ Chí Minh |
| | `other_province` | Other province | Tỉnh khác | Tỉnh khác, Ngoại tỉnh |
| `sex` | `male` | Male | Nam | Nam, M |
| | `female` | Female | Nữ | Nữ, F |

Muốn thêm biến hoặc mức mới: sửa `src/core/variables.ts` (mã và cách viết được chấp nhận) và thêm nhãn trong `vars` của `src/i18n/vi.ts` và `src/i18n/en.ts`.

File có thể ngăn cách bằng dấu phẩy hoặc dấu chấm phẩy (Excel tiếng Việt), mã hóa UTF-8. Số thập phân dùng dấu phẩy được tự đổi.

## Biến dẫn xuất khi xuất file (`encog-derived.csv`)

| Biến | Ý nghĩa |
|---|---|
| `months_since_discharge` | (Ngày đánh giá − Ngày xuất viện) / 30,4375 |
| `age_years` | Tuổi lúc đánh giá (năm) |
| `spread`, `vci_pri_diff`, `wmi_psi_diff` | Các mức chênh dùng trong quy tắc |
| `rule_index` | FSIQ / GAI / CPI / NONE theo quy tắc |
| `rule_matches_reported` | 1 nếu khớp `reported_type`, 0 nếu không |
| `summary_value`, `summary_band` | Giá trị và mức của chỉ số tổng theo quy tắc |
| `summary_below_70` | 1 / 0 – kết cục chính |
| `uneven_profile` | 1 nếu chênh ≥ ngưỡng |
| `lowest_index` | Chỉ số thấp nhất (nếu bằng nhau: nối bằng "/") |
| `n_indexes_below_70` | Số chỉ số < 70 |
| `next_due` | Ngày đề xuất đánh giá lại |
| `n_errors`, `n_warnings` | Số lỗi / cảnh báo của dòng |
| `discharge_status`, `etiology_group`, `sex`, … | Các cột chia nhóm, bằng mã tiếng Anh |

Ví dụ nhập vào Stata: `import delimited "encog-derived.csv", encoding(utf8) clear`.
