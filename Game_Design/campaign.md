# Chiến dịch, màn chơi và chế độ

File này sở hữu thứ tự chương, mục tiêu, sự kiện, boss và các mode ngoài chiến dịch. Cốt truyện cơ bản và thứ tự chương tham chiếu FE3; danh sách chương, dữ liệu bản đồ và số chương phát hành chưa được kiểm hoặc chốt. Những con số 10+, 25+ và 40+ trong đề án cũ là các mức dự kiến khác nhau, không phải cam kết.

## Quy tắc tái hiện chiến dịch

Chủ dự án đã xác nhận ngày 2026-11-13: tất cả màn chiến dịch theo cốt truyện và diễn tiến **FE3: Mystery of the Emblem** đúng Book/chương, trừ khi có yêu cầu khác. Trước khi nhập dữ liệu chương, đối chiếu ít nhất mục tiêu, nhân vật/địch, thu phục, viện binh và chuẩn bị đội với nguồn FE3; không thay bằng dữ liệu FE1/FE11. Phần chưa xác minh giữ nhãn prototype, không tự điền để đủ tính năng.

Đối chiếu hiện có cho Book 1: chương 1–2 đều cần Marth chiếm cổng để thắng; Marth chết thì thua. Chương 2 có màn chuẩn bị. Wrys và Darros không có trong FE3; Ogma, Barst, Bord, Cord vào đội đầu chương 2, Castor có thể thu phục ở chương 2. Bảng địch chương 2 ghi một số hải tặc chưa hiện trong màn chuẩn bị nhưng xuất hiện khi vào trận; đây là sự kiện mở màn cần kiểm riêng, không tự biến thành viện binh giữa trận. Bảng quân Book 1 chưa ghi đợt viện binh giữa trận ở chương 1–2, nên không tạo đợt giả. Quy tắc B04 áp dụng tại chương FE3 có viện binh thật: báo trước để người chơi phản ứng và quân mới không hành động ngay lúc xuất hiện theo thiết kế đã chọn.

Đối chiếu ngày 2026-11-14: [bảng địch FE3 Book 1](https://serenesforest.net/mystery-of-the-emblem/characters/enemy-data/book-1/) ghi chương 1 có **14 địch** (11 Pirate, 1 Hunter, 1 Thief, Gazzak). JSON chương 1 hiện có 14 địch và bản đồ 30×13 với hai làng; làng phía đông thưởng 5.000G, phía tây thưởng Vulnerary theo [trang chương 1](https://fireemblemwiki.org/wiki/Marth_Embarks). Đây là mức khớp về số lượng và loại nội dung; tọa độ từng ô, vị trí quân và lời thoại chưa được xác nhận từ dữ liệu gốc. Bài chơi trọn từ mở màn vẫn chưa PASS trên trình duyệt, nên chưa coi là tái hiện đầy đủ FE3.

Đã tìm được [sơ đồ FE3 chương 1](https://chirimenzeyo.ari-jigoku.com/fire_emblem/03_monsyou/kouryaku_1_1.html) có ký hiệu ô và 14 vị trí địch, cùng vị trí 7 quân ta. Bản đồ chương 1 hiện đặt cổng tại `(4,4)` và chương 2 hiện là 30×15 theo [trang chương 2](https://fireemblemwiki.org/wiki/The_Pirates_of_Galder). Cần đối chiếu trực tiếp từng ô với sơ đồ và kiểm bài chơi trọn chương trước khi xác nhận độ chính xác.

[Hướng dẫn chương 1 FE3](https://fireemblemwiki.org/wiki/Marth_Embarks) ghi Gazzak chuyển lên Gate ở lượt đầu rồi đứng yên; hai Pirate gần Gate cũng chuyển tới cạnh Gate và dừng; Thief hướng tới làng để cướp, không ưu tiên giao tranh. Code hiện cho Thief ưu tiên làng còn nguyên, nhưng Gazzak đang đặt sẵn trên Gate và sự kiện di chuyển đầu lượt của các Pirate chưa có. Tọa độ ký hiệu trên sơ đồ chưa đủ chứng minh vị trí ROM chính xác, nên chưa xác nhận mức khớp của từng quân.

Nguồn đối chiếu: [sổ tay Nintendo](https://www.nintendo.co.jp/data/software/manual/man_jahj.pdf), [danh sách chương FE3](https://fireemblemwiki.org/wiki/List_of_chapters_in_Fire_Emblem:_Mystery_of_the_Emblem), [dữ liệu địch FE3 Book 1](https://serenesforest.net/mystery-of-the-emblem/characters/enemy-data/book-1/). Dữ liệu vị trí ô, chỉ số và lời thoại trong prototype vẫn cần kiểm riêng; các nguồn này không xác nhận toàn bộ JSON hiện có.

### Chi tiết các chương đã chuẩn hóa (2026-11-15)

Ngôn ngữ mặc định cho tên chương, mục tiêu, thoại và phần thưởng là **tiếng Anh (English)**:

- **Chapter 1: Marth Embarks (Talys)**:
  - Bản đồ: 30×13 (`talys_map`), Cổng thành tại `(4,4)`.
  - Quân ta (7): Marth, Jagen, Caeda, Abel, Cain, Gordin, Draug.
  - Quân địch (14): Gazzak (Boss, Pirate Lv5 tại `4,4`), 1 Pirate Lv3, 10 Pirate Lv1, 1 Hunter Lv1, 1 Thief Lv1.
  - Làng: Làng Tây `(3,9)` tặng Vulnerary; Làng Đông `(24,11)` tặng 5.000G.
  - Mục tiêu: Seize gate tại `(4,4)` sau khi hạ boss Gazzak.

- **Chapter 2: The Pirates of Galder**:
  - Bản đồ: 30×15 (`galder_map`), Cổng thành tại `(1,1)`.
  - Quân ta (11 + 1 chiêu mộ): 7 quân từ Ch1 + nhóm Talys (Ogma, Barst, Bord, Cord). Chiêu mộ Castor (Hunter Lv3) bằng Caeda.
  - Quân địch (17): Gomer (Boss, Pirate Lv7 tại `1,1`, rơi `steel_sword`), Castor, 2 Grust Cavalier Lv3, 2 Thief Lv1, 2 Hunter Lv1, 9 Pirate (1 Lv3, 8 Lv1).
  - Làng: Làng Galder `(20,5)` tặng 3.000G và cảnh báo về Navarre ở Núi Quỷ.
  - Mục tiêu: Seize gate tại `(1,1)` sau khi hạ boss Gomer.

- **Chapter 3: The Devil Mountain**:
  - Bản đồ: 30×20 (`devil_mountain_map`), Cổng thành tại `(1,2)`.
  - Quân ta (13 cố định + Castor tùy chọn + 1 chiêu mộ): Marth + quân carryover từ Ch2, gồm Julian (Thief Lv3 mang Iron Sword & Door Key) và Lena (Cleric Lv3 mang Mend Staff & Warp Staff) khởi đầu tại thung lũng `(21,10)` & `(22,10)`. Chiêu mộ Navarre (Mercenary Lv3 mang Killing Edge) bằng Caeda.
  - Quân địch (15): Hyman (Boss, Fighter Lv8 tại `1,2`, rơi `mend_staff`), Navarre, 8 Fighter (trong đó `samsoian_fighter_6` rơi `vulnerary`), 3 Hunter, 2 Thief.
  - Làng: Làng Núi Quỷ `(2,16)` tặng Devil Axe (`devil_axe`).
  - Thưởng chiếm cổng: 15.000G khi Marth chiếm cổng thành (`seizeReward`).
  - Mục tiêu: Seize gate tại `(1,2)` sau khi hạ boss Hyman.

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
