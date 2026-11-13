# Quyết định và vấn đề còn mở

Cập nhật: 2026-11-13. Nguồn lựa chọn: chủ dự án chọn trực tiếp trong cuộc trao đổi về danh mục cơ chế. **Đã chọn** nghĩa là đưa cơ chế vào thiết kế để đặc tả; các giá trị số và cách kết hợp vẫn cần chốt trước khi code.

## Cơ chế đã chọn

| Mã | Cơ chế | File sở hữu |
|---|---|---|
| C01, C03, C10 | Tam giác vũ khí; vũ khí khắc class; trượng hỗ trợ | `battle.md` |
| C12 | Phá vật che chắn | `battle.md` |
| V04, V05, V07, V08 | Canto; đánh kẹp; lợi thế cao độ; bẫy/chặn lối | `battle.md` |
| B01–B03 | Vùng nguy hiểm; đường mục tiêu địch; đòn báo trước | `battle.md`, hiển thị ở `art_ui.md` |
| B04–B06 | Viện binh báo trước; bảo vệ mục tiêu; thoát bản đồ | `campaign.md` |
| B09–B11 | Thu phục trong trận; vai trò AI; boss nhiều pha | `characters.md`, `battle.md`, `campaign.md` theo quy tắc chung/sự kiện |
| N01–N04 | Kỹ năng cá nhân; kỹ năng class; chuyển lớp phân nhánh; reclass | `characters.md` |
| N06, N10, N11 | Quan hệ hỗ trợ; vai trò phi sát thương; tuyển địch | `characters.md` |
| Q04–Q07 | Độ khó; dự báo; chuẩn bị trận; tua/bỏ hoạt cảnh | `campaign.md`, `art_ui.md` |
| Q10, Q12 | Bản đồ giải đố; bản đồ ngẫu nhiên | `campaign.md` |

Danh sách này có 30 mã. B09 là điều kiện thu phục trong trận; N11 là quy tắc đưa đơn vị thu phục vào đội. C01 **không bao gồm Break**. V05 là đòn phối hợp do đánh kẹp vị trí, **không tự thêm** Chain Attack hoặc Attack Stance. Q12 áp dụng cho mode riêng, không thay bản đồ FE3 của chiến dịch.

## Ý tưởng có trong đề án cũ nhưng chưa được chọn

Break; Arts khắc Bow/Tome/Dagger; Battle Styles đầy đủ; Chain Attack tự động; Combat Arts; Gambits; Pair Up/Guard Stance; Rescue/Drop/Shove/Swap; rewind; Ironman/Classic/Casual; Fog of War; tương tác nguyên tố và phá/đốt/đóng băng diện rộng; tháp thử thách; randomizer; toàn bộ campaign 40+ chương; shop/forge và hub mở rộng. Những mục này không được triển khai chỉ vì từng xuất hiện trong báo cáo hoặc đề án. Một số có thể trở lại nếu chủ dự án chọn sau.

## Cần chủ dự án chốt trước khi viết luật số hoặc triển khai

| Vấn đề | Vì sao chưa chốt |
|---|---|
| C01, C03: bonus tam giác, hệ số vũ khí khắc class và thứ tự nhân hệ số | Đề án và báo cáo dùng công thức effective damage khác nhau; không tự chọn một bản. |
| Hit/Avoid/Crit, RNG và tăng trưởng | Đề án có `SupportBonus` trong Hit, bản `AGENTS.md` cũ không có; các mô tả Hybrid RN và anti-screwage không thống nhất hoặc thiếu cách tính. |
| V04, V05, V07, V08, C12 | Cần giới hạn Canto, vị trí kích hoạt đánh kẹp, cao độ, số loại bẫy và ô có thể phá; bản đồ FE3 gốc không tự có các dữ liệu này. |
| B02, B03, B10 | Cần quyết định địch công bố mục tiêu dự kiến hay hành động đã khóa, và lúc nào được đổi ý; AI không được dùng thông tin bị che. |
| B09, N11 | Cần xác định nhân vật nào có thể chiêu mộ, điều kiện, tỉ lệ và hậu quả với câu chuyện. |
| N03, N04 | Cần giới hạn cây promotion và reclass; đề án cũ còn gợi ý lên class theo level mà không cần item. |
| Q04, Q10, Q12 | Cần số mức độ khó, quy tắc sinh map, điều kiện giải đố và cách lưu thành tích; chưa có phạm vi nội dung được duyệt. |
| Thiết bị mục tiêu, quy mô chương và quyền asset | Chưa có kiểm chứng hiệu năng, số chương hoặc quyền tái sử dụng từng asset. |

## Bản đồ chuyển nội dung từ đề án cũ

| Phần của đề án cũ | Nơi giữ nội dung còn phù hợp |
|---|---|
| Tầm nhìn và phạm vi | `overview.md`; cơ chế chưa chọn ghi ở file này |
| Kiến trúc và bảng công nghệ | `implementation_spec.md` |
| Chỉ số, công thức, RNG, tăng trưởng, tam giác, AI | `battle.md`; phần chưa chốt giữ rõ trạng thái |
| Class, kỹ năng, vật phẩm và phát triển nhân vật | `characters.md` |
| Chế độ chơi, chương, mục tiêu, viện binh | `campaign.md` |
| Art direction, camera, renderer, UI | `art_ui.md` |
| Audio và định dạng | `audio.md`, `implementation_spec.md` |
| Lộ trình, milestone, tiêu chí nghiệm thu | `PLAN.md`; không chuyển dấu `[x]` cũ |
| Cây thư mục dự kiến, rủi ro, nguồn dữ liệu/asset | `implementation_spec.md`, `overview.md` và bảng vấn đề còn mở ở trên |

Các báo cáo trong `report/` còn nguyên để tra lại lập luận nghiên cứu. Bảng này ghi nơi chuyển nội dung, không khẳng định mọi ý tưởng cũ đã được phê duyệt.
