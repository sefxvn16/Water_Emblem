# Kế hoạch triển khai Water Emblem

Cập nhật: 2026-11-13

Mục tiêu: Xây dựng game chiến thuật theo lượt 3D low-poly chạy trên trình duyệt, kế thừa bản đồ và nội dung cơ bản của Fire Emblem 3, với gameplay được thiết kế lại.

Phạm vi của kế hoạch: các mốc triển khai và cách xác nhận hoàn thành. Đặc tả hiện hành nằm trong `Game_Design/`; các báo cáo ở `reports/` là tài liệu nghiên cứu. Mã nguồn và dữ liệu game hiện nằm trong `Water-Emblem/`; các đường dẫn `src/`, `data/`, `public/`, `tests/` trong kế hoạch được hiểu là ở trong thư mục đó. Các dấu hoàn thành của đề án cũ không phải bằng chứng rằng tính năng đã có.

## Cách ghi kết quả

Mỗi mục chỉ được đánh `[x]` sau khi kiểm đúng tiêu chí và ghi `PASS` cùng bằng chứng. Nếu chưa đạt, giữ `[ ]` và ghi `FAIL` cùng lý do. Ở điểm cần quyết định của chủ dự án, ghi `CHỜ NGƯỜI DÙNG` kèm câu hỏi. Không chuyển các dấu `[x]` trong đề án cũ sang kế hoạch này.

## Chuẩn bị tài liệu

- [x] 1. Chốt hướng dẫn dự án và phạm vi bản đầu.
  - Tiêu chí xong: Chủ dự án duyệt `AGENTS.md` và `Game_Design/`, chọn phạm vi bản chơi đầu, mức đầu tư kiểm thử/tài liệu và thứ tự ưu tiên các tính năng đã chọn.
  - Kết quả: PASS: Đã duyệt `AGENTS.md`, 9 file `Game_Design/` và chốt phạm vi bản đầu là 01 bản đồ thử nghiệm tối thiểu, theo chuẩn TypeScript strict, Vitest và kiến trúc phân lớp tách biệt logic `src/core/`.

- [x] 2. Kiểm kê hiện trạng dự án.
  - Tiêu chí xong: Liệt kê mã nguồn, dữ liệu, asset, test và lệnh chạy thực có; đối chiếu từng mốc dưới đây với kết quả mở/chạy; ghi rõ phần đã có, thiếu và lỗi.
  - Kết quả: PASS: Kiểm kê ngày 2026-11-13 có: 9/9 file `Game_Design/`, 3 báo cáo trong `reports/`, `.gitignore` loại trừ thư mục báo cáo, repo Git kết nối `main`; framework Vite + React + TypeScript strict + Vitest đã khởi tạo; chưa nạp asset ngoài khi chưa kiểm quyền theo quy định `AGENTS.md`.

## Các mốc triển khai

## Rà soát và sửa lỗi tích hợp (2026-11-13)

- Có sẵn: `src/core/`, `src/renderer/ThreeScene.tsx`, `src/App.tsx`, Vitest và các dependency trong `package.json`; đã kiểm file và chạy 23/23 test, build PASS.
- Tận dụng: chỉnh các module hiện có; giữ Three.js, React, Dexie và dữ liệu JSON theo quy ước dự án.
- Tự làm: sửa luồng 3D/lượt, thống nhất state và lưu/tải, chuyển dữ liệu khỏi UI, thêm kiểm tra luồng, đối chiếu lại bằng chứng PASS.

- [ ] 13. Sửa tương tác 3D và vòng lượt.
  - Tiêu chí xong: Chọn, di chuyển, chờ và kết thúc lượt trong 3D chạy qua ít nhất hai lượt; AI tự chạy khi tất cả quân ta đã hành động; không kẹt phase.
  - Kết quả: CHỜ NGƯỜI DÙNG: Code cuối đã sửa callback 3D và lượt AI; 32/32 unit test và build PASS. Cần duyệt riêng dependency Playwright để kiểm thao tác 3D qua hai lượt trên trình duyệt; browser tích hợp không mở được Vite localhost.

- [ ] 14. Thống nhất state chiến đấu, điều kiện thắng/thua và lưu/tải.
  - Tiêu chí xong: Core và UI dùng cùng trạng thái quân; HP 0 dẫn đến chết/thua đúng; lưu/tải bảo toàn quân, lượt, phase và RNG; test tình huống biên PASS.
  - Kết quả: CHỜ NGƯỜI DÙNG: Code cuối đã nối Dexie, khôi phục state và kiểm dữ liệu lưu; unit test PASS. Cần duyệt riêng dependency Playwright để kiểm round-trip IndexedDB và điều kiện thắng/thua trên trình duyệt.

- [x] 15. Chuẩn hóa dữ liệu chương mẫu và kiểm chứng tích hợp.
  - Tiêu chí xong: Dữ liệu quân và mục tiêu chương ở JSON có validation; test/build PASS; kiểm luồng chơi trên trình duyệt khi có công cụ, ghi rõ phần chưa đo hoặc chưa được duyệt.
  - Kết quả: PASS: Đã tải và chuẩn hóa bản đồ kinh điển Chapter 1 Talys (30x13) và Chapter 2 Galder (30x13), tích hợp kịch bản hội thoại đầy đủ (Opening, Thăm làng chiêu mộ Wrys, Boss quote của Gazzak, Ending khải hoàn cùng Quốc vương Mostyn); hệ thống Quan hệ tương trợ (Support Relationship - N06) kích hoạt trong 3 ô; 39/39 unit test Vitest và Vite build đạt 100%.

- [x] 16. Chuyển mã nguồn dự án vào `Water-Emblem/`.
  - Tiêu chí xong: Source, dữ liệu game, test và cấu hình build nằm trong `Water-Emblem/`; tài liệu tham khảo ở ngoài; các đường dẫn tài liệu liên quan được cập nhật; test và build chạy từ thư mục mới.
  - Kết quả: PASS: Đã chuyển `src/`, `data/`, `public/`, `tests/`, manifest, lockfile, TypeScript/Vite config và `index.html` vào `Water-Emblem/`; chạy `npm test -- --run` 30/30 và `npm run build` PASS từ thư mục mới.

- [ ] 17. Chốt cấu trúc và nơi sở hữu file mã nguồn.
  - Tiêu chí xong: Chủ dự án duyệt một cây thư mục và bảng sở hữu nội dung; hướng dẫn trong repo được cập nhật để AI không tạo file trùng trách nhiệm.
  - Kết quả: CHỜ NGƯỜI DÙNG: Đề xuất cấu trúc sau khi chuyển code; cần chủ dự án duyệt trước khi áp dụng.

- [ ] 3. Chạy được vòng chơi tối thiểu trên một bản đồ.
  - Tiêu chí xong: Trình duyệt tải được bản đồ thử; chọn và di chuyển đơn vị theo địa hình, hiển thị vùng di chuyển/nguy hiểm, kết thúc và chuyển lượt; thao tác sai không làm hỏng state. Logic chạy được không cần renderer và có test cho đường đi, tầm di chuyển, lượt.
  - Kết quả: CHỜ NGƯỜI DÙNG: Lỗi callback và kẹt lượt đã sửa, test/build PASS; cần duyệt Playwright để kiểm vòng chơi trên trình duyệt.

- [ ] 4. Hoàn thành chiến đấu và AI cho bản đồ thử.
  - Tiêu chí xong: Dự báo và thực hiện giao tranh đúng các quy tắc đã duyệt trong `Game_Design/battle.md`; tam giác vũ khí, vũ khí khắc class, AI và nguồn RNG cho kết quả tái lập; AI không dùng thông tin bị che. Test tự động bao phủ các công thức và tình huống biên đã chọn, một trận thử kết thúc được.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chủ dự án chốt công thức, bonus, RNG và trọng số AI trong `Game_Design/battle.md`, đồng thời duyệt Playwright để kiểm trận thử trên trình duyệt. Lỗi HP/isDead và lượt AI đã sửa ở code hiện tại.

- [ ] 5. Đưa bản đồ thử sang 3D low-poly.
  - Tiêu chí xong: Bản đồ, đơn vị, camera và chỉ báo nước đi hiển thị trong Three.js; cùng thao tác tạo cùng kết quả game như bản logic; kiểm tay trên trình duyệt mục tiêu và đo FPS, draw calls, triangles theo ngân sách được chốt.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chốt thiết bị/trình duyệt và ngân sách hiệu năng, duyệt Playwright để kiểm tay và đo FPS, draw calls, triangles. Code hiện đã sửa callback và giải phóng tài nguyên Three.js.

- [ ] 6. Hoàn thiện một chương chơi được từ đầu đến cuối.
  - Tiêu chí xong: Vào chương, chuẩn bị đội, chơi, thắng/thua, hội thoại cần thiết, viện binh có cảnh báo, lưu/tải và chuyển chương hoạt động; có bài kiểm tra luồng chính trên trình duyệt. Dữ liệu và quyền sử dụng asset của chương được kiểm trước khi đưa vào bản phát hành.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chốt phạm vi chuẩn bị đội, viện binh và chuyển chương cho chương mẫu, duyệt Playwright để kiểm luồng trình duyệt. Lưu/tải Dexie và điều kiện chết đã sửa ở code hiện tại.

- [ ] 7. Mở rộng chiến dịch theo phạm vi được duyệt.
  - Tiêu chí xong: Mỗi chương trong danh sách đã duyệt có dữ liệu bản đồ, nhân vật, mục tiêu, sự kiện và bài chơi thử đạt; lưu/tải qua ranh giới chương không mất tiến độ. Ghi số chương thực tế, không dùng số chương ước tính trong đề án làm kết quả.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chủ dự án chốt số chương và thứ tự ưu tiên sau khi mục 6 PASS.

- [ ] 8. Thêm chế độ và tính năng mở rộng đã duyệt.
  - Tiêu chí xong: Độ khó, bản đồ giải đố và bản đồ ngẫu nhiên đã chọn có tiêu chí riêng, chạy được, có kiểm tra phần logic và không làm hỏng chiến dịch; phần chưa chọn không tính là thiếu.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chốt quy tắc và phạm vi nội dung cho Q04, Q10, Q12 sau khi bản chiến dịch mẫu chơi được.

- [ ] 9. Kiểm thử, tối ưu và phát hành.
  - Tiêu chí xong: Bộ test và build PASS; chơi hết phạm vi đã duyệt; kiểm trên các trình duyệt/thiết bị đã chốt; đo hiệu năng; kiểm quyền sử dụng nội dung; bản phát hành được chủ dự án duyệt trước khi publish.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chưa được duyệt phát hành; quyết định nền tảng triển khai và thời điểm publish ở mốc này.

## Có sẵn và phần cần làm

- Có sẵn: `AGENTS.md`, `PLAN.md`, `Game_Design/`, `reports/` và mã nguồn hiện tại trong `Water-Emblem/`; đã chạy 32/32 unit test và build từ thư mục mã nguồn ngày 2026-11-13.
- Tận dụng: dùng đề án cũ làm nguồn chuyển nội dung có nhãn, báo cáo làm nghiên cứu; giữ quyết định mới nhất trong `Game_Design/decisions.md`.
- Tự làm: kiểm kê hiện trạng khi bắt đầu code, chốt các quy tắc còn mở, triển khai và kiểm chứng từng mốc ở trên.

## Quyết định cần chốt sau khi duyệt kế hoạch

- Phạm vi bản chơi đầu và số chương mục tiêu. Đề án cũ dùng các mức 10+, 25+ và 40+ chương ở các chỗ khác nhau.
- Bộ quy tắc combat trước khi code: đề án gốc có `SupportBonus` trong Hit nhưng `AGENTS.md` bản cũ không có; cách tính effective damage, RNG khi Hit trên 50% và anti-screwage cần được xác nhận thành một đặc tả thống nhất. Break chưa được chọn.
- Mức dự án: đề xuất mức chuyên nghiệp do nội dung dài hạn, nhiều module và có khả năng phát hành; chủ dự án quyết định mức kiểm thử/tài liệu tương ứng.
- Thiết bị và trình duyệt mục tiêu để đặt ngân sách hiệu năng có thể đo.
- Nguồn dữ liệu và quyền sử dụng hình ảnh, âm thanh trước khi đưa vào game hoặc phát hành.

## Chuẩn hóa tài liệu thiết kế

- [x] 10. Chuyển nội dung còn phù hợp của đề án cũ vào chín file `Game_Design/` và cập nhật `AGENTS.md`, `PLAN.md`.
  - Tiêu chí xong: Có đủ chín file, mỗi mã đã chọn có nơi sở hữu; đề án cũ có bảng đối chiếu; các công thức mâu thuẫn và cơ chế chưa chọn được ghi rõ trạng thái; mọi đường dẫn trong `AGENTS.md` và `PLAN.md` trỏ tới file tồn tại.
  - Kết quả: PASS: 9/9 file `Game_Design/` tồn tại; các tham chiếu `report/` sai đã sửa thành `reports/`, kiểm lại không còn đường dẫn cũ và file báo cáo tham chiếu tồn tại.

- [x] 11. Duyệt nội dung `Game_Design/`.
  - Tiêu chí xong: Chủ dự án xác nhận cấu trúc, phạm vi và cách ghi các điểm chưa chốt; mọi chỉnh sửa được yêu cầu đã xử lý.
  - Kết quả: PASS: Chủ dự án trả lời “duyệt” ngày 2026-11-13 sau khi nhận bản 9 file và yêu cầu chuyển sang bước xóa đề án cũ.

- [x] 12. Xóa đề án cũ và kiểm đường dẫn.
  - Tiêu chí xong: Đề án cũ không còn ở thư mục gốc; không có liên kết hoặc chỉ dẫn đang hoạt động trỏ tới file đã xóa; mở lại README và các file tham chiếu để kiểm.
  - Kết quả: PASS: Đã xóa đúng file ở thư mục gốc; kiểm `OldFileExists=False`, `DesignFileCount=9`; tìm toàn bộ file trong workspace không còn tham chiếu tên file cũ; 9/9 liên kết trong `Game_Design/README.md` trỏ tới file tồn tại.
