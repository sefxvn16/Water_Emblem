# Kế hoạch triển khai Water Emblem

Cập nhật: 2026-11-17 · Lập lại toàn bộ kế hoạch sau rà soát code và chạy gate.

Mục tiêu: game chiến thuật theo lượt chạy trên trình duyệt, tái hiện bản đồ, nhân vật và mạch chương FE3, với luật chơi lấy từ các bản FE đời mới theo `Game_Design/decisions.md`.

Phạm vi hiện tại: FE3 Book 1 Chương 1–3 trên giao diện 2D. Theo thứ tự: dọn nền → kiểm lại dữ liệu FE3 → tách luật khỏi UI vào `src/core/` → bổ sung cơ chế đã chọn còn thiếu → mở rộng chương → port 3D. Không làm: Book 2, chương 4+ và tính năng 3D mới cho đến khi chủ dự án mở giai đoạn đó.

Quy tắc làm việc, kiến trúc và định dạng mục: theo `AGENTS.md`. Mỗi mục chỉ được đánh `[x]` khi dòng Kết quả là `PASS: <bằng chứng>` và đã chạy `node .studio/gate.mjs`. Mục nào cần chủ dự án quyết thì ghi `CHỜ NGƯỜI DÙNG` kèm câu hỏi.

## Hiện trạng đã kiểm ngày 2026-11-17

- Gate `node .studio/gate.mjs`: **Result: FAIL**. Vitest PASS, build PASS; Playwright 19/20 PASS, fail `tests/browser/battle.spec.ts:178` (test 3D tìm `canvas`, nhưng giao diện mặc định đã là 2D).
- Nhánh `cs/fe3-map-2d` có 21 file sửa chưa commit (bản đồ/chương Ch1–3, `App.tsx`, `transition.ts`, `chapterData.ts`, 9 file test) và `HANDOFF_FE3_MAP_2D.md` chưa theo dõi.
- `src/core/` (14 file) không import React/Three/Dexie. Tuy vậy luật chơi vẫn nằm trong `src/App.tsx` (2.339 dòng, 26 `useState`): vòng lượt địch, loot, thăm làng, chiếm thành, chiêu mộ, thoại boss, 12 chỗ hard-code ID nhân vật, 5 chỗ `any`, có chỗ sửa trực tiếp state. Lưới 2D được vẽ inline trong `App.tsx`. XState có trong dependency nhưng không được dùng.
- Test e2e chương 1–3 là bot heuristic tự chơi; đợt sửa ngày 2026-11-16 đã chỉnh heuristic của bot để test qua. Test tọa độ bản đồ lấy kỳ vọng chép từ JSON.
- PASS của mục cũ 42 và 45 không đủ bằng chứng: `Game_Design/campaign.md` chỉ có quy trình đối chiếu, không có bảng đối chiếu từng ô; mục 45 ghi gate PASS nhưng gate chạy lại cho FAIL. Hai mục này được thay bằng mục 51–53.
- Cơ chế Đã chọn chưa có trong code: Canto, đánh kẹp, lợi thế cao độ, bẫy, phá vật che, viện binh báo trước, thoát bản đồ, đường mục tiêu địch, đòn báo trước, kỹ năng, độ khó, boss nhiều pha, reclass.
- Repo có hàng chục thư mục `_backup/` trong `Water-Emblem/src`, `data`, `tests`; các thư mục `New folder`, `scratch`, `dist`, `test-results` ở gốc; hai file bàn giao rời nhau. `public/models/Original/` (khoảng 978 MB) sẽ được chủ dự án dời ra ngoài repo; hiện `src/ui/WorldMapModal.tsx:50` còn nạp ảnh từ thư mục đó.

## Giai đoạn 0: Dọn nền

- [ ] 46. Rà và commit thay đổi đang dở trên nhánh `cs/fe3-map-2d`.
  - Tiêu chí xong: Rà diff 21 file; tách phần dữ liệu bản đồ, phần code và phần test thành các commit riêng; `git status` không còn file sửa chưa commit ngoài những file chủ dự án quyết định giữ lại.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cho phép commit các thay đổi Antigravity để lại trên nhánh `cs/fe3-map-2d`? Các test trong diff đã bị chỉnh cho qua, nên đề xuất commit tách riêng phần test để có thể hoàn tác.
  - Kiểm bởi: tôi

- [ ] 47. Xử lý test 3D đang fail ở `tests/browser/battle.spec.ts:178`.
  - Tiêu chí xong: Gate không còn fail do test 3D; lý do sửa ghi tại mục này; không làm yếu assertion của luồng 2D.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chọn (a) test bấm nút chuyển 3D trước khi tìm canvas, giữ kiểm 3D, hay (b) `test.skip` có ghi lý do "3D đóng băng đến giai đoạn port"?
  - Kiểm bởi: tôi

- [ ] 48. Dọn file rác và gộp bàn giao.
  - Tiêu chí xong: Không còn `_backup/` trong `Water-Emblem/`; `New folder`, `scratch`, `dist`, `test-results` được xóa hoặc dời theo quyết định; `ANTIGRAVITY_HANDOFF.md` và `HANDOFF_FE3_MAP_2D.md` được gộp thành `HANDOFF.md` theo mẫu trong `AGENTS.md`; build và test vẫn PASS.
  - Kết quả: CHỜ NGƯỜI DÙNG: Việc này có xóa dữ liệu. Xác nhận xóa các `_backup/` (đã gitignore, có git làm bản lịch sử) hay dời chúng ra ngoài repo? Bốn thư mục ở gốc xử lý thế nào?
  - Kiểm bởi: tôi

- [ ] 49. Gỡ phụ thuộc vào `public/models/Original/` trước khi dời kho gốc.
  - Tiêu chí xong: Ảnh World Map game đang dùng được copy vào `public/maps/` và `WorldMapModal.tsx` nạp từ đó; `grep -r "models/Original" Water-Emblem/src` không còn kết quả; `Game_Design/campaign.md` và `Game_Design/asset_sources.md` ghi đường dẫn kho gốc mới; World Map hiển thị ảnh trên trình duyệt.
  - Kết quả: CHỜ NGƯỜI DÙNG: Kho `Original` sẽ được dời tới đường dẫn nào?
  - Kiểm bởi: tôi

- [ ] 50. Chốt mức dự án.
  - Tiêu chí xong: Chủ dự án chọn mức (trung bình hoặc chuyên nghiệp); mức được ghi ở đầu file này cùng yêu cầu test/tài liệu tương ứng.
  - Kết quả: CHỜ NGƯỜI DÙNG: Đề xuất mức chuyên nghiệp (dự án dài hạn, nhiều module, có thể phát hành). Đồng ý không?
  - Kiểm bởi: người dùng

## Giai đoạn 1: Kiểm lại dữ liệu FE3 trên 2D

- [ ] 51. Lập bảng tham chiếu ô FE3 độc lập cho Chương 1–3.
  - Tiêu chí xong: Mỗi chương có một bảng `grid[y][x]` nhập từ sơ đồ FE3 và ảnh gốc, không chép từ JSON game; ghi nguồn, ngày kiểm và danh sách ô chưa chắc; mỗi chương có ảnh đối chiếu 2D đặt cạnh ảnh FE3.
  - Kết quả: CHỜ NGƯỜI DÙNG: Đặt bảng tham chiếu ở đâu? Đề xuất `Water-Emblem/data/reference/fe3/<chapter-id>.json`, để test đọc được và loader game không nạp.
  - Kiểm bởi: subagent

- [ ] 52. So khớp JSON bản đồ với bảng tham chiếu bằng test.
  - Tiêu chí xong: Unit test so từng ô `data/maps/<map-id>.json` với bảng của mục 51; số ô lệch bằng 0, hoặc mỗi ô lệch có lý do được chủ dự án duyệt và ghi tại đây; ô lệch nào sửa được thì sửa trong JSON.
  - Kết quả: CHỜ NGƯỜI DÙNG: Phụ thuộc mục 51.
  - Kiểm bởi: tôi

- [ ] 53. Đối chiếu quân, vật thể và sự kiện Chương 1–3 với FE3.
  - Tiêu chí xong: Bảng theo từng chương gồm số quân ta/địch, class, level, vị trí, vũ khí, drop, làng và thưởng, mục tiêu, nhân vật chiêu mộ, cột nguồn FE3 và cột JSON; mọi điểm lệch được sửa hoặc ghi lý do; chơi kiểm trên 2D, ghi thao tác và ảnh.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chờ duyệt kế hoạch; làm sau mục 46.
  - Kiểm bởi: subagent

## Giai đoạn 2: Tách luật vào `src/core/` (không đổi hành vi)

Mỗi mục trong giai đoạn này giữ nguyên hành vi game: trước và sau khi tách, test hành vi phải cho cùng kết quả. Mục nào đổi schema JSON hoặc giao diện công khai của core phải được chủ dự án duyệt trước khi code.

- [ ] 54. Định nghĩa `GameEvent` và tách vòng lượt địch khỏi `App.tsx`.
  - Tiêu chí xong: `src/core/turn/enemyPhase.ts` nhận state + RNG, trả state mới + `GameEvent[]`; `App.tsx` không còn vòng lặp lượt địch; âm thanh và log dựng từ sự kiện; unit test có seed cho tấn công, chết, rơi đồ, cướp làng và kết thúc chương giữa lượt địch.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chờ duyệt kế hoạch và hình dạng kiểu `GameEvent` (giao diện công khai của core).
  - Kiểm bởi: subagent

- [ ] 55. Tách hành động người chơi vào core.
  - Tiêu chí xong: Tấn công, chờ, dùng vật phẩm, thăng cấp, lên/xuống ngựa, hủy di chuyển là hàm core thuần, có unit test; `App.tsx` chỉ gọi hàm và cập nhật state; không còn sửa trực tiếp object state (`unit.position = ...`).
  - Kết quả: CHỜ NGƯỜI DÙNG: Làm sau mục 54.
  - Kiểm bởi: subagent

- [ ] 56. Tách sự kiện chương và bỏ hard-code ID.
  - Tiêu chí xong: Thăm làng, chiếm thành, chiêu mộ, thoại boss và loot nằm trong `src/core/chapter/`; người được chiếm thành, cặp chiêu mộ và thoại khai báo trong JSON chương; `grep` các ID nhân vật (`'marth'`, `'castor'`, `'navarre'`, `'gazzak'`, `'gomer'`, `'hyman'`, `'caeda'`) trong `src/` không còn kết quả ngoài file test.
  - Kết quả: CHỜ NGƯỜI DÙNG: Việc này đổi schema JSON chương (thêm trường như `seizeUnitIds`, `talkEvents`). Duyệt đổi schema không?
  - Kiểm bởi: subagent

- [ ] 57. Tách lưới 2D thành renderer và thu gọn `App.tsx`.
  - Tiêu chí xong: Lưới 2D nằm ở `src/renderer/` và đọc cùng state với `ThreeScene`; `App.tsx` dưới 400 dòng, mỗi file mới dưới 400 dòng; luồng 2D trên trình duyệt chạy như trước.
  - Kết quả: CHỜ NGƯỜI DÙNG: Làm sau mục 54–56.
  - Kiểm bởi: tôi

- [ ] 58. Làm sạch kiểu và kiểm dữ liệu khi nạp.
  - Tiêu chí xong: `grep` không còn `any` trong `src/`; JSON chương, bản đồ, hội thoại được kiểm khi nạp, không dùng `as` để ép kiểu dữ liệu chưa kiểm; build strict PASS.
  - Kết quả: CHỜ NGƯỜI DÙNG: Làm sau mục 56.
  - Kiểm bởi: tôi

- [ ] 59. Quyết định dùng hay gỡ XState.
  - Tiêu chí xong: Chủ dự án chọn; nếu dùng thì vòng phase/lượt chạy qua một machine có test; nếu gỡ thì bỏ khỏi `package.json` và `AGENTS.md`.
  - Kết quả: CHỜ NGƯỜI DÙNG: Đề xuất dùng XState cho vòng phase (chọn quân → di chuyển → hành động → lượt địch), vì đúng stack đã chốt và chặn được lỗi kẹt phase. Đồng ý không?
  - Kiểm bởi: người dùng

- [ ] 60. Thay bot e2e bằng kịch bản cố định.
  - Tiêu chí xong: Mỗi chương có một spec Playwright 2D với seed RNG cố định và chuỗi nước đi cố định, kiểm Title → chuẩn bị → hành động → lưu/tải → thắng; luật được kiểm bằng unit test ở mục 54–56; bot heuristic bị gỡ sau khi spec mới PASS.
  - Kết quả: CHỜ NGƯỜI DÙNG: Việc này sửa `tests/**` (vùng bảo vệ). Duyệt thay thế các spec `fullChapter*.spec.ts` không?
  - Kiểm bởi: subagent

## Giai đoạn 3: Cơ chế đã chọn còn thiếu (2D)

Mỗi cơ chế phải được chốt luật trong `Game_Design/battle.md` hoặc `campaign.md` trước khi code, và làm sau giai đoạn 2.

- [ ] 61. Chốt và triển khai nhóm vị trí: Canto (V04), đánh kẹp (V05), lợi thế cao độ (V07), bẫy/chặn lối (V08), phá vật che (C12).
  - Tiêu chí xong: Luật được ghi trong `battle.md` với nguồn; unit test cho từng cơ chế; hiển thị trên 2D; chơi kiểm ít nhất một tình huống mỗi cơ chế.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chốt giới hạn Canto, vị trí kích hoạt đánh kẹp, số bậc cao độ, loại bẫy và ô phá được (đang ghi Chờ chốt trong `decisions.md`).
  - Kiểm bởi: tôi

- [ ] 62. Chốt và triển khai thông tin địch: đường mục tiêu (B02), đòn báo trước (B03), vai trò AI (B10).
  - Tiêu chí xong: Hiển thị khớp đúng hành động thật ở lượt địch kế tiếp (test kiểm dự báo trùng kết quả); AI không dùng thông tin bị che.
  - Kết quả: CHỜ NGƯỜI DÙNG: Địch công bố mục tiêu dự kiến hay hành động đã khóa? Khi nào được đổi ý?
  - Kiểm bởi: tôi

- [ ] 63. Viện binh báo trước (B04), bảo vệ mục tiêu (B05), thoát bản đồ (B06), boss nhiều pha (B11).
  - Tiêu chí xong: Khai báo trong JSON chương; viện binh có cảnh báo trước một lượt và không hành động ngay khi xuất hiện; unit test và chơi kiểm ở chương FE3 có sự kiện tương ứng.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chương 1–3 của FE3 có viện binh hoặc sự kiện nào thuộc nhóm này? Cần đối chiếu ở mục 53 trước khi đặt phạm vi.
  - Kiểm bởi: tôi

- [ ] 64. Kỹ năng cá nhân và kỹ năng class (N01, N02).
  - Tiêu chí xong: Danh sách kỹ năng có nguồn trong `characters.md`; dữ liệu nằm trong JSON; unit test cho từng kỹ năng có trong Chương 1–3.
  - Kết quả: CHỜ NGƯỜI DÙNG: Lấy bộ kỹ năng từ bản FE nào, và nhân vật nào trong Chương 1–3 có kỹ năng?
  - Kiểm bởi: tôi

- [ ] 65. Độ khó (Q04) và tua/bỏ hoạt cảnh (Q07).
  - Tiêu chí xong: Số mức độ khó và tham số nằm trong `data/balance.json`; chọn ở màn New Game; test kiểm tham số áp đúng; hoạt cảnh có nút bỏ qua.
  - Kết quả: CHỜ NGƯỜI DÙNG: Có bao nhiêu mức độ khó, và mỗi mức đổi những gì?
  - Kiểm bởi: tôi

## Giai đoạn 4 trở đi: mở rộng

- [ ] 34. Triển khai reclass và giới hạn class từ Chương 4.
  - Tiêu chí xong: Đối chiếu nhóm class FE11 với class Water Emblem; cho reclass tại màn chuẩn bị từ Chương 4, giữ level/EXP/rank theo luật đã chốt; test core, save và trình duyệt PASS khi Chương 4 có dữ liệu.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chỉ triển khai khi bắt đầu Chương 4 và đã chốt mapping class Water Emblem.
  - Kiểm bởi: tôi

- [ ] 66. Mở rộng Chương 4 trở đi của Book 1.
  - Tiêu chí xong: Mỗi chương mới đi qua đủ quy trình của mục 51–53 trước khi ghi PASS.
  - Kết quả: CHỜ NGƯỜI DÙNG: Mở sau khi giai đoạn 1–2 PASS. Phạm vi số chương của bản chơi đầu là bao nhiêu?
  - Kiểm bởi: tôi

- [ ] 8. Thêm chế độ mở rộng đã chọn: bản đồ giải đố (Q10), bản đồ ngẫu nhiên (Q12).
  - Tiêu chí xong: Mỗi chế độ có tiêu chí riêng, chạy được, có test logic và không làm hỏng chiến dịch.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chốt quy tắc và phạm vi nội dung Q10, Q12 sau khi chiến dịch mẫu chơi được.
  - Kiểm bởi: tôi

- [ ] 41. Port 3D và đo chi phí render.
  - Tiêu chí xong: 3D đọc cùng state/sự kiện như 2D; chốt thiết bị và ngân sách (fps, draw calls, tam giác); đo trước và sau trên bản chạy thật; test 3D PASS.
  - Kết quả: CHỜ NGƯỜI DÙNG: Mở giai đoạn port 3D khi nào, và thiết bị mục tiêu là gì?
  - Kiểm bởi: tôi

- [ ] 9. Kiểm thử, tối ưu và phát hành.
  - Tiêu chí xong: Gate PASS; chơi hết phạm vi đã duyệt; kiểm trên trình duyệt và thiết bị đã chốt; kiểm quyền sử dụng hình ảnh, âm thanh; bản phát hành được chủ dự án duyệt trước khi publish.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chọn nền tảng triển khai và thời điểm publish.
  - Kiểm bởi: người dùng

## Lịch sử: mục 1–45 (do các phiên trước ghi)

Bản đầy đủ trước khi lập lại kế hoạch lưu ở `work/plan-rebuild/PLAN.before-2026-11-17.md` (thư mục `work/` không được git theo dõi); phần đã commit nằm trong git của `PLAN.md`. Bảng dưới đây ghi tóm tắt, không phải bằng chứng hiện tại. Trạng thái thật của code và dữ liệu ghi ở phần "Hiện trạng đã kiểm".

| Mục | Nội dung | Ghi chú khi lập lại kế hoạch |
|---|---|---|
| 1–2, 10–12 | Chốt hướng dẫn, kiểm kê, chuyển đề án cũ vào `Game_Design/`, xóa đề án cũ | Tài liệu tồn tại; giữ |
| 3–5, 13–15 | Vòng chơi tối thiểu, combat/AI, scene 3D, state/lưu/tải, chuẩn hóa dữ liệu chương mẫu | Unit test tương ứng PASS ngày 2026-11-17; luồng 3D nay đóng băng |
| 6–7 | Chuẩn hóa Chương 1–3 theo FE3 | Chưa kiểm lại; thay bằng mục 53 |
| 16–17 | Chuyển mã vào `Water-Emblem/`, bảng sở hữu file | Bảng sở hữu đã cập nhật trong `AGENTS.md` ngày 2026-11-17 |
| 18–19 | Đối chiếu chiến dịch FE3, cảnh báo bảo mật công cụ | Giữ |
| 20–23 | Model 3D, camera, minimap | Thuộc 3D; đóng băng |
| 24 (hai mục cùng số) | Đối chiếu ba repo tham khảo; hệ thống âm thanh | Giữ |
| 25–32 | Công thức, growth, class theo FE11/FE8 | Unit test PASS; các điểm Tạm chốt giữ theo `decisions.md` |
| 33 | Bàn giao cho Antigravity | Thay bằng quy tắc bàn giao trong `AGENTS.md` |
| 35 | Test tình huống biên | Test vẫn có; số liệu cũ ghi ngày 2026-11-15 |
| 36–39 | Camera 1:1, hội thoại, Title/Save/Book/World Map, chuẩn hóa tiếng Anh, World Map FE3 | Màn hình tồn tại; Book 2 và World Map 11 vương quốc vượt phạm vi Chương 1–3, giữ nhưng không mở rộng |
| 40 | Hướng A/B về hiệu năng | Hướng B chuyển thành mục 41 |
| 42, 45 | Bảng đối chiếu ô FE3; kiểm chứng 2D và gate | PASS không đủ bằng chứng; thay bằng mục 51–53 và gate hiện tại |
| 43–44 | Sửa dữ liệu bản đồ Ch1–3; đặt 2D mặc định và luồng Title | Thay đổi chưa commit; xử lý ở mục 46 |
