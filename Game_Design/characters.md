# Nhân vật, class và phát triển đội hình

File này sở hữu quy tắc chung cho nhân vật và đội hình. Tên, chân dung và vai trò cốt truyện lấy FE3 làm nguồn đối chiếu; chưa có bảng dữ liệu từng nhân vật được kiểm trong dự án. Các chỉ số và công thức số nằm ở `battle.md`.

## Dữ liệu nhân vật và class

Mỗi nhân vật cần ID ổn định, tên hiển thị, portrait, class, cấp, chỉ số, growth, kỹ năng riêng, quan hệ hỗ trợ và trang bị ban đầu. Mỗi class cần loại di chuyển, MOV, loại vũ khí/trượng dùng được, đặc tính chiến đấu và hướng promotion. Đây là nhóm dữ liệu dự kiến, không mặc định các con số Marth trong ví dụ JSON cũ là dữ liệu chuẩn. `implementation_spec.md` quy định schema và kiểm tham chiếu.

N01 chọn kỹ năng cá nhân để các nhân vật cùng class vẫn có vai trò khác nhau. N02 chọn kỹ năng theo class. Cần chốt số kỹ năng được mang, thời điểm học, khả năng chuyển kỹ năng sau đổi class, cách hiện trong UI và thứ tự hiệu ứng với `battle.md`. Không tự đưa các kỹ năng proc Sol/Luna/Astra của đề án cũ vào danh sách đã duyệt.

## Chuyển lớp và reclass

N03 là promotion có nhánh; N04 cho đổi sang class khác. Hai cơ chế cùng được chọn nhưng chưa chốt cây class, điều kiện mở, cấp tối thiểu, item, chi phí, giới hạn số lần và việc giữ kỹ năng/chỉ số. Đề án cũ có gợi ý hai hướng Tier 2 và lên class khi đạt level không cần item; giữ làm phương án đối chiếu, **không mặc định áp dụng**.

Class phải có vai trò đọc được qua di chuyển, tầm, vũ khí, khả năng hỗ trợ hoặc chống chịu. Tác dụng của kỵ binh, quân bay và giáp khi gặp cao độ, bẫy, cover hoặc vũ khí khắc class cần được đặc tả thống nhất với `battle.md`.

## Quan hệ và vai trò hỗ trợ

N06 chọn quan hệ hỗ trợ giữa nhân vật. Chờ chốt cách tăng quan hệ, giới hạn cặp, nội dung hội thoại, bonus chiến đấu và việc bonus có cộng vào Hit hay không. N10 chọn hành động phi sát thương hữu ích cho đơn vị hỗ trợ, ví dụ trượng C10; danh sách tác dụng cụ thể nằm ở `battle.md`. Không tự thêm hệ Pair Up hoặc con cái từ các FE khác.

## Thu phục trong trận

N11 cho phép tuyển một số đơn vị địch vào đội; B09 là hành động hoặc điều kiện thu phục trên bản đồ. Quy tắc chung ở đây gồm điều kiện đối tượng hợp lệ, ai được thuyết phục, thành công/thất bại, trạng thái sau khi gia nhập và dữ liệu lưu. Các nhân vật, lời thoại, vị trí và thời điểm tuyển của từng chương nằm ở `campaign.md`. Chưa có tỉ lệ chiêu mộ hoặc danh sách đơn vị được duyệt; không mặc định mọi kẻ địch đều có thể tuyển.

## Tăng trưởng

Đề án cũ chia growth thành cá nhân + class, random có chống lệch và fixed theo độ khó. Đây là đề xuất cũ; công thức và chế độ áp dụng chưa được duyệt. `battle.md` là nơi sở hữu cách tính; file này chỉ ghi dữ liệu cần có và tác động của promotion/reclass lên nhân vật.
