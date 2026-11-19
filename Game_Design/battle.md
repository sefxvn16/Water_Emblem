# Luật trận đánh và công thức

File này sở hữu quy tắc lượt, di chuyển, địa hình, chiến đấu, AI và công thức. Trạng thái cơ chế lấy từ `decisions.md`. Các con số dưới mục “Đề xuất cũ” được giữ để đối chiếu khi chốt, **chưa phải giá trị được phép code**.

## Lượt và hành động

Nền FE3 dùng lượt theo phe. Đề án cũ mô tả pha người chơi, địch và đồng minh; thứ tự pha, hành động của đơn vị trung lập và thời điểm kiểm thắng/thua cần xác nhận theo dữ liệu chương. Đơn vị có thể chọn ô di chuyển, hành động và kết thúc lượt; việc chọn rồi hủy chưa được coi là hành động tiêu hao nếu chưa xác nhận. Hồi HP từ Fort/Gate chạy ở đầu phase của phe đứng trên ô; các hiệu ứng đầu/cuối lượt khác cần đặc tả riêng trước khi code.

Di chuyển dùng lưới ô vuông với chi phí địa hình, ô bị chiếm và loại di chuyển của class. Canto (V04) cho phép di chuyển sau hành động; độ dài quãng còn lại, hành động nào cho phép Canto và việc đi qua bẫy sau Canto **chờ chốt**. Đề án cũ gợi ý dùng phần MOV chưa tiêu, nhưng đó chưa là quy tắc được duyệt.

## Vị trí, địa hình và thông tin

Các ô đang có lấy bonus từ [bảng địa hình FE11](https://serenesforest.net/shadow-dragon/classes/terrain-data/): Forest +10 Avoid/0 Def, Mountain +20/1, Peak 0/0, Fort +15/1 và hồi 20%, Gate +20/2 và hồi 20%, Sea +20/0. Bonus Def chỉ chống đòn vật lý; phi binh không nhận Avoid/Def địa hình nhưng vẫn được hồi HP. Khi bắt đầu phase của phe tương ứng, quân đứng trên Fort/Gate hồi 20% HP tối đa; vì nguồn bảng không quy định làm tròn, Water Emblem **tạm chốt** làm tròn lên, không vượt HP tối đa. [Sổ tay Nintendo FE11](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_ds_21/Manual_NintendoDS_FireEmblemShadowDragon_EN.pdf) xác nhận hồi HP khi bắt đầu Player Phase. Chi phí Forest/Mountain/River/Sea áp theo `sourceClass` FE11 khi có đối ứng; class FE12 và ô mới chưa có bảng riêng dùng `MoveType` làm phương án tạm.

- V05: đánh kẹp khi hai đồng minh đặt hai phía của mục tiêu. Chờ chốt cách xác định “hai phía” trên lưới, ai được bồi đòn, sát thương và giới hạn mỗi giao tranh. Đây không phải Chain Attack tự động của Battle Style Backup.
- V07: cao độ ảnh hưởng chiến đấu. Bản 3D cũ dự kiến các mức 0–2, nhưng lợi thế tầm bắn, hit, damage và khả năng đi lên/xuống **chưa chốt**. Cao độ trang trí không tự phát sinh bonus gameplay.
- V08: bẫy và chặn lối. Chờ chốt loại bẫy, cách đặt/nhìn thấy/kích hoạt, thời gian tồn tại và AI có được biết bẫy hay không.
- C12: vật che chắn có thể bị phá. Chờ chốt ô nào là cover, độ bền, ảnh hưởng đến line of sight/hit và hậu quả khi bị phá. Bố cục bản đồ FE3 gốc không tự có dữ liệu cover có thể phá.
- B01: vùng nguy hiểm là hợp tầm địch có thể đánh ở trạng thái hiện tại, dùng cùng luật di chuyển/tầm đánh thực; UI chỉ đọc kết quả này. Cần quy định cách biểu diễn khi còn Fog of War nếu sau này được chọn.

## Giao tranh và hỗ trợ

Quy trình thiết kế: chọn vũ khí hoặc trượng, tính tầm và hợp lệ, xem dự báo, xác nhận, giải quyết thứ tự đòn và hiệu ứng, cập nhật state, kiểm điều kiện chương. Dự báo Q05 phải dùng cùng hàm tính với giao tranh; không tạo công thức riêng trong UI.

Theo quyết định tạm chốt ngày 2026-11-14, tên chỉ số nhân vật là **Skill** (`skill` trong data/code, thay `dex`). `Atk`, `Hit`, `Avoid`, `Crit` và `AS` phải được **tính và hiển thị** từ chỉ số gốc, vũ khí, class, địa hình và quan hệ tương ứng; không lưu chúng như base stat cố định của nhân vật. Thăng cấp Sniper cho tầm 2–3 ô, Mangudai giữ tầm 2 ô. Mã hiện dùng EXP sau giao tranh và 1RN growth theo FE8 trên growth hiệu dụng FE11: cấp tối đa 20, 100 EXP mỗi cấp, trần stat 30 và HP 60; hạ boss có thưởng 40 EXP và hạ Thief có thưởng 20 EXP theo FE8, sau đó giới hạn EXP trận ở 100; growth hiệu dụng đã tính từ personal + class FE11 cho các đối ứng có nguồn; chưa có điều chỉnh động FE11. Bản lưu v3 lưu level/EXP và di trú v2 khi tải. Bảng “Đề xuất cũ” bên dưới ghi nguyên văn DEX/BLD của đề án cũ để đối chiếu, không còn là tên chỉ số chọn cho game.

Dữ liệu vũ khí bản thử hiện dùng số FE11 cho 17 vũ khí có đối ứng: [sword](https://serenesforest.net/shadow-dragon/inventory/swords/), [lance](https://serenesforest.net/shadow-dragon/inventory/lances/), [axe](https://serenesforest.net/shadow-dragon/inventory/axes/), [bow](https://serenesforest.net/shadow-dragon/inventory/bows/). Slim Lance lấy [FE8](https://serenesforest.net/the-sacred-stones/inventory/lances/) vì không có trong bảng FE11 đã kiểm. Heal staff có thông số [FE11](https://serenesforest.net/shadow-dragon/inventory/staves/); Vulnerary là consumable hồi 10 HP, 3 lần theo [FE11](https://serenesforest.net/shadow-dragon/inventory/items/). Staff/consumable không thể tấn công, nhưng hành động hồi máu vẫn chưa code. Rank yêu cầu đã lưu trong `items.json`; loader kiểm rank vũ khí khởi đầu và combat từ chối vũ khí không đủ rank hoặc sai loại class. Rank của `galder_pirate` được đặt mức D tối thiểu từ Hand Axe đang trang bị, còn là suy luận tạm chốt, không được trình bày như số FE11 xác nhận. AI hiện tính xác suất Hit đúng theo mode 2RN của `SeededRNG`; vùng nguy hiểm không cộng ô di chuyển cho AI đứng canh. Support hiện dùng [bảng FE11](https://serenesforest.net/shadow-dragon/characters/support-bonus/): C +5 Hit/Avoid, B +10 Hit/Avoid, A +10 Hit/Avoid và +5 Crit/Dodge; trong 3 ô, cộng 1 điểm sau một chương cùng xuất trận. Điểm và hướng quan hệ lưu cùng unit để không mất khi chuyển chương/lưu game.


- C01: Sword > Axe > Lance > Sword. Đề án cũ còn ghi Arts > Bow/Tome/Dagger, +15 Hit, +1 Damage và Break; chủ dự án chỉ chọn **tam giác vũ khí**, nên các phần thêm đó chưa được chốt.
- C03: vũ khí khắc class như cung với đơn vị bay hoặc vũ khí chuyên dụng với giáp/kỵ binh. Danh sách cặp khắc, hệ số và thứ tự nhân hệ số **chờ chốt**.
- C10: trượng có tác dụng hỗ trợ ngoài hồi HP. Cần chốt tập hiệu ứng, tầm, số lần dùng, đối tượng hợp lệ, độ chính xác và thời điểm tác dụng. Đề án cũ chưa mô tả đủ.
- V05, V07, V08, C12 có thể thay dự báo và kết quả. Thứ tự ưu tiên giữa đòn chính, đánh kẹp, bẫy, cover và hiệu ứng trượng **chờ chốt**; không tự suy diễn từ FE hoặc Triangle Strategy.

### Độ bền vũ khí (PLAN mục 84, chốt 2026-11-19)

- Vũ khí vật lý mất 1 độ bền cho mỗi đòn **trúng** (đòn trượt không mất độ bền — chuẩn đa số dòng FE). Vũ khí phép (tome) mất 1 độ bền cho mỗi đòn tung ra, kể cả trượt. Trượng mất 1 độ bền mỗi lần dùng (mục 89).
- Độ bền về 0 thì vũ khí **biến mất** khỏi túi (chủ dự án chốt 2026-11-19; game không có rèn đồ). Quân tự trang bị vũ khí dùng được tiếp theo trong túi; không còn vũ khí dùng được thì quân ở trạng thái không vũ khí (không tấn công/phản đòn được).
- Độ bền áp dụng **sau khi giao tranh kết thúc** (đơn giản hóa đã ghi nhận: vũ khí còn 1 độ bền vẫn đánh đủ số đòn của giao tranh đó rồi mới vỡ; chưa mô phỏng vỡ giữa giao tranh).
- Falchion không vỡ (FE3) — áp dụng khi vật phẩm này xuất hiện trong dữ liệu.

## Công thức đề xuất cũ, chưa được duyệt

Các chỉ số đề án dùng: HP, STR, MAG, DEX, SPD, LCK, DEF, RES, BLD và MOV. Công thức dưới đây chỉ ghi lại bản đề án để tránh thất lạc khi thay file cũ:

| Tính toán | Đề án cũ |
|---|---|
| Attack Speed | `AS = SPD - max(0, WeaponWeight - BLD)` |
| Đánh hai lần | `AS_attacker - AS_defender >= 5` |
| Sát thương vật lý | `max(0, (STR + WeaponMight + TriangleBonus) × EffectiveMultiplier - DEF)` |
| Sát thương phép | `max(0, (MAG + TomeMight + TriangleBonus) × EffectiveMultiplier - RES)` |
| Hit | `WeaponHit + 2×DEX + floor(LCK/2) + TriangleHitBonus + SupportBonus` |
| Avoid | `2×AS + LCK + TerrainAvoidBonus` |
| Tỉ lệ trúng hiển thị | `clamp(Hit - Avoid, 0, 100)` |
| Crit | `WeaponCrit + floor(DEX/2) + ClassCritBonus - defender.LCK` |
| Sát thương chí mạng | `Damage × 3` |

Mâu thuẫn cần giải quyết: báo cáo cơ chế tính vũ khí khắc bằng `STR + (WeaponMight + TriangleBonus) × EffectiveMultiplier - DEF`, còn đề án nhân cả STR. `SupportBonus` cũng xuất hiện trong đề án nhưng không có quy tắc quan hệ cụ thể. Không chọn công thức nào trước khi chủ dự án duyệt.

Theo quy tắc nguồn ngày 2026-11-14 trong `decisions.md`, bản đang chạy tạm dùng Shadow Dragon (FE11) cho combat; phương án nền FE11/FE12 được tạm chốt, phần rank generic chưa đồng bộ: `AS=max(0,Spd−max(0,Wt−Str))`, đánh hai lần khi chênh AS ≥4, power=`Str/Mag+Mt×hệ số khắc+bonus rank+bonus tam giác`, damage=`max(0,power−Def/Res−địa hình)`, Hit=`Hit vũ khí+Skl+floor(Lck/2)+bonus rank/tam giác/support−Avoid`, Avoid=`AS+floor(Lck/2)+địa hình+support`, Crit=`Crit vũ khí+floor(Skl/2)+support−Lck−dodge support`. Bonus tam giác phụ thuộc rank, bonus rank bị vô hiệu khi đối thủ có lợi thế tam giác. [Mã FE11](https://github.com/Eebit/fe11-us/blob/be854842fb6f59e964f104e03f10fd0fb99891f5/src/unit.cpp#L1673-L1937) xác nhận Might/Hit/Crit/AS/Avoid; [bảng phép tính Shadow Dragon](https://serenesforest.net/shadow-dragon/miscellaneous/calculations/) xác nhận damage cuối, hiệu lực, double và bonus rank/tam giác. Rank của một số quân generic chưa có nguồn; `galder_pirate` được suy ra mức D tối thiểu từ Hand Axe. Bonus class FE11 đã áp dụng: Sniper +5 Hit/+5 Crit, Blade Dancer (đối ứng Swordmaster) +10 Hit, Berserker và Marauder (đối ứng Berserker) +10 Crit; nguồn [bảng công thức FE11](https://serenesforest.net/shadow-dragon/miscellaneous/calculations/). AI hiện nhân sát thương với xác suất Hit thực theo mode 2RN của RNG, lấy khung [cách chấm điểm FE8](https://github.com/FireEmblemUniverse/fireemblem8u/blob/04d1edb163d14bd10777a065697e1a9f17be65f2/src/cp_battle.c#L572-L716); trọng số vẫn là tham số prototype trong `balance.json`. [Báo cáo nguồn](../reports/doi_chieu_cong_thuc_fe_2026-11-14.md) ghi ranh giới áp dụng.

Đề án cũ nêu Hybrid RN: Hit hiển thị đến 50% dùng 1RN, trên 50% dùng đường cong ưu ái người đánh; tài liệu khác đưa ra cách tính khác nhau. Chế độ tăng trưởng cũ gợi ý random có anti-screwage ở Normal/Hard và fixed ở Maddening, với growth cá nhân cộng growth class. Cách tính RNG, anti-screwage, tích lũy điểm ẩn, seed và thời điểm tăng level đều **chờ chốt**. Việc chọn Q04 (độ khó) không đồng nghĩa duyệt mô hình tăng trưởng này.

## AI và minh bạch ý định

Chủ dự án đã giao chọn phần hệ số AI theo FE hiện đại: tạm giữ `data/balance.json` làm cân bằng Water Emblem cho khung chấm mục tiêu FE8 (sát thương kỳ vọng, khả năng kết liễu, rủi ro phản đòn, HP mục tiêu). Các hệ số này **không phải số trích từ FE8** vì mã tham chiếu không chứa bảng hệ số. Có thể điều chỉnh bằng đo trận thực tế; không ghi như đã được FE8 xác nhận. Vai trò AI của từng quân (`stationary`, `pursue`, `pillage`) do trường `aiRole` trong JSON chương quyết định; quân `pillage` phá làng nó đứng lên theo dữ liệu, không theo class (chủ dự án chốt 2026-11-17).

B10 cho địch nhiều vai trò: canh giữ, truy đuổi, tuần tra, rút lui, cướp đồ hoặc bỏ chạy. Đây là danh sách gợi ý từ báo cáo; vai trò nào có ở chương nào do `campaign.md` quyết định. Đề án cũ mô tả pipeline trạng thái → quét tầm → chấm mục tiêu → chọn ô đứng → hành động. Các tiêu chí hiện có là khả năng kết liễu, sát thương dự kiến, rủi ro phản đòn và HP mục tiêu; hệ số là cân bằng tạm của Water Emblem.

B02 cho người chơi thấy mục tiêu địch đang dự kiến tấn công; B03 báo trước đòn hoặc vùng tác động. Cần phân biệt dự đoán có thể đổi (B02) với hành động đã khóa (B03), thời điểm cập nhật và trường hợp người chơi thay đổi vị trí. AI không được đọc thông tin Fog of War bị che và không được biết trước kết quả RNG. B04 về viện binh và B05–B06 về điều kiện chương thuộc `campaign.md`; `art_ui.md` quy định cách hiển thị B01–B03.

Nguồn tham khảo: `../reports/bao_cao_nghien_cuu_co_che_tactical_rpg.md`. Báo cáo giải thích lựa chọn từ nhiều game; mọi con số và nhận định chưa được xác minh độc lập vẫn giữ nhãn Chờ chốt.
