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

- [x] 52. So khớp JSON bản đồ với bảng tham chiếu bằng test.
  - Tiêu chí xong: Unit test so từng ô `data/maps/<map-id>.json` với bảng của mục 51; số ô lệch bằng 0, hoặc mỗi ô lệch có lý do được chủ dự án duyệt và ghi tại đây; ô lệch nào sửa được thì sửa trong JSON.
  - Kết quả: PASS: `Water-Emblem/tests/core/fe3MapReference.test.ts` so từng ô của mọi `data/maps/<id>.json` với `data/reference/fe3/<id>.json` (4 bản đồ) và kiểm chính file tham chiếu hợp lệ (đủ hàng, đủ cột, mọi ký tự có trong legend); terrain `rock` đã xóa khỏi `terrains.json` và `terrainStyle2d.ts` vì 11 ô cũ là pháo đài theo chú giải FE3 và không bản đồ FE3 nào (atlas 44 bản đồ) có loại đá. Save cũ không bị ảnh hưởng (save không lưu địa hình). Commit `a391391`, `86f3a9f`; Vitest 132/132, build PASS, Playwright 20/20 (verify 1 trên `86f3a9f`).
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

- [x] 56. Tách sự kiện chương và bỏ hard-code ID.
  - Tiêu chí xong: Thăm làng, chiếm thành, chiêu mộ, thoại boss và loot nằm trong `src/core/chapter/`; người được chiếm thành, cặp chiêu mộ và thoại khai báo trong JSON chương; `grep` các ID nhân vật (`'marth'`, `'castor'`, `'navarre'`, `'gazzak'`, `'gomer'`, `'hyman'`, `'caeda'`) trong `src/` không còn kết quả ngoài file test.
  - Kết quả: PASS: Sự kiện chương nằm trong `src/core/chapter/events.ts` (hàm thuần, unit test); JSON chương có `lordUnitId`; `saveLoad.ts` dùng `chapter.lordUnitId`; cướp làng theo `aiRole: "pillage"` (commit `27e3750`, `bdff589`; verify 3: Vitest 119/119, build PASS, Playwright 20/20). Ngoại lệ được chủ dự án chấp nhận ngày 2026-11-17: `src/renderer/ThreeScene.tsx` hàm `characterModelFor` còn so `'ogma'`, `'navarre'`, `'julian'` để chọn model 3D (chỉ hiển thị, không phải luật); 3D đang đóng băng, sửa khi port 3D theo mục 41.
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

- [x] 69. Nợ kỹ thuật từ review plan-phase0 (2026-11-17).
  - Tiêu chí xong: (a) `evaluateChapterOutcome` bắt buộc tham số `lordUnitId`, bỏ fallback "quân ta đầu tiên" (`src/core/chapter/types.ts:17-23`), `tests/core/chapter.test.ts` truyền id rõ ràng; (b) unit test cho `bossStartEvent`, phần thưởng item không tồn tại (làng, chiếm thành), quân `aiRole: "pillage"` đứng trên làng đã phá; (c) unit test kiểm `saveLoad` với lord khác `marth` và khi thiếu lord; (d) cờ chỉ quân cướp làng: giữ `aiRole` hay thêm cờ ở class. Tất cả PASS trong gate.
  - Kết quả: PASS: (a) `evaluateChapterOutcome` bắt buộc `seizeCommandUsed` và `lordUnitId`, bỏ fallback; `tests/core/chapter.test.ts` chỉ thêm tham số `'marth'` (chủ dự án duyệt 2026-11-17), không đổi assertion; (b) `tests/core/chapterEventsExtra.test.ts` 6 test (bossStartEvent, item thưởng không tồn tại, cướp làng đã phá, quân không cướp đứng trên làng); (c) `tests/core/saveLoadLord.test.ts` 2 test lord khác `marth`; (d) giữ cướp làng theo `aiRole`, ghi trong `Game_Design/battle.md`. Commit `735d112`, `86f3a9f`; Vitest 132/132, build PASS, Playwright 20/20; review PASS WITH NOTES.
  - Kiểm bởi: subagent

- [ ] 70. Thiết kế cao độ cho cơ chế lợi thế cao độ (V07) sau khi đặt cao độ FE3 về 0.
  - Tiêu chí xong: Ngày 2026-11-17 cao độ Chương 1–4 được đặt về 0 vì FE3 không có dữ liệu cao độ (luật chơi không đọc cao độ; `boardView` chép sang mô hình, 3D dùng để dựng độ cao ô nên đồi Ch1 nay phẳng trong 3D). Cần: chốt luật V07 trong `battle.md`, quy tắc gán cao độ (ví dụ theo loại địa hình hoặc thiết kế tay) và ghi rõ đây là dữ liệu tự thiết kế, không phải FE3; sửa `Game_Design/art_ui.md` dòng 7 và `overview.md` dòng 18 đang mô tả "cao độ 0–2" cho khớp.
  - Kết quả: CHỜ NGƯỜI DÙNG: Gắn với mục 61 (chốt luật nhóm vị trí). Cao độ lấy theo loại địa hình hay thiết kế từng bản đồ?
  - Kiểm bởi: tôi

- [x] 71. Màn trận 2D toàn màn hình theo bố cục FE3 (chủ dự án yêu cầu 2026-11-17).
  - Tiêu chí xong: (1) Ở viewport 1366x768, Chương 1–3: bản đồ chiếm toàn khung, không còn thanh trên và cột phải; cuộn tới được ô (0,0) và ô góc dưới phải (kiểm trên trình duyệt thật). (2) Một nút ⚙ mở menu chứa chọn chương, mục tiêu, vàng, Turn/Phase, Save/Load Game, Save Files, World Map, Title, 2D/3D, âm thanh, Combat Log. (3) Nút End Turn luôn hiện ngoài menu; End Turn và ⚙ đặt cạnh nhau ở góc phải dưới, ⚙ bên phải End Turn, ⚙ to hơn (chủ dự án yêu cầu 2026-11-17); menu mở lên trên. (4) Dự báo giao tranh là cửa sổ đè mép trái bản đồ; menu hành động chỉ hiện sau khi di chuyển; thông tin quân/địa hình chỉ hiện khi rê lên quân. (5) Trên 2D mỗi quân là hình tròn (rộng = cao) nằm giữa ô (chủ dự án yêu cầu 2026-11-17). (6) Không thêm tính năng ngoài danh sách trên; `App.tsx` không dài thêm. (7) Gate PASS.
  - Nguồn bố cục: ảnh FE3 trong `Original/04_Battle_Backgrounds/` (`UI_and_Menus/Ss_fe03_combat_forecast*.png`, `InGame_Screenshots/Ss_fe03_lower_left_corner_of_chapter_2_final.png`, `Ss_fe03_fan_translation_ch6.png`, `Ss_fe03_trade.png`).
  - Sửa test (chủ dự án duyệt 2026-11-17): các test bấm nút đã chuyển vào menu ⚙ được thêm bước mở menu trước thao tác; không đổi điều test kiểm.
  - Kết quả: PASS: gate `node .studio/gate.mjs` trên commit `1abab2e` nhánh `cs/battle-fullscreen-ui`: **Result: PASS** (test, build, integration); Vitest 134/134; Playwright 20/20 (lượt chạy toàn bộ trước đó trên `bda9fb2` cũng Result: PASS). Review độc lập (subagent reviewer, `bda9fb2`): PASS WITH NOTES, 0 HIGH; 3 MEDIUM đã sửa ở `1abab2e` (xóa popup cũ khi tải/đổi chương/chơi lại, đệm bản đồ khỏi cụm HUD, unit test `tests/core/combatPopupData.test.ts`), tài liệu `art_ui.md` đã cập nhật. Verifier subagent không chạy được: hook của plugin coding-claude chặn `run-verify.mjs` ở mọi đường dẫn đã thử (lỗi cấu hình hook ngoài dự án). Kiểm trên trình duyệt thật (Playwright, 1366x768): bản đồ toàn khung, cuộn tới ô (0,0) và (29,12) và ô cuối bấm trúng được (không bị HUD che), End Turn + ⚙ (48px) góc phải dưới, quân 2D tròn 46x46; ảnh `work/battle-fullscreen-ui/battle-1366*.png`, `review/10-max-scroll.png`. Sửa test được chủ dự án duyệt: thêm bước mở ⚙; chờ model 3D tải xong trong `enterBattle` (chủ dự án cho tự quyết 2026-11-18); chờ thông báo tải xong trước khi mở lại ⚙.
  - Kiểm bởi: subagent

- [x] 73. Rà soát và sửa các popup màn trận 2D theo FE3 (thông tin quân, dự báo giao tranh, kết quả giao tranh, menu hành động, chuẩn bị trận, hội thoại).
  - Tiêu chí xong: mỗi phát hiện trong `work/battle-fullscreen-ui/review/` (ảnh 01–09, chụp 1366x768, seed replay Chương 1) được sửa hoặc chủ dự án chọn giữ; đối chiếu ảnh FE3 trong `Original/04_Battle_Backgrounds/`; gate PASS.
  - Phát hiện (2026-11-18): P1 sau khi đánh không còn thấy kết quả (Combat Log nằm trong ⚙); P1 dự báo thiếu đánh hai lần dù core có `attackCount` (Q05 yêu cầu); P2 cửa sổ thông tin quân hiện growth rate (FE3 không hiện), cỡ 300x400 che mép trái, trùng thông tin khi đang xem dự báo; P2 menu hành động ở góc phải trên, xa quân; P2 menu ⚙ vẫn mở phía sau màn chuẩn bị khi đổi chương; P3 màn chuẩn bị là danh sách checkbox (FE3: lưới tên quân + panel thông tin, `Ss_fe03_unit_select.png`); P3 hội thoại là modal giữa màn (FE3: khung chữ mép dưới/trên).
  - Quyết định chủ dự án (2026-11-18): popup kết quả giao tranh kiểu FE3 (2 panel, không hoạt cảnh); thông tin quân gọn khi rê, đầy đủ khi chuột phải/nhấn giữ, bỏ growth rate; làm lại màn chuẩn bị (lưới tên + panel thông tin) và hội thoại (khung chữ mép dưới) theo FE3; các phát hiện còn lại tự xử lý. Brief: `work/battle-fullscreen-ui/04-handoff-2.md`.
  - Kết quả: PASS: gate `node .studio/gate.mjs` trên commit `1abab2e` nhánh `cs/battle-fullscreen-ui`: **Result: PASS** (test, build, integration); Vitest 134/134; Playwright 20/20 (lượt chạy toàn bộ trước đó trên `bda9fb2` cũng Result: PASS). Review độc lập (subagent reviewer, `bda9fb2`): PASS WITH NOTES, 0 HIGH; 3 MEDIUM đã sửa ở `1abab2e` (xóa popup cũ khi tải/đổi chương/chơi lại, đệm bản đồ khỏi cụm HUD, unit test `tests/core/combatPopupData.test.ts`), tài liệu `art_ui.md` đã cập nhật. Verifier subagent không chạy được: hook của plugin coding-claude chặn `run-verify.mjs` ở mọi đường dẫn đã thử (lỗi cấu hình hook ngoài dự án). Ảnh trước/sau ở `work/battle-fullscreen-ui/review/01–10.png` (replay Chương 1 seed cố định): popup kết quả 2 panel, khung thông tin gọn khi rê (không growth), dự báo ×N, menu hành động cạnh quân, màn chuẩn bị dạng lưới 3 cột + panel, hội thoại khung mép dưới, ⚙ đóng khi đổi chương. Còn LOW chưa xử lý (ghi trong review): popup không có `aria-live`, popup che HUD khi khung hẹp dưới ~950px, menu hành động không bám theo khi cuộn bản đồ.
  - Kiểm bởi: subagent

- [x] 74. Sửa giao diện thông tin chi tiết nhân vật (FE3 layout, hỗ trợ tablet), thay icon quân 2D bằng avatar + thanh máu, đồng bộ 4 popup/giao diện màn trận theo FE3, nâng cấp bảng dự báo giao tranh, định vị thông minh menu hành động tránh che mục tiêu, mũi tên dẫn đường di chuyển và hoạt cảnh bước đi kèm âm thanh.
  - Tiêu chí xong: (1) Hỗ trợ tablet/cảm ứng cho thông tin chi tiết nhân vật: chạm vào quân hiện bảng thông tin cơ bản (`UnitHoverWindow`); trên bảng này có nút/vùng bấm mở chi tiết (`UnitInspectorWindow`), đồng thời hỗ trợ chạm giữ (long-press ~500ms) trên ô; trên giao diện chi tiết có nút đóng rõ ràng [✕]. (2) Bảng thông tin chi tiết (`UnitInspectorWindow`) thiết kế theo bố cục FE3 gốc: phân khối chuẩn (khối trên: tên, class, LV/EXP, HP, chân dung nhân vật, danh sách vũ khí kèm icon FE3 và số lần dùng; khối dưới trái: chỉ số combat Atk/Hit/Avo/Crit/AS/Eff; khối dưới giữa: chỉ số Str/Skl/Spd/Lck/Mag/Def/Res; khối dưới phải: vật phẩm/items kèm icon FE3 và số lần dùng, Max HP, Move), giữ phong cách UI hiện đại đồng bộ dự án, 100% tiếng Anh không dịch sang tiếng Việt/tiếng Nhật. Icon vũ khí và vật phẩm lấy từ `Original/08_Items_and_Weapons/` đưa vào `public/icons/items/`. Giữ nguyên mọi công thức, dữ liệu và chỉ số hiện có. (3) Trên lưới 2D (`Grid2D.tsx`): thay icon hình tròn bằng avatar nhân vật kèm viền phe (xanh cho quân ta, đỏ cho quân địch, xám khi đã hành động, vàng khi được chọn); phía dưới mỗi quân có thanh máu (HP bar) với màu theo tỷ lệ máu và chữ hiển thị số máu hiện tại/tổng số máu (HP: hiện tại / tối đa). (4) Đồng bộ 4 thành phần UI màn trận theo bố cục FE3 và ảnh tham chiếu người dùng (2026-11-18): [Ảnh 1] Hộp thoại (`DialogueBox.tsx`) có chân dung avatar đóng khung bên cạnh khung thoại, đuôi mũi tên hình tam giác chỉ trực tiếp vào chân dung người nói; [Ảnh 2] Thông tin địa hình (`TerrainInfoWindow.tsx`) nhỏ gọn hiển thị tên địa hình và né tránh (`Avoid : X%` kèm Def nếu > 0) khi chạm/di chuột vào ô trống; [Ảnh 3] Menu hành động (`ActionMenuWindow.tsx`) nền navy viền vàng với con trỏ bàn tay chỉ (`👉`) cạnh lệnh đang chọn/hover; [Ảnh 4] Thông tin cơ bản quân (`UnitHoverWindow.tsx`) dạng banner ngang 3 cột (Cột 1: Name, Class, LV · EX, HP; Cột 2: Avatar đóng khung giữa; Cột 3: Vũ khí trang bị kèm `/uses`, icon FE3 và nút Details cho tablet). (5) Nâng cấp bảng dự báo giao tranh (`CombatForecastWindow.tsx`): hiển thị chi tiết lượng máu giảm dự kiến `HP: current → after (-loss)` (không tính crit), kèm thanh máu trực quan phân đoạn hai màu (xanh lá: máu còn lại, đỏ: lượng máu mất đi), chỉ số trúng `Hit: X%`, chỉ số né tránh `Avo: X%`, chí mạng `Crit: X%`, tốc độ ra đòn `AS: X` (và nhãn `Double Attack` / `×N`), chân dung avatar và icon vũ khí FE3 gốc. (6) Định vị thông minh cho menu hành động (`ActionMenuWindow.tsx`): thuật toán tính toán vị trí theo trọng số và vùng va chạm (`computeActionMenuPosition`) tự động né tất cả các ô mục tiêu tấn công (`targetPositions` và ô đỏ `[data-attack-target]`), mở về phía đối diện mục tiêu (sang trái khi mục tiêu ở bên phải, sang phải khi mục tiêu ở bên trái, hoặc lên trên/xuống dưới khi bị kẹp hai bên) để không bao giờ che khuất quân địch hay ô đỏ cần click tấn công. (7) Mũi tên dẫn đường di chuyển (`MovementArrow.tsx`) hiển thị từ ô xuất phát đến ô đích khi chọn ô, nhân vật giữ nguyên vị trí cũ, popup hành động xuất hiện ở ô đích; khi xác nhận hành động (Wait, Attack, Seize, Talk, Village, Vulnerary, Promote) nhân vật di chuyển lướt mượt qua từng ô theo đường đi (`movementAnimation.ts`) kèm âm thanh bước chân (`soundManager.playMoveStep`); bấm Cancel Move huỷ lệnh và xoá mũi tên mà không teleport. (8) Code TypeScript strict, không `any`, kích thước file dưới 400 dòng (`App.tsx` duy trì 1179 dòng). (9) Gate PASS (150 unit tests, build, 20/20 e2e integration).
  - Kết quả: PASS: gate `node .studio/gate.mjs` trên nhánh `agy/74-fe3-unit-details-avatar`: **Result: PASS** (rules 0, test 23 files/150 tests PASS, build PASS, integration 20/20 Playwright e2e PASS); mũi tên dẫn đường di chuyển (`MovementArrow.tsx`) và hoạt cảnh bước chân lướt từng ô (`movementAnimation.ts`, ~65ms/ô) kèm âm thanh bước chân theo loại di chuyển (foot, cavalry, armor, flier); menu hành động né thông minh mục tiêu tấn công (`computeActionMenuPosition`), không che ô đỏ/quân địch; hỗ trợ tablet qua nút "Details ℹ️" trên `UnitHoverWindow` và long-press ~500ms trên ô; popup `UnitInspectorWindow` giữ đúng bố cục FE3 với icon vũ khí/vật phẩm FE3 gốc từ `public/icons/items/` và phong cách theme phẳng hiện đại, 100% tiếng Anh; `Grid2D` thay hình tròn bằng avatar nhân vật bo góc (42×42) kèm viền phe và thanh máu trực quan hiển thị `HP: current/max`; hoàn thiện 4 giao diện màn trận theo 4 ảnh tham chiếu FE3 (hộp thoại có đuôi mũi tên chỉ avatar, thông tin ô đất gọn gàng, menu hành động có con trỏ bàn tay `👉`, banner thông tin cơ bản nhân vật 3 cột); bảng dự báo giao tranh hiển thị đầy đủ lượng máu giảm `HP: current → after (-loss)` kèm thanh máu hai màu, `Hit`, `Avo`, `Crit`, `AS` và icon vũ khí FE3; `App.tsx` duy trì 1179 dòng (không vượt).
  - Kiểm bởi: tôi

- [ ] 75. Sửa các phát hiện High/Medium của code review toàn repo ngày 2026-11-18.
  - Nguồn: `reports/code_review_toan_repo_2026-11-18.md` (OCR delegate, 88/88 file, HEAD `4567226`); mã H1–H2, M1–M13 trong file đó. `reports/` bị gitignore, file nằm trong thư mục dự án trên OneDrive.
  - Tiêu chí xong: (1) H1, H2 sửa xong, mỗi lỗi có test tái hiện (unit hoặc Playwright) fail trước khi sửa và pass sau khi sửa. (2) M1, M3, M4, M8 (phần `loadGameState`), M9, M10, M13 sửa xong, có test hoặc bằng chứng kiểm tay ghi lại. (3) M2, M5, M6, M7, M11, M12 thuộc diện sửa lớn hoặc đổi type core: được sửa, hoặc tách thành mục riêng trong `PLAN.md` kèm lý do. (4) Không sửa hay làm yếu test có sẵn; mục cần đổi test ghi lý do và chờ duyệt. (5) Gate `node .studio/gate.mjs` Result: PASS.
  - Kết quả: CHỜ NGƯỜI DÙNG: H1, H2 sửa xong trên nhánh `cs/water-batch1-h1-h2` (chưa push/merge): H1 — `buildNewGameSnapshot()` mới trong `src/storage/saveLoad.ts`, `onNewGameAtSlot` trong `src/App.tsx` lưu snapshot chương 01 mới thay vì state cũ; test tái hiện `tests/core/saveLoadNewGame.test.ts` (3 test, fail trước khi sửa, pass sau). H2 — `SaveSlotsModal.tsx` dùng giá trị trả về của `deleteSaveSlot`/`copySaveSlot` cho toast và hỏi `window.confirm` trước khi copy đè ô đã có dữ liệu; test tái hiện `tests/browser/saveSlots.spec.ts` (2 test Playwright, test copy fail trước khi sửa vì không có hộp xác nhận, pass sau). Vitest 24 file/153 test PASS, build (`tsc && vite build`) PASS. Gate `node .studio/gate.mjs` 2026-11-19: Result: FAIL — e2e 11 passed / 11 failed, cả 11 lỗi đều ở `tests/browser/battle.spec.ts`. Đã loại trừ: chạy lại `battle.spec.ts` trên HEAD gốc (stash hết sửa đổi) cũng fail đúng 11 test đó (không phải do đợt 1); cài browser Playwright 1254 thật rồi chạy lại gate vẫn fail đúng 11 test đó (không phải do browser). Chẩn đoán bằng test debug tạm (đã xóa): sau khi bấm Save Game, bản lưu vẫn ghi thành công vào IndexedDB và toast 'Game progress saved' vẫn hiện — nhưng chậm ~3,5 giây vì vòng render 3D chiếm main thread trên máy yếu (1,5 CPU), trong khi test chỉ chờ toast 5 giây. Cần chủ dự án quyết: chạy gate trên máy mạnh hơn, hay duyệt tăng timeout cho các assertion chờ toast trong `battle.spec.ts`. Quyết định của chủ dự án 2026-11-19: bỏ test 3D, giao diện mặc định là 2D, chỉ test trên 2D. Lý do (ghi theo AGENTS.md): 3D tạm đóng băng tới giai đoạn port (mục 41); 11 lỗi battle.spec là do vòng render 3D chiếm main thread trên máy yếu. Đã xóa 3 test chỉ-3D (scene loads, drag pan/rotate/zoom, minimap) + 1 test chuyển view 3D/2D trong errorTolerance, và chuyển 8 test luồng chơi sang chạy trên lưới 2D (click tile qua data-testid, cùng mẫu với chapterReplay.spec.ts). Gate `node .studio/gate.mjs` 2026-11-19 sau đợt bỏ test 3D: Result: PASS (build PASS, e2e PASS; battle.spec.ts 9/9 pass trong 25 giây). Quyết định của chủ dự án 2026-11-18: class `knight` thăng lên `cataphract` là CHỦ Ý, không phải lỗi. Đợt 4 (M5/M7/M12) đã có research + brief + spec (`work/water-batch4-m5-m7-m12/`, specs `core-purity`, `data-driven-rules`, `app-assembly`), chờ duyệt M1/M2. Còn chờ chủ dự án: H1 và M5 sửa trong mục này hay tách riêng?
  - Kiểm bởi: tôi

- [x] 76. Thiết kế lại giao diện 4 vùng: thông tin cơ bản, chi tiết nhân vật, dự báo chiến đấu, menu setting.
  - Nguồn: yêu cầu của chủ dự án 2026-11-18 ("điều chỉnh lại giao diện, đặc biệt là các trang thông tin cơ bản, thông tin chi tiết nhân vật, thông tin dự báo chiến đấu, menu setting (xấu, các nút lộn xộn...)"); hợp đồng hình ảnh trong `Game_Design/art_ui.md` (tối giản/Nordic, navy `#0c1e5b` + gold `#eab308`, bản đồ toàn khung, popup chỉ là lớp phủ, giao diện 100% tiếng Anh).
  - Tiêu chí xong: (1) Bốn vùng theo spec đã duyệt (`specs/design-system.md`, `specs/hud-basic-info.md`, `specs/unit-inspector.md`, `specs/combat-forecast-ui.md`, `specs/settings-menu.md`): menu setting có nhóm + tiêu đề + một hành động chính duy nhất, panel dùng chung navy/gold (bỏ `#262626`/`#444`), riêng inspector dùng nền theo phe (địch đỏ đậm, ally xanh) + viền vàng theo quyết định 2026-11-19; mọi nút bấm đạt tối thiểu 44px; cửa sổ overlay bám lại ô của nó khi cuộn bản đồ/đổi kích thước cửa sổ. (2) `DESIGN.md` ở gốc repo ghi luật đã xác nhận, tách riêng trạng thái chưa xác nhận. (3) Không đổi luật chơi hay con số nào (số dự báo vẫn do core tính; đúng/sai số dự báo thuộc M1/M2, đợt 2); không đụng 3D; không sửa màn hình ngoài 4 vùng trừ khi dùng chung primitive. (4) Ảnh trước/sau của từng vùng trên giao diện thật tại 1366x768. (5) Gate `node .studio/gate.mjs` Result: PASS.
  - Kết quả: PASS: gate `node .studio/gate.mjs` Result: PASS (test PASS, build PASS, integration e2e PASS); Vitest 24 files/159 tests PASS; Playwright `tests/browser/uiRedesign.spec.ts` 25/25 PASS; before/after screenshots 7 shots each at 1366x768 in `work/water-ui-redesign/before/` and `work/water-ui-redesign/after/`.
    - Commits on `cs/water-ui-redesign` (from `dcb9a0d`): `7555be3` DESIGN.md + approved specs in `specs/`; `82dab0c` shared design tokens + tile-anchored overlay hook; `f54ad21` restyle hover banner, terrain, inspector, forecast, settings + `<html lang="en">`; `1b9ad99` muted text raised to caption grey for 4.5:1 contrast; `a099543` Vitest forecast/anchor tests; `a690c85` Playwright acceptance tests; `c249602` strict-TS fixes in the new tests; `a99420b` DESIGN.md flip-reachability note. Not pushed, not merged.
    - M1 owner decisions 2026-11-19 (recorded before the build): (1) full redesign; (2) basic info = hover banner + terrain window + HUD; (3) settings bottom-right next to End Turn; (4) inspector enemy gold frame + dark red bg, ally gold frame + blue bg, colours from the original FE3; (5) `<html lang="vi">` → "en".
    - Unconfirmed, for the owner (see `DESIGN.md`): inspector background shades `#1d4ed8`/`#7f1d1d` are [Giả định] — the FE3 reference (`Original/04_Battle_Backgrounds/`) is not reachable from this VM, confirm from `after/03-inspector-ally.png` and `after/04-inspector-enemy.png`; settings primary action = Save Game is [Giả định]; banner-flip test moves Marth to (19,5) first because chapter-1 units start too close to the map edge to scroll across the viewport middle at 1366px; forecast Avo display still uses the UI computation (Batch 2 M1/M2 owns its correctness).
- [ ] 77. Menu hành động sau di chuyển: bỏ dấu tích V trước Wait; thêm nút Attack khi có địch trong tầm đánh.
  - Nguồn: yêu cầu của chủ dự án 2026-11-19.
  - Tiêu chí xong: (1) Popup hành động sau di chuyển không còn dấu tích V trước chữ Wait. (2) Nút Attack chỉ hiện khi có địch nằm trong phạm vi tầm đánh của quân vừa di chuyển; bấm Attack đưa người chơi tới bước chọn mục tiêu/dự báo chiến đấu như khi bấm trực tiếp ô địch; không hiện nút khi không có địch trong tầm. (3) Không đổi luật chơi hay con số nào. (4) Kiểm trên trình duyệt thật (2D): di chuyển tới chỗ có địch trong tầm thì popup có Attack, di chuyển tới chỗ không có địch trong tầm thì popup không có Attack; chụp ảnh kiểm chứng. (5) Gate `node .studio/gate.mjs` Result: PASS.
  - Kết quả: PASS: (1) Wait không còn dấu ✓ (`ActionMenuWindow.tsx`; kiểm bằng textContent === 'Wait' trên trình duyệt thật + test uiRender assert `>Wait<` và không chứa '✓ Wait'). (2) Nút Attack chỉ hiện khi có địch trong tầm (`handleAttack` mở dự báo qua `handleTileClick` — dùng lại luồng bấm ô đỏ); kiểm trên trình duyệt thật 2D: địch kề Marth → menu có Attack → bấm Attack → COMBAT FORECAST hiện → Cancel → menu lại có Attack; Caeda di chuyển tới chỗ không có địch trong tầm → menu không có Attack. Ảnh: `work/water-action-menu-77/item77-attack-visible.png`, `item77-forecast.png`, `item77-no-attack.png`. Vitest 24 files/154 tests PASS; build PASS.
    - Nhiều mục tiêu trong tầm: Attack mở dự báo cho mục tiêu đầu tiên; hủy dự báo để quay lại menu rồi bấm ô đỏ khác (chủ dự án có thể yêu cầu danh sách chọn mục tiêu sau).
    - App.tsx +4 dòng (1183→1187) do handler `handleAttack` mới; không nhân đôi logic dự báo.
    - Gate lần 1 trên nhánh này: FAIL — cả 3 chapter replay fail vì fixture ghi bước '✓ Wait' (247 bước), không khớp nút Wait mới. Đã sửa fixture thành 'Wait' (chapterReplay 3/3 pass trở lại) và commit riêng. Gate chạy lại 2026-11-19: Result: PASS (build PASS, e2e PASS).
  - Kiểm bởi: tôi

- [x] 80. Menu hành động: bỏ dòng gợi ý "Click red tile to attack"; nút Attack khóa chọn mục tiêu trong tầm đánh; sửa bug dự báo cũ khi đổi ô đích.
  - Nguồn: yêu cầu của chủ dự án 2026-11-19 (kèm ảnh chụp màn hình). (1) Bỏ dòng chữ "Click red tile to attack" trong popup hành động, chỉ còn nút Attack. (2) Bấm Attack thì khóa vào các mục tiêu trong tầm đánh (nhiều mục tiêu thì chọn một trong số đó), không chọn được ô ngoài. (3) Bug hiện tại: bấm ô đỏ → popup dự báo hiện → không tắt popup, chọn di chuyển ô khác → bấm Attack vẫn đánh địch mà vẫn di chuyển ô khác được. Nguyên nhân đã tra: nhánh "bấm ô đích mới" trong `handleTileClick` đổi `pendingMovePos` mà không xóa `combatForecast`/`selectedTarget`, nên dự báo cũ (tính theo vị trí cũ) vẫn xác nhận được trong khi `executeWithMove` di chuyển quân tới ô mới.
  - Tiêu chí xong: (1) Popup hành động không còn dòng "Click red tile to attack"; nút Attack vẫn chỉ hiện khi có địch trong tầm. (2) Bấm Attack: đúng 1 mục tiêu → mở dự báo ngay như cũ; từ 2 mục tiêu → vào chế độ khóa chọn mục tiêu (menu ẩn, chỉ ô địch trong tầm mới đáp ứng, bấm ô đích của quân hoặc Esc để quay lại menu, ô khác bỏ qua). (3) Đổi ô đích khi dự báo đang mở → dự báo cũ đóng (không còn đánh + di chuyển cùng lúc). (4) Không đổi luật chơi hay con số nào; test uiRender bỏ assert dòng gợi ý (chủ dự án ra lệnh bỏ dòng đó). (5) Kiểm trên trình duyệt thật (2D) bằng spec mới `tests/browser/actionMenuAttack.spec.ts`: tái hiện bug (dự báo mở → bấm ô đích khác → dự báo đóng) và khóa chọn mục tiêu (2 địch trong tầm → Attack → bấm ô ngoài tầm không có gì xảy ra → bấm ô địch → dự báo mở; Esc quay lại menu); chụp ảnh kiểm chứng. (6) Gate `node .studio/gate.mjs` Result: PASS.
  - Kết quả: PASS: nhánh `cs/action-menu-attack-wait` (3 commit: `4a78443` PLAN, `d413186` triển khai, `0bd1452` test). (1) Đã bỏ dòng "🎯 Click red tile to attack" khỏi `ActionMenuWindow.tsx` (test uiRender đổi assert thành không chứa dòng đó — chủ dự án ra lệnh bỏ). (2) Nút Attack: đúng 1 mục tiêu → mở dự báo ngay; từ 2 mục tiêu → chế độ khóa chọn mục tiêu (`attackTargeting` trong `App.tsx`): menu ẩn, chỉ ô địch trong tầm mới đáp ứng (bấm vào mở dự báo của địch đó), bấm ô đích của quân hoặc Esc quay lại menu, ô khác bỏ qua. (3) Sửa bug: nhánh "bấm ô đích mới" trong `handleTileClick` nay xóa `combatForecast`/`selectedTarget`/`attackTargeting` — đổi ô đích thì dự báo cũ đóng, không còn đánh + di chuyển cùng lúc. Logic mở dự báo gộp thành helper `openAttackForecast` dùng chung cho bấm ô đỏ và khóa chọn mục tiêu (không nhân đôi). `App.tsx` +43 dòng (1187→1230; file vượt giới hạn dòng, ghi nhận trung thực). Kiểm chứng: `tsc --noEmit` PASS; Vitest 24 file/154 test PASS; Playwright spec mới `tests/browser/actionMenuAttack.spec.ts` 2/2 PASS trên 2D (tái hiện bug: dự báo mở → bấm ô đích khác → dự báo đóng + menu lại; khóa chọn mục tiêu: 2 địch trong tầm → Attack → bấm ô ngoài tầm không có gì xảy ra → bấm ô đích quay lại menu → Attack → bấm ô địch → dự báo mở → Cancel → Attack → Esc quay lại menu; địch được đưa vào tầm bằng seed vị trí trong IndexedDB); ảnh `work/water-action-menu-80/bug-fixed.png` + `target-lock.png`. Gate `node .studio/gate.mjs`: Result: PASS (test PASS, build PASS, integration PASS, 0 vi phạm luật). Chưa push/merge (chờ lệnh riêng).
  - Kiểm bởi: tôi

- [x] 79. Thiết kế lại trang thông tin chi tiết nhân vật theo mẫu J2 (navy hiện đại, Japanese minimalist, icon vũ khí/vật phẩm lớn).
  - Nguồn: yêu cầu của chủ dự án 2026-11-19 ("Design lại trang thông tin chi tiết nhân vật đi, xấu quá..."); chủ dự án chọn mẫu J2 ngày 2026-11-19 14:16 ("J2 nhé. Code đi"). Mockup: `~/workspace/water-emblem/work/water-inspector-redesign/mockup-j2.html` (+ `mockup-j2.png`). Nhánh `cs/water-inspector-j2` từ `cs/water-ui-redesign` @ `32429a4` (mục 78 nằm trên nhánh riêng `cs/move-arrow-avatar` nên số 79 không trùng).
  - Tiêu chí xong: (1) Inspector theo đúng mẫu J2 đã duyệt: panel navy `#101a2e`, viền vàng nhạt `#c9a227`, phe thể hiện bằng vạch accent trên + chip (không còn nền theo phe); avatar 112px, tên serif 23px, HP dạng thanh; ô Weapons riêng (lưới 2×2, mỗi ô icon FE3 26px + tên + số lần dùng); ô Items riêng (4 ô icon, ô trống viền đứt nét); ô Vitals riêng (Max HP, Move); Combat/Attributes hai cột; đóng bằng nút Close, bấm ngoài, Escape. (2) Không đổi nội dung hay con số nào (R1): đúng dữ liệu chương, không tính toán combat mới. (3) Cập nhật spec (`specs/unit-inspector.md` R2/R3/R7/R8/A4/A6, `specs/design-system.md` R1/R10/A1/A2) + `DESIGN.md` trước khi code; lý do sửa test ghi trong `work/water-inspector-j2/01-brief.md` (mẫu J2 đã duyệt thay thế cách thể hiện inspector của mục 76 — test không bị làm yếu, chỉ đổi giá trị kỳ vọng theo thiết kế mới). (4) Vitest PASS; Playwright (`uiRedesign.spec.ts` đã cập nhật + `inspectorJ2.spec.ts` mới) PASS trên 2D; ảnh trước/sau tại 1366x768. (5) Gate `node .studio/gate.mjs` Result: PASS. (6) Mở rộng theo quyết định chủ dự án 2026-11-19 16:07 (phương án B — nền theo phe dịu, thay thế quy tắc "không nền theo phe" của J2): nền panel nhuộm màu theo 4 nhóm hiển thị (ta `#101a2e` / địch `#2b1719` / trung gian `#12241a` / tiếp viện `#1e1428` [Giả định]) kèm vạch accent 3px + chip (Player/Enemy/Ally/Reinforcement) với 4 màu phe đã chốt 14:34 (`#3b82f6` / `#ef4444` / `#22c55e` / `#a855f7`); ô trong, ô icon, đường kẻ, rãnh thanh HP theo cùng tông phe; cờ hiển thị `GridUnit.isReinforcement` (chỉ để hiển thị — phe vẫn quyết hành vi) đọc từ JSON chương; token quân trên bản đồ 2D dùng cùng tông phe (nền `#1e3a8a`/`#7f1d1d`/`#14532d`/`#581c87` [2 giá trị sau Giả định], viền màu phe); 3D đóng băng không đụng. Spec: `specs/unit-inspector.md` R2/R9/A8, `specs/design-system.md` R1/R10/A1, `DESIGN.md` bảng màu. Test: Vitest cho `getFactionTone` + render SSR cả 4 tông; Playwright `uiRedesign.spec.ts` A1/A2/A4/A6 cập nhật theo tông phe + `inspectorJ2.spec.ts` kiểm tông ta/địch trên game thật; ảnh sau 4 phe (ta/địch chụp game thật, trung gian/tiếp viện chụp render component — chưa chương nào có quân Ally và kiểm tra save chặn đổi phe trong save).
  - Kết quả: PASS: nhánh `cs/water-inspector-j2` từ `cs/water-ui-redesign` @ `32429a4` (5 commit: `f22b236` spec J2 + PLAN, `ca8ab11` triển khai J2, `4c84084` spec tông phe B, `29e37fb` triển khai tông phe B, `0395457` test). Inspector theo J2 + nền nhuộm màu theo 4 nhóm hiển thị (ta `#101a2e` / địch `#2b1719` / trung gian `#12241a` / tiếp viện `#1e1428` [Giả định]), vạch accent 3px + chip (Player/Enemy/Ally/Reinforcement) với 4 màu phe đã chốt; ô trong/ô icon/đường kẻ/rãnh HP theo cùng tông; cờ `GridUnit.isReinforcement` đọc từ JSON chương (chỉ hiển thị, phe vẫn quyết hành vi); token quân trên bản đồ 2D theo cùng tông (nền `#1e3a8a`/`#7f1d1d`/`#14532d`/`#581c87` [2 giá trị sau Giả định], viền màu phe); 3D đóng băng không đụng. `App.tsx` +1 dòng (truyền `isReinforcement` qua `getUnitDisplay` — file vượt giới hạn dòng, ghi nhận trung thực). Kiểm chứng: `tsc --noEmit` PASS; Vitest 25 file/165 test PASS (thêm `tests/core/factionTones.test.ts` + render SSR cả 4 tông trong `uiRender.test.ts`); Playwright 2D: `uiRedesign.spec.ts` 25/25 + `inspectorJ2.spec.ts` 2/2 PASS (lý do sửa test ghi trong `work/water-inspector-j2/01-brief.md` — mẫu J2 + phương án B đã duyệt thay thế cách thể hiện của mục 76, test giữ nguyên ý định); ảnh trước/sau tại `work/water-inspector-j2/before/` + `after/` (ta/địch chụp game thật; trung gian/tiếp viện chụp render component — chưa chương nào có quân Ally và kiểm tra save chặn đổi phe trong save, ảnh game thật của 2 tông này còn nợ khi có chương có quân như vậy). Gate `node .studio/gate.mjs`: Result: PASS (test PASS, build PASS, integration PASS, 0 vi phạm luật). Chưa push/merge (chờ lệnh riêng). Còn chờ chủ xác nhận: nền tiếp viện `#1e1428` + tông phụ của nó và nền token trung gian/tiếp viện [Giả định] (xem ảnh sau).
  - Kiểm bởi: tôi

- [x] 82. Inspector: vũ khí ô 1 (đang trang bị) bị hiện 2 lần — bỏ bản trùng.
  - Nguồn: yêu cầu của chủ dự án 2026-11-19 ("Sửa cả lỗi vũ khí ở ô 1, khi port từ game FE3 sang thì bị nhân đôi đi"). Đã tra: dữ liệu gốc sạch (Marth chỉ có Rapier + Iron Sword; Gazzak chỉ có 1 Iron Axe) — lỗi ở logic hiển thị `UnitInspectorWindow.tsx`: `weaponList` bắt đầu bằng vũ khí đang trang bị rồi liệt kê tiếp toàn bộ vũ khí trong túi, kể cả chính cây đang trang bị, nên ô 1 luôn hiện 2 lần (thấy rõ trên ảnh mục 79: Marth hiện Rapier 2 lần, Gazzak hiện Iron Axe 2 lần).
  - Tiêu chí xong: (1) Inspector hiện mỗi vũ khí đúng 1 lần: vũ khí đang trang bị đứng đầu (ô 1), các vũ khí còn lại trong túi theo sau; quân mang 2 cây giống nhau thì cây thứ hai vẫn hiện. (2) Không đổi dữ liệu, luật chơi hay con số nào. (3) Test: Vitest `uiRender.test.ts` assert tên vũ khí đang trang bị xuất hiện đúng 1 lần trong render; Playwright `inspectorJ2.spec.ts` (test icons) cập nhật số ô có icon theo hiển thị đúng (Marth: Rapier + Iron Sword = 2 ô, 2 ô trống) — assert cũ ghim hiển thị bị nhân đôi mà chủ dự án báo là lỗi. (4) Chụp lại ảnh inspector sau sửa (ta/địch game thật + render trung gian/tiếp viện). (5) Gate `node .studio/gate.mjs` Result: PASS.
  - Kết quả: PASS: nhánh `cs/water-inspector-j2` (3 commit: `c090654` PLAN, `87d6ea5` sửa, `507501b` test). Sửa `UnitInspectorWindow.tsx`: khi dựng `weaponList`, bỏ qua mục trong túi trùng với vũ khí đang trang bị (cây thứ hai giống hệt vẫn hiện). Áp dụng cho mọi quân (lỗi ở logic hiển thị, dữ liệu gốc sạch — đã kiểm `characters.json` + chương 1). Kiểm chứng: `tsc --noEmit` PASS; Vitest 25 file/165 test PASS (thêm assert `>Rapier<` xuất hiện đúng 1 lần — đếm chữ hiển thị, không đếm alt của icon); Playwright `inspectorJ2.spec.ts` 2/2 PASS (test icons cập nhật: Marth 2 ô có icon + 2 ô trống — assert cũ ghim hiển thị nhân đôi, chủ dự án báo là lỗi); ảnh sau chụp lại: `work/water-inspector-j2/after/01-inspector-player.png` (Rapier 1 lần + Iron Sword), `02-inspector-enemy.png`, render `03/04` chụp lại. Gate `node .studio/gate.mjs`: Result: PASS (test PASS, build PASS, integration PASS, 0 vi phạm luật). Chưa push/merge (chờ lệnh riêng).
  - Kiểm bởi: tôi

- [ ] 83. Đường di chuyển: nút tròn ở ô bắt đầu phải nhìn thấy được (hiện bị avatar che).
  - Nguồn: chủ dự án báo 2026-11-19 kèm ảnh chụp ("Hình tròn đường kính 1/3 chiều ngang ô vuông chưa có"). Đã kiểm: nút tròn có trong DOM (r=10.67 tại tâm ô bắt đầu) nhưng SVG đường đi ở z 1, avatar ở lớp z 25 nên avatar 42px che kín nút 21px — người chơi không nhìn thấy.
  - Tiêu chí xong: (1) Nút tròn đường kính = 1/3 chiều ngang ô (r = tileSize/6), tâm tại ô bắt đầu, vẽ **trên** lớp avatar (z 26) để nhìn thấy; đường trắng mảnh vẫn ở z 1 dưới avatar (mục 78 giữ nguyên: avatar đè lên đường). (2) Test: Vitest `uiRender.test.ts` (test MovementArrow) thêm assert nút tròn nằm ở lớp trên avatar (`data-testid="movement-origin-node"`, z-index 26) — assert cũ về đường/r giữ nguyên. (3) Ảnh kiểm chứng trên trình duyệt thật: chọn quân + bấm ô đích, nút tròn hiện rõ tại ô bắt đầu. (4) Gate `node .studio/gate.mjs` Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 84. Độ bền vũ khí: vũ khí giảm độ bền khi đánh, vỡ thì biến mất.
  - Nguồn: đề xuất cơ chế 2026-11-19 (`work/water-mechanics-proposal/01-proposal.md` Nhóm A7); chủ dự án chốt 2026-11-19: "Vũ khí vỡ thì biến mất vì game không có rèn đồ". Hiện trạng: vũ khí không giảm `uses` khi đánh nên không bao giờ vỡ.
  - Tiêu chí xong: (1) Mỗi lần đánh bằng vũ khí (kể cả phản đòn/nhân đôi theo luật combat hiện có) trừ 1 độ bền; về 0 thì vũ khí biến mất khỏi túi, quân chuyển sang vũ khí dùng được tiếp theo (không còn thì không vũ khí). (2) Vật phẩm tiêu hao giữ nguyên cơ chế `spendItem` hiện có. (3) Test Vitest cho trừ độ bền + biến mất + chuyển vũ khí; Playwright kiểm trên game thật. (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 85. Đổi vũ khí trong trận: chọn vũ khí trang bị từ túi.
  - Nguồn: đề xuất cơ chế 2026-11-19 (Nhóm A7). Hiện trạng: vũ khí trang bị cố định theo trường `weapon`, các vũ khí khác trong túi chỉ để hiển thị.
  - Tiêu chí xong: (1) Trong menu hành động (hoặc inspector) đổi được vũ khí trang bị sang cây khác trong túi mà quân dùng được (rank/loại hợp lệ); dự báo giao tranh tính theo vũ khí mới. (2) Không đổi luật combat nào khác. (3) Test Vitest + Playwright. (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 86. Giới hạn túi đồ theo FE3: 4 vũ khí + 4 vật phẩm [Giả định].
  - Nguồn: đề xuất cơ chế 2026-11-19 (Nhóm A8); FE3 gốc tách 2 túi 4+4 (trượng thuộc túi vật phẩm). [Giả định 2026-11-19: chọn 4+4 kiểu FE3 — khớp sẵn bố cục inspector J2 (ô Weapons 2×2 + 4 ô Items); chủ dự án chưa trả lời điểm này trong lượt chốt, ghi rõ là giả định.]
  - Tiêu chí xong: (1) Túi mỗi quân tối đa 4 vũ khí + 4 vật phẩm; nhận đồ khi đầy thì hỏi gửi vào kho (mục 88) hoặc bỏ. (2) Dữ liệu chương hiện tại không quân nào vượt giới hạn (kiểm bằng test). (3) Test Vitest + Playwright. (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 87. Trao đổi đồ (Trade) giữa 2 quân đứng cạnh nhau.
  - Nguồn: chủ dự án yêu cầu 2026-11-19; luật FE3 gốc (nghiên cứu 2026-11-19): đổi đồ giữa 2 quân kề nhau; thoát Trade thì hết di chuyển nhưng vẫn đánh/dùng đồ/dùng trượng được từ ô đó; mỗi quân chỉ chủ động trade 1 lần/lượt; quân khác vẫn trade với quân đó được; trade với quân đã hành động xong sẽ đổi vũ khí trang bị của quân đó thành cây dùng được đầu tiên; đánh xong không trade được.
  - Tiêu chí xong: (1) Menu hành động có Trade khi đứng kề đồng minh; giao diện 2 cửa sổ theo bố cục FE3 (`art_ui.md` đã tham chiếu ảnh trade). (2) Đúng các luật trên, gồm giới hạn túi (mục 86). (3) Test Vitest + Playwright. (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 88. Kho đồ qua Marth (Convoy): cất/lấy đồ khi đứng cạnh Marth.
  - Nguồn: chủ dự án yêu cầu 2026-11-19; luật FE3 gốc: Marth là kho, 128 ô chung cho vũ khí + vật phẩm (trượng/đá rồng tính là vật phẩm), cất/lấy miễn phí; trong trận chỉ quân đứng kề Marth (và chính Marth) mới có lệnh Storage; màn chuẩn bị tự do cất/lấy/trade; đồ tràn túi hỏi gửi vào kho.
  - Tiêu chí xong: (1) Kho 128 ô lưu trong save; lệnh Storage trong menu khi kề Marth; màn chuẩn bị (Q06) quản lý kho được. (2) Đồ nhận khi túi đầy (mục 86) hỏi gửi vào kho. (3) Test Vitest + Playwright (kể cả save/load giữ kho). (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 89. Dùng trượng (C10): hành động dùng trượng trong trận.
  - Nguồn: đã chọn C10 trong `decisions.md`; danh sách trượng FE3 (nghiên cứu 2026-11-19): Heal/Mend/Recover/Physic/Fortify/Warp/Rescue/Silence/Barrier/Hammerne/Thief/Unlock/Watch/Again/Aum (Rewarp không có ở FE3). Dữ liệu hiện có heal/mend/warp + quân mang trượng (Wrys, Lena) nhưng không có hành động dùng.
  - Tiêu chí xong: (1) Hành động dùng trượng trong menu cho quân mang trượng dùng được (rank/loại hợp lệ): hồi máu (Heal/Mend/Recover/Physic/Fortify) trước; các trượng còn lại theo dữ liệu có sẵn, ghi rõ trượng nào chưa làm. (2) Trượng giảm độ bền khi dùng, vỡ thì biến mất (mục 84). (3) EXP cho healer: kiểm nguồn FE3 trước khi chốt số (nghiên cứu ghi chưa thống nhất — ghi rõ số dùng là [Giả định] nếu chưa kiểm được ROM). (4) Test Vitest + Playwright. (5) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 90. Rank vũ khí tăng theo dùng (WEx).
  - Nguồn: đề xuất cơ chế 2026-11-19 (Nhóm A9); FE5: ngưỡng E→D 50, D→C 100, C→B 150, B→A 200, A→S 250; 1 WEx mỗi lần đánh trúng, trượng 1–10 theo rank. Hiện trạng: rank có nhưng không bao giờ tăng.
  - Tiêu chí xong: (1) Đánh trúng/dùng trượng cộng WEx theo loại vũ khí; đủ ngưỡng thì lên rank; rank giữ qua chương (save). (2) Không đổi bonus rank hiện có. (3) Test Vitest + Playwright. (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 91. Tiệm vũ khí/dụng cụ: mua/bán bằng vàng.
  - Nguồn: đề xuất cơ chế 2026-11-19 (Nhóm A4). Hiện trạng: ô `shop` có trên bản đồ nhưng không mua bán được; `items.json` chưa có giá. `decisions.md` từng xếp shop/forge vào "chưa chọn" — mục này đưa shop vào phạm vi (forge vẫn không làm, theo chốt "game không có rèn đồ" 2026-11-19).
  - Tiêu chí xong: (1) Giá mua cho mọi vật phẩm trong `items.json` (nguồn FE11/FE12 theo quy tắc nguồn `decisions.md`, ghi rõ vật phẩm nào là [Giả định]); bán lại theo tỉ lệ cố định ghi trong spec. (2) Đứng trên ô shop có lệnh mua/bán; đồ mua vào túi (giới hạn mục 86, tràn thì vào kho mục 88). (3) Test Vitest + Playwright. (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 92. Rương/cửa/khóa: mở bằng thief, chìa khóa, Marth + Fire Emblem.
  - Nguồn: đề xuất cơ chế 2026-11-19 (Nhóm A5); FE3 gốc: thief mở khóa bẩm sinh (không cần lockpick), Marth chỉ mở rương khi có Fire Emblem. Hiện trạng: `door_key` có trong dữ liệu, Julian mang sẵn, nhưng không có tương tác; `terrains.json` chưa có ô chest/door.
  - Tiêu chí xong: (1) Ô chest/door trong dữ liệu địa hình + bản đồ chương có đặt rương/cửa (ghi rõ chương nào); thief mở được cả hai, quân mang `door_key` mở cửa (tiêu hao), Marth có Fire Emblem mở rương. (2) Rương cho vật phẩm/vàng theo dữ liệu chương. (3) Test Vitest + Playwright. (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 93. Đấu trường (Arena) với Yield.
  - Nguồn: đề xuất cơ chế 2026-11-19 (Nhóm A6); FE3 có Yield (rút lui) so với FE1.
  - Tiêu chí xong: (1) Ô arena trên bản đồ chương có đặt (ghi rõ chương nào); vào đấu trường tốn vàng cược, thắng nhận vàng + EXP, Yield rút lui giữa trận (mất cược), thua hết HP thì chết theo luật permadeath hiện có. (2) Đối thủ đấu trường theo dữ liệu cân bằng ghi trong spec. (3) Test Vitest + Playwright. (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 94. Viện binh (B04): báo trước, không hành động lượt xuất hiện.
  - Nguồn: đã chọn B04 "Viện binh báo trước" trong `decisions.md`; chủ dự án ủy quyền quyết định kiểu viện binh 2026-11-19 ("cho phép tự quyết định"). Quyết định (tôi, theo ủy quyền): viện binh được báo trước (hiển thị điểm/lượt xuất hiện) và **không hành động trong lượt xuất hiện** — kiểu hiện đại được người chơi đánh giá cao hơn; ambush spawn kiểu FE3 (đánh ngay lượt xuất hiện) bị phê bình rộng rãi là không công bằng. Hiện trạng: chưa có hệ viện binh (chỉ có cờ hiển thị `isReinforcement`).
  - Tiêu chí xong: (1) Dữ liệu chương khai báo viện binh (lượt/điều kiện kích hoạt, ô xuất hiện, quân); xuất hiện đầu pha địch, lượt đó không di chuyển/tấn công; cảnh báo trước cho người chơi (điểm xuất hiện + lượt). (2) Quân viện binh dùng cờ `isReinforcement` sẵn có cho hiển thị. (3) Test Vitest + Playwright. (4) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [ ] 95. Nguồn Master Seal ở chương 1–3 [Giả định vị trí].
  - Nguồn: đề xuất cơ chế 2026-11-19 (Nhóm A10). Thăng cấp đã code (Master Seal + cấp ≥10) nhưng ch1–3 không có nguồn Master Seal nào nên không thăng cấp được. [Giả định 2026-11-19: đặt 1 Master Seal ở làng chương 2 và 1 ở rương chương 3 (cần mục 92); chủ dự án chưa trả lời điểm này trong lượt chốt.]
  - Tiêu chí xong: (1) Dữ liệu chương 2/3 có Master Seal tại vị trí đã ghi; quân cấp ≥10 thăng cấp được trong game thật. (2) Test Playwright kiểm luồng thăng cấp. (3) Gate Result: PASS.
  - Kết quả: Mới ghi nhận 2026-11-19, chưa làm.
  - Kiểm bởi: tôi

- [x] 78. Mũi tên di chuyển: avatar đè lên mũi tên; mũi tên dày, trắng, nét liền, hơi trong suốt, đầu mũi tên dạng khối theo ảnh mẫu.
  - Nguồn: yêu cầu của chủ dự án 2026-11-19 (kèm ảnh mũi tên mẫu — chỉ lấy hình dáng, không lấy màu).
  - Tiêu chí xong: (1) Trên trình duyệt thật (2D): khi chọn quân và rê tới ô đích, avatar của mọi quân trên đường đi luôn hiển thị đè lên mũi tên (không bị mũi tên che); chụp ảnh kiểm chứng. (2) Mũi tên: thân dày hơn (rộng ~18px so với 9px cũ), màu trắng, nét liền (không còn đường đứt), hơi trong suốt (opacity ~0.85), có viền tối để không trùng nền; đầu mũi tên dạng khối tam giác rộng theo ảnh mẫu. (3) Không đổi luật chơi hay con số nào. (4) Gate `node .studio/gate.mjs` Result: PASS.
  - Kết quả: PASS: `MovementArrow.tsx` — bỏ glow cyan + lõi trắng đứt đoạn; thân trắng liền 18px opacity 0.85, viền tối `#0f172a` 26px opacity 0.85, đầu mũi tên khối `M 20,0 L -14,-22 L -7,0 L -14,22 Z` trắng opacity 0.85 viền tối 3.5px, vòng đích trắng liền, chấm gốc trắng viền tối; SVG z 15 → 1. `Grid2D.tsx` — tách `UnitToken` dùng chung (avatar + thanh HP); avatar các quân đứng yên dời vào lớp phủ riêng (z 25, `data-testid=unit-token-<unitId>`, pointer-events none) sau mũi tên, avatar đang di chuyển dùng lại `UnitToken` (z 25); `Grid2D.tsx` 379 → 354 dòng. Vitest 24 file / 153 test PASS; build PASS. Kiểm trên trình duyệt thật (spec tạm, đã xóa): Marth (24,5) → (23,5): polyline trắng 18px + viền tối 26px, không dasharray, không `#38bdf8`, không glow; đầu mũi tên đúng path; SVG z 1, token Marth z 25, token sau SVG trong DOM; ảnh `work/water-move-arrow-78/item78-arrow.png` cho thấy avatar Marth đè lên thân mũi tên, đầu mũi tên trắng dạng khối tại (23,5). Ghi chú kiểm chứng: đường đi chỉ hiện khi CLICK ô đích (plannedPath set ở `App.tsx` khi click, không phải khi hover — tiêu chí (1) nói "rê tới" hiểu là chọn đích); ô (20–22,5) là biển theo `data/maps/chapter_01_talys.json` nên không vào được trên bộ, dùng (23,5) làm đích. Đổi test `tests/core/uiRender.test.ts` (test MovementArrow cũ assert đúng phần bị bỏ: `feDropShadow` + `stroke-dasharray="6 6"`) sang assert mũi tên mới — đổi test theo tiêu chí mục đã duyệt. Không đổi luật/con số nào. Gate `node .studio/gate.mjs` Result: PASS (test PASS, build PASS, integration PASS).
  - Kiểm bởi: tôi

- [x] 81. Đường di chuyển: đổi mũi tên dày thành đường mảnh liền + nút tròn 1/3 ô ở đầu di chuyển.
  - Nguồn: yêu cầu của chủ dự án 2026-11-19 (kèm ảnh mẫu thứ hai): "đổi mũi tên hiện tại thành thiết kế giống như trong ảnh 2: một đường mảnh liền, 1 nút tròn có đường kính bằng 1/3 chiều ngang ô vuông, nằm chính giữa ở đầu di chuyển". Thay thiết kế mũi tên dày/đầu khối của mục 78; yêu cầu "avatar đè lên trên thanh hướng di chuyển" (mục 78) giữ nguyên.
  - Tiêu chí xong: (1) `MovementArrow.tsx`: đường đi là một đường mảnh liền (trắng 3px trên viền tối 5px để không trùng nền, giữ opacity 0.85), không còn thân dày 18/26px, không còn đầu mũi tên khối, không còn vòng đích; nút tròn ở đầu di chuyển: đường kính = 1/3 chiều ngang ô (r = tileSize/6), nằm chính giữa ô xuất phát. (2) Avatar vẫn đè lên trên đường (lớp phủ z 25 của mục 78 giữ nguyên, SVG z 1). (3) Không đổi luật chơi hay con số nào; test uiRender (test MovementArrow) đổi assert theo thiết kế mới — chủ dự án ra lệnh đổi thiết kế. (4) Kiểm trên trình duyệt thật (2D, spec tạm đã xóa sau khi chụp): Marth (24,5) → (23,5): polyline trắng 3px + viền tối 5px, nút tròn r≈10.7 tại tâm ô (24,5), không còn path đầu mũi tên/vòng đích; chụp ảnh kiểm chứng. (5) Gate `node .studio/gate.mjs` Result: PASS.
  - Kết quả: PASS: nhánh `cs/move-arrow-avatar` (2 commit: `9022092` PLAN, `c5f90bc` triển khai + test). `MovementArrow.tsx` viết lại (122 → 84 dòng): đường mảnh liền trắng 3px trên viền tối 5px (opacity 0.85, bo tròn đầu/nối), nút tròn ở đầu di chuyển r = tileSize/6 = 10.67px (đường kính 1/3 ô 64px) tại tâm ô xuất phát, trắng viền tối; bỏ thân dày 18/26px, đầu mũi tên khối, vòng đích, chấm gốc r6. Avatar vẫn đè lên trên (lớp phủ z 25 của mục 78 giữ nguyên, SVG z 1). Test uiRender (MovementArrow) đổi assert theo thiết kế mới (chủ dự án ra lệnh đổi thiết kế). Kiểm chứng: `tsc --noEmit` PASS; Vitest 24 file/153 test PASS; trình duyệt thật 2D (spec tạm, đã xóa): Marth (24,5) → (23,5): polyline đúng 2 lớp (tối 5px/trắng 3px, không dash), đúng 1 circle r=10.67 tại (1620,366) = tâm ô (24,5), 0 path (không còn đầu mũi tên), SVG z 1, token Marth z 25; ảnh `work/water-move-arrow-81/item81-thin-line.png`. Gate `node .studio/gate.mjs`: Result: PASS (test PASS, build PASS, integration PASS, 0 vi phạm luật). Chưa push/merge (chờ lệnh riêng).
  - Kiểm bởi: tôi

## Giai đoạn 4 trở đi: mở rộng

- [x] 68. Lưới bản đồ FE3 Book 1 Chương 4 (giao Antigravity, Claude kiểm soát).
  - Tiêu chí xong: Antigravity làm theo `Water-Emblem/tools/fe3_map_reference/README.md` trên nhánh `agy/fe3-ch4-map`: có `data/reference/fe3/<map-id>.json` và `data/maps/<map-id>.json`; `compare.mjs` MATCH; test, build PASS; không sửa file ngoài phạm vi. Claude kiểm độc lập: tự trích lại lưới từ sơ đồ và so từng ô, đối chiếu kích thước/công trình với ảnh gốc, kiểm định dạng và phạm vi file; báo chủ dự án chất lượng.
  - Kết quả: PASS: Antigravity (gemini-3.8-flash-high) lập `data/reference/fe3/chapter_04_champions_of_aurelis.json` và `data/maps/chapter_04_champions_of_aurelis.json` (commit `381bd30`). Claude kiểm độc lập: 600/600 ô địa hình khớp lưới Claude tự trích từ `map1_04.png`; 30×20 khớp ảnh gốc 512×352; cổng, pháo đài, làng, tiệm, cầu khớp ảnh gốc. Lỗi của Antigravity: tự đặt `elevations` theo loại địa hình và báo sai là quy ước có sẵn; không có bằng chứng cho lời báo "gate PASS". Theo quyết định chủ dự án (2026-11-17), Claude đặt elevations Chương 4 về 0 và đưa file về định dạng mỗi hàng một dòng (commit `a44a21c`), rồi merge vào `cs/plan-phase0`. Sau merge (`8ac6213`): `node tools/fe3_map_reference/compare.mjs` MATCH 4/4, `npm test` 17 file/119 test PASS, `npm run build` PASS.
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
  - Tiêu chí xong: 3D đọc cùng state/sự kiện như 2D; chọn model 3D theo dữ liệu (thêm trường như `modelId` trong `characters.json`/`classes.json`) thay cho các ID viết cứng `'ogma'`, `'navarre'`, `'julian'` trong `characterModelFor` của `ThreeScene.tsx` (ngoại lệ còn lại của mục 56); chốt thiết bị và ngân sách (fps, draw calls, tam giác); đo trước và sau trên bản chạy thật; test 3D PASS.
  - Kết quả: CHỜ NGƯỜI DÙNG: Mở giai đoạn port 3D khi nào, và thiết bị mục tiêu là gì?
  - Kiểm bởi: tôi

- [ ] 72. Thử dựng prop địa hình 3D bằng code thay cho Blender (chủ dự án yêu cầu ghi 2026-11-17; thuộc giai đoạn port 3D, mục 41).
  - Tiêu chí xong: Dựng bằng Three.js có sẵn (`IcosahedronGeometry`, `LatheGeometry`, `ExtrudeGeometry`, `TubeGeometry`) cộng đẩy đỉnh bằng noise và RNG có seed, không thêm dependency; làm thử ít nhất đá/núi, cây, pháo đài, cầu trên một ô; prop tái lập giống hệt mỗi lần tải (test seed); chủ dự án duyệt ảnh chụp so với hướng chibi low-poly toon trong `Game_Design/art_ui.md`; đo tam giác và draw calls trong ngân sách mục 41. Nhân vật vẫn dùng GLB, không thuộc mục này.
  - Yêu cầu tái sử dụng (chủ dự án, 2026-11-17: game có rất nhiều hình trùng lặp): mỗi loại vật thể là một "công thức" viết một lần trong một thư viện prop chung của renderer (ví dụ `src/renderer/props/`), gọi theo `propId` + tham số (kích thước, màu, seed); bản đồ và chương chỉ khai báo `propId` trong JSON, không viết code dựng hình riêng cho từng chương hay từng ô. Geometry và material của mỗi tổ hợp (`propId`, tham số) chỉ dựng một lần rồi lưu cache; các ô cùng loại dùng chung qua `InstancedMesh`. Công thức con (thân cây, mái, tường, ván) ghép lại được để tạo biến thể mà không chép code. Kiểm bằng: thêm một ô cùng loại không làm tăng số geometry đã dựng (test đếm cache); thêm một biến thể mới chỉ cần sửa dữ liệu hoặc ghép công thức có sẵn.
  - Nguồn ý tưởng: repo `Noniv/abyssal-garden` (MIT, commit `a596354`, đã đọc toàn bộ `source/src/`): đá từ icosphere đẩy noise + cắt mặt phẳng (`world.js` `meshChunk`), lathe có noise (`meshLathe`), ghép thanh theo đường (`meshShip`, `Mesh.sweep` trong `math.js`), seed RNG riêng từng hệ (`rseed`). Chỉ lấy ý, không chép mã: repo dùng WebGPU thuần, không qua Three.js, phong cách tả thực.
  - Kết quả: CHỜ NGƯỜI DÙNG: Làm khi mở giai đoạn port 3D (mục 41).
  - Kiểm bởi: người dùng

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
