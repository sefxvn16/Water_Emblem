# Luật trận đánh và công thức

File này sở hữu quy tắc lượt, di chuyển, địa hình, chiến đấu, AI và công thức. Trạng thái cơ chế lấy từ `decisions.md`. Các con số dưới mục “Đề xuất cũ” được giữ để đối chiếu khi chốt, **chưa phải giá trị được phép code**.

## Lượt và hành động

Nền FE3 dùng lượt theo phe. Đề án cũ mô tả pha người chơi, địch và đồng minh; thứ tự pha, hành động của đơn vị trung lập và thời điểm kiểm thắng/thua cần xác nhận theo dữ liệu chương. Đơn vị có thể chọn ô di chuyển, hành động và kết thúc lượt; việc chọn rồi hủy chưa được coi là hành động tiêu hao nếu chưa xác nhận. Cần đặc tả riêng các thời điểm phát sinh hiệu ứng đầu/cuối lượt trước khi code.

Di chuyển dùng lưới ô vuông với chi phí địa hình, ô bị chiếm và loại di chuyển của class. Canto (V04) cho phép di chuyển sau hành động; độ dài quãng còn lại, hành động nào cho phép Canto và việc đi qua bẫy sau Canto **chờ chốt**. Đề án cũ gợi ý dùng phần MOV chưa tiêu, nhưng đó chưa là quy tắc được duyệt.

## Vị trí, địa hình và thông tin

- V05: đánh kẹp khi hai đồng minh đặt hai phía của mục tiêu. Chờ chốt cách xác định “hai phía” trên lưới, ai được bồi đòn, sát thương và giới hạn mỗi giao tranh. Đây không phải Chain Attack tự động của Battle Style Backup.
- V07: cao độ ảnh hưởng chiến đấu. Bản 3D cũ dự kiến các mức 0–2, nhưng lợi thế tầm bắn, hit, damage và khả năng đi lên/xuống **chưa chốt**. Cao độ trang trí không tự phát sinh bonus gameplay.
- V08: bẫy và chặn lối. Chờ chốt loại bẫy, cách đặt/nhìn thấy/kích hoạt, thời gian tồn tại và AI có được biết bẫy hay không.
- C12: vật che chắn có thể bị phá. Chờ chốt ô nào là cover, độ bền, ảnh hưởng đến line of sight/hit và hậu quả khi bị phá. Bố cục bản đồ FE3 gốc không tự có dữ liệu cover có thể phá.
- B01: vùng nguy hiểm là hợp tầm địch có thể đánh ở trạng thái hiện tại, dùng cùng luật di chuyển/tầm đánh thực; UI chỉ đọc kết quả này. Cần quy định cách biểu diễn khi còn Fog of War nếu sau này được chọn.

## Giao tranh và hỗ trợ

Quy trình thiết kế: chọn vũ khí hoặc trượng, tính tầm và hợp lệ, xem dự báo, xác nhận, giải quyết thứ tự đòn và hiệu ứng, cập nhật state, kiểm điều kiện chương. Dự báo Q05 phải dùng cùng hàm tính với giao tranh; không tạo công thức riêng trong UI.

- C01: Sword > Axe > Lance > Sword. Đề án cũ còn ghi Arts > Bow/Tome/Dagger, +15 Hit, +1 Damage và Break; chủ dự án chỉ chọn **tam giác vũ khí**, nên các phần thêm đó chưa được chốt.
- C03: vũ khí khắc class như cung với đơn vị bay hoặc vũ khí chuyên dụng với giáp/kỵ binh. Danh sách cặp khắc, hệ số và thứ tự nhân hệ số **chờ chốt**.
- C10: trượng có tác dụng hỗ trợ ngoài hồi HP. Cần chốt tập hiệu ứng, tầm, số lần dùng, đối tượng hợp lệ, độ chính xác và thời điểm tác dụng. Đề án cũ chưa mô tả đủ.
- V05, V07, V08, C12 có thể thay dự báo và kết quả. Thứ tự ưu tiên giữa đòn chính, đánh kẹp, bẫy, cover và hiệu ứng trượng **chờ chốt**; không tự suy diễn từ FE hoặc Triangle Strategy.

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

Đề án cũ nêu Hybrid RN: Hit hiển thị đến 50% dùng 1RN, trên 50% dùng đường cong ưu ái người đánh; tài liệu khác đưa ra cách tính khác nhau. Chế độ tăng trưởng cũ gợi ý random có anti-screwage ở Normal/Hard và fixed ở Maddening, với growth cá nhân cộng growth class. Cách tính RNG, anti-screwage, tích lũy điểm ẩn, seed và thời điểm tăng level đều **chờ chốt**. Việc chọn Q04 (độ khó) không đồng nghĩa duyệt mô hình tăng trưởng này.

## AI và minh bạch ý định

B10 cho địch nhiều vai trò: canh giữ, truy đuổi, tuần tra, rút lui, cướp đồ hoặc bỏ chạy. Đây là danh sách gợi ý từ báo cáo; vai trò nào có ở chương nào do `campaign.md` quyết định. Đề án cũ mô tả pipeline trạng thái → quét tầm → chấm mục tiêu → chọn ô đứng → hành động. Các tiêu chí gợi ý là khả năng kết liễu, sát thương dự kiến, an toàn, khắc vũ khí và vị trí; trọng số chưa chốt.

B02 cho người chơi thấy mục tiêu địch đang dự kiến tấn công; B03 báo trước đòn hoặc vùng tác động. Cần phân biệt dự đoán có thể đổi (B02) với hành động đã khóa (B03), thời điểm cập nhật và trường hợp người chơi thay đổi vị trí. AI không được đọc thông tin Fog of War bị che và không được biết trước kết quả RNG. B04 về viện binh và B05–B06 về điều kiện chương thuộc `campaign.md`; `art_ui.md` quy định cách hiển thị B01–B03.

Nguồn tham khảo: `../reports/bao_cao_nghien_cuu_co_che_tactical_rpg.md`. Báo cáo giải thích lựa chọn từ nhiều game; mọi con số và nhận định chưa được xác minh độc lập vẫn giữ nhãn Chờ chốt.
