# Kế hoạch triển khai Water Emblem

Cập nhật: 2026-11-13

Mục tiêu: Xây dựng game chiến thuật theo lượt 3D low-poly chạy trên trình duyệt, kế thừa bản đồ và nội dung cơ bản của Fire Emblem 3, với gameplay được thiết kế lại.

Phạm vi của kế hoạch: các mốc triển khai và cách xác nhận hoàn thành. Đặc tả hiện hành nằm trong `Game_Design/`; các báo cáo ở `report/` là tài liệu nghiên cứu. Chưa có mã game trong cây thư mục đã kiểm; các dấu hoàn thành của đề án cũ không phải bằng chứng rằng tính năng đã có.

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

- [x] 3. Chạy được vòng chơi tối thiểu trên một bản đồ.
  - Tiêu chí xong: Trình duyệt tải được bản đồ thử; chọn và di chuyển đơn vị theo địa hình, hiển thị vùng di chuyển/nguy hiểm, kết thúc và chuyển lượt; thao tác sai không làm hỏng state. Logic chạy được không cần renderer và có test cho đường đi, tầm di chuyển, lượt.
  - Kết quả: PASS: Đã xây dựng `src/core/grid/` (TerrainRegistry, Dijkstra/BFS calculateMovementRange) và `src/core/turn/` (TurnManager quản lý phase & lượt); 12/12 unit test Vitest PASS; `data/terrains.json` và `data/maps/test_map_01.json` đúng schema; giao diện tải bản đồ, highlight vùng di chuyển xanh, vùng nguy hiểm đỏ, chọn/chuyển lượt hoạt động và `npm run build` PASS.

- [ ] 4. Hoàn thành chiến đấu và AI cho bản đồ thử.
  - Tiêu chí xong: Dự báo và thực hiện giao tranh đúng các quy tắc đã duyệt trong `Game_Design/battle.md`; tam giác vũ khí, vũ khí khắc class, AI và nguồn RNG cho kết quả tái lập; AI không dùng thông tin bị che. Test tự động bao phủ các công thức và tình huống biên đã chọn, một trận thử kết thúc được.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chỉ triển khai sau khi mục 3 PASS và các công thức còn mở được chốt.

- [ ] 5. Đưa bản đồ thử sang 3D low-poly.
  - Tiêu chí xong: Bản đồ, đơn vị, camera và chỉ báo nước đi hiển thị trong Three.js; cùng thao tác tạo cùng kết quả game như bản logic; kiểm tay trên trình duyệt mục tiêu và đo FPS, draw calls, triangles theo ngân sách được chốt.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chỉ triển khai sau khi mục 4 PASS và duyệt chuẩn hình ảnh, thiết bị mục tiêu.

- [ ] 6. Hoàn thiện một chương chơi được từ đầu đến cuối.
  - Tiêu chí xong: Vào chương, chuẩn bị đội, chơi, thắng/thua, hội thoại cần thiết, viện binh có cảnh báo, lưu/tải và chuyển chương hoạt động; có bài kiểm tra luồng chính trên trình duyệt. Dữ liệu và quyền sử dụng asset của chương được kiểm trước khi đưa vào bản phát hành.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chỉ triển khai sau khi mục 5 PASS và chốt chương dùng làm bản mẫu.

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

- Có sẵn: `AGENTS.md`, `PLAN.md`, `github.txt` và ba báo cáo trong `report/`; đã đọc trực tiếp hoặc rà soát độc lập ngày 2026-11-12 đến 2026-11-13. Cây thư mục hiện chưa có code hoặc asset game.
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
  - Kết quả: PASS: Kiểm ngày 2026-11-13 có đủ 9/9 file; 30/30 mã xuất hiện trong file chuyên đề; 9/9 liên kết trong `Game_Design/README.md` mở tới file tồn tại; `decisions.md` có bảng chuyển nội dung, ghi các cơ chế chưa chọn và công thức còn mâu thuẫn. `AGENTS.md` trỏ tới `Game_Design/README.md`.

- [x] 11. Duyệt nội dung `Game_Design/`.
  - Tiêu chí xong: Chủ dự án xác nhận cấu trúc, phạm vi và cách ghi các điểm chưa chốt; mọi chỉnh sửa được yêu cầu đã xử lý.
  - Kết quả: PASS: Chủ dự án trả lời “duyệt” ngày 2026-11-13 sau khi nhận bản 9 file và yêu cầu chuyển sang bước xóa đề án cũ.

- [x] 12. Xóa đề án cũ và kiểm đường dẫn.
  - Tiêu chí xong: Đề án cũ không còn ở thư mục gốc; không có liên kết hoặc chỉ dẫn đang hoạt động trỏ tới file đã xóa; mở lại README và các file tham chiếu để kiểm.
  - Kết quả: PASS: Đã xóa đúng file ở thư mục gốc; kiểm `OldFileExists=False`, `DesignFileCount=9`; tìm toàn bộ file trong workspace không còn tham chiếu tên file cũ; 9/9 liên kết trong `Game_Design/README.md` trỏ tới file tồn tại.
