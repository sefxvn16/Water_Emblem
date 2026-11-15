# Tổng quan dự án

## Định hướng đã xác nhận

Water Emblem - Mystery of Nothing là game chiến thuật theo lượt 3D low-poly chạy trực tiếp trên trình duyệt, không giả lập ROM. Chiến dịch tái hiện đúng Book/chương của Fire Emblem 3: Mystery of the Emblem về bố cục bản đồ, nhân vật xuất hiện, thứ tự chương, mục tiêu và sự kiện, trừ khi chủ dự án yêu cầu khác. Chỉ số, công thức, AI và nhiều cơ chế chiến đấu được thiết kế lại. Quyền sử dụng dữ liệu và asset phải được kiểm riêng trước khi đưa vào bản phát hành.

Trận đánh cần cho người chơi đọc được nguy cơ, chọn vị trí, phối hợp đơn vị và giải quyết mục tiêu của chương. Những cơ chế chủ dự án đã chọn được ghi tại `decisions.md`; việc chọn cơ chế chưa ấn định mọi giá trị số, ngoại lệ hay quy mô nội dung. Ngôn ngữ mặc định của game là **tiếng Anh (English)** cho toàn bộ dữ liệu, giao diện và hội thoại.

## Ranh giới thiết kế

- Giữ bản đồ ô vuông và tuyến truyện cơ bản của FE3. Bản đồ ngẫu nhiên và giải đố là hoạt động riêng, không thay dữ liệu của chiến dịch.
- Quy tắc ảnh hưởng đến kết quả trận đánh nằm ở `battle.md`; danh sách nhân vật và class ở `characters.md`; mục tiêu và sự kiện từng chương ở `campaign.md`.
- Trạng thái hoàn thành chỉ lấy từ kết quả kiểm chứng trong `PLAN.md`. Tài liệu cũ từng mô tả 10+, 25+ và 40+ chương ở các mốc khác nhau; số chương mục tiêu chưa được chốt.
- Mã game hiện nằm trong `../Water-Emblem/`; các sơ đồ thư mục và mốc thời gian của đề án trước không thay thế việc kiểm code và `PLAN.md` hiện tại.

## Trải nghiệm cần giữ khi cụ thể hóa luật

Mỗi lựa chọn chiến thuật phải có tín hiệu để người chơi hiểu hậu quả: tầm đánh, mục tiêu địch, điều kiện thắng/thua và khả năng phản đòn. Bản đồ 3D phải giúp đọc vị trí và cao độ; hoạt cảnh có thể tua hoặc bỏ mà không làm đổi kết quả. Độ khó thay thử thách nhưng không cho AI biết thông tin bị che hoặc kết quả RNG trước khi hành động.

Chi tiết chưa chốt được ghi trong `decisions.md` và ở đúng file chuyên đề. Không suy ra rằng một cơ chế không được chọn là bị loại vĩnh viễn.
