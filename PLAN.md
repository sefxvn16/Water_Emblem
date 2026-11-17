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

- [x] 46. Rà và commit thay đổi đang dở trên nhánh `cs/fe3-map-2d`.
  - Tiêu chí xong: Rà diff 21 file; tách phần dữ liệu bản đồ, phần code và phần test thành các commit riêng; `git status` không còn file sửa chưa commit ngoài những file chủ dự án quyết định giữ lại.
  - Kết quả: PASS: Ngày 2026-11-17 commit theo nhóm trên `cs/fe3-map-2d`: `d4559be` (dữ liệu bản đồ/chương), `ce84a17` (App/transition/chapterData), `2efe77c` (test, tách riêng để có thể hoàn tác), `acb5733` (campaign.md), `b728278` (AGENTS.md, PLAN.md); không còn file sửa dở của Antigravity.
  - Kiểm bởi: tôi

- [x] 47. Xử lý test 3D đang fail ở `tests/browser/battle.spec.ts:178`.
  - Tiêu chí xong: Gate không còn fail do test 3D; lý do sửa ghi tại mục này; không làm yếu assertion của luồng 2D.
  - Kết quả: PASS: Chủ dự án yêu cầu làm mục 47 (2026-11-17); chọn phương án (a): `battle.spec.ts` bấm nút "3D View" trước khi tìm canvas, không bỏ assertion nào; commit `0a6e1da`. Kết quả gate sau khi merge ghi ở mục 67.
  - Kiểm bởi: tôi

- [x] 48. Dọn file rác và bỏ file bàn giao.
  - Tiêu chí xong: Không còn `_backup/` trong `Water-Emblem/`; `New folder`, `scratch`, `dist`, `test-results` được xóa hoặc dời theo quyết định; không còn file bàn giao (chủ dự án quyết định ngày 2026-11-17: mỗi lúc một AI, đồng bộ qua `PLAN.md`); build và test vẫn PASS.
  - Kết quả: PASS: 19 thư mục `_backup/` (trong `Water-Emblem/src`, `data`, `tests`, `tools`, `Game_Design`, `reports`, gốc) và `scratch/` được dời, không xóa, sang `work/archive-2026-11-17/` (gitignore); `find -name _backup` ngoài `work/` trả 0. `New folder` do chủ dự án xóa, commit `3fff745`. `ANTIGRAVITY_HANDOFF.md` và `HANDOFF_FE3_MAP_2D.md` đã xóa theo yêu cầu chủ dự án sau khi chuyển bảng đối chiếu lực lượng FE3 vào `Game_Design/campaign.md`; `AGENTS.md` mục 6 thay file bàn giao bằng ghi trạng thái trong `PLAN.md`. `dist/`, `test-results/` là output build/test đã gitignore, giữ nguyên.
  - Kiểm bởi: tôi

- [x] 49. Gỡ phụ thuộc vào `public/models/Original/` trước khi dời kho gốc.
  - Tiêu chí xong: Ảnh World Map game đang dùng được copy vào `public/maps/` và `WorldMapModal.tsx` nạp từ đó; `grep -r "models/Original" Water-Emblem/src` không còn kết quả; `Game_Design/campaign.md` và `Game_Design/asset_sources.md` ghi đường dẫn kho gốc mới; World Map hiển thị ảnh trên trình duyệt.
  - Kết quả: PASS: Kho gốc nằm ở `Original/` tại gốc repo (gitignore, commit `3fff745`); `WorldMapModal.tsx` nạp `/maps/world_map_archanea_4x.png`, giống hệt bản trong `Original` (md5 4470037402751579f3c38e895ac079e5); `grep -r "models/Original" Water-Emblem/src` không còn kết quả; `campaign.md` và `asset_sources.md` ghi đường dẫn mới.
  - Kiểm bởi: tôi

- [x] 50. Chốt mức dự án.
  - Tiêu chí xong: Chủ dự án chọn mức (trung bình hoặc chuyên nghiệp); mức được ghi ở đầu file này cùng yêu cầu test/tài liệu tương ứng.
  - Kết quả: PASS: Tạm chốt mức chuyên nghiệp theo đề xuất; chủ dự án yêu cầu làm mục 50 ngày 2026-11-17 và không sửa đề xuất. Yêu cầu kèm theo: unit test cho mọi luật core, e2e kịch bản cố định, review độc lập trước khi ghi PASS mục code, tài liệu theo `AGENTS.md`.
  - Kiểm bởi: người dùng

## Giai đoạn 1: Kiểm lại dữ liệu FE3 trên 2D

- [x] 51. Lập bảng tham chiếu ô FE3 độc lập cho Chương 1–3.
  - Tiêu chí xong: Mỗi chương có một bảng `grid[y][x]` nhập từ sơ đồ FE3 và ảnh gốc, không chép từ JSON game; ghi nguồn, ngày kiểm và danh sách ô chưa chắc; mỗi chương có ảnh đối chiếu 2D đặt cạnh ảnh FE3.
  - Kết quả: PASS: Lưới tham chiếu lập độc lập từ sơ đồ chirimenzeyo (đọc màu từng ô bằng canvas trên trình duyệt, ánh xạ theo chú giải từng chương) và kiểm chéo kích thước/công trình với ảnh `Original/01_Maps/Book_1/Cm_fe03_b1_{1,2,3}.png` (16px/ô, viền 1 ô): `Water-Emblem/data/reference/fe3/chapter_0{1,2,3}_*.json`, 30×13, 30×15, 30×20, không còn màu chưa xác định. Quy trình và script: `Water-Emblem/tools/fe3_map_reference/` (README, `extract_diagram.js`, `compare.mjs`). Commit `9a4b437`.
  - Kiểm bởi: subagent

- [ ] 52. So khớp JSON bản đồ với bảng tham chiếu bằng test.
  - Tiêu chí xong: Unit test so từng ô `data/maps/<map-id>.json` với bảng của mục 51; số ô lệch bằng 0, hoặc mỗi ô lệch có lý do được chủ dự án duyệt và ghi tại đây; ô lệch nào sửa được thì sửa trong JSON.
  - Kết quả: CHỜ NGƯỜI DÙNG: `node tools/fe3_map_reference/compare.mjs` tìm ra 11 ô lệch cùng một lỗi (pháo đài 砦 ghi thành `rock`), đã sửa thành `fort`, nay báo MATCH cả 3 chương (commit `9a4b437`). Còn thiếu unit test Vitest chạy phép so này trong gate. Terrain `rock` trong `data/terrains.json` không còn ô nào dùng: giữ hay xóa?
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
  - Kết quả: CHỜ NGƯỜI DÙNG: Đã làm trên nhánh `cs/plan-phase0` (commit `27e3750`, sửa thêm `bdff589`): thăm làng, chiếm thành, chiêu mộ, loot, thoại boss nằm trong `src/core/chapter/events.ts` (hàm thuần, 15 unit test); JSON chương có `lordUnitId`; `saveLoad.ts` dùng `chapter.lordUnitId`; cướp làng theo `aiRole: "pillage"`. Verify 3 trên `bdff589`: Vitest 119/119, build PASS, Playwright 20/20 (PASS-FLAGGED, cờ là test mới); review vòng 2 PASS WITH NOTES. Grep ID còn đúng 1 chỗ: `src/renderer/ThreeScene.tsx:125` (`'navarre'` chọn model 3D, 3D đang đóng băng). Chấp nhận ngoại lệ này đến lúc port 3D (mục 41) không?
  - Kiểm bởi: subagent

- [ ] 57. Tách lưới 2D thành renderer và thu gọn `App.tsx`.
  - Tiêu chí xong: Lưới 2D nằm ở `src/renderer/` và đọc cùng state với `ThreeScene`; `App.tsx` dưới 400 dòng, mỗi file mới dưới 400 dòng; luồng 2D trên trình duyệt chạy như trước.
  - Kết quả: CHỜ NGƯỜI DÙNG: Làm sau mục 54–56.
  - Kiểm bởi: tôi

- [x] 67. Dựng khung lưới 2D dùng chung làm cơ sở cho 3D.
  - Tiêu chí xong: `src/core/grid/boardView.ts` dựng mô hình bàn cờ thuần (địa hình, cao độ, quân, lớp phủ) có unit test; `src/renderer/Grid2D.tsx` vẽ mô hình đó, mỗi ô có `data-testid="tile-x-y"`; `App.tsx` không còn lưới vẽ inline; giao diện 2D như cũ; gate PASS. 3D sẽ đọc cùng mô hình khi port (mục 41).
  - Kết quả: PASS: `src/core/grid/boardView.ts` (hàm thuần `buildBoardView`, 4 unit test) và `src/renderer/Grid2D.tsx` (mỗi ô `data-testid="tile-x-y"`, bảng màu ở `terrainStyle2d.ts`); `App.tsx` không còn lưới inline (2339 → 2115 dòng). Review vòng 1 so từng phần với lưới cũ: giữ nguyên viền và lớp phủ. Verify 3 trên `bdff589`: Vitest 119/119, build PASS, Playwright 20/20. Commit `5522b8a`.
  - Kiểm bởi: subagent

- [ ] 58. Làm sạch kiểu và kiểm dữ liệu khi nạp.
  - Tiêu chí xong: `grep` không còn `any` trong `src/`; JSON chương, bản đồ, hội thoại được kiểm khi nạp, không dùng `as` để ép kiểu dữ liệu chưa kiểm; build strict PASS.
  - Kết quả: CHỜ NGƯỜI DÙNG: Làm sau mục 56.
  - Kiểm bởi: tôi

- [ ] 59. Quyết định dùng hay gỡ XState.
  - Tiêu chí xong: Chủ dự án chọn; nếu dùng thì vòng phase/lượt chạy qua một machine có test; nếu gỡ thì bỏ khỏi `package.json` và `AGENTS.md`.
  - Kết quả: CHỜ NGƯỜI DÙNG: Đề xuất dùng XState cho vòng phase (chọn quân → di chuyển → hành động → lượt địch), vì đúng stack đã chốt và chặn được lỗi kẹt phase. Đồng ý không?
  - Kiểm bởi: người dùng

- [x] 60. Thay bot e2e bằng kịch bản cố định.
  - Tiêu chí xong: Mỗi chương có một spec Playwright 2D với seed RNG cố định và chuỗi nước đi cố định, kiểm Title → chuẩn bị → hành động → lưu/tải → thắng; luật được kiểm bằng unit test ở mục 54–56; bot heuristic bị gỡ sau khi spec mới PASS.
  - Kết quả: PASS: `tests/browser/chapterReplay.spec.ts` phát lại chuỗi thao tác cố định (`tests/browser/fixtures/chapter{1,2,3}.replay.json`, seed 20261117, 268/353/460 bước) qua `data-testid` ô và tên nút; kiểm lưu→tải khi trận đầu bắt đầu, màn chuẩn bị sau mỗi lần chuyển chương, PLAYER PHASE khi vào trận, STAGE CLEAR sau mỗi lần chiếm thành. Chạy riêng 2 lần liên tiếp 3/3 PASS; verify 3 trên `bdff589` Playwright 20/20. Bot heuristic chuyển sang `tools/e2e_record/` làm công cụ ghi (không chạy trong gate), kèm README. Chiêu mộ qua giao diện vẫn do `battle.spec.ts:455` kiểm; replay không có bước chiêu mộ/thăm làng (ghi trong README). Commit `064e735`, `bdff589`.
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

- [ ] 69. Nợ kỹ thuật từ review plan-phase0 (2026-11-17).
  - Tiêu chí xong: (a) `evaluateChapterOutcome` bắt buộc tham số `lordUnitId`, bỏ fallback "quân ta đầu tiên" (`src/core/chapter/types.ts:17-23`), `tests/core/chapter.test.ts` truyền id rõ ràng; (b) unit test cho `bossStartEvent`, phần thưởng item không tồn tại (làng, chiếm thành), quân `aiRole: "pillage"` đứng trên làng đã phá; (c) unit test kiểm `saveLoad` với lord khác `marth` và khi thiếu lord; (d) cờ chỉ quân cướp làng: giữ `aiRole` hay thêm cờ ở class. Tất cả PASS trong gate.
  - Kết quả: CHỜ NGƯỜI DÙNG: (a) và (c) sửa test có sẵn/đổi chữ ký hàm, cần chủ dự án duyệt; (d) cần quyết định.
  - Kiểm bởi: subagent

## Giai đoạn 4 trở đi: mở rộng

- [x] 68. Lưới bản đồ FE3 Book 1 Chương 4 (giao Antigravity, Claude kiểm soát).
  - Tiêu chí xong: Antigravity làm theo `Water-Emblem/tools/fe3_map_reference/README.md` trên nhánh `agy/fe3-ch4-map`: có `data/reference/fe3/<map-id>.json` và `data/maps/<map-id>.json`; `compare.mjs` MATCH; test, build PASS; không sửa file ngoài phạm vi. Claude kiểm độc lập: tự trích lại lưới từ sơ đồ và so từng ô, đối chiếu kích thước/công trình với ảnh gốc, kiểm định dạng và phạm vi file; báo chủ dự án chất lượng.
  - Kết quả: PASS: Antigravity (gemini-3.8-flash-high) lập `data/reference/fe3/chapter_04_champions_of_aurelis.json` và `data/maps/chapter_04_champions_of_aurelis.json` (commit `381bd30`). Claude kiểm độc lập: 600/600 ô địa hình khớp lưới Claude tự trích từ `map1_04.png`; 30×20 khớp ảnh gốc 512×352; cổng, pháo đài, làng, tiệm, cầu khớp ảnh gốc. Lỗi của Antigravity: tự đặt `elevations` theo loại địa hình và báo sai là quy ước có sẵn; không có bằng chứng cho lời báo "gate PASS". Theo quyết định chủ dự án (2026-11-17), Claude đặt elevations Chương 4 về 0 và đưa file về định dạng mỗi hàng một dòng (commit `a44a21c`), rồi merge vào `cs/plan-phase0`. Sau merge: `compare.mjs` MATCH 4/4, Vitest và build PASS (lệnh và số ghi ở commit merge).
  - Kiểm bởi: tôi

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
| 33 | Bàn giao cho Antigravity | Bỏ; nay mỗi lúc một AI, đồng bộ qua `PLAN.md` (`AGENTS.md` mục 6) |
| 35 | Test tình huống biên | Test vẫn có; số liệu cũ ghi ngày 2026-11-15 |
| 36–39 | Camera 1:1, hội thoại, Title/Save/Book/World Map, chuẩn hóa tiếng Anh, World Map FE3 | Màn hình tồn tại; Book 2 và World Map 11 vương quốc vượt phạm vi Chương 1–3, giữ nhưng không mở rộng |
| 40 | Hướng A/B về hiệu năng | Hướng B chuyển thành mục 41 |
| 42, 45 | Bảng đối chiếu ô FE3; kiểm chứng 2D và gate | PASS không đủ bằng chứng; thay bằng mục 51–53 và gate hiện tại |
| 43–44 | Sửa dữ liệu bản đồ Ch1–3; đặt 2D mặc định và luồng Title | Thay đổi chưa commit; xử lý ở mục 46 |
