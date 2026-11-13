# Game Design: Water Emblem

Thư mục này ghi thiết kế của **Water Emblem - Mystery of Nothing**. Đọc file này trước, sau đó chỉ mở tài liệu liên quan đến việc đang làm. [PLAN.md](../PLAN.md) ở thư mục gốc theo dõi tiến độ; tài liệu trong `report/` là nghiên cứu và không tự trở thành luật game.

## Nguồn có thẩm quyền và trạng thái

1. Quyết định mới nhất của chủ dự án đứng trước nội dung cũ. `decisions.md` ghi những cơ chế đã chọn và vấn đề còn phải chốt.
2. Mỗi file thiết kế bên dưới sở hữu quy tắc trong phạm vi của nó. Một quy tắc xuất hiện ở nhiều màn hình vẫn chỉ được định nghĩa một lần; file khác dẫn liên kết đến nơi sở hữu.
3. `AGENTS.md` ở thư mục gốc quy định cách agent làm việc và ranh giới kỹ thuật. `implementation_spec.md` giữ đặc tả kỹ thuật đã được phê duyệt hoặc đang chờ duyệt.
4. `report/` và `github.txt` là nguồn tham khảo. Nhận định về lịch sử game, dữ liệu, license hoặc khả năng dùng lại asset cần được kiểm trực tiếp trước khi dùng.

Các nhãn trong thư mục: **Đã chọn** = chủ dự án muốn có cơ chế, chưa đồng nghĩa đã chốt công thức hoặc cách triển khai; **Đã chốt** = quy tắc chi tiết đã được chủ dự án duyệt; **Chờ chốt** = chưa được phép tự chọn; **Đề xuất cũ** = ghi lại để đối chiếu, không đưa vào phạm vi hiện hành. Trước khi code một phần có nhãn Chờ chốt, hỏi gộp các quyết định ảnh hưởng phần đó.

## Đọc theo nhiệm vụ

| Nhiệm vụ | Đọc theo thứ tự |
|---|---|
| Chọn hoặc đổi cơ chế | `overview.md` → `decisions.md` → file chuyên đề liên quan |
| Làm lượt, di chuyển, combat, công thức hoặc AI | `decisions.md` → `battle.md` → `characters.md` hoặc `campaign.md` nếu có liên quan |
| Làm nhân vật, class, kỹ năng, phát triển | `decisions.md` → `characters.md` → `battle.md` cho hiệu ứng và công thức |
| Viết chương, boss, viện binh, mode | `decisions.md` → `campaign.md` → `battle.md` |
| Làm hình ảnh hoặc giao diện | `art_ui.md` → `battle.md`/`campaign.md` cho dữ liệu cần hiển thị → `implementation_spec.md` |
| Làm âm thanh | `audio.md` → `art_ui.md` và `campaign.md` khi cần tín hiệu theo ngữ cảnh |
| Viết code, nạp dữ liệu hoặc asset | `AGENTS.md` → `decisions.md` → file chuyên đề → `implementation_spec.md` → `PLAN.md` |

## File và nơi sở hữu nội dung

- [overview.md](overview.md): định hướng, phần kế thừa FE3 và ranh giới nội dung.
- [battle.md](battle.md): lượt, vị trí, địa hình, chiến đấu, AI và toàn bộ công thức gameplay.
- [characters.md](characters.md): nhân vật, class, kỹ năng, quan hệ, chuyển lớp và quy tắc thu phục chung.
- [campaign.md](campaign.md): chương, mục tiêu, viện binh, boss, độ khó, bản đồ giải đố và ngẫu nhiên.
- [art_ui.md](art_ui.md): tạo hình 3D, camera, animation, UI và cách hiển thị thông tin chiến thuật.
- [audio.md](audio.md): nhạc, SFX và tín hiệu âm thanh.
- [decisions.md](decisions.md): danh sách đã chọn, chưa chọn và các quyết định còn mở.
- [implementation_spec.md](implementation_spec.md): kiến trúc, stack, data, asset pipeline, kiểm thử và hiệu năng.

## Cách cập nhật

Khi chủ dự án chốt một quy tắc, cập nhật `decisions.md` và file sở hữu trong cùng lần sửa. Giữ nguồn và ngày quyết định; nếu quy tắc thay thế nội dung cũ, sửa liên kết liên quan. Chỉ đánh PASS trong `PLAN.md` sau khi kiểm chứng kết quả thực tế. Không dùng dấu hoàn thành của đề án cũ làm bằng chứng.
