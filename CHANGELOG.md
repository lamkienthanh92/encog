# Nhật ký phiên bản / Changelog

## 0.4.0 – 2026-10-28

Sửa theo nhận xét phản biện / Changes after peer review:
- **CPI không còn thay thế FSIQ/GAI.** Khi cả FSIQ và GAI không đại diện, ENCOG diễn giải hồ sơ bốn chỉ số; CPI (nếu WMI–PSI < 23) chỉ là điểm bổ sung kèm cảnh báo `cpiSupplementary`. Tùy chọn `allowCpiSummary` tái lập quy tắc cũ để so sánh hồi cứu.
  *The CPI no longer substitutes for FSIQ/GAI; when neither is representative the four-index profile is interpreted and the CPI is shown only as a supplementary score. `allowCpiSummary` reproduces the earlier rule for retrospective comparison.*
- **Chỉ số không nguyên bị chặn** (trước đây chỉ cảnh báo). *Non-integer index scores now block the analysis.*
- **Khoảng cách tối thiểu giữa hai lần test tăng từ 6 lên 12 tháng**; mốc 18 tháng được ghi rõ là mặc định tại chỗ, không phải lịch tối ưu. *Minimum re-test gap raised from 6 to 12 months; the 18-month visit is labelled a configurable local default, not an optimal schedule.*
- Bộ kiểm chứng độc lập `tests/verification.test.ts` (lưới 2,8 triệu hồ sơ, mọi giá trị biên 22/23, 1 triệu hồ sơ ngẫu nhiên, input sai, ngày tái khám). *Independent verification suite added.*

## 0.3.0 – 2026-10-13

Phát triển theo kết quả bài báo pha 1 (32 trẻ, Pediatric Neurology – đang gửi): trẻ có chỉ số tổng < 70 được đánh giá sớm hơn, và thời điểm đánh giá làm nhiễu các mối liên quan.
Developed from the phase-1 manuscript findings: assessment timing confounded the associations with a summary index < 70.

**Phân tích nhóm / Cohort analysis**
- *Thời điểm đánh giá và chỉ số tổng*: biểu đồ phân tán (tháng sau xuất viện × chỉ số tổng), trung vị thời gian theo nhóm < 70 / ≥ 70 (Mann–Whitney), tương quan Spearman.
- *Yếu tố liên quan với chỉ số tổng < 70*: hồi quy logistic Firth (`src/core/regression.ts`), khoảng tin cậy 95% theo hồ sơ khả năng phạt, p theo tỉ số khả năng phạt; mỗi biến có OR chưa hiệu chỉnh và OR hiệu chỉnh theo thời gian đánh giá; biểu đồ forest thang log.
- *Hồ sơ chỉ số theo nhóm*: bảng màu trung vị VCI, PRI, WMI, PSI và chỉ số tổng cho mỗi mức của biến chia nhóm.
- Phân tích độ nhạy thêm dòng "bỏ các trẻ dùng CPI".
- Biến số lâm sàng mới (mã tiếng Anh, nhận tên cột tiếng Việt): `n_seizures`, `fever_days`, `gcs_admission`, `ventilation_days`, `icu_days`, `hospital_days`; cột số chưa biết (≥ 90% là số, ≥ 3 giá trị) cũng được dùng. Kiểm tra mới: `numericNotNumber`, `numericRange`.
- Biến phân loại mới `residence` (`hcmc`, `other_province`).
- File xuất `encog-derived.csv` có thêm các cột số.

**Một trẻ / Single child**
- Lịch đánh giá lại cố định: đề xuất mốc 18 tháng sau xuất viện (cách lần trước ≥ 6 tháng); nếu đã qua hoặc quá gần thì sau 12 tháng.

**Khác / Other**
- Thống kê mới trong `stats.ts`: hạng trung bình, Mann–Whitney (xấp xỉ chuẩn, hiệu chỉnh hạng trùng và liên tục), Spearman, phân phối t và χ².
- Giá trị p hiển thị "p = 0,018" / "p < 0,001" (trước đây "p = <0,001").
- Dữ liệu giả lập thêm biến lâm sàng và hiệu ứng hồi phục theo thời gian.
- 55 bài kiểm thử (hồi quy Firth, Mann–Whitney, Spearman đối chiếu với Python/SciPy).

## 0.2.2 – 2026-10-12

**Ưu tiên tiếng Anh, hiển thị theo ngôn ngữ / English-first data, localised display**
- Biến phân loại có mã tiếng Anh chuẩn (`src/core/variables.ts`): `discharge_status` (`full_recovery`, `sequelae`), `etiology_group` (`autoimmune`, `infectious`, `unknown`), `sex` (`male`, `female`). Dữ liệu được lưu và xuất bằng mã; file ghi tiếng Việt được tự quy đổi; giá trị lạ có cảnh báo `unknownLevel`.
- Giao diện hiển thị tên biến và giá trị theo ngôn ngữ đang chọn (ô chọn nhóm, nhãn biểu đồ so sánh nhóm, danh sách cột nhận diện, thông báo lỗi).
- Số thập phân theo ngôn ngữ ở thứ hạng phần trăm và giá trị p (0.5 / 0,5; <0.001 / <0,001).
- File xuất `encog-derived.csv` có thêm các cột chia nhóm bằng mã tiếng Anh.
- Dữ liệu giả lập dùng mã tiếng Anh; mã ví dụ đổi thành `EX-01`; tên file lưu hồ sơ bằng tiếng Anh; nhãn chọn ngôn ngữ theo ngôn ngữ đang dùng; số ít/số nhiều đúng trong tiếng Anh.
- 45 bài kiểm thử.

## 0.2.1 – 2026-10-12

**Biểu đồ**
- Box plot viết lại: hộp căn giữa đúng nhãn, các chấm từng trẻ đặt chồng lên hộp, hộp rộng theo cột, râu theo Tukey (1,5 × khoảng tứ phân vị), giá trị ngoại lai có viền đỏ. Nhóm dưới 4 trẻ chỉ hiện chấm. Rê chuột vào cột để xem n, trung vị, khoảng tứ phân vị, trung bình.
- Trục điểm chuẩn tự co theo dữ liệu (từ 40 tới mốc 15 điểm kế tiếp, trong khoảng 100–160), không còn để trống phần trên.
- Quỹ đạo: trục thời gian bắt đầu từ mốc gần dữ liệu nhất; làm nổi một trẻ khi rê chuột bằng CSS thay vì state.
- Phụ đề biểu đồ không còn bị ngắt dòng lẻ.

**Code React**
- Tooltip tách thành component riêng (`forwardRef` + `useImperativeHandle`): rê chuột không còn vẽ lại toàn bộ biểu đồ.
- `useElementWidth` đo bằng `useLayoutEffect` trước khi vẽ, bỏ chiều rộng giả định ban đầu và giới hạn tối thiểu 260 px.
- `App` tách `AppShell` và `Notice` nằm trong `LanguageProvider`, bỏ các lần gọi `makeT` trực tiếp.
- `useMemo` cho dữ liệu đầu vào của biểu đồ và danh sách lỗi dữ liệu.
- Thêm kiểu `BoxStats`, hàm `boxStats`, `scoreDomainMax`, `scoreTicks` và 3 bài test (tổng 42).

## 0.2.0 – 2026-10-12

- Viết lại toàn bộ bằng **React 18 + TypeScript** (chế độ `strict`), khai báo kiểu cho mọi dữ liệu, hàm và props (`src/types.ts`).
- Giao diện mới nền trắng: thanh điều hướng gọn, khung nhập liệu theo nhóm, thẻ chỉ số (KPI), thông báo và gợi ý rõ ràng.
- Biểu đồ làm lại, tự co giãn theo khung, có tên trục, chú giải và tooltip khi rê chuột: thước điểm chuẩn có dải phân loại, histogram, thanh ngang có nền tỉ lệ, box plot kèm điểm từng trẻ, forest plot so sánh nhóm (có đường tỉ lệ toàn nhóm), quỹ đạo theo thời gian (rê chuột để làm nổi một trẻ), LOS, phân tích độ nhạy FSIQ dạng forest plot.
- Từ điển tiếng Anh được kiểu hóa theo từ điển tiếng Việt: thiếu khóa sẽ báo lỗi khi biên dịch.
- Kiểm thử chuyển sang TypeScript (39 bài, chạy bằng `tsx --test`); CI thêm bước `typecheck`.

## 0.1.0 – 2026-10-12

Bản đầu tiên (JavaScript).
