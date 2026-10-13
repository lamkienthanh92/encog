# Kế hoạch đánh giá công cụ – báo cáo tiền pha 2

ENCOG được xây dựng **sau** khi pha 1 đã thu thập dữ liệu (32 trẻ, đánh giá WISC-IV từ 6 tháng sau xuất viện). Vì vậy dữ liệu pha 1 không được thu bằng ENCOG; chúng được dùng để **kiểm chứng hồi cứu** công cụ. Dữ liệu bệnh nhân không được đưa lên kho mã.

## A. Đánh giá đã làm được ngay (hồi cứu, không cần tuyển thêm bệnh nhân)

| # | Câu hỏi | Cách làm | Chỉ số | Trạng thái |
|---|---|---|---|---|
| A1 | Quy tắc của ENCOG có tái lập lựa chọn chỉ số của chuyên viên tâm lý? | Nhập 4 chỉ số của 32 ca (đã mã hóa) vào chế độ Nhóm, so `rule_index` với `reported_type` | Tỉ lệ khớp | **Hoàn thành: 32/32** (FSIQ 15, GAI 13, CPI 4) |
| A2 | Bộ kiểm tra dữ liệu bắt được bao nhiêu lỗi đã gặp khi nhập tay? | Đưa các lỗi thực tế về nhận thức và thời điểm (ví dụ WMI = 7, đánh giá < 6 tháng, tuổi tròn 16) vào bộ test | Tỉ lệ phát hiện | Cần làm; lưu ý lỗi ở biến xét nghiệm nằm ngoài phạm vi ENCOG |
| A3 | Người dùng có dùng được không? | 5–10 người (bác sĩ hồi sức, bác sĩ tâm lý, nghiên cứu viên) làm 3 nhiệm vụ: nhập 1 ca, in báo cáo gia đình, tải file nhóm | Thang SUS (System Usability Scale), mục tiêu ≥ 68; số lỗi thao tác | Cần làm |
| A4 | Có tiết kiệm thời gian không? | 10 ca: soạn báo cáo bằng tay so với dùng ENCOG | Phút/ca | Cần làm |

Nên viết là "**tái lập** quyết định lâm sàng" cho A1, không viết "thẩm định", vì đây mới là sự khớp với thực hành của một chuyên viên tâm lý tại một trung tâm.

## B. Pha 2 (tiến cứu)

- Đưa ENCOG vào quy trình tái khám: hẹn đánh giá lúc 6 tháng, đánh giá lại lúc 18 tháng cho trẻ có chỉ số tổng < 80 hoặc hồ sơ không đồng đều.
- Phối hợp thêm Liverpool Outcome Score, Vineland (khi chỉ số tổng < 70), SDQ (xem `LITERATURE.md`).
- Chỉ số triển khai: tỉ lệ trẻ được hẹn, tỉ lệ quay lại, thời gian từ đánh giá đến có báo cáo, tỉ lệ trẻ có chỉ số thấp được chuyển can thiệp.
- Hiểu báo cáo của phụ huynh (thang Likert 5 mức) – cần bổ sung đề cương và Hội đồng Đạo đức.

## C. Những điều không tuyên bố

- Không tuyên bố ENCOG cải thiện kết cục cho trẻ (chưa có dữ liệu can thiệp).
- Không tuyên bố chẩn đoán khuyết tật trí tuệ.
- Không tuyên bố tính tổng quát cho trẻ viêm não không nằm hồi sức.
