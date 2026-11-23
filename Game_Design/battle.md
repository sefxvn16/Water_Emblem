# Luật trận đánh và công thức

File này sở hữu quy tắc lượt, di chuyển, địa hình, chiến đấu, AI và công thức. Trạng thái cơ chế lấy từ `decisions.md`. Các con số dưới mục “Đề xuất cũ” được giữ để đối chiếu khi chốt, **chưa phải giá trị được phép code**.

## Lượt và hành động

Nền FE3 dùng lượt theo phe. Đề án cũ mô tả pha người chơi, địch và đồng minh; thứ tự pha, hành động của đơn vị trung lập và thời điểm kiểm thắng/thua cần xác nhận theo dữ liệu chương. Đơn vị có thể chọn ô di chuyển, hành động và kết thúc lượt; việc chọn rồi hủy chưa được coi là hành động tiêu hao nếu chưa xác nhận. Hồi HP từ Fort/Gate chạy ở đầu phase của phe đứng trên ô; các hiệu ứng đầu/cuối lượt khác cần đặc tả riêng trước khi code.

Di chuyển dùng lưới ô vuông với chi phí địa hình, ô bị chiếm và loại di chuyển của class. Canto (V04) cho phép di chuyển sau hành động; độ dài quãng còn lại và hành động nào cho phép Canto xem mục "Đợt B cơ chế đã chốt" dưới đây. Đề án cũ gợi ý dùng phần MOV chưa tiêu, nhưng đó chưa là quy tắc được duyệt.

## Vị trí, địa hình và thông tin

Các ô đang có lấy bonus từ [bảng địa hình FE11](https://serenesforest.net/shadow-dragon/classes/terrain-data/): Forest +10 Avoid/0 Def, Mountain +20/1, Peak 0/0, Fort +15/1 và hồi 20%, Gate +20/2 và hồi 20%, Sea +20/0. Bonus Def chỉ chống đòn vật lý; phi binh không nhận Avoid/Def địa hình nhưng vẫn được hồi HP. Khi bắt đầu phase của phe tương ứng, quân đứng trên Fort/Gate hồi 20% HP tối đa; vì nguồn bảng không quy định làm tròn, Water Emblem **tạm chốt** làm tròn lên, không vượt HP tối đa. [Sổ tay Nintendo FE11](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_ds_21/Manual_NintendoDS_FireEmblemShadowDragon_EN.pdf) xác nhận hồi HP khi bắt đầu Player Phase. Chi phí Forest/Mountain/River/Sea áp theo `sourceClass` FE11 khi có đối ứng; class FE12 và ô mới chưa có bảng riêng dùng `MoveType` làm phương án tạm.

- V05: đánh kẹp khi hai đồng minh đặt hai phía của mục tiêu. Chờ chốt cách xác định “hai phía” trên lưới, ai được bồi đòn, sát thương và giới hạn mỗi giao tranh. Đây không phải Chain Attack tự động của Battle Style Backup.
- V07: cao độ ảnh hưởng chiến đấu. Bản 3D cũ dự kiến các mức 0–2, nhưng lợi thế tầm bắn, hit, damage và khả năng đi lên/xuống **chưa chốt**. Cao độ trang trí không tự phát sinh bonus gameplay.
- V08 bẫy và chặn lối: **đã gỡ bỏ** theo lệnh chủ dự án 2026-11-19 ("làm gì có bẫy. Bỏ"; PLAN mục 149). Game không có bẫy; không dựng lại cơ chế này.
- B01: vùng nguy hiểm là hợp tầm địch có thể đánh ở trạng thái hiện tại, dùng cùng luật di chuyển/tầm đánh thực; UI chỉ đọc kết quả này. Cần quy định cách biểu diễn khi còn Fog of War nếu sau này được chọn.

## Giao tranh và hỗ trợ

Quy trình thiết kế: chọn vũ khí hoặc trượng, tính tầm và hợp lệ, xem dự báo, xác nhận, giải quyết thứ tự đòn và hiệu ứng, cập nhật state, kiểm điều kiện chương. Dự báo Q05 phải dùng cùng hàm tính với giao tranh; không tạo công thức riêng trong UI.

Theo quyết định tạm chốt ngày 2026-11-14, tên chỉ số nhân vật là **Skill** (`skill` trong data/code, thay `dex`). `Atk`, `Hit`, `Avoid`, `Crit` và `AS` phải được **tính và hiển thị** từ chỉ số gốc, vũ khí, class, địa hình và quan hệ tương ứng; không lưu chúng như base stat cố định của nhân vật. Thăng cấp Sniper cho tầm 2–3 ô, Mangudai giữ tầm 2 ô. Mã hiện dùng EXP sau giao tranh và 1RN growth theo FE8 trên growth hiệu dụng FE11: cấp tối đa 20, 100 EXP mỗi cấp, trần stat 30 và HP 60; hạ boss có thưởng 40 EXP và hạ Thief có thưởng 20 EXP theo FE8, sau đó giới hạn EXP trận ở 100; growth hiệu dụng đã tính từ personal + class FE11 cho các đối ứng có nguồn; chưa có điều chỉnh động FE11. Bản lưu v3 lưu level/EXP và di trú v2 khi tải. Bảng “Đề xuất cũ” bên dưới ghi nguyên văn DEX/BLD của đề án cũ để đối chiếu, không còn là tên chỉ số chọn cho game.

Dữ liệu vũ khí bản thử hiện dùng số FE11 cho 17 vũ khí có đối ứng: [sword](https://serenesforest.net/shadow-dragon/inventory/swords/), [lance](https://serenesforest.net/shadow-dragon/inventory/lances/), [axe](https://serenesforest.net/shadow-dragon/inventory/axes/), [bow](https://serenesforest.net/shadow-dragon/inventory/bows/). Slim Lance lấy [FE8](https://serenesforest.net/the-sacred-stones/inventory/lances/) vì không có trong bảng FE11 đã kiểm. Heal staff có thông số [FE11](https://serenesforest.net/shadow-dragon/inventory/staves/); Vulnerary là consumable hồi 10 HP, 3 lần theo [FE11](https://serenesforest.net/shadow-dragon/inventory/items/). Staff/consumable không thể tấn công, nhưng hành động hồi máu vẫn chưa code. Rank yêu cầu đã lưu trong `items.json`; loader kiểm rank vũ khí khởi đầu và combat từ chối vũ khí không đủ rank hoặc sai loại class. Rank của `galder_pirate` được đặt mức D tối thiểu từ Hand Axe đang trang bị, còn là suy luận tạm chốt, không được trình bày như số FE11 xác nhận. AI hiện tính xác suất Hit đúng theo mode 2RN của `SeededRNG`; vùng nguy hiểm không cộng ô di chuyển cho AI đứng canh. Support hiện dùng [bảng FE11](https://serenesforest.net/shadow-dragon/characters/support-bonus/): C +5 Hit/Avoid, B +10 Hit/Avoid, A +10 Hit/Avoid và +5 Crit/Dodge; trong 3 ô, cộng 1 điểm sau một chương cùng xuất trận. Điểm và hướng quan hệ lưu cùng unit để không mất khi chuyển chương/lưu game.


- C01: Sword > Axe > Lance > Sword. Đề án cũ còn ghi Arts > Bow/Tome/Dagger, +15 Hit, +1 Damage và Break; chủ dự án chỉ chọn **tam giác vũ khí**, nên các phần thêm đó chưa được chốt.
- C03: vũ khí khắc class như cung với đơn vị bay hoặc vũ khí chuyên dụng với giáp/kỵ binh. Danh sách cặp khắc, hệ số và thứ tự nhân hệ số **chờ chốt**.
- C10: trượng có tác dụng hỗ trợ ngoài hồi HP. Cần chốt tập hiệu ứng, tầm, số lần dùng, đối tượng hợp lệ, độ chính xác và thời điểm tác dụng. Đề án cũ chưa mô tả đủ.
- V05 và V07 có thể thay dự báo và kết quả. Thứ tự ưu tiên giữa đòn chính, đánh kẹp và hiệu ứng trượng **chờ chốt**; không tự suy diễn từ FE hoặc Triangle Strategy.

### Độ bền vũ khí (PLAN mục 84, chốt 2026-11-19)

- Vũ khí vật lý mất 1 độ bền cho mỗi đòn **trúng** (đòn trượt không mất độ bền — chuẩn đa số dòng FE). Vũ khí phép (tome) mất 1 độ bền cho mỗi đòn tung ra, kể cả trượt. Trượng mất 1 độ bền mỗi lần dùng (mục 89).
- Độ bền về 0 thì vũ khí **biến mất** khỏi túi (chủ dự án chốt 2026-11-19; game không có rèn đồ). Quân tự trang bị vũ khí dùng được tiếp theo trong túi; không còn vũ khí dùng được thì quân ở trạng thái không vũ khí (không tấn công/phản đòn được).
- Độ bền áp dụng **sau khi giao tranh kết thúc** (đơn giản hóa đã ghi nhận: vũ khí còn 1 độ bền vẫn đánh đủ số đòn của giao tranh đó rồi mới vỡ; chưa mô phỏng vỡ giữa giao tranh).
- Falchion không vỡ (FE3) — áp dụng khi vật phẩm này xuất hiện trong dữ liệu.

### Đổi vũ khí trong trận (PLAN mục 85, chốt 2026-11-19)

- Quân trang bị được bất kỳ vũ khí nào trong túi mà quân dùng được (loại vũ khí của class + rank vũ khí đủ) và còn độ bền. Trượng trang bị được (dùng trượng, không tấn công); vật phẩm tiêu hao không trang bị.
- Bấm **Attack**: nếu quân có từ 2 vũ khí tấn công dùng được trở lên, game mở cửa sổ chọn vũ khí trước khi chọn mục tiêu; dự báo giao tranh tính theo vũ khí đã chọn. Menu hành động cũng có dòng **Equip: \<tên vũ khí\>** để đổi vũ khí trang bị mà không kết thúc hành động (dùng cho phản đòn pha địch).
- Một địch được coi là tấn công được khi **bất kỳ** vũ khí dùng được nào trong túi chạm tới; khi mở dự báo, nếu vũ khí đang trang bị không chạm tới mục tiêu nhưng vũ khí khác chạm tới, game tự trang bị vũ khí chạm tới đầu tiên (theo thứ tự trong túi).
- Đổi vũ khí không tốn hành động, không đổi luật combat nào khác.

### Giới hạn túi đồ (PLAN mục 86, chốt 2026-11-19)

- Mỗi quân có 2 túi riêng kiểu FE3: **4 ô vũ khí + 4 ô vật phẩm**. Trượng tính vào túi vật phẩm (FE3 §1.22); vật phẩm tiêu hao và đồ khóa (door_key, master_seal) cũng vào túi vật phẩm.
- Nhận đồ (rương, làng, đồ rơi) khi túi tương ứng đã đầy: game hỏi bỏ một món trong cùng túi để lấy chỗ, hoặc bỏ món mới. Từ mục 88 có thêm lựa chọn gửi vào kho qua Marth.
- Bỏ vũ khí đang trang bị thì quân thành không vũ khí (trang bị lại bằng mục 85).

### Trao đổi đồ — Trade (PLAN mục 87, chốt 2026-11-19)

- Quân đứng kề đồng minh có lệnh **Trade**: đổi chỗ hoặc chuyển đồ giữa 2 túi, tôn trọng giới hạn 4+4 (mục 86). Trong một lần mở Trade đổi được nhiều lần.
- Thoát Trade thì **hết di chuyển** (ô đích bị khóa, không hủy bước đi được nữa) nhưng quân vẫn tấn công/dùng đồ/dùng trượng được từ ô đó.
- Mỗi quân chỉ **chủ động** Trade 1 lần mỗi lượt; quân khác vẫn Trade với quân đó được.
- Vũ khí đang trang bị rời túi thì quân tự trang bị vũ khí dùng được đầu tiên; quân **đã hành động xong** mà bị sắp xếp lại túi thì vũ khí trang bị thành cây dùng được đầu tiên trong túi (mẹo trang bị cho pha địch kiểu FE3).

### Kho đồ qua Marth — Convoy (PLAN mục 88, chốt 2026-11-19)

- Marth là kho: **128 ô** chung cho vũ khí + vật phẩm, cất/lấy miễn phí, kho giữ qua các chương và lưu trong save.
- Trong trận: Marth và quân đứng **kề Marth** có lệnh **Storage** (cất/lấy). Thoát Storage thì hết di chuyển như Trade [Giả định — nghiên cứu không ghi rõ điểm này]. Màn chuẩn bị: mọi quân cất/lấy tự do.
- Nhận đồ khi túi đầy (mục 86) có thêm lựa chọn **gửi vào kho** khi kho còn chỗ.

### Dùng trượng (PLAN mục 89, C10, chốt 2026-11-19)

- Quân mang trượng dùng được (class + rank) có lệnh **Staff: \<tên trượng\>** khi có mục tiêu hợp lệ; bấm vào đồng minh được tô sáng để dùng. Dùng trượng kết thúc hành động của quân.
- Trượng hồi máu (Heal/Mend): hồi **healBase + MAG ÷ healMagDivisor** (làm tròn xuống) HP cho đồng minh trong tầm trượng (chưa đầy máu). Trượng mất 1 độ bền mỗi lần dùng, về 0 thì biến mất (mục 84).
- EXP cho healer: **14 EXP/lần dùng [Giả định]** — nguồn FE3 mâu thuẫn (Serenes Forest nói FE3 không có EXP trượng; bảng trượng Tanas Manor ghi Heal 14); cần kiểm ROM trước khi chốt số cuối.
- **Warp chưa làm** (trượng dịch chuyển cần chọn ô đích — ghi nhận còn nợ); các trượng FE3 khác (Recover/Physic/Fortify/Rescue/Silence/Barrier/Hammerne/Thief/Unlock/Watch/Again/Aum) chưa có trong dữ liệu.

### Rank vũ khí tăng theo dùng — WEx (PLAN mục 90, A9 theo FE5, chốt 2026-11-19)

- Mỗi đòn **trúng** cộng 1 WEx cho loại vũ khí đã dùng (kể cả phản đòn). Ngưỡng lên rank kiểu FE5: E→D 50, D→C 100, C→B 150, B→A 200; điểm dư mang sang rank kế. Rank tối đa **A** (dữ liệu không có vũ khí hạng S/★).
- Dùng trượng cộng WEx trượng theo rank của trượng: E 1, D 2, C 4, B 6, A 10 **[Giả định]** (nghiên cứu chỉ ghi khoảng 1–10 theo rank).
- Tiến độ WEx lưu theo từng loại vũ khí, giữ qua chương (save). Bonus theo rank hiện có không đổi.

### Tiệm vũ khí/dụng cụ — Shop (PLAN mục 91, chốt 2026-11-19)

- Đứng trên ô `shop` có lệnh **Shop**; vàng là quỹ chung của quân (đã có sẵn trong save). Đóng tiệm thì quân kết thúc hành động (luật Visit/Shop của FE3). Trong lúc tiệm mở có thể mua/bán nhiều lần.
- Giá mua nằm trong `data/items.json` (`price`), lấy từ FE11 (Shadow Dragon): kiếm sắt 400, kiếm thép 875, kiếm diệt giáp 1000, đoản đao 1500, thương sắt 480, thương thép 980, thương bạc 2200, thương phóng 750, thương diệt kỵ 1200, rìu sắt 320, rìu thép 700, rìu ném 540, chùy 1100, cung sắt 440, cung thép 770, trượng Heal 800, trượng Mend 1280, thuốc hồi máu 360, chìa cửa 500, ấn thăng cấp 2500, Rapier/Wing Spear 1120.
- Ba giá **[Giả định]**: Slim Lance 450 (FE11 không có, dữ liệu ghi nguồn FE8), Devil Axe 1100 và Warp 2000 (FE11 không bán hai món này nên không có giá mua).
- Không bán ở tiệm (`buyable: false`): Rapier, Wing Spear (vũ khí cá nhân), Master Seal (thăng cấp không cần đồ theo chốt A10), Devil Axe, Warp. Các món này vẫn có giá để tính tiền bán lại.
- Bán lại theo FE11: **nửa giá nhân tỉ lệ độ bền còn lại**, làm tròn xuống (`floor(price × uses / maxUses / 2)`). Bán vũ khí đang trang bị thì quân tự trang bị vũ khí dùng được tiếp theo (giống Trade/kho đồ).
- Đồ mua vào túi quân mua nếu còn chỗ (giới hạn 4+4 mục 86), đầy thì vào kho đồ (mục 88), cả hai đầy thì không mua được. Chỉ bán đồ trong túi của quân đang vào tiệm (chưa bán từ kho đồ).

### Rương, cửa và khóa (PLAN mục 92, chốt 2026-11-19)

- Địa hình mới: `chest` (rương, đứng lên được như làng/tiệm) và `door` (cửa khóa, **chặn đường** như tường cho tới khi mở; mở xong đi qua được với chi phí 1). Rương/cửa khai trong dữ liệu chương (`chests`, `doors`), vị trí phải đúng ô địa hình tương ứng.
- Đặt hiện tại: chương 3 — rương tại (22,2) gần Julian (thưởng Steel Sword), cửa tại (1,7) ở tường thành; chương test — rương (7,4) thưởng 1000 vàng, cửa (0,3). Hai ô này lệch khỏi lưới tham chiếu FE3 (plains/wall) — test `fe3MapReference` bỏ qua ô chest/door vì là thêm mới có chủ đích.
- Mở rương: đứng **trên** ô rương, lệnh **Open Chest**. Chỉ lớp đạo tặc (cờ dữ liệu `canOpenLocks`: Thief, Trickster) mở bẩm sinh; Marth chỉ mở được khi mang **Fire Emblem** (luật FE3; vật phẩm `fire_emblem` đã thêm vào dữ liệu, chưa chương nào phát — tới chương có Fire Emblem mới dùng). Thưởng theo dữ liệu chương (vật phẩm/vàng), tràn túi thì theo luồng mục 86.
- Mở cửa: đứng **kề** cửa, lệnh **Open Door**. Đạo tặc mở không tốn đồ; quân khác phải mang **Door Key** (tiêu hao 1 lần dùng). Mở rương/cửa đều kết thúc hành động của quân.
- Trạng thái rương/cửa đã mở lưu trong save (`chestStates`, `doorStates`); save cũ không có hai trường này thì coi như chưa mở. Ô cửa đã mở vẫn vẽ như ô cửa (chưa đổi hình), vùng di chuyển cho thấy đi qua được.

### Đấu trường — Arena (PLAN mục 93, chốt 2026-11-19)

- Địa hình mới `arena` (đứng lên được như tiệm); hiện đặt ở bản đồ test (6,7). Các chương 1–4 theo FE3 không có đấu trường (FE3 đặt đấu trường từ chương 7) nên chưa đặt ở đó — khi thêm chương có đấu trường thì đặt theo dữ liệu chương.
- Đứng trên ô arena, quân có vũ khí gây sát thương và đủ vàng thì có lệnh **Arena**: chọn mức cược 300/600/1000 vàng [Giả định]. Cược càng cao đối thủ càng mạnh (đối thủ gương theo chính quân đó: cấp +0/+1/+2, chỉ số chiến đấu +0/+1/+2, HP tối đa +0/+2/+4, cầm vũ khí sắt cùng loại).
- Đánh nhiều hiệp tới khi một bên gục (tối đa 10 hiệp, hòa = thua cược). Quân người chơi đánh trước mỗi hiệp (FE3 quyết định đòn đầu theo AS — đơn giản hóa, ghi nhận tại đây). Thắng: nhận lại cược + lãi bằng cược (tổng 2× cược) và EXP chiến đấu như thường. Thua: mất cược, quân **không chết**, còn 1 HP (luật hiện đại theo PLAN 93; FE3 gốc là chết thật, có nút Yield để bỏ cược cứu quân).
- Độ bền vũ khí (mục 84) và WEx (mục 90) áp dụng trong đấu trường. Đánh xong được đánh tiếp (cược mới, đối thủ mới) hoặc rời đấu trường; rời kết thúc hành động của quân.

### Viện binh — Reinforcements (B04, PLAN mục 94, chốt 2026-11-19)

- Dữ liệu chương khai báo `reinforcements`: mỗi nhóm có `id`, `turn` (lượt xuất hiện) và danh sách quân (cùng định dạng quân chương). Hiện đặt ở chương test: nhóm `test_reinforcements` lượt 2, một Galder Pirate ở (7,1) [Giả định — chương 1–4 theo FE3 chưa đặt viện binh].
- **Báo trước**: đầu pha người chơi của lượt xuất hiện, game hiện thông báo + dòng nhật ký "Enemy reinforcements will arrive at the end of this turn!".
- **Xuất hiện cuối pha địch** của lượt đó (chốt của chủ dự án), không hành động trong lượt xuất hiện (đánh dấu đã hành động; lượt địch kế tiếp mới di chuyển). Quân viện binh hiện tông tím (mục 79, cờ `isReinforcement`).
- Ô xuất hiện bị chiếm thì quân dời tới ô trống gần nhất trong bán kính 2; không có ô trống thì quân đó không xuất hiện. Nhóm đã xuất hiện được ghi vào save (`spawnedReinforcements`) để nạp lại không xuất hiện lần hai.

### Thăng cấp không cần đồ (PLAN mục 95, chốt A10 2026-11-19)

- Quân cấp ≥10 được người chơi chọn thăng cấp ngay trong menu hành động (lệnh Promote theo cây thăng cấp nhánh N03), **không cần Master Seal** hay vật phẩm nào. Thăng cấp reset cấp về 1, EXP về 0 và cộng chênh lệch chỉ số gốc của lớp mới (luật FE11 sẵn có trong `promoteUnit`). Vật phẩm `master_seal` vẫn còn trong dữ liệu nhưng không còn dùng để thăng cấp và không bán ở tiệm.

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

## Đợt A cơ chế đã chốt (2026-11-19, PLAN mục 101/103/104/105)

- **C12 Phá vật che chắn (mục 101) — ĐÃ GỠ BỎ** theo lệnh chủ dự án 2026-11-19 ("bỏ. không có cơ chế này"; PLAN mục 143): chủ không nhớ đã duyệt C12, chi tiết "ô nào phá được" chưa từng được chốt. Toàn bộ code (`src/core/chapter/objects.ts`), cờ `destructible`/`maxHp` trên `wall`, trường save `objectStates` và test liên quan đã xóa; tường là ô không đi qua được như thường. Save cũ còn trường `objectStates` vẫn nạp được (trường bị bỏ qua khi nạp).
- **V05 Đánh kẹp (mục 103):** khi quân ta đánh địch mà có quân ta khác đứng kề phía đối diện của địch (so với quân đánh) thì quân đánh được **+15 Hit, +10 Crit** [Giả định]. Áp dụng cả hai phía giao tranh theo đồng minh của từng phía.
- **V07 Lợi thế cao độ (mục 104):** cao độ ô lấy từ `elevations` của bản đồ; chênh cao độ cho **±10 Hit mỗi bậc, tối đa ±20** [Giả định] (cao hơn đánh trúng hơn, thấp hơn bị trừ tương ứng).
- **V08 Bẫy (mục 105) — ĐÃ GỠ BỎ** theo lệnh chủ dự án 2026-11-19 ("làm gì có bẫy. Bỏ"; PLAN mục 149). Cơ chế từng được làm ở mục 105 rồi gỡ hết: `src/core/chapter/traps.ts`, đường nối trong `chapterData`/`saveLoad`/`App`, trường `traps` của chương và `trapMinHp` trong `balance.json` đã xóa; save cũ còn trường `triggeredTraps` vẫn nạp được (trường bị bỏ qua khi nạp). Game không có bẫy.

## Đợt B cơ chế đã chốt (2026-11-19, PLAN mục 102/110/111)

- **V04 Canto (mục 102):** quân cưỡi/bay sau khi hành động (đánh/trượng/đồ/mở rương-cửa/cửa hàng/đấu trường) được đi tiếp số ô di chuyển còn dư lúc tới ô hành động; tổng không vượt MOV. Chỉ quân người chơi [Giả định], AI địch không dùng Canto. Lệnh Wait thuần không kích hoạt Canto.
- **B10 Vai trò AI (mục 110):** thêm `patrol` (đi tuần theo `patrolPoints`, vẫn đánh khi có quân trong tầm), `retreat` (dưới 50% HP thì rút xa quân ta [Giả định], còn lại như pursue), `thief` (tới rương/làng chưa mở để cướp; hết mục tiêu thì bỏ chạy), `flee` (luôn chạy xa quân ta, không đánh). Ô rút lui chọn theo khoảng cách xa nhất + thưởng né địa hình.
- **B11 Boss nhiều pha (mục 111):** chương khai báo `bossPhases` cho boss (ngưỡng HP% → cộng chỉ số/đổi vũ khí/đổi vai trò AI). Mỗi pha áp dụng 1 lần khi HP xuống ngưỡng, ghi nhật ký; tiến độ pha (`bossPhase`) lưu cùng quân trong save.

## Đợt F cơ chế Book 2 (2026-11-19, PLAN mục 120–124)

- **A12 Ngọc Sáng/Tối (mục 120):** `lightsphere`/`darksphere` là vật phẩm mang theo (không bán ở cửa hàng, không cộng chỉ số — đúng quyết định chủ: bỏ chức năng tăng chỉ số). Quân cầm Ngọc Tối không nhận sát thương, trừ khi quân đánh cầm Ngọc Sáng.
- **A13 Manakete (mục 121):** class `manakete` + nhân vật Tiki (chương test). Lệnh Transform: không cần đá (quyết định chủ A13), biến hình 5 lượt (+1 nếu Luck ≥ 15 [Giả định]), +5 Str/Def/Res, +3 Spd [Giả định], dùng vũ khí Dragon Breath (phép 1–2 ô); hết hạn nghỉ 2 lượt mới biến hình lại.
- **A14 Ballista (mục 122):** ô địa hình `ballista`; quân cung (archer/sniper/hunter/mangudai) đứng trên đó bắn tầm 3–10, +6 Might [Giả định]. Địch dùng được như quân ta.
- **A15 Triangle Attack (mục 123):** 3 quân bay đồng minh kề quanh 1 địch thì đòn của quân bay tấn công chắc chắn chí mạng (Crit 100%).
- **Kị binh trong thành (mục 188, 190):** không ép xuống ngựa khi vào thành; địa hình sàn/ngai/điện thờ/trụ cột tốn 2–3 MOV/ô đối với kị binh (ngang bằng hoặc chậm hơn bộ binh) — con số 2–3 MOV mỗi ô trong thành là tham số do chủ dự án đặt, không gán cho bản Fire Emblem nào làm nguồn.
- **A16 Dancer + Xane (mục 124):** Dancer (Feena) có lệnh Dance: quân đồng minh kề bên đã hành động được hành động lại. Xane (class `chameleon`) có lệnh Imitate: sao chép chỉ số + vũ khí của đồng minh kề bên trong 5 lượt [Giả định], hết hạn trở lại như cũ.
