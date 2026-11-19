# AGENTS.md: Water Emblem

File này là quy định chung cho mọi agent (ChatGPT/Codex, Antigravity/Gemini, Claude) và người làm việc trong repo. Khi hướng dẫn riêng của một công cụ mâu thuẫn với file này, theo file này và báo chủ dự án.

## Mục tiêu và nguồn tham chiếu

Water Emblem - Mystery of Nothing là game chiến thuật theo lượt chạy trực tiếp trên trình duyệt, không giả lập ROM. Dự án giữ hình ảnh, bản đồ và nhân vật của Fire Emblem 3. Cơ chế, công thức và chỉ số lấy từ các bản Fire Emblem đời mới hơn được đánh giá tốt, kết hợp với các tính năng chủ dự án đã chọn. Trước khi áp dụng phải đối chiếu nguồn và khả năng tương thích; không tự tạo số liệu hoặc xem toàn bộ luật của một bản FE là đã được duyệt.

Đọc `Game_Design/README.md` trước khi làm thiết kế hoặc game code, rồi mở các file được chỉ dẫn theo nhiệm vụ. `Game_Design/decisions.md` ghi cơ chế chủ dự án đã chọn và điểm chưa chốt; các file chuyên đề sở hữu luật chi tiết. `PLAN.md` ghi tiến độ và bằng chứng PASS. Các báo cáo trong `reports/` là tài liệu nghiên cứu, không tự thành luật game. Khi tài liệu mâu thuẫn, kiểm code/dữ liệu thực có, báo điểm khác biệt và xin quyết định nếu nó làm đổi thiết kế.

## Hai nguyên tắc nguồn của chủ dự án

1. **Giống bản gốc FE3:** bản đồ (từng ô), tên nhân vật, vị trí công trình, nhân vật và vật thể phải chính xác như FE3 đúng Book, đúng chương. Không ước lượng, không "gần đúng"; ô hoặc vị trí chưa xác nhận được thì ghi là chưa xác nhận, không đánh PASS.
2. **Theo FE đời mới:** công thức, class, growth rate, chỉ số và cơ chế lấy từ các bản FE mới hơn có nguồn, theo `Game_Design/decisions.md`; không lấy số liệu FE3 cho phần này.

## Giai đoạn hiện tại: 2D trước, 3D sau

- Giao diện 2D là giao diện chuẩn và mặc định. Mọi việc khớp bản đồ, vị trí quân, công trình và luồng chơi theo FE3 được làm và kiểm trên 2D.
- 3D (`src/renderer/ThreeScene.tsx`) tạm đóng băng: không thêm tính năng, không sửa trừ khi lỗi 3D làm hỏng build hoặc chặn việc 2D. 3D sẽ được port sau, khi chủ dự án mở giai đoạn đó.
- Renderer 2D và 3D cùng đọc một state và một danh sách sự kiện từ `src/core/`. Không renderer nào chứa luật chơi, để việc port 3D chỉ còn là viết lại phần hiển thị.
- Test trình duyệt kiểm luồng 3D thuộc giai đoạn port. Muốn tạm hoãn hay sửa test đó phải ghi lý do trong `PLAN.md` và được chủ dự án duyệt; không tự `skip` để gate qua.

## Cách làm việc chung

1. **Trước khi làm:** chạy `git status`; đọc `PLAN.md` và mục liên quan trong `Game_Design/`. Xác định mục `PLAN.md` mà việc thuộc về; việc chưa có mục thì thêm mục mới với tiêu chí đo được trước khi code.
2. **Nhánh và commit:** không làm trực tiếp trên `main`. Mỗi việc một nhánh (`cs/<task-id>` hoặc `<agent>/<task-id>`); commit nhỏ, message tiếng Anh, mô tả đúng thay đổi. Không push, deploy, publish khi chưa được chủ dự án duyệt từng lệnh.
3. **Hoàn tác bằng git, không bằng file backup:** commit trạng thái đang có trước khi sửa lớn. Không tạo thư mục `_backup/`, file `*.bak`, `New folder`, `scratch/` hay bản sao kiểu `App.old.tsx` trong repo. File tạm để ngoài repo hoặc trong `work/<task-id>/` (đã gitignore).
4. **Phạm vi:** chỉ làm đúng mục được giao. Ý tưởng hoặc lỗi phát hiện thêm ghi vào `PLAN.md` thành mục mới (`CHỜ NGƯỜI DÙNG` nếu cần quyết định), không tự làm. Không tự thêm màn hình, nội dung Book/chương, cơ chế hay dependency chưa có trong `Game_Design/decisions.md` hoặc `PLAN.md`.
5. **Báo xong:** chạy `node .studio/gate.mjs` ở gốc repo, chép nguyên dòng `Result`. Gate FAIL thì không ghi PASS, không báo hoàn thành; ghi FAIL kèm test fail và lý do.
6. **Một AI tại một thời điểm, đồng bộ qua `PLAN.md`:** mỗi lúc chỉ một AI làm việc trong repo. Không tạo file bàn giao (`HANDOFF*.md` hay tương tự). Trước khi dừng, ghi trạng thái thật vào dòng Kết quả của mục đang làm trong `PLAN.md` (đã làm gì, commit nào, dòng `Result` của gate, việc còn dở, câu hỏi cho chủ dự án) và commit. AI tiếp theo bắt đầu bằng `git status`, `git log` và `PLAN.md`.

## Định dạng `PLAN.md`

- Số mục tăng dần, không trùng, không chép lặp một mục ở hai nơi. Mục cũ không đánh số lại.
- Mỗi mục có ba dòng chính:
  - `- [ ] <số>. <tên việc>`
  - `  - Tiêu chí xong: <điều đo được, cách kiểm>`
  - `  - Kết quả: PASS: <bằng chứng>`, hoặc `Kết quả: FAIL: <lý do>`, hoặc `Kết quả: CHỜ NGƯỜI DÙNG: <câu hỏi>`
- Bằng chứng viết ngay sau `PASS:` trên cùng dòng (lệnh, số test, dòng `Result` của gate, đường dẫn ảnh chụp trong repo); chi tiết thêm có thể xuống dòng bên dưới. Chỉ đánh `[x]` khi dòng Kết quả là PASS.
- Không ghi PASS dựa trên code vừa viết, build thành công hay test do chính lượt đó sửa cho qua; phải kiểm đúng tiêu chí.

## Kiến trúc: core + modules

Mã nguồn, dữ liệu, asset dùng trong game, test và cấu hình build nằm trong `Water-Emblem/`. Các đường dẫn `src/`, `data/`, `public/`, `tests/` bên dưới tương đối với thư mục này. Ranh giới module được khai báo ở `.studio/modules.json`; chỉ chủ dự án đổi file đó.

| Module | Thư mục | Được import | Trách nhiệm |
|---|---|---|---|
| data | `data/` | — | JSON nhân vật, class, item, địa hình, bản đồ, chương, hội thoại, schema |
| core | `src/core/` | data | Toàn bộ luật chơi; chạy được trong Node, không cần trình duyệt |
| storage | `src/storage/` | core, data | Lưu/tải Dexie, kiểm và nâng phiên bản bản lưu |
| audio | `src/audio/` | core | Phát nhạc và SFX theo sự kiện từ core |
| renderer | `src/renderer/` | core | Vẽ state: lưới 2D và scene 3D |
| ui | `src/ui/` | core, storage, audio, data | Màn hình, menu, panel, hội thoại |
| app | `src/App.tsx`, `src/main.tsx` | tất cả | Lắp ghép module và giữ state cấp ứng dụng |

Quy tắc bắt buộc:

- **Luật chỉ nằm trong `src/core/`.** Di chuyển, lượt, combat, AI, EXP, loot, thăm làng, chiếm thành, chiêu mộ, điều kiện thắng/thua, viện binh, sự kiện chương đều là luật. `src/core/` không import React, Three.js, Dexie, Howler, `src/ui`, `src/renderer`, `src/storage`, `src/audio`.
- **Hàm luật dạng thuần:** nhận state + input + nguồn RNG, trả state mới + danh sách sự kiện (`GameEvent[]`: trúng, trượt, crit, chết, rơi đồ, lên cấp, làng bị phá...). Không sửa trực tiếp object đầu vào. UI, renderer, audio chỉ đọc sự kiện để hiển thị log, hoạt cảnh và phát âm thanh; không tự tính lại kết quả.
- **`App.tsx` chỉ lắp ghép:** chuyển màn hình, giữ state ứng dụng, gọi hàm core và chuyển kết quả cho UI/renderer. Không viết luật, vòng lượt địch, công thức hay xử lý thưởng trong `App.tsx` hoặc component React. Lưới 2D là renderer, đặt trong `src/renderer/`, không vẽ inline trong `App.tsx`.
- **Không hard-code nội dung trong `src/`:** không so sánh ID nhân vật, chương, boss, item cụ thể (`'marth'`, `'castor'`, `'gazzak'`...). Ai được chiếm thành, ai chiêu mộ ai, thoại boss, thưởng làng, rơi đồ khai báo trong JSON chương/nhân vật và đọc qua `src/core/data/chapterData.ts`.
- **Kích thước file:** file mã nguồn không quá khoảng 400 dòng; vượt thì tách theo trách nhiệm. File đang vượt (`src/App.tsx`, `src/ui/WorldMapModal.tsx`, `src/renderer/ThreeScene.tsx`, `src/core/data/chapterData.ts`) được tách dần theo mục trong `PLAN.md`; khi sửa không được làm chúng dài thêm.
- **Kiểu:** TypeScript strict, không `any`, không dùng `as` để ép kiểu dữ liệu JSON chưa kiểm; dữ liệu JSON được kiểm khi nạp.
- Khi gặp vi phạm các quy tắc trên ngoài phạm vi việc đang làm, ghi vào `PLAN.md`, không sửa chen ngang.

### Stack

TypeScript strict, React hooks, Three.js, Vite, Howler.js, IndexedDB qua Dexie, Vitest, Playwright. XState v5 có trong dependency nhưng chưa được dùng; dùng cho vòng lượt hay gỡ bỏ do chủ dự án quyết định. Đường đi dùng thuật toán grid tự viết. Asset 3D dùng GLB; âm thanh ưu tiên OGG, có MP3 khi cần cho Safari. Không đổi stack hoặc thêm dependency khi chưa được chủ dự án duyệt.

### Dữ liệu

Dữ liệu nhân vật, class, vật phẩm, kỹ năng, bản đồ, chương và tham số cân bằng nằm trong `data/` dưới dạng JSON, có schema/type TypeScript. Giữ ID và tham chiếu nhất quán. Công thức là logic có test; tham số có thể điều chỉnh nằm trong dữ liệu. Không đưa bảng dữ liệu game vào code.

## Nơi sở hữu file

| Nội dung | File/thư mục sở hữu |
|---|---|
| Nhân vật, chỉ số gốc, tăng trưởng, chân dung | `data/characters.json` |
| Class, kiểu di chuyển, tầm di chuyển gốc | `data/classes.json` |
| Vật phẩm và vũ khí | `data/items.json` |
| Kỹ năng (định nghĩa và số hiệu ứng) | `data/skills.json` |
| Địa hình và tham số cân bằng | `data/terrains.json`, `data/balance.json` |
| Lưới ô và cao độ | `data/maps/<map-id>.json` |
| Atlas tra cứu mọi bản đồ FE3 (lưới, quân, công trình) và bảng nguồn | `Game_Design/campaign.md` mục "Atlas bản đồ FE3 và bảng tra nguồn"; atlas ở `D:\OneDrive\AI Relax\projects\FE3_map_atlas\` |
| Lưới tham chiếu FE3 (lập độc lập, chỉ dùng để đối chiếu và test) | `data/reference/fe3/<map-id>.json`; quy trình và script ở `tools/fe3_map_reference/` |
| Mục tiêu, vị trí và phe của quân, ô triển khai, vũ khí trang bị, làng, sự kiện, ngoại lệ riêng của chương | `data/chapters/<chapter-id>.json` |
| Hội thoại từng chương | `data/dialogues/<chapter-id>_dialogues.json`; thoại làng mặc định khi chương không khai báo: `data/dialogues/default_dialogues.json` |
| Vị trí và thông tin vùng trên World Map | `data/world_map.json` |
| Schema JSON | `data/schemas/` |
| Quan hệ hỗ trợ và bonus theo điểm | `data/supports.json`, `src/core/combat/support.ts` |
| Kiểm ID/tham chiếu JSON và dựng state chương | `src/core/data/chapterData.ts` |
| Chuyển chương và giữ đội hình | `src/core/chapter/transition.ts` |
| Điều kiện thắng/thua và sự kiện chương | `src/core/chapter/` |
| Quy tắc class, thăng cấp, lên/xuống ngựa và tầm đánh theo class | `src/core/class/classRules.ts` |
| EXP, tăng level và growth | `src/core/progression/experience.ts` |
| Di chuyển, địa hình, đường đi | `src/core/grid/` |
| Lượt và phase | `src/core/turn/` |
| Combat và RNG | `src/core/combat/` |
| AI | `src/core/ai/` |
| Dexie/IndexedDB và kiểm bản lưu | `src/storage/saveLoad.ts` |
| Nhạc và SFX | `src/audio/soundManager.ts`, file âm thanh trong `public/audio/` |
| Renderer 2D | `src/renderer/` (tách từ `App.tsx` theo `PLAN.md`) |
| Renderer 3D (đóng băng) | `src/renderer/ThreeScene.tsx` |
| Màn Title, chọn Book, ô lưu, World Map | `src/ui/TitleScreen.tsx`, `src/ui/BookSelectModal.tsx`, `src/ui/SaveSlotsModal.tsx`, `src/ui/WorldMapModal.tsx` |
| Lắp ghép ứng dụng | `src/App.tsx`, `src/main.tsx` |
| Chân dung, ảnh bản đồ và asset tĩnh game thực dùng, đã kiểm quyền | `public/avatars/`, `public/maps/`, `public/models/` |
| Kho asset gốc FE3 (ngoài repo) và pipeline trích xuất | `Game_Design/asset_sources.md` |
| Script nhập/sắp xếp avatar phục vụ nội bộ | `tools/download_fe3.py`, `tools/sync_avatars.py`; kiểm quyền ảnh trước khi phát hành |
| Cốt truyện và kịch bản nhân vật chính Hardin | `Story/hardin_chronicles.md` |
| Điểm vào, build và dependency | `src/main.tsx`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `package.json`, `package-lock.json` |
| Unit test và luồng trình duyệt | `tests/core/`, `tests/browser/` |

Trước khi tạo file, tìm theo tên ID và chức năng trong các nơi sở hữu trên. Sửa file sở hữu hiện có khi thêm dữ liệu cùng loại; không tạo bản sao trong `src/`, chương JSON hoặc file tên gần nghĩa. Chương tham chiếu `characterId`, `weaponId`, `mapId`; chỉ ghi trường ghi đè khi thực sự khác dữ liệu gốc. Khi thêm loại dữ liệu hoặc module mới, cập nhật bảng này trong cùng thay đổi.

## Asset gốc

Kho asset gốc FE3 (trước đây là `public/models/Original/`) nằm ngoài repo; đường dẫn và cách trích xuất ghi trong `Game_Design/asset_sources.md`. Game không tham chiếu kho gốc lúc chạy: file nào game thực dùng thì copy đơn lẻ vào thư mục tương ứng trong `public/` và ghi nguồn trong `asset_sources.md`. Ảnh dùng để đối chiếu bản đồ được mở từ kho gốc, không copy vào repo.

## Ràng buộc gameplay

- Mọi chương chiến dịch tái hiện thứ tự, nhân vật xuất hiện, mục tiêu và sự kiện theo **Fire Emblem 3: Mystery of the Emblem**, đúng Book và đúng chương. Chỉ đổi khi chủ dự án yêu cầu rõ. Trước khi thêm một nhân vật, viện binh, lời thoại hoặc điều kiện thắng, đối chiếu dữ liệu FE3; không suy từ FE1, FE11, FE12 hoặc bản remake. Cơ chế chiến đấu đã được chọn để thiết kế lại vẫn theo `Game_Design/decisions.md`.
- Quy tắc nguồn ngày 2026-11-14: FE3 sở hữu hình ảnh, bản đồ, nhân vật và mạch chương đã được yêu cầu; chỉ số, growth, công thức và các cơ chế còn lại dùng bản FE đời mới hơn phù hợp với danh sách tính năng đã chọn. Nếu một bản không có phần cần dùng, xét bản FE khác có nguồn. Ghi rõ phiên bản, file hoặc bảng nguồn, phần kế thừa và phần điều chỉnh; không gán dữ liệu FE3 cho chỉ số gameplay chỉ vì nhân vật xuất phát từ FE3.
- Chỉ các cơ chế trong `Game_Design/decisions.md` có nhãn Đã chọn mới thuộc phạm vi thiết kế hiện tại. Đã chọn chưa đồng nghĩa chốt công thức, tham số hoặc cách triển khai; không tự khôi phục cơ chế từ đề án cũ. `Game_Design/battle.md` sở hữu công thức sau khi được duyệt.
- AI không đọc thông tin người chơi chưa được thấy và không biết trước kết quả RNG. Vùng nguy hiểm, mục tiêu dự kiến và đòn báo trước phải tương ứng với state thật. Viện binh có cảnh báo và không hành động ngay khi xuất hiện.
- Tên và nội dung lấy từ FE3 cần đối chiếu nguồn. Không đưa asset hoặc code từ repository tham khảo vào game khi chưa kiểm quyền sử dụng và nguồn gốc. Không giả định fan-made đồng nghĩa với được phép tái sử dụng.
- Ngôn ngữ trong game là tiếng Anh theo `Game_Design/decisions.md`. Tài liệu dự án viết tiếng Việt; code, tên biến và commit viết tiếng Anh.

## Hình ảnh và hiệu năng

Đích cuối là phong cách chibi, 3D low-poly, shading phẳng hoặc toon, bản đồ theo ô có cao độ và camera góc 3/4; áp dụng khi mở giai đoạn port 3D. Thiết kế asset và renderer theo ngân sách hiệu năng đã được chốt cho thiết bị mục tiêu; đo trên bản chạy thực tế trước khi ghi PASS. Tái sử dụng đối tượng trong render loop và hạn chế draw calls khi có số đo cho thấy cần tối ưu.

## Kiểm thử

- **Unit test (Vitest)** cho mọi luật trong `src/core/`: công thức combat, RNG, tăng trưởng, đường đi, AI scoring, sự kiện chương. Dùng RNG có seed hoặc chuỗi số cố định để kết quả tái lập được.
- **Test dữ liệu bản đồ:** tọa độ kỳ vọng lấy từ bảng đối chiếu FE3 (`Game_Design/campaign.md` hoặc báo cáo đối chiếu có nguồn), không chép ngược từ JSON vừa sửa.
- **Test trình duyệt (Playwright)** kiểm luồng màn hình và thao tác người chơi trên 2D: Title → chọn game → chuẩn bị → vào trận → hành động → lưu/tải → thắng/thua. Trận dùng seed cố định và kịch bản nước đi cố định. Không dùng bot heuristic tự chơi làm bằng chứng luật đúng, và không chỉnh heuristic để test qua.
- `tests/**` là vùng bảo vệ. Không sửa, làm yếu, bỏ qua hoặc xóa test/assertion có sẵn để thay đổi pass. Khi yêu cầu đổi làm test cũ sai, ghi lý do trong `PLAN.md` và chờ chủ dự án duyệt trước khi sửa test.
- Luồng chơi quan trọng phải được mở và thao tác trên trình duyệt thật trước khi ghi PASS.

## Quyết định và kiểm chứng

- Trước khi viết hoặc thay đổi bất kỳ chức năng nào của dự án, luôn kiểm trong các repository tham khảo đã được chủ dự án chỉ định xem chức năng cần thiết đã có trong **file mã nguồn triển khai** hay chưa; không dừng ở README. Nếu có, báo cho chủ dự án tên repo, commit/file/hàm, mức có thể tận dụng (dùng nguyên, chỉnh hoặc chỉ lấy ý tưởng), điểm khác với các tính năng đã chốt và rủi ro quyền sử dụng. Chờ chủ dự án chốt hướng kế thừa rồi mới code; không tự viết lại chức năng khi chưa có quyết định đó. Nếu không có, ghi rõ các repo và nơi đã tra trước khi đề xuất tự làm.
- Với nhóm chỉ số, class và tăng trưởng được chủ dự án chỉnh ngày 2026-11-14, phần nào chủ dự án không sửa trong đề xuất đã báo thì ghi **Tạm chốt** theo đề xuất, kèm nguồn và điểm còn phải kiểm; không lặp lại câu hỏi đã có đáp án. Điểm mơ hồ có thể làm đổi schema hoặc luật trận vẫn hỏi gộp một lượt trước khi code phần phụ thuộc.
- Quyết định lớn về kiến trúc, gameplay, phạm vi, dependency, dùng tài sản bên ngoài và phát hành thuộc chủ dự án.
- Khi chưa rõ, kiểm tài liệu và code hiện có trước; nêu giả định hoặc điểm chưa kiểm chứng. Hỏi chủ dự án nếu câu trả lời làm thay đổi thiết kế. Không báo đã chạy, đã kiểm hoặc đã hoàn thành khi chưa có bằng chứng.
- **Theo Fire Emblem, không tự bịa (chủ dự án 2026-11-19):** mọi cơ chế, luật và hiển thị phải theo dòng Fire Emblem hoặc quyết định đã ghi của chủ dự án. **CẤM BỊA, CẤM SÁNG TẠO LUNG TUNG KHI CHƯA HỎI NGƯỜI DÙNG** — không tự tạo luật, cơ chế hay hiển thị chưa được chủ xác nhận; điểm chưa chốt thì hỏi chủ, không tự suy diễn (bài học mục 101/C12, mục 143).

<!-- coding-studio-gate:begin -->
## Quality gate (every AI and person)
- Before reporting work done, run `node .studio/gate.mjs` from the repo root; report its Result line. Do not edit `.studio/**`, `.githooks/**` or `.github/workflows/**` to make it pass; a FAIL is reported, not hidden.
- Once per clone: `git config core.hooksPath .githooks` (the pre-push hook runs the gate). Machines with other tool paths set `GATE_CMD_<NAME>` (e.g. `GATE_CMD_TEST`) instead of editing `.studio/project.json`.
<!-- coding-studio-gate:end -->
