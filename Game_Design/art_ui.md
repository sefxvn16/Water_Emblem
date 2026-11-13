# Đồ họa và giao diện

File này mô tả thứ người chơi nhìn thấy và thao tác. Quy tắc tạo kết quả gameplay nằm ở `battle.md`, dữ liệu chương ở `campaign.md`; UI không tự tính một kết quả khác.

## Hướng hình ảnh

Định hướng đã ghi trong dự án: 3D low-poly phong cách chibi, tạo khối rõ ở góc nhìn chiến thuật, shading phẳng hoặc toon, nhân vật nhận diện được theo class và màu/phụ kiện. Bản đồ là lưới ô có cao độ; model 3D dùng GLB. Đề án cũ nêu khoảng 300–800 triangles mỗi nhân vật, mức cao độ 0–2 và texture atlas 2048²; đây là mục tiêu ban đầu **chưa đo trên bản chạy thực tế**, không phải điều kiện PASS tự động.

Pipeline dự kiến là dựng model/animation, xuất GLB, kiểm độ đọc trên bản đồ, rồi tối ưu theo số đo. Cần xác định nguồn hợp lệ cho portrait, icon, model, texture và hiệu ứng trước khi dùng. Không tự sao chép tài nguyên từ repository tham khảo vì báo cáo cũ khẳng định có thể dùng.

## Camera và hoạt cảnh

Góc nhìn chính là isometric/dimetric, có zoom và pan. Đề án cũ vừa ghi xoay 4 hướng 90° vừa ghi deliverable “xoay 360°”; số góc xoay **chờ chốt** theo độ đọc bản đồ và thao tác người chơi. Camera phải giúp nhìn rõ ô, cao độ V07, cover C12 và bẫy V08; không che ô mục tiêu khi dự báo.

Hoạt cảnh cần tối thiểu các trạng thái đọc được: đứng, đi, ra đòn, trúng/né, bị hạ và hiệu ứng hành động hỗ trợ. Số bộ hoạt cảnh và camera zoom giao tranh tùy quy mô asset được duyệt. Q07 cho phép tua hoặc bỏ hoạt cảnh; kết quả trận đánh, RNG, thứ tự hiệu ứng và thời điểm lưu không phụ thuộc tốc độ hiển thị.

## Thông tin chiến thuật trên màn hình

| Thông tin | Cách dùng UI; nguồn luật |
|---|---|
| B01: vùng nguy hiểm | Tô rõ những ô nằm trong tầm đánh địch, có chú giải và cách bật/tắt. Tập ô do `battle.md` tính. |
| B02: đường mục tiêu địch | Chỉ từ địch tới mục tiêu dự kiến; phân biệt với hành động đã khóa. Quy tắc dự kiến do `battle.md` quyết. |
| B03: đòn báo trước | Dấu hiệu khác đường mục tiêu, thể hiện vùng hoặc thời điểm đòn sắp xảy ra. Không ghi “chắc chắn” nếu AI còn được đổi ý. |
| Q05: dự báo giao tranh | Trước khi xác nhận, hiện sát thương, khả năng trúng/chí mạng, phản đòn, đánh hai lần, hiệu ứng vũ khí khắc và đánh kẹp khi có. Giá trị dùng đúng hàm gameplay. |
| Q06: chuẩn bị trận | Cho xem bản đồ, mục tiêu, quân được chọn, vị trí xuất phát, class, vũ khí và trượng; cảnh báo trang bị không hợp lệ. |
| Q07: tốc độ | Tua hoặc bỏ animation trong giao tranh; giữ thông báo kết quả đủ để hiểu diễn biến. |

Giao diện còn cần menu hành động, trạng thái đơn vị, thông tin ô, HP, điều kiện thắng/thua, cảnh báo viện binh B04 và kết quả thu phục B09. Đề án cũ có minimap, level-up screen và nhiều hiệu ứng phụ; chỉ đưa vào phạm vi khi chủ dự án chốt. Với màu vùng nguy hiểm, không chỉ dùng màu để phân biệt nếu còn cách ký hiệu hoặc đường viền dễ đọc.

## Kiểm chứng hình ảnh và hiệu năng

Kiểm tay bằng bản đồ và đơn vị thực: chọn ô, xem tầm, xoay/zoom, đọc mục tiêu, giao tranh, tua hoạt cảnh. Đề án cũ nêu 60 FPS trên laptop tầm trung, 30 FPS mobile, dưới 100.000 triangles và 100 draw calls; thiết bị mục tiêu và điều kiện đo chưa được chốt. Giữ các số đó làm mốc tham khảo, đo rồi điều chỉnh trước khi biến thành tiêu chí nghiệm thu trong `PLAN.md`.
