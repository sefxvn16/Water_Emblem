# Chiến dịch, màn chơi và chế độ

File này sở hữu thứ tự chương, mục tiêu, sự kiện, boss và các mode ngoài chiến dịch. Cốt truyện cơ bản và thứ tự chương tham chiếu FE3; danh sách chương, dữ liệu bản đồ và số chương phát hành chưa được kiểm hoặc chốt. Những con số 10+, 25+ và 40+ trong đề án cũ là các mức dự kiến khác nhau, không phải cam kết.

## Cấu trúc một chương

Mỗi chương cần ID, tên, map, đơn vị người chơi/địch, vị trí xuất phát, điều kiện thắng/thua, sự kiện hội thoại, thời điểm viện binh, nhạc và những nhân vật có thể chiêu mộ. Cấu trúc dữ liệu cụ thể thuộc `implementation_spec.md`; chương nào có nội dung gì sẽ được điền sau khi đối chiếu nguồn FE3 và quyết định của chủ dự án. Không lấy dữ liệu FE11 mặc nhiên làm dữ liệu FE3 Book 2.

Các loại mục tiêu từng có trong đề án: chiếm ô, tiêu diệt tất cả, hạ boss, phòng thủ và thoát. B05 chọn bảo vệ một đơn vị/công trình; B06 chọn thoát bản đồ. Cần chốt mục tiêu nào dùng ở chương nào, ô đích, số lượt, đơn vị phải sống, ai phải thoát và điều gì xảy ra nếu hết lượt. Mục tiêu phụ như cứu dân hoặc lấy vật phẩm chỉ thêm khi được duyệt cho chương cụ thể.

## Sự kiện, viện binh và boss

B04: viện binh phải có cảnh báo đủ sớm để người chơi phản ứng, và không hành động ngay lúc xuất hiện. Đề án cũ gợi ý cảnh báo trước một lượt, xuất hiện cuối lượt địch, hành động ở lượt sau; thời điểm chính xác của từng event cần được chốt cùng thứ tự pha ở `battle.md`. Viện binh cần spawn tile hợp lệ và có cách xử lý khi ô đã bị chiếm.

B09: một số đơn vị có thể được thu phục trong trận. Mỗi trường hợp phải ghi người nói chuyện, mục tiêu, điều kiện, lời thoại và hệ quả nếu bỏ lỡ. Quy tắc chung và trạng thái đơn vị sau khi gia nhập thuộc `characters.md`.

B11: boss nhiều pha hoặc nhiều lớp phòng thủ. Chờ chốt số pha, điều kiện chuyển pha, thông tin báo trước, phần thưởng và tính nhất quán với dự báo chiến đấu. Không dùng mặc định quy tắc boss cần hai đòn để Break của đề án cũ vì Break chưa được chọn.

B10 (vai trò AI) được gán theo từng đơn vị/nhóm ở chương; `battle.md` sở hữu hành vi chung. B02–B03 phải hiển thị các ý định hoặc đòn đã khóa tương ứng với event của chương.

## Độ khó và các mode khác

Q04 chọn nhiều độ khó. Cần chốt số mức, thông số nào đổi giữa các mức (quân số, trang bị, AI, mức cảnh báo, tài nguyên), cùng tiêu chí để không tạo thông tin ẩn bất công. Đề án cũ dùng Normal/Hard/Maddening và gắn growth mode theo độ khó, nhưng các quy tắc đó chưa được duyệt.

Q10 là bản đồ giải đố: đội hình và tài nguyên định trước, mục tiêu rõ, có thể kiểm nghiệm lời giải. Q12 là bản đồ ngẫu nhiên: cần chốt bộ tile, thuật toán tạo map, điều kiện kết nối, vị trí xuất phát, mục tiêu và cách kiểm bản đồ luôn chơi được. Hai mode này tách dữ liệu khỏi chiến dịch FE3. Tháp 50 tầng, skirmish cày cấp và Ironman trong đề án cũ chưa được chọn.

## Dữ liệu và quyền nội dung

Đề án cũ đề xuất trích bản đồ/chỉ số từ `fe11-us` và chân dung/SFX từ `Super-Lex-Talionis`. Đây chỉ là hướng tham khảo. `fe11-us` là dự án về FE11 Shadow Dragon; việc dùng cho FE3 Book 2 cần đối chiếu riêng. Trước khi nhập bất kỳ map, portrait, icon, nhạc hoặc SFX nào, kiểm nguồn gốc, quyền sử dụng và dữ liệu có khớp chương dự kiến hay không. Ghi kết quả ở dữ liệu chương hoặc hồ sơ asset, không tự coi tuyên bố trong báo cáo repository là bằng chứng.
