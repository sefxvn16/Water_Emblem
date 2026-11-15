# Đặc tả triển khai

Mã nguồn và cấu hình chạy hiện nằm trong `../Water-Emblem/`; mọi đường dẫn `src/`, `data/`, `public/` và `tests/` trong tài liệu này tương đối với thư mục đó.

File này giữ ranh giới kỹ thuật đã ghi trong `AGENTS.md` và phần còn dùng được của đề án triển khai cũ. Mô tả đường dẫn bên dưới là **cấu trúc dự kiến**, không khẳng định thư mục hoặc code đã tồn tại. Tình trạng thực tế và kết quả kiểm tra nằm ở `PLAN.md`.

## Công nghệ và ranh giới

| Phần | Quy định hiện hành |
|---|---|
| Ngôn ngữ và build | TypeScript strict, Vite |
| 3D và UI | Three.js; React functional components và hooks |
| Luồng state | XState v5 cho phase và action flow |
| Âm thanh | Howler.js; OGG và MP3 dự phòng khi cần |
| Lưu/tải | IndexedDB qua Dexie |
| Kiểm thử | Vitest cho logic, Playwright cho luồng quan trọng trên trình duyệt |
| Đường đi | Thuật toán trên grid tự viết; A* cho đường đi có chi phí, quét tầm theo chi phí di chuyển thích hợp |
| Asset | Model GLB; portrait, icon và texture ở định dạng web phù hợp sau khi kiểm quyền |

`src/core/` sở hữu state và tính toán game, chạy được không cần Three.js hoặc React. `src/renderer/` đọc state/sự kiện để vẽ scene và animation, không quyết định kết quả. `src/ui/` gọi core qua interface/hook, không điều khiển scene trực tiếp. `src/data/schemas/` và loader định nghĩa dữ liệu; `data/` giữ nhân vật, class, vật phẩm, map, chapter và tham số cân bằng. Không dùng `any`; không đưa dữ liệu bản đồ hoặc bảng chỉ số vào code logic. Công thức đã chốt nằm ở `battle.md`, tham số cân bằng nằm trong JSON phù hợp. Đề án cũ từng cho phép React hoặc Preact; quyết định hiện hành trong `AGENTS.md` là React.

## Dữ liệu và trạng thái

Các nhóm JSON dự kiến: `units`, `classes`, `items`, `skills`, `terrains`, `maps`, `chapters` và `balance`. Mỗi nhóm cần schema TypeScript, ID nhất quán và kiểm tham chiếu giữa file. Dữ liệu mẫu trong đề án cũ chỉ minh họa cấu trúc, không chứng minh chỉ số hay vị trí trong FE3. Mỗi chương cần các trường đủ cho mục tiêu, địch, viện binh, hội thoại, thu phục và boss theo `campaign.md`.

State cần lưu đơn vị, vị trí, pha/lượt, event đã kích hoạt, mục tiêu, inventory, progression và nguồn RNG để cùng state/hành động tạo cùng kết quả. Đề án cũ đề nghị rewind bằng snapshot sau mỗi action, nhưng rewind **chưa được chủ dự án chọn**; không xây lịch sử rewind chỉ vì ghi chú này. Save/load phải kiểm phiên bản dữ liệu và xử lý lỗi nạp để không làm mất tiến độ.

## Renderer và asset pipeline

Đề án cũ gợi ý Blender → GLB → Three.js, InstancedMesh cho terrain, toon shading, model class dùng lại bộ phận/animation và texture atlas. Đây là hướng kỹ thuật để thử, không phải cam kết asset đã có. Tối ưu theo số đo FPS, draw calls, triangles, tải asset và bộ nhớ trên thiết bị mục tiêu. Camera, độ cao và cách hiển thị nằm ở `art_ui.md`; logic cao độ nằm ở `battle.md`.

Không sao chép code từ các repository tham khảo bằng cách đổi tên biến. Mã `rainlash/lex-talionis` legacy cho thấy AI, đường đi, trigger và lưu game Python; dữ liệu legacy là XML/TXT, không phải schema JSON. Mã `fe11-us` cho thấy bảng nhân vật/class/item/map của FE11, có ích để tham khảo các chương chung với FE3 Book 1, nhưng repo công khai không chứa sẵn dữ liệu chương để nhập trực tiếp và mọi chi tiết FE3 vẫn phải kiểm riêng. `Super-Lex-Talionis` có mẫu cấu trúc event/level FE8; tài nguyên ảnh/âm thanh phải kiểm quyền từng file. Xem [đối chiếu file nguồn](../reports/doi_chieu_ma_nguon_ba_repo_2026-11-13.md). Ghi nguồn, phiên bản, tác giả, điều kiện sử dụng và kết quả đối chiếu trước khi nhập mã, tài sản hoặc dữ liệu.

## Kiểm thử và hoàn thành

Unit test cho công thức đã chốt, RNG, đường đi, tầm đánh, AI và xử lý tương tác địa hình. Test trình duyệt cho chọn/di chuyển, dự báo, giao tranh, hoàn thành chương, lưu/tải, chuẩn bị trận và tua animation. Kiểm tay art, UI, âm thanh trên thiết bị mục tiêu. Không coi coverage 90%, thời lượng 10–12 tháng hoặc các ô `[x]` trong đề án cũ là kết quả đã đạt; nếu dùng các số đó làm tiêu chí, chủ dự án cần duyệt và có phép đo.

Các mốc công việc được giữ ở `PLAN.md`. Đề án cũ chia Phase 0–6: khởi tạo/data; grid; combat/AI; renderer 3D; campaign/UI; mode/polish; test/release. Đây là thứ tự tham khảo, không làm thay việc kiểm kê hiện trạng và chốt phạm vi theo 30 mã trong `decisions.md`. Không tạo toàn bộ cây file/module dự kiến trước khi có nhu cầu triển khai thật.
