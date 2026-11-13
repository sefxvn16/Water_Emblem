# Âm thanh

Nguồn cũ chỉ xác định dùng Howler.js, ưu tiên OGG và MP3 dự phòng cho Safari; nêu nhu cầu SFX, nhạc theo chương và điều chỉnh âm lượng. Chưa có danh mục track, nhạc mẫu, phối khí hoặc quyền sử dụng đã được xác minh. File này ghi các vị trí âm cần thiết để khi có asset, người làm âm thanh và người làm gameplay có cùng cách gọi.

## Nhóm tín hiệu cần thiết kế

| Ngữ cảnh | Tín hiệu cần phân biệt |
|---|---|
| Điều khiển | Di chuyển con trỏ, chọn, hủy, xác nhận hành động không thể quay lại. |
| Trận đánh | Ra đòn, trúng, trượt, chí mạng, vũ khí khắc class, trượng hỗ trợ, bẫy kích hoạt và cover bị phá. |
| Thông tin chiến thuật | Đòn địch báo trước B03, viện binh báo trước B04, mục tiêu phụ bị đe dọa, chuyển pha và thắng/thua. |
| Nhân vật | Lên cấp, chuyển class, mở quan hệ hỗ trợ, thu phục thành công/thất bại. |
| Nhạc | Menu, chuẩn bị trận, từng chương hoặc nhóm chương, giao tranh, kết quả. |

Đây là danh mục **điểm phát âm**, không phải cam kết sẽ tạo một asset riêng cho mỗi dòng. B03 và B04 cần âm cảnh báo khác nhau hoặc nhãn hình ảnh rõ nếu tắt âm. Q07 tua/bỏ hoạt cảnh không được làm âm thanh tiếp tục chạy sai trạng thái; âm giao tranh được dừng hoặc rút ngắn cùng hoạt cảnh. Đề án cũ gợi ý điều chỉnh âm lượng; việc tách nhạc/SFX, mức âm, vòng lặp và ưu tiên khi nhiều sự kiện trùng nhau chờ chốt khi có bản chạy.

Trước khi nhập âm thanh, ghi nguồn, chủ sở hữu, giấy phép và quyền sử dụng của từng asset. Không suy ra SFX trong bộ tài nguyên cộng đồng được phép dùng chỉ từ tên repository hoặc license ở cấp repository. `implementation_spec.md` giữ định dạng và cách nạp; `campaign.md` giữ khóa nhạc của từng chương.
