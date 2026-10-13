# Đóng góp / Contributing

- Báo lỗi hoặc đề xuất qua GitHub Issues. **Không đính kèm dữ liệu bệnh nhân thật**, kể cả đã bỏ tên.
- Trước khi gửi pull request: `npm run typecheck` và `npm test` phải đạt.
- Kiểu dữ liệu dùng chung khai báo ở `src/types.ts`. Logic tính toán đặt ở `src/core/` (hàm thuần, không phụ thuộc React) và phải có test trong `tests/`.
- Văn bản giao diện ở `src/i18n/vi.ts` (định nghĩa kiểu `Dict`) và `src/i18n/en.ts` (khai báo `const en: Dict`), nên thiếu khóa sẽ lỗi khi biên dịch.
- Không đưa vào kho mã câu hỏi, dụng cụ, bảng chuẩn hay bảng quy đổi điểm của WISC-IV hoặc trắc nghiệm có bản quyền khác.

- Report bugs through GitHub Issues; never attach real patient data.
- Run `npm run typecheck` and `npm test` before opening a pull request.
- Shared types live in `src/types.ts`; pure logic in `src/core/` with tests in `tests/`.
- UI strings: `src/i18n/vi.ts` defines `Dict`; `src/i18n/en.ts` is typed as `Dict`.
- Do not add items, materials or norm tables from copyrighted tests.
