# Nhân vật, class và phát triển đội hình

File này sở hữu quy tắc chung cho nhân vật và đội hình. Tên, chân dung và vai trò cốt truyện lấy FE3 làm nguồn đối chiếu. Chỉ số và growth của 15 nhân vật có dữ liệu trong FE11 Shadow Dragon đã được cập nhật ngày 2026-11-14; quân địch và nhân vật ngoài nhóm này còn là prototype. Các công thức số nằm ở `battle.md`.

## Chỉ số và class tạm chốt ngày 2026-11-14

Chủ dự án chọn **toàn bộ base stat ban đầu FE11/FE12** của từng nhân vật khi họ gia nhập, tương ứng Book 1/Book 2; điều này thay yêu cầu base FE3 trước đó. Trần Str/Mag/Skill/Spd/Luck/Def/Res là **30**, HP là **60**; dùng growth và EXP hiện đại. Khi qua chương phải giữ level, EXP, chỉ số đã tăng, HP mất, quân thu phục và trang bị; không reset về base mới. Key trong JSON/code hiện là `skill`; save v2 dùng `dex` được di trú khi tải. `Atk`, `Hit`, `Avoid`, `Crit`, `AS` được tính và hiển thị theo vũ khí/ngữ cảnh, không phải trường base stat cố định.

Các nhánh dưới đây là **tạm chốt** theo chỉ dẫn trực tiếp của chủ dự án. Catalog class và hàm core đã có; điều kiện/item promotion, UI, model riêng và kỹ năng chưa hoàn chỉnh. Tên sau dấu `→` là class thăng cấp; dấu `/` là lựa chọn nhánh.

| Class gốc | Class thăng cấp / quy tắc riêng |
|---|---|
| Lord | Warlord, cưỡi ngựa |
| Archer | Sniper, tầm bắn 2–3 ô |
| Hunter | Mangudai cưỡi ngựa mặt đất, tầm bắn 2 ô |
| Mercenary | Hero / Blade Dancer |
| Thief | Trickster |
| Fighter | Marauder / Axe Knight; Axe Knight cưỡi ngựa |
| Mage nam | Sage |
| Dark Mage | Warlock |
| Mage nữ | Sorceress |
| Sister nữ | Oracle |
| Dancer | Enchantress |
| Armour Knight | Cataphract cưỡi ngựa / General |
| Social Knight | Cataphract / Outrider; cả hai cưỡi ngựa |
| Pegasus Knight | Seraph Knight giữ hình dáng ngựa bay / Dragon Knight |
| Pirate, Curate và class chưa nêu | Tạm giữ nhánh có đối ứng trong đề xuất trước (Pirate → Berserker; Curate → Bishop); chỉ nhập khi nhân vật/chương dùng đến |

Kỵ binh mặt đất, gồm Mangudai, có thể xuống ngựa tự chọn, không có ô thành bắt buộc xuống ngựa. Khi xuống ngựa thành **Paladin đi bộ** và lưu class cưỡi ngựa trước đó để lên lại; Warlord trở về Lord. `Paladin` cưỡi ngựa cũ bị thay thế, không dùng song song hai nghĩa. Quân bay không xuống ngựa theo cơ chế này. Bản thử hiện chỉ đổi class, loại di chuyển và MOV khi xuống/lên ngựa; HP và bảy stat gốc giữ nguyên để không phát sinh hồi máu do đổi class. Đây là quy tắc tạm chốt cần cân bằng khi thêm đầy đủ cơ chế class. Navarre là Mercenary theo FE3, khác Myrmidon của FE11; tạm giữ Mercenary theo nguyên tác và để nhánh Blade Dancer tạo hướng kiếm sĩ riêng.

## Dữ liệu nhân vật và class

Mỗi nhân vật cần ID ổn định, tên hiển thị, portrait, class, cấp, chỉ số, growth, kỹ năng riêng, quan hệ hỗ trợ và trang bị ban đầu. Mỗi class cần loại di chuyển, MOV, loại vũ khí/trượng dùng được, đặc tính chiến đấu và hướng promotion. Đây là nhóm dữ liệu dự kiến, không mặc định các con số Marth trong ví dụ JSON cũ là dữ liệu chuẩn. `implementation_spec.md` quy định schema và kiểm tham chiếu.

N01 chọn kỹ năng cá nhân để các nhân vật cùng class vẫn có vai trò khác nhau. N02 chọn kỹ năng theo class. Cần chốt số kỹ năng được mang, thời điểm học, khả năng chuyển kỹ năng sau đổi class, cách hiện trong UI và thứ tự hiệu ứng với `battle.md`. Không tự đưa các kỹ năng proc Sol/Luna/Astra của đề án cũ vào danh sách đã duyệt.

## Chuyển lớp và reclass

N03 là promotion có nhánh; N04 cho đổi sang class khác. Cây class đã tạm chốt và lưu trong `data/classes.json`. Chủ dự án giao chọn cơ chế FE hiện đại, nên **tạm chốt** theo [sổ tay FE11 của Nintendo](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_ds_21/Manual_NintendoDS_FireEmblemShadowDragon_EN.pdf): Master Seal ở cấp ≥10; reclass trong Battle Preparation từ chương 4, giữ level/EXP và weapon rank đã luyện cho từng loại vũ khí. Hàm core promotion hiện trả về level 1/0 EXP theo FE11 `item.cpp:182-215` và `unit.cpp:2049-2058`. Master Seal, kho vật phẩm và UI promotion đã có; reclass và giới hạn số class chưa triển khai. Growth cá nhân và class đã tách trong dữ liệu, nhưng các class Water Emblem mới chưa có mapping reclass theo nhóm FE11. Màn chuẩn bị chương 2 vẫn dùng để chọn quân theo thiết kế chương mẫu, chưa mở reclass. Đề án cũ có gợi ý lên class tự động không cần item; không áp dụng.

Class phải có vai trò đọc được qua di chuyển, tầm, vũ khí, khả năng hỗ trợ hoặc chống chịu. Tác dụng của kỵ binh, quân bay và giáp khi gặp cao độ, bẫy, cover hoặc vũ khí khắc class cần được đặc tả thống nhất với `battle.md`.

## Quan hệ và vai trò hỗ trợ

N06 chọn quan hệ hỗ trợ giữa nhân vật. Bản thử tạm dùng [FE11 support](https://serenesforest.net/shadow-dragon/characters/support-bonus/): cặp có hướng, 3 ô kích hoạt, cùng xuất trận trọn chương tăng 1 điểm, C/B/A theo ngưỡng từng cặp và bonus Hit/Avoid/Crit/Dodge tương ứng. Marth–Caeda khởi đầu 4 điểm, đạt C ở 5. `data/supports.json` hiện chỉ có 11 hướng quan hệ phù hợp nhóm nhân vật đang dùng; các cặp sau cần nhập theo chương. Hội thoại support, nếu thêm, là nội dung riêng chưa chốt. N10 chọn hành động phi sát thương hữu ích cho đơn vị hỗ trợ, ví dụ trượng C10; danh sách tác dụng cụ thể nằm ở `battle.md`. Không tự thêm hệ Pair Up hoặc con cái từ các FE khác.

## Thu phục trong trận

N11 cho phép tuyển một số đơn vị địch vào đội; B09 là hành động hoặc điều kiện thu phục trên bản đồ. Quy tắc chung ở đây gồm điều kiện đối tượng hợp lệ, ai được thuyết phục, thành công/thất bại, trạng thái sau khi gia nhập và dữ liệu lưu. Các nhân vật, lời thoại, vị trí và thời điểm tuyển của từng chương nằm ở `campaign.md`. Chưa có tỉ lệ chiêu mộ hoặc danh sách đơn vị được duyệt; không mặc định mọi kẻ địch đều có thể tuyển.

## Tăng trưởng

`characters.json` lưu `personalGrowths` cho 15 nhân vật FE11 và `classes.json` lưu `growths` cho 35 class có đối ứng FE11. Công thức hiệu dụng là `max(0, personal + class)` theo [bảng cá nhân FE11](https://serenesforest.net/shadow-dragon/characters/growth-rates/base/) và [bảng class FE11](https://serenesforest.net/shadow-dragon/classes/growth-rates/player/). 15/15 tỷ lệ hiện hành được đối chiếu không đổi khi ở class ban đầu; khi đổi class, core lấy phần cá nhân cộng growth class mới. Lớp Paladin đi bộ dùng growth class cưỡi ngựa lưu trong `mountedClassId`; hai class Dancer/Enchantress chưa có bảng FE11 nên giữ tỷ lệ hiệu dụng đang có. Dracoknight đối ứng dòng nữ vì nhánh xuất phát từ Pegasus Knight theo cây hiện hành. Điều chỉnh growth động của FE11 chưa triển khai; phần tung chỉ số vẫn là 1RN FE8, không gọi là FE11 đầy đủ.

Đề án cũ chia growth thành cá nhân + class, random có chống lệch và fixed theo độ khó. Đây là đề xuất cũ; công thức và chế độ áp dụng chưa được duyệt. `battle.md` là nơi sở hữu cách tính; file này chỉ ghi dữ liệu cần có và tác động của promotion/reclass lên nhân vật.

`data/characters.json` dùng [base stat FE11](https://serenesforest.net/shadow-dragon/characters/base-stats/default/) và [growth hiệu dụng FE11](https://serenesforest.net/shadow-dragon/characters/growth-rates/all/) cho nhóm nhân vật có đối ứng FE11; Ogma level 4, Castor level 3. `skill` là key hiện hành. Navarre giữ `mercenary` theo FE3 dù FE11 là Myrmidon; base/growth được suy ra theo [chênh lệch base và growth class FE11](https://serenesforest.net/shadow-dragon/classes/reclassing/), phép tính ghi trong báo cáo chỉ số. Sáu boss dùng [số FE11 Normal](https://serenesforest.net/shadow-dragon/characters/boss-data/normal/stats/). Mười mẫu quân thường cấp 1 dùng [base class](https://serenesforest.net/shadow-dragon/classes/base-stats/) và [growth class địch FE11](https://serenesforest.net/shadow-dragon/classes/growth-rates/enemy/) làm **nền có nguồn**; đây không phải stat được trích riêng từ từng quân trên ROM FE11. `enemy_barbarian` dùng class Pirate tương ứng trong catalog hiện tại. EXP/level-up chạy theo khung FE8 ghi ở `battle.md`, không phải dynamic growth của FE11. Khi đưa nhân vật Book 2 vào game phải kiểm số FE12 riêng.
