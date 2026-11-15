# AGENTS.md: Water Emblem

## Mục tiêu và nguồn tham chiếu

Water Emblem - Mystery of Nothing là game chiến thuật theo lượt 3D low-poly chạy trực tiếp trên trình duyệt, không giả lập ROM. Dự án giữ hình ảnh, bản đồ và nhân vật của Fire Emblem 3. Cơ chế, công thức và chỉ số lấy từ các bản Fire Emblem đời mới hơn được đánh giá tốt, kết hợp với các tính năng chủ dự án đã chọn. Trước khi áp dụng phải đối chiếu nguồn và khả năng tương thích; không tự tạo số liệu hoặc xem toàn bộ luật của một bản FE là đã được duyệt.

Đọc `Game_Design/README.md` trước khi làm thiết kế hoặc game code, rồi mở các file được chỉ dẫn theo nhiệm vụ. `Game_Design/decisions.md` ghi cơ chế chủ dự án đã chọn và điểm chưa chốt; các file chuyên đề sở hữu luật chi tiết. `PLAN.md` ghi tiến độ và bằng chứng PASS. Các báo cáo trong `reports/` là tài liệu nghiên cứu, không tự thành luật game. Khi tài liệu mâu thuẫn, kiểm code/dữ liệu thực có, báo điểm khác biệt và xin quyết định nếu nó làm đổi thiết kế.

## Ranh giới kỹ thuật

Mã nguồn, dữ liệu game, asset giao diện, test và cấu hình build nằm trong `Water-Emblem/`. Các đường dẫn `src/`, `data/`, `public/` và `tests/` bên dưới được hiểu là tương đối với thư mục này.

## Nơi sở hữu file

| Nội dung                                                                     | File/thư mục sở hữu                                                                                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Nhân vật, chỉ số gốc, tăng trưởng, chân dung                                 | `data/characters.json`                                                                                |
| Class, kiểu di chuyển, tầm di chuyển gốc                                     | `data/classes.json`                                                                                   |
| Vật phẩm và vũ khí                                                           | `data/items.json`                                                                                     |
| Địa hình và tham số cân bằng                                                 | `data/terrains.json`, `data/balance.json`                                                             |
| Lưới ô và cao độ                                                             | `data/maps/<map-id>.json`                                                                             |
| Mục tiêu, vị trí và phe của quân, vũ khí trang bị, ngoại lệ riêng của chương | `data/chapters/<chapter-id>.json`                                                                     |
| Hội thoại từng chương                                                        | `data/dialogues/<chapter-id>_dialogues.json`                                                          |
| Quan hệ hỗ trợ và bonus theo điểm                                            | `data/supports.json`, `src/core/combat/support.ts`                                                    |
| Kiểm ID/tham chiếu JSON và dựng state chương                                 | `src/core/data/chapterData.ts`                                                                        |
| Chuyển chương và giữ đội hình                                                | `src/core/chapter/transition.ts`                                                                      |
| Quy tắc class, thăng cấp, lên/xuống ngựa và tầm đánh theo class              | `src/core/class/classRules.ts`                                                                        |
| EXP, tăng level và growth                                                    | `src/core/progression/experience.ts`                                                                  |
| Di chuyển, lượt, combat, AI                                                  | Các module tương ứng trong `src/core/`                                                                |
| Dexie/IndexedDB và kiểm bản lưu                                              | `src/storage/saveLoad.ts`; không import vào `src/core/`                                               |
| Scene Three.js                                                               | `src/renderer/ThreeScene.tsx`                                                                         |
| Luồng giao diện hiện tại                                                     | `src/App.tsx`; chỉ tách vào `src/ui/` khi có trách nhiệm độc lập thật                                 |
| Chân dung và asset tĩnh đã kiểm quyền                                        | `public/avatars/` và thư mục cùng loại dưới `public/`                                                 |
| Kho asset 3D gốc và pipeline trích xuất                                      | `Game_Design/asset_sources.md`                                                                        |
| Script nhập/sắp xếp avatar phục vụ nội bộ                                    | `tools/download_fe3.py`, `tools/sync_avatars.py`; kiểm quyền ảnh trước khi phát hành                  |
| Cốt truyện và kịch bản nhân vật chính Hardin                                 | `Story/hardin_chronicles.md`                                                                          |
| Điểm vào, build và dependency                                                | `src/main.tsx`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `package.json`, `package-lock.json` |
| Unit test và luồng trình duyệt                                               | `tests/core/`, `tests/browser/`                                                                       |

Trước khi tạo file, tìm theo tên ID và chức năng trong các nơi sở hữu trên. Sửa file sở hữu hiện có khi thêm dữ liệu cùng loại; không tạo bản sao trong `src/`, chương JSON hoặc file tên gần nghĩa. Chương tham chiếu `characterId`, `weaponId`, `mapId`; chỉ ghi trường ghi đè khi thực sự khác dữ liệu gốc. Khi thêm loại dữ liệu mới, cập nhật bảng này trong cùng thay đổi. Không đánh PASS trong `PLAN.md` dựa trên code mới xuất hiện: phải kiểm đúng từng tiêu chí và ghi lệnh/kết quả hoặc bằng chứng thao tác.

- Giữ TypeScript strict, Three.js, React hooks, XState v5, Vite, Howler.js, IndexedDB qua Dexie, Vitest và Playwright. Đường đi dùng thuật toán grid tự viết. Asset 3D dùng GLB; âm thanh ưu tiên OGG và có MP3 khi cần cho Safari. Không đổi stack hoặc thêm dependency khi chưa được chủ dự án duyệt.
- `src/core/` chứa gameplay và chạy được trong môi trường không có trình duyệt. Nó không import Three.js, React, renderer hoặc UI. `src/renderer/` chỉ hiển thị state và sự kiện từ core; `src/ui/` gọi core qua giao diện được định nghĩa rõ, không trực tiếp điều khiển scene. Nếu thấy vi phạm ngoài phạm vi việc đang làm, ghi vào `PLAN.md` để xử lý theo thứ tự.
- Dữ liệu về nhân vật, class, vật phẩm, kỹ năng, bản đồ, chương và tham số cân bằng nằm trong `data/` dưới dạng JSON, có schema/type TypeScript. Giữ ID và tham chiếu nhất quán. Công thức là logic có test; tham số có thể điều chỉnh nằm trong dữ liệu. Không đưa bảng dữ liệu game vào code.
- Không dùng `any`. Hàm tính toán gameplay nên thuần khi có thể; state, nguồn RNG và thao tác lưu phải được kiểm soát để có thể tái lập kết quả.

## Ràng buộc gameplay

- Mọi chương chiến dịch tái hiện thứ tự, nhân vật xuất hiện, mục tiêu và sự kiện theo **Fire Emblem 3: Mystery of the Emblem**, đúng Book và đúng chương. Chỉ đổi khi chủ dự án yêu cầu rõ. Trước khi thêm một nhân vật, viện binh, lời thoại hoặc điều kiện thắng, đối chiếu dữ liệu FE3; không suy từ FE1, FE11, FE12 hoặc bản remake. Cơ chế chiến đấu đã được chọn để thiết kế lại vẫn theo `Game_Design/decisions.md`.
- Quy tắc nguồn ngày 2026-11-14: FE3 sở hữu hình ảnh, bản đồ, nhân vật và mạch chương đã được yêu cầu; chỉ số, growth, công thức và các cơ chế còn lại dùng bản FE đời mới hơn phù hợp với danh sách tính năng đã chọn. Nếu một bản không có phần cần dùng, xét bản FE khác có nguồn. Ghi rõ phiên bản, file hoặc bảng nguồn, phần kế thừa và phần điều chỉnh; không gán dữ liệu FE3 cho chỉ số gameplay chỉ vì nhân vật xuất phát từ FE3.
- Chỉ các cơ chế trong `Game_Design/decisions.md` có nhãn Đã chọn mới thuộc phạm vi thiết kế hiện tại. Đã chọn chưa đồng nghĩa chốt công thức, tham số hoặc cách triển khai; không tự khôi phục cơ chế từ đề án cũ. `Game_Design/battle.md` sở hữu công thức sau khi được duyệt.
- AI không đọc thông tin người chơi chưa được thấy và không biết trước kết quả RNG. Vùng nguy hiểm, mục tiêu dự kiến và đòn báo trước phải tương ứng với state thật. Viện binh có cảnh báo và không hành động ngay khi xuất hiện.
- Tên và nội dung lấy từ FE3 cần đối chiếu nguồn. Không đưa asset hoặc code từ repository tham khảo vào game khi chưa kiểm quyền sử dụng và nguồn gốc. Không giả định fan-made đồng nghĩa với được phép tái sử dụng.

## Hình ảnh và hiệu năng

Giữ phong cách chibi, 3D low-poly, shading phẳng hoặc toon, bản đồ theo ô có cao độ và camera góc 3/4. Thiết kế asset và renderer theo ngân sách hiệu năng đã được chốt cho thiết bị mục tiêu; đo trên bản chạy thực tế trước khi ghi PASS. Tái sử dụng đối tượng trong render loop và hạn chế draw calls khi có số đo cho thấy cần tối ưu.

## Kiểm chứng và cách làm

- Trước khi viết hoặc thay đổi bất kỳ chức năng nào của dự án, luôn kiểm trong các repository tham khảo đã được chủ dự án chỉ định xem chức năng cần thiết đã có trong **file mã nguồn triển khai** hay chưa; không dừng ở README. Nếu có, báo cho chủ dự án tên repo, commit/file/hàm, mức có thể tận dụng (dùng nguyên, chỉnh hoặc chỉ lấy ý tưởng), điểm khác với các tính năng đã chốt và rủi ro quyền sử dụng. Chờ chủ dự án chốt hướng kế thừa rồi mới code; không tự viết lại chức năng khi chưa có quyết định đó. Nếu không có, ghi rõ các repo và nơi đã tra trước khi đề xuất tự làm.
- Với nhóm chỉ số, class và tăng trưởng được chủ dự án chỉnh ngày 2026-11-14, phần nào chủ dự án không sửa trong đề xuất đã báo thì ghi **Tạm chốt** theo đề xuất, kèm nguồn và điểm còn phải kiểm; không lặp lại câu hỏi đã có đáp án. Điểm mơ hồ có thể làm đổi schema hoặc luật trận vẫn hỏi gộp một lượt trước khi code phần phụ thuộc.
- Mỗi công thức combat, RNG, tăng trưởng, đường đi và AI scoring mới cần unit test. Luồng chơi quan trọng cần kiểm trên trình duyệt. Chỉ ghi hoàn thành trong `PLAN.md` khi tiêu chí đo được đã PASS và có bằng chứng; không dùng dấu hoàn thành trong đề án cũ.
- Trước khi sửa, xác định phạm vi việc và giữ thay đổi sẵn có. Quyết định lớn về kiến trúc, gameplay, phạm vi, dependency, dùng tài sản bên ngoài và phát hành thuộc chủ dự án. Việc phát hiện vấn đề khác được thêm vào kế hoạch, không tự chen ngang trừ khi nó trực tiếp chặn việc hiện tại.
- Khi chưa rõ, kiểm tài liệu và code hiện có trước; nêu giả định hoặc điểm chưa kiểm chứng. Hỏi chủ dự án nếu câu trả lời làm thay đổi thiết kế. Không báo đã chạy, đã kiểm hoặc đã hoàn thành khi chưa có bằng chứng.

<!-- coding-studio-gate:begin -->
## Quality gate (every AI and person)
- Before reporting work done, run `node .studio/gate.mjs` from the repo root; report its Result line. Do not edit `.studio/**`, `.githooks/**` or `.github/workflows/**` to make it pass; a FAIL is reported, not hidden.
- Once per clone: `git config core.hooksPath .githooks` (the pre-push hook runs the gate). Machines with other tool paths set `GATE_CMD_<NAME>` (e.g. `GATE_CMD_TEST`) instead of editing `.studio/project.json`.
<!-- coding-studio-gate:end -->
