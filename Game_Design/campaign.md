# Chiến dịch, màn chơi và chế độ

File này sở hữu thứ tự chương, mục tiêu, sự kiện, boss và các mode ngoài chiến dịch. Cốt truyện cơ bản và thứ tự chương tham chiếu FE3; danh sách chương, dữ liệu bản đồ và số chương phát hành chưa được kiểm hoặc chốt. Những con số 10+, 25+ và 40+ trong đề án cũ là các mức dự kiến khác nhau, không phải cam kết.

## Quy tắc tái hiện chiến dịch

Chủ dự án đã xác nhận ngày 2026-11-13: tất cả màn chiến dịch theo cốt truyện và diễn tiến **FE3: Mystery of the Emblem** đúng Book/chương, trừ khi có yêu cầu khác. Trước khi nhập dữ liệu chương, đối chiếu ít nhất mục tiêu, nhân vật/địch, thu phục, viện binh và chuẩn bị đội với nguồn FE3; không thay bằng dữ liệu FE1/FE11. Phần chưa xác minh giữ nhãn prototype, không tự điền để đủ tính năng.

Đối chiếu hiện có cho Book 1: chương 1–2 đều cần Marth chiếm cổng để thắng; Marth chết thì thua. Chương 2 có màn chuẩn bị. Wrys và Darros không có trong FE3; Ogma, Barst, Bord, Cord vào đội đầu chương 2, Castor có thể thu phục ở chương 2. Bảng địch chương 2 ghi một số hải tặc chưa hiện trong màn chuẩn bị nhưng xuất hiện khi vào trận; đây là sự kiện mở màn cần kiểm riêng, không tự biến thành viện binh giữa trận. Bảng quân Book 1 chưa ghi đợt viện binh giữa trận ở chương 1–2, nên không tạo đợt giả. Quy tắc B04 áp dụng tại chương FE3 có viện binh thật: báo trước để người chơi phản ứng và quân mới không hành động ngay lúc xuất hiện theo thiết kế đã chọn.

Đối chiếu ngày 2026-11-14: [bảng địch FE3 Book 1](https://serenesforest.net/mystery-of-the-emblem/characters/enemy-data/book-1/) ghi chương 1 có **14 địch** (11 Pirate, 1 Hunter, 1 Thief, Gazzak). JSON chương 1 hiện có 14 địch và bản đồ 30×13 với hai làng; làng phía đông thưởng 5.000G, phía tây thưởng Vulnerary theo [trang chương 1](https://fireemblemwiki.org/wiki/Marth_Embarks). Đây là mức khớp về số lượng và loại nội dung; tọa độ từng ô, vị trí quân và lời thoại chưa được xác nhận từ dữ liệu gốc. Bài chơi trọn từ mở màn vẫn chưa PASS trên trình duyệt, nên chưa coi là tái hiện đầy đủ FE3.

Đã tìm được [sơ đồ FE3 chương 1](https://chirimenzeyo.ari-jigoku.com/fire_emblem/03_monsyou/kouryaku_1_1.html) có ký hiệu ô và 14 vị trí địch, cùng vị trí 7 quân ta. Bản đồ chương 1 hiện đặt cổng tại `(4,4)` và chương 2 hiện là 30×15 theo [trang chương 2](https://fireemblemwiki.org/wiki/The_Pirates_of_Galder). Cần đối chiếu trực tiếp từng ô với sơ đồ và kiểm bài chơi trọn chương trước khi xác nhận độ chính xác.

[Hướng dẫn chương 1 FE3](https://fireemblemwiki.org/wiki/Marth_Embarks) ghi Gazzak chuyển lên Gate ở lượt đầu rồi đứng yên; hai Pirate gần Gate cũng chuyển tới cạnh Gate và dừng; Thief hướng tới làng để cướp, không ưu tiên giao tranh. Code hiện cho Thief ưu tiên làng còn nguyên, nhưng Gazzak đang đặt sẵn trên Gate và sự kiện di chuyển đầu lượt của các Pirate chưa có. Tọa độ ký hiệu trên sơ đồ chưa đủ chứng minh vị trí ROM chính xác, nên chưa xác nhận mức khớp của từng quân.

Nguồn đối chiếu: [sổ tay Nintendo](https://www.nintendo.co.jp/data/software/manual/man_jahj.pdf), [danh sách chương FE3](https://fireemblemwiki.org/wiki/List_of_chapters_in_Fire_Emblem:_Mystery_of_the_Emblem), [dữ liệu địch FE3 Book 1](https://serenesforest.net/mystery-of-the-emblem/characters/enemy-data/book-1/). Dữ liệu vị trí ô, chỉ số và lời thoại trong prototype vẫn cần kiểm riêng; các nguồn này không xác nhận toàn bộ JSON hiện có.

### Quy trình đối chiếu bản đồ FE3 cho các chương tiếp theo (2026-11-16)

Nguồn đã mở và dùng để đối chiếu:

| Nguồn | Nội dung dùng được | Giới hạn |
|---|---|---|
| `Water-Emblem/public/models/Original/01_Maps/Book_1/Cm_fe03_b1_<chương>.png` và `Book_2/` cùng cấu trúc | Hình dạng bờ biển, núi, công trình và vị trí sprite trên ảnh FE3; có bản phóng 4x trong `Upscaled_PixelSharp/4x/` | Sprite và chú thích che địa hình; `Original/README.md` chưa ghi URL hoặc quyền sử dụng của từng ảnh. Kích thước PNG có thể gồm phần mép, không tự coi là kích thước map chơi được. |
| [Sơ đồ Book 1 chương 1–10](https://chirimenzeyo.ari-jigoku.com/fire_emblem/03_monsyou/kouryaku_1_1.html), [11–20](https://chirimenzeyo.ari-jigoku.com/fire_emblem/03_monsyou/kouryaku_1_2.html) | Lưới có chú giải loại địa hình, công trình và ký hiệu quân; ảnh chương 1–3 đã mở trực tiếp tại `MAP/map1_01.png`, `map1_02.png`, `map1_03.png`. | Sơ đồ do người viết hướng dẫn lập, không phải dữ liệu ROM; ký hiệu có thể che màu ô hoặc được dời để dễ đọc. Chỉ dùng làm nguồn tham chiếu, không chép ảnh vào game. |
| [Sơ đồ Book 2 chương 1–12](https://chirimenzeyo.ari-jigoku.com/fire_emblem/03_monsyou/kouryaku_2_1.html), [13–Endgame](https://chirimenzeyo.ari-jigoku.com/fire_emblem/03_monsyou/kouryaku_2_2.html) | Điểm bắt đầu tra chương Book 2 về sau. | Chưa kiểm trực tiếp từng ảnh; không suy URL ảnh hoặc độ chính xác từ ba chương Book 1. |
| [Bảng địch FE3 Book 1](https://serenesforest.net/mystery-of-the-emblem/characters/enemy-data/book-1/), trang chương tương ứng trên Fire Emblem Wiki | Kiểm số lượng, class, nhân vật xuất hiện, sự kiện và mục tiêu. | Không thay thế được tọa độ từng ô. |

Các bước khi thêm hoặc sửa một chương:

1. Xác nhận đúng **FE3, Book và chương**. Mở ảnh `Original/01_Maps/` và sơ đồ chương tương ứng; ghi URL, ngày kiểm, kích thước ảnh, kích thước lưới và quy ước tọa độ `x=0` bên trái, `y=0` phía trên vào hồ sơ đối chiếu của chương.
2. Đếm cột/hàng theo **vạch lưới của sơ đồ**. Ba sơ đồ đầu có bước cột 17 px, bước hàng 15 px (kể cả nét lưới), bắt đầu tại `(8,29)`, `(4,30)`, `(4,29)`; hàng và cột cuối là nét viền, không phải ô chơi. Lưới thực là 30×13, 30×15, 30×20. Ảnh chương 1–3 trong repo tương ứng 32×15, 32×17, 32×22 khối 16 px; chênh lệch này chưa được phép tự động cắt một ô mỗi mép, phải đối chiếu điểm gốc bằng cổng, làng, đường bờ và vị trí quân.
3. Đọc **chú giải của đúng ảnh chương** rồi nhập `grid[y][x]` vào `Water-Emblem/data/maps/<map-id>.json` và kiểm trực quan với ảnh FE3. Cùng màu be xám là `がれき` (rubble) ở Chương 1 nhưng là `橋` (bridge) ở Chương 2; không dùng một bảng màu chung cho mọi chương. `elevations[y][x]` chỉ ghi mức có căn cứ; màu ảnh phẳng không đủ chứng minh độ cao gameplay. Ô bị ký hiệu che hoặc hai nguồn khác nhau phải ghi `chưa xác minh` trong hồ sơ, không đoán bằng ô lân cận.
4. Ghi vị trí quân, phe, điểm thắng và vật thể vào `Water-Emblem/data/chapters/<chapter-id>.json`. Dùng tâm sprite trên ảnh FE3 và ký hiệu sơ đồ để đối chiếu; nếu chúng khác nhau, tìm ảnh chụp gameplay hoặc nguồn dữ liệu FE3 khác trước khi chốt. Không dùng tọa độ FE1, FE11 hoặc FE12 để lấp chỗ trống.
5. Kiểm từng vị trí nằm trong lưới, không chồng sai, loại địa hình cho phép class đó đứng/di chuyển, cổng/làng/cầu nằm ở đúng ô, và đường đi tới mục tiêu thực sự chơi được. Đối chiếu số quân và sự kiện theo nguồn FE3; chạy test logic, build, rồi mở từng map trong Chromium để so ảnh ở trạng thái bắt đầu trận.
6. Hồ sơ đối chiếu phải ghi **tọa độ hoặc ô chưa chắc, nguồn nào xác nhận, kết quả test và ảnh kiểm thực tế**. Chỉ ghi PASS khi mọi ô và vị trí thuộc phạm vi chương đã được xác nhận; test/build PASS riêng không chứng minh map khớp FE3. Ảnh tham khảo bên ngoài và asset FE3 chưa rõ quyền không được tự động thêm vào bản phát hành.

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
