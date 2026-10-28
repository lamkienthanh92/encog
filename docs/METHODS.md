# Phương pháp / Methods

## 1. Phạm vi

ENCOG làm việc với **điểm chỉ số đã được chấm** (VCI, PRI, WMI, PSI và, nếu có, FSIQ, GAI, CPI) do người đã được đào tạo chấm bằng bộ WISC-IV có bản quyền (tại Việt Nam: WISC-IV-VN). ENCOG không chấm tiểu test, không tính chỉ số tổng hợp, không chứa câu hỏi hay bảng chuẩn, và không chẩn đoán.

ENCOG works with **index scores already obtained** by a trained examiner using a licensed WISC-IV kit. It does not score subtests, compute composites, contain items or norm tables, or diagnose.

## 2. Chọn chỉ số tổng / Choosing the summary index

Với ngưỡng *T* (mặc định 23 điểm = 1,5 độ lệch chuẩn):

| Điều kiện | Chỉ số tổng |
|---|---|
| max(4 chỉ số) − min(4 chỉ số) < *T* | FSIQ |
| ngược lại, và \|VCI − PRI\| < *T* | GAI |
| ngược lại | Không dùng chỉ số tổng; diễn giải hồ sơ 4 chỉ số (CPI là điểm bổ sung nếu \|WMI − PSI\| < *T*) — từ 0.4.0 |

Nguồn: Flanagan & Kaufman (2009); Weiss và cs. (2006); Raiford và cs. (2005). Ngưỡng có thể chỉnh trong giao diện (10–40).

**Lưu ý về CPI.** CPI phản ánh trí nhớ công việc và tốc độ xử lý, không phải năng lực suy luận chung. Từ 0.4.0, ENCOG không dùng CPI thay cho FSIQ/GAI; khi WMI và PSI đồng đều, CPI chỉ được hiện như điểm bổ sung kèm cảnh báo. Tùy chọn `allowCpiSummary` (chỉ trong mã, không có trên giao diện) tái lập quy tắc cũ (0.3.0) để so sánh hồi cứu với thực hành tại khoa.

## 3. Mức phân loại / Bands

| Điểm | Mức |
|---|---|
| < 70 | Rất thấp |
| 70–79 | Ranh giới |
| 80–89 | Trung bình thấp |
| 90–109 | Trung bình |
| 110–119 | Trung bình cao |
| 120–129 | Cao |
| ≥ 130 | Rất cao |

Chỉ số tổng < 70 kèm khuyến nghị đánh giá hành vi thích ứng trước khi kết luận khuyết tật trí tuệ. Thứ hạng phần trăm được **ước tính** từ phân phối chuẩn (trung bình 100, ĐLC 15); ưu tiên thứ hạng in trên phiếu kết quả.

## 4. Lĩnh vực cần hỗ trợ

Một chỉ số được xem là lĩnh vực cần hỗ trợ khi < 80 **hoặc** thấp hơn trung bình 4 chỉ số của chính trẻ từ 15 điểm trở lên. Gợi ý hỗ trợ là các điều chỉnh giáo dục chung, không phải can thiệp điều trị.

## 5. Thời điểm / Timing

- 1 tháng = 30,4375 ngày.
- Cảnh báo khi ngày đánh giá sớm hơn mốc 6 tháng lịch sau xuất viện.
- Cảnh báo khi tuổi lúc đánh giá ngoài 6 tuổi 0 tháng – 16 tuổi 11 tháng (khoảng áp dụng WISC-IV).
- Khi chỉ số tổng < 80, hồ sơ không đồng đều hoặc có chỉ số < 70: đề xuất đánh giá lại ở **mốc mặc định 18 tháng sau xuất viện**, nếu mốc này cách lần đánh giá hiện tại ít nhất 12 tháng (hạn chế hiệu ứng làm quen; Calamia và cs. 2012); nếu không, đề xuất 12 tháng sau lần đánh giá hiện tại. Đây là mặc định theo kế hoạch theo dõi tại chỗ, **không phải lịch tối ưu đã được chứng minh**; thời điểm đánh giá lại tối ưu sau viêm não chưa được xác lập.

## 6. Thống kê nhóm / Cohort statistics

- Mỗi trẻ được tính **một lần**, ở lần đánh giá sớm nhất có đủ 4 chỉ số. Dòng trùng mã và ngày đánh giá bị loại.
- Tỉ lệ: khoảng tin cậy 95% Wilson (Wilson 1927).
- So sánh 2 nhóm: kiểm định chính xác Fisher hai phía. Với > 2 nhóm chỉ báo cáo tỉ lệ và khoảng tin cậy.
- Mô tả: trung bình ± ĐLC, trung vị (tứ phân vị; quantile kiểu 7).
- Quỹ đạo: trẻ có ≥ 2 lần đánh giá, trục ngang là tháng sau xuất viện.

## 6b. Thời điểm đánh giá và yếu tố liên quan / Timing and associated factors

Trong nghiên cứu pha 1, trẻ có chỉ số tổng < 70 được đánh giá sớm hơn (trung vị 9,2 so với 17,2 tháng) và các mối liên quan với số cơn co giật, số ngày sốt giảm mạnh sau khi hiệu chỉnh theo thời gian đánh giá. Vì vậy ENCOG báo cáo:

- **Thời gian từ xuất viện đến đánh giá** theo nhóm < 70 / ≥ 70: trung vị (tứ phân vị), kiểm định Mann–Whitney hai phía (xấp xỉ chuẩn, hiệu chỉnh hạng trùng và hiệu chỉnh liên tục; giống `scipy.stats.mannwhitneyu(method='asymptotic')`).
- **Tương quan Spearman** giữa thời gian và chỉ số tổng (p theo xấp xỉ t).
- **Hồi quy logistic Firth** (Firth 1993; Heinze & Schemper 2002) cho kết cục chỉ số tổng < 70: OR chưa hiệu chỉnh và OR hiệu chỉnh theo thời gian đánh giá (tháng). Phương pháp phạt Jeffreys cho ước lượng hữu hạn khi có tách biệt (ví dụ mọi trẻ có kết cục cùng một nhóm). KTC 95% theo hồ sơ khả năng phạt, p theo kiểm định tỉ số khả năng phạt (như gói R `logistf`). Kết quả được đối chiếu với một cài đặt Python độc lập trong `tests/regression.test.ts`.
- Biến đưa vào: mỗi cột chia nhóm có đúng 2 giá trị (mức tham chiếu: mức đầu trong danh mục mã hóa, hoặc mức nhiều trẻ hơn) và mỗi cột số. Mỗi mô hình chỉ có **một biến cùng thời gian đánh giá**, vì số kết cục thường ít (quy tắc ≥ 10 kết cục cho mỗi biến). Đây là phân tích thăm dò, không phải mô hình tiên lượng.
- **Hồ sơ chỉ số theo nhóm**: trung vị bốn chỉ số và chỉ số tổng cho mỗi mức của biến chia nhóm (mô tả).

## 7. Kiểm tra dữ liệu / Data checks

| Mã | Mức | Điều kiện |
|---|---|---|
| missing, notNumber, outOfRange | Lỗi | Chỉ số bắt buộc trống, không phải số, ngoài 40–160 |
| notInteger | Cảnh báo | Chỉ số không nguyên |
| badDate, dischargeBeforeBirth, assessmentBeforeDischarge | Lỗi | Ngày sai định dạng hoặc sai thứ tự |
| earlyAssessment | Cảnh báo | Đánh giá < 6 tháng sau xuất viện |
| ageOutOfRange | Cảnh báo | Tuổi ngoài 6:0–16:11 |
| typeMismatch | Cảnh báo | Loại chỉ số đã ghi khác với quy tắc |
| summaryMissing | Cảnh báo | Quy tắc chọn một chỉ số tổng chưa được nhập |
| losRange, mrsRange | Lỗi | LOS ngoài 1–5, mRS ngoài 0–6 |
| duplicate | Lỗi | Trùng mã trẻ và ngày đánh giá |
| numericNotNumber | Cảnh báo | Cột số lâm sàng có giá trị không phải số (bị bỏ qua) |
| numericRange | Cảnh báo | Biến số lâm sàng ngoài khoảng hợp lý (bị bỏ qua) |

ENCOG chỉ kiểm tra các biến về nhận thức và thời điểm. Biến lâm sàng và cận lâm sàng (xét nghiệm, điều trị) nên được kiểm tra ở hệ thống nhập liệu (ví dụ REDCap).

## 8. Hạn chế

- Quy tắc 23 điểm là quy ước lâm sàng, không phải tiêu chuẩn vàng; các tác giả khác nhau dùng ngưỡng khác nhau.
- ENCOG phụ thuộc hoàn toàn vào độ chính xác của điểm được nhập.
- Bản hiện tại mới được kiểm chứng hồi cứu; đánh giá tiến cứu nằm trong kế hoạch pha 2 (xem `VALIDATION_PLAN.md`).

## Tài liệu tham khảo

- Flanagan DP, Kaufman AS. *Essentials of WISC-IV Assessment.* 2nd ed. Hoboken (NJ): Wiley; 2009.
- Weiss LG, Saklofske DH, Prifitera A, Holdnack JA. *WISC-IV Advanced Clinical Interpretation.* Burlington (MA): Academic Press; 2006.
- Raiford SE, Weiss LG, Rolfhus E, Coalson D. *General Ability Index.* WISC-IV Technical Report No. 4. San Antonio (TX): Harcourt Assessment; 2005.
- Dang HM, Weiss B, Pollack A, Nguyen MC. Adaptation of the Wechsler Intelligence Scale for Children-IV (WISC-IV) for Vietnam. *Psychol Stud (Mysore).* 2012;56(4):387–392.
- Firth D. Bias reduction of maximum likelihood estimates. *Biometrika.* 1993;80:27–38.
- Heinze G, Schemper M. A solution to the problem of separation in logistic regression. *Stat Med.* 2002;21:2409–2419.
- Wilson EB. Probable inference, the law of succession, and statistical inference. *J Am Stat Assoc.* 1927;22:209–212.
