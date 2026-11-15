# Quyết định và vấn đề còn mở

Cập nhật: 2026-11-13. Nguồn lựa chọn: chủ dự án chọn trực tiếp trong cuộc trao đổi về danh mục cơ chế. **Đã chọn** nghĩa là đưa cơ chế vào thiết kế để đặc tả; các giá trị số và cách kết hợp vẫn cần chốt trước khi code.

## Quy tắc nguồn đã chốt ngày 2026-11-14

Chỉ giữ hình ảnh, bản đồ và nhân vật của FE3; mạch chương FE3 tiếp tục theo yêu cầu tái hiện cốt truyện. Cơ chế, công thức, chỉ số và growth lấy từ các phiên bản Fire Emblem đời mới hơn được đánh giá tốt, miễn phù hợp với các tính năng chủ dự án đã chọn. Ưu tiên nguồn có mã hoặc bảng tính kiểm được; phần bản FE được chọn không có thì đối chiếu bản FE khác. Không tự đoán con số và không nhập một cơ chế chưa được chọn. Bản đối chiếu [FE3/FE8/FE11/FE12](../reports/Chi%20so%20va%20class%20Fire%20Emblem.md) đưa ra phương án C; các phần chủ dự án không sửa ngày 2026-11-14 được **tạm chốt** theo phương án đó, không ghi như đã kiểm chứng trong game.

## Tạm chốt về chỉ số và class ngày 2026-11-14

- Dùng `HP, Str, Mag, Skill, Spd, Luck, Def, Res` làm chỉ số gốc. `Atk, Hit, Avoid, Crit, AS` là chỉ số chiến đấu **phải tính và hiển thị**, không lưu như chỉ số gốc cố định. Key code/data hiện là `skill`; save v2 dùng `dex` được di trú khi tải. `MOV` theo class/trạng thái, weapon rank theo loại vũ khí, `Level` và `EXP` theo nhân vật.
- Dùng **toàn bộ chỉ số ban đầu FE11/FE12** cho nhân vật theo phần chiến dịch tương ứng; FE11 cho Book 1, FE12 cho Book 2 khi có dữ liệu kiểm được. Trần Str/Mag/Skill/Spd/Luck/Def/Res là 30, HP là 60; MOV, level và EXP có luật riêng. Dùng cách tăng trưởng hiện đại có mã nguồn đối chiếu. FE11 `Unit::LevelUp` dùng growth nhân vật + class, giới hạn theo cap và theo dõi sai lệch tăng trưởng; FE8 có hàm tính EXP sau giao tranh. Mã hiện có EXP/growth kiểu FE8 trên growth hiệu dụng FE11; số quân generic và Book 2 chưa kiểm đủ nguồn.
- Dùng hệ class và nhánh do chủ dự án nêu trong [characters.md](characters.md); phần class không được nêu giữ đề xuất có nguồn của báo cáo trước với nhãn tạm chốt. Thăng cấp có nhánh và reclass vẫn thuộc phạm vi đã chọn.
- Xuống ngựa là lựa chọn của người chơi, **không bắt buộc khi vào thành**. Chỉ kỵ binh mặt đất áp dụng, gồm Mangudai: khi xuống ngựa chuyển thành **Paladin đi bộ**, lưu class cưỡi ngựa để lên lại; Warlord xuống ngựa trở về Lord. Paladin cưỡi ngựa cũ bị bỏ. Pegasus/Dragon Knight và các class bay khác không theo cơ chế này.
- Chủ dự án đã giao chọn chi tiết còn thiếu theo FE hiện đại: tạm lấy [FE11](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_ds_21/Manual_NintendoDS_FireEmblemShadowDragon_EN.pdf) làm nền cho Master Seal ở cấp ≥10 và reclass tại Battle Preparation từ chương 4; cây promotion vẫn theo class Water Emblem đã chốt. Màn chuẩn bị đội chương 2 vẫn có theo yêu cầu cốt truyện nhưng chưa mở reclass. Trọng số chấm AI đang ở `data/balance.json` là cân bằng **tạm** của Water Emblem dựa trên tiêu chí chấm FE8, không nhận là hệ số FE8 gốc. Các quyết định này không biến tính năng chưa code thành hoàn thành.

## Cơ chế đã chọn

| Mã | Cơ chế | File sở hữu |
|---|---|---|
| C01, C03, C10 | Tam giác vũ khí; vũ khí khắc class; trượng hỗ trợ | `battle.md` |
| C12 | Phá vật che chắn | `battle.md` |
| V04, V05, V07, V08 | Canto; đánh kẹp; lợi thế cao độ; bẫy/chặn lối | `battle.md` |
| B01–B03 | Vùng nguy hiểm; đường mục tiêu địch; đòn báo trước | `battle.md`, hiển thị ở `art_ui.md` |
| B04–B06 | Viện binh báo trước; bảo vệ mục tiêu; thoát bản đồ | `campaign.md` |
| B09–B11 | Thu phục trong trận; vai trò AI; boss nhiều pha | `characters.md`, `battle.md`, `campaign.md` theo quy tắc chung/sự kiện |
| N01–N04 | Kỹ năng cá nhân; kỹ năng class; chuyển lớp phân nhánh; reclass | `characters.md` |
| N06, N10, N11 | Quan hệ hỗ trợ; vai trò phi sát thương; tuyển địch | `characters.md` |
| Q04–Q07 | Độ khó; dự báo; chuẩn bị trận; tua/bỏ hoạt cảnh | `campaign.md`, `art_ui.md` |
| Q10, Q12 | Bản đồ giải đố; bản đồ ngẫu nhiên | `campaign.md` |

Danh sách này có 30 mã. B09 là điều kiện thu phục trong trận; N11 là quy tắc đưa đơn vị thu phục vào đội. C01 **không bao gồm Break**. V05 là đòn phối hợp do đánh kẹp vị trí, **không tự thêm** Chain Attack hoặc Attack Stance. Q12 áp dụng cho mode riêng, không thay bản đồ FE3 của chiến dịch.

## Quyết định giao diện ngày 2026-11-13

Chủ dự án chọn giao diện tối giản theo hướng Bắc Âu, ưu tiên biểu tượng có popup giải thích khi di chuột hoặc chạm, thông tin và chữ dễ đọc. Camera xoay tự do. Quy tắc chi tiết nằm ở `art_ui.md`; đây là yêu cầu thiết kế, chưa phải bằng chứng đã triển khai.

Chủ dự án bổ sung minimap tròn ở góc trên trái theo khu vực ô chọn. Sau khi xem bản chạy, chủ dự án bỏ ba nấc zoom, chọn zoom liên tục bằng lăn chuột hoặc nút cộng/trừ dưới minimap, mặc định ở góc nhìn khu vực; mức thu nhỏ nhất vẫn phải để toàn bộ bản đồ vừa và chiếm phần lớn khung. Chi tiết thuộc `art_ui.md`.

## Quyết định về ngôn ngữ nội dung và giao diện ngày 2026-11-15

Ngôn ngữ mặc định của toàn bộ trò chơi là **tiếng Anh (English)**. Không tự dịch nội dung game, tên nhân vật, class, vũ khí, vật phẩm, kỹ năng, địa hình/vật thể, mục tiêu và lời thoại sang tiếng Việt khi chủ dự án không yêu cầu. Mọi nhãn hiển thị, văn bản giao diện và dữ liệu gameplay sử dụng tiếng Anh chuẩn theo các bản Fire Emblem tham chiếu (FE3 / FE11 / FE12).

## Ý tưởng có trong đề án cũ nhưng chưa được chọn

Break; Arts khắc Bow/Tome/Dagger; Battle Styles đầy đủ; Chain Attack tự động; Combat Arts; Gambits; Pair Up/Guard Stance; Rescue/Drop/Shove/Swap; rewind; Ironman/Classic/Casual; Fog of War; tương tác nguyên tố và phá/đốt/đóng băng diện rộng; tháp thử thách; randomizer; toàn bộ campaign 40+ chương; shop/forge và hub mở rộng. Những mục này không được triển khai chỉ vì từng xuất hiện trong báo cáo hoặc đề án. Một số có thể trở lại nếu chủ dự án chọn sau.

## Điểm còn cần chốt hoặc kiểm nguồn trước khi triển khai

| Vấn đề | Vì sao chưa chốt |
|---|---|
| C01, C03, Hit/Avoid/Crit | Phương án nền FE11/FE12 được **tạm chốt**; 17 vũ khí FE11 đã đồng bộ số và class đã có catalog; rank khởi đầu đã được kiểm khi nạp và combat, nhưng `galder_pirate` D là mức tối thiểu suy ra từ Hand Axe. Support FE11 dùng điểm/ngưỡng theo chương cho 11 quan hệ; bonus class FE11 đã áp dụng cho Sniper, Blade Dancer, Berserker và Marauder. Cần đối chiếu tiếp rank generic và quan hệ ngoài nhóm hiện có. |
| EXP, level-up và growth sau reclass | Chủ dự án yêu cầu thêm EXP và growth hiện đại. Đã có EXP, level, giới hạn 30/60 và 1RN theo FE8; đã nạp growth cá nhân cho 15 nhân vật và growth class cho 35 class có đối ứng FE11, tính lại tỷ lệ hiệu dụng khi đổi class; chưa có dynamic adjustment của FE11. Phần tung 1RN vẫn theo FE8, tạo cơ chế lai đã ghi nguồn. |
| RNG và support bổ sung | 2RN hiện được dùng nhất quán cả combat và điểm sát thương kỳ vọng AI; support dùng 11 quan hệ FE11 đã đối chiếu. Hybrid RN và anti-screwage chưa được đưa vào chỉ vì xuất hiện trong đề án. |
| V04, V05, V07, V08, C12 | Cần giới hạn Canto, vị trí kích hoạt đánh kẹp, cao độ, số loại bẫy và ô có thể phá; bản đồ FE3 gốc không tự có các dữ liệu này. |
| B02, B03, B10 | Cần quyết định địch công bố mục tiêu dự kiến hay hành động đã khóa, và lúc nào được đổi ý; AI không được dùng thông tin bị che. |
| B09, N11 | Cần xác định nhân vật nào có thể chiêu mộ, điều kiện, tỉ lệ và hậu quả với câu chuyện. |
| N03, N04 | Cây class và hướng FE11 cho Master Seal/reclass đã **tạm chốt**; item, kho đồ, UI promotion và growth cá nhân + class đã có và được kiểm một phần trên Chromium. Reclass và giới hạn số class chưa có; mapping của class Water Emblem vào các nhóm FE11 cần chốt khi triển khai. Chỉ đánh PASS sau khi kiểm đủ luồng. |
| Q04, Q10, Q12 | Cần số mức độ khó, quy tắc sinh map, điều kiện giải đố và cách lưu thành tích; chưa có phạm vi nội dung được duyệt. |
| Thiết bị mục tiêu, quy mô chương và quyền asset | Đã có số đo Chromium headless (xem `PLAN.md` mục 5), nhưng chưa có ngân sách và kiểm trên thiết bị mục tiêu; số chương và quyền tái sử dụng từng asset cũng chưa chốt. |

## Bản đồ chuyển nội dung từ đề án cũ

| Phần của đề án cũ | Nơi giữ nội dung còn phù hợp |
|---|---|
| Tầm nhìn và phạm vi | `overview.md`; cơ chế chưa chọn ghi ở file này |
| Kiến trúc và bảng công nghệ | `implementation_spec.md` |
| Chỉ số, công thức, RNG, tăng trưởng, tam giác, AI | `battle.md`; phần chưa chốt giữ rõ trạng thái |
| Class, kỹ năng, vật phẩm và phát triển nhân vật | `characters.md` |
| Chế độ chơi, chương, mục tiêu, viện binh | `campaign.md` |
| Art direction, camera, renderer, UI | `art_ui.md` |
| Audio và định dạng | `audio.md`, `implementation_spec.md` |
| Lộ trình, milestone, tiêu chí nghiệm thu | `PLAN.md`; không chuyển dấu `[x]` cũ |
| Cây thư mục dự kiến, rủi ro, nguồn dữ liệu/asset | `implementation_spec.md`, `overview.md` và bảng vấn đề còn mở ở trên |

Các báo cáo trong `reports/` còn nguyên để tra lại lập luận nghiên cứu. Bảng này ghi nơi chuyển nội dung, không khẳng định mọi ý tưởng cũ đã được phê duyệt.
