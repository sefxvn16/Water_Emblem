# Đồ họa và giao diện

File này mô tả thứ người chơi nhìn thấy và thao tác. Quy tắc tạo kết quả gameplay nằm ở `battle.md`, dữ liệu chương ở `campaign.md`; UI không tự tính một kết quả khác.

## Hướng hình ảnh

Định hướng đã ghi trong dự án: 3D low-poly phong cách chibi, tạo khối rõ ở góc nhìn chiến thuật, shading phẳng hoặc toon, nhân vật nhận diện được theo class và màu/phụ kiện. Bản đồ là lưới ô có cao độ; model 3D dùng GLB. Đề án cũ nêu khoảng 300–800 triangles mỗi nhân vật, mức cao độ 0–2 và texture atlas 2048²; đây là mục tiêu ban đầu **chưa đo trên bản chạy thực tế**, không phải điều kiện PASS tự động.

Pipeline dự kiến là dựng model/animation, xuất GLB, kiểm độ đọc trên bản đồ, rồi tối ưu theo số đo. Cần xác định nguồn hợp lệ cho portrait, icon, model, texture và hiệu ứng trước khi dùng. Không tự sao chép tài nguyên từ repository tham khảo vì báo cáo cũ khẳng định có thể dùng.

## Nguyên tắc giao diện đã chốt

Chủ dự án đánh giá hình ảnh bản hiện tại chưa đạt; việc model tải thành công và scene chạy được không đồng nghĩa giao diện hoặc chất lượng hình ảnh đã được duyệt.

Giao diện theo hướng tối giản, ưu tiên tinh thần thiết kế Bắc Âu: bố cục thoáng, ít chi tiết trang trí, phân cấp thông tin rõ và dễ theo dõi trong lúc chơi. Các thông tin cần thiết như quân đang chọn, HP, hành động khả dụng, mục tiêu và trạng thái lượt phải tìm thấy nhanh, không bị chìm trong nền 3D.

Ưu tiên biểu tượng thay chữ ở những thao tác có thể nhận biết rõ bằng hình. Khi di chuột hoặc chạm vào biểu tượng, hiện popup nhỏ giải thích chức năng; biểu tượng vẫn phải có tên cho công nghệ hỗ trợ. Những thông tin hoặc hành động dễ hiểu sai phải giữ nhãn chữ. Tất cả chữ hiển thị phải đọc được trên nền thực tế của game, với cỡ chữ, độ tương phản và khoảng cách phù hợp; không hy sinh độ đọc để thu gọn giao diện.

Ngôn ngữ hiển thị mặc định của toàn bộ trò chơi là **tiếng Anh (English)** cho tất cả nhãn UI, menu, thông báo chiến thuật, tên nhân vật, class, vũ khí, vật phẩm, địa hình và hội thoại; không tự ý dịch sang tiếng Việt trong game.

## Bố cục màn trận 2D (2026-11-17)

Theo `decisions.md` ngày 2026-11-17: bản đồ chiếm toàn khung và cuộn được tới mọi ô; không có thanh trên hay cột bên cố định. Đối chiếu ảnh FE3 trong `Original/04_Battle_Backgrounds/`:

| Thành phần | Bố cục | Nguồn FE3 |
|---|---|---|
| Bản đồ | Toàn khung, không HUD thường trực | `InGame_Screenshots/Ss_fe03_lower_left_corner_of_chapter_2_final.png`, `Ss_fe03_earth_dragon_movement.png` |
| Dự báo giao tranh | Cửa sổ đè mép trái bản đồ, chỉ số xếp dọc | `UI_and_Menus/Ss_fe03_combat_forecast.png`, `Ss_fe03_combat_forecast_01.png` |
| Hội thoại | Khung chữ kèm chân dung đè mép trên/dưới bản đồ | `InGame_Screenshots/Ss_fe03_fan_translation_ch6.png`, `Ss_fe03_fan_translation_ch2-18.png` |
| Trao đổi đồ | Hai cửa sổ đè lên bản đồ | `InGame_Screenshots/Ss_fe03_trade.png` |
| Kết quả giao tranh | Hai panel đỏ (địch, trái) / xanh (ta, phải) ở giữa mép dưới: tên, class, LV, vũ khí, thanh HP trước → sau, từng đòn trúng/trượt/chí mạng; không hoạt cảnh; tự đóng sau khoảng 2,5 giây hoặc khi click/nhấn phím, không chặn thao tác | `InGame_Screenshots/Ss_fe03_marth_battle.png` |
| Chuẩn bị trận | Thanh trên (số quân đã chọn, nút bắt đầu), lưới tên quân 3 cột, panel thông tin quân đang trỏ ở dưới | `InGame_Screenshots/Ss_fe03_unit_select.png` |

Quyết định chủ dự án ngày 2026-11-17 và 2026-11-18 (`PLAN.md` mục 71, 73, 74):

- Điều khiển không có trong FE3 nằm trong menu Settings (⚙). End Turn và ⚙ đặt cạnh nhau ở góc phải dưới, ⚙ bên phải; menu mở lên trên. Menu tự đóng khi đổi chương hoặc mở màn khác.
- Thông tin cơ bản nhân vật (`UnitHoverWindow.tsx`): khi rê chuột hoặc chạm vào ô có quân, hiện banner ngang 3 cột theo chuẩn FE3 (Cột 1: Name, Class, LV · EX, HP; Cột 2: chân dung avatar đóng khung ở giữa; Cột 3: tên vũ khí trang bị kèm `/uses` và icon FE3 gốc, nút 'Details ℹ️' cho tablet).
- Bảng thông tin chi tiết nhân vật (`UnitInspectorWindow.tsx`): chuột phải, nhấn giữ (0.5s) hoặc bấm nút 'Details ℹ️' mở bảng đầy đủ theo chuẩn FE3 (khung viền vàng, nền xanh navy, phân khối chỉ số combat At/Ac/Av/Cr/AS/Ef, chỉ số gốc Str/Skl/Spd/Lck/Wlv/Def/Res, vũ khí & vật phẩm kèm icon FE3 gốc trích từ `Original/08_Items_and_Weapons/` vào `public/icons/items/`, Max HP, Move). Không hiển thị growth rate. Toàn bộ bằng tiếng Anh, hỗ trợ đóng rõ ràng bằng nút [✕].
- Thông tin ô đất (`TerrainInfoWindow.tsx`): khi rê chuột hoặc chạm vào ô trống không có quân, hiện khung nhỏ gọn hiển thị tên địa hình (Plains, Forest, Fort, Castle...) và chỉ số né tránh (`Avoid : X%` kèm Def nếu > 0), tự động căn mép đối diện ô đang trỏ.
- Menu hành động (`ActionMenuWindow.tsx`): khung nền navy viền vàng hiện cạnh quân vừa di chuyển, luôn nằm trong khung nhìn, có con trỏ bàn tay (`👉`) chỉ vào lệnh đang hover/chọn.
- Hộp hội thoại nhân vật (`DialogueBox.tsx`): chân dung nhân vật đóng khung bên cạnh khung chữ, có đuôi mũi tên hình tam giác chỉ trực tiếp vào chân dung nhân vật đang nói, bố cục đảo bên theo phe/vị trí người nói.
- Dự báo giao tranh (`CombatForecastWindow.tsx`): hiển thị chi tiết lượng máu giảm dự kiến `HP: current → after (-loss)` (không tính crit), kèm thanh máu trực quan phân đoạn hai màu (xanh: máu còn lại, đỏ: lượng máu bị trừ), tỉ lệ trúng `Hit: X%`, chỉ số né tránh `Avo: X%`, chí mạng `Crit: X%`, tốc độ ra đòn `AS: X` (và nhãn `Double Attack / ×N` khi đánh nhiều lần), chân dung avatar và icon vũ khí FE3 gốc.
- Trên 2D mỗi quân hiển thị bằng avatar nhân vật (42×42) có viền màu phe (xanh: ta, đỏ: địch, xám: đã đi, vàng: đang chọn); phía dưới có thanh máu kèm số máu hiện tại/tối đa (HP: còn lại/tổng số).

Vị trí chính xác của menu hành động và cửa sổ thông tin quân khi rê chuột trong FE3 chưa có ảnh đối chiếu trong kho; bố cục hiện tại là lựa chọn của dự án.

## Camera và hoạt cảnh

Góc nhìn chính bắt đầu ở góc 3/4 để đọc bản đồ, nhưng camera xoay tự do và liên tục quanh điểm quan sát, không khóa ở bốn hướng 90°. Kéo chuột trái hoặc một ngón để di chuyển bản đồ; kéo chuột phải để xoay camera. Chỉ dẫn thao tác phải hiện rõ trong khung chơi. Camera phải giúp nhìn rõ ô, cao độ V07, cover C12 và bẫy V08; không che ô mục tiêu khi dự báo.

Zoom liên tục bằng lăn chuột hoặc nút cộng/trừ dưới minimap, không chia thành ba nấc. Góc nhìn ban đầu ở khoảng cách khu vực để thao tác chiến thuật; người chơi có thể thu nhỏ tới mức toàn bộ bản đồ vừa khung và chiếm phần lớn diện tích khả dụng, hoặc phóng gần nhân vật. Giữ hướng xoay và tâm quan sát khi zoom; chữ, dấu chọn và thông tin chiến thuật vẫn phải đọc được. Quy tắc này thay thế mô tả ba nấc zoom trước đó.

Minimap hình tròn đặt ở góc trên bên trái khung chơi, hiển thị khu vực quanh ô hoặc quân đang chọn; đánh dấu ô trung tâm và vị trí quân trong vùng đang thấy. Khi chọn ô khác, minimap chuyển sang khu vực đó. Hai nút cộng và trừ đặt gọn dưới minimap để điều chỉnh zoom liên tục.

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

Giao diện còn cần menu hành động, trạng thái đơn vị, thông tin ô, HP, điều kiện thắng/thua, cảnh báo viện binh B04 và kết quả thu phục B09. Minimap đã được chủ dự án chọn như trên; level-up screen và nhiều hiệu ứng phụ trong đề án cũ chỉ đưa vào phạm vi khi chủ dự án chốt. Với màu vùng nguy hiểm, không chỉ dùng màu để phân biệt nếu còn cách ký hiệu hoặc đường viền dễ đọc.

## Kiểm chứng hình ảnh và hiệu năng

Kiểm tay bằng bản đồ và đơn vị thực: chọn ô, xem tầm, xoay/zoom, đọc mục tiêu, giao tranh, tua hoạt cảnh. Đề án cũ nêu 60 FPS trên laptop tầm trung, 30 FPS mobile, dưới 100.000 triangles và 100 draw calls; thiết bị mục tiêu và điều kiện đo chưa được chốt. Giữ các số đó làm mốc tham khảo, đo rồi điều chỉnh trước khi biến thành tiêu chí nghiệm thu trong `PLAN.md`.
