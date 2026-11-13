# AGENTS.md: Water Emblem

## Mục tiêu và nguồn tham chiếu

Water Emblem - Mystery of Nothing là game chiến thuật theo lượt 3D low-poly chạy trực tiếp trên trình duyệt, không giả lập ROM. Dự án kế thừa bố cục bản đồ, tên nhân vật, cốt truyện cơ bản và tên vật phẩm của Fire Emblem 3; hệ thống chiến đấu và AI được thiết kế lại.

Đọc `Game_Design/README.md` trước khi làm thiết kế hoặc game code, rồi mở các file được chỉ dẫn theo nhiệm vụ. `Game_Design/decisions.md` ghi cơ chế chủ dự án đã chọn và điểm chưa chốt; các file chuyên đề sở hữu luật chi tiết. `PLAN.md` ghi tiến độ và bằng chứng PASS. Các báo cáo trong `reports/` là tài liệu nghiên cứu, không tự thành luật game. Khi tài liệu mâu thuẫn, kiểm code/dữ liệu thực có, báo điểm khác biệt và xin quyết định nếu nó làm đổi thiết kế.

## Ranh giới kỹ thuật

Mã nguồn, dữ liệu game, asset giao diện, test và cấu hình build nằm trong `Water-Emblem/`. Các đường dẫn `src/`, `data/`, `public/` và `tests/` bên dưới được hiểu là tương đối với thư mục này.

- Giữ TypeScript strict, Three.js, React hooks, XState v5, Vite, Howler.js, IndexedDB qua Dexie, Vitest và Playwright. Đường đi dùng thuật toán grid tự viết. Asset 3D dùng GLB; âm thanh ưu tiên OGG và có MP3 khi cần cho Safari. Không đổi stack hoặc thêm dependency khi chưa được chủ dự án duyệt.
- `src/core/` chứa gameplay và chạy được trong môi trường không có trình duyệt. Nó không import Three.js, React, renderer hoặc UI. `src/renderer/` chỉ hiển thị state và sự kiện từ core; `src/ui/` gọi core qua giao diện được định nghĩa rõ, không trực tiếp điều khiển scene. Nếu thấy vi phạm ngoài phạm vi việc đang làm, ghi vào `PLAN.md` để xử lý theo thứ tự.
- Dữ liệu về nhân vật, class, vật phẩm, kỹ năng, bản đồ, chương và tham số cân bằng nằm trong `data/` dưới dạng JSON, có schema/type TypeScript. Giữ ID và tham chiếu nhất quán. Công thức là logic có test; tham số có thể điều chỉnh nằm trong dữ liệu. Không đưa bảng dữ liệu game vào code.
- Không dùng `any`. Hàm tính toán gameplay nên thuần khi có thể; state, nguồn RNG và thao tác lưu phải được kiểm soát để có thể tái lập kết quả.

## Ràng buộc gameplay

- Chỉ các cơ chế trong `Game_Design/decisions.md` có nhãn Đã chọn mới thuộc phạm vi thiết kế hiện tại. Đã chọn chưa đồng nghĩa chốt công thức, tham số hoặc cách triển khai; không tự khôi phục cơ chế từ đề án cũ. `Game_Design/battle.md` sở hữu công thức sau khi được duyệt.
- AI không đọc thông tin người chơi chưa được thấy và không biết trước kết quả RNG. Vùng nguy hiểm, mục tiêu dự kiến và đòn báo trước phải tương ứng với state thật. Viện binh có cảnh báo và không hành động ngay khi xuất hiện.
- Tên và nội dung lấy từ FE3 cần đối chiếu nguồn. Không đưa asset hoặc code từ repository tham khảo vào game khi chưa kiểm quyền sử dụng và nguồn gốc. Không giả định fan-made đồng nghĩa với được phép tái sử dụng.

## Hình ảnh và hiệu năng

Giữ phong cách chibi low-poly, shading phẳng hoặc toon, bản đồ theo ô có cao độ và camera góc 3/4. Thiết kế asset và renderer theo ngân sách hiệu năng đã được chốt cho thiết bị mục tiêu; đo trên bản chạy thực tế trước khi ghi PASS. Tái sử dụng đối tượng trong render loop và hạn chế draw calls khi có số đo cho thấy cần tối ưu.

## Kiểm chứng và cách làm

- Mỗi công thức combat, RNG, tăng trưởng, đường đi và AI scoring mới cần unit test. Luồng chơi quan trọng cần kiểm trên trình duyệt. Chỉ ghi hoàn thành trong `PLAN.md` khi tiêu chí đo được đã PASS và có bằng chứng; không dùng dấu hoàn thành trong đề án cũ.
- Trước khi sửa, xác định phạm vi việc và giữ thay đổi sẵn có. Quyết định lớn về kiến trúc, gameplay, phạm vi, dependency, dùng tài sản bên ngoài và phát hành thuộc chủ dự án. Việc phát hiện vấn đề khác được thêm vào kế hoạch, không tự chen ngang trừ khi nó trực tiếp chặn việc hiện tại.
- Khi chưa rõ, kiểm tài liệu và code hiện có trước; nêu giả định hoặc điểm chưa kiểm chứng. Hỏi chủ dự án nếu câu trả lời làm thay đổi thiết kế. Không báo đã chạy, đã kiểm hoặc đã hoàn thành khi chưa có bằng chứng.
