# Quy trình lập lưới tham chiếu FE3 và đối chiếu bản đồ game

Mục đích: lưới địa hình trong `data/maps/<map-id>.json` phải giống FE3 từng ô. Tham chiếu được lập **độc lập** với JSON game, lưu ở `data/reference/fe3/<map-id>.json`, rồi so tự động. Không bao giờ chép ngược từ JSON game sang tham chiếu.

Áp dụng cho mọi chương mới (Book 1 chương 4+, Book 2). Làm được bằng bất kỳ agent nào có trình duyệt chạy được JavaScript.

## Nguồn

| Nguồn | Dùng để | Ghi chú |
|---|---|---|
| Sơ đồ chirimenzeyo: `https://chirimenzeyo.ari-jigoku.com/fire_emblem/03_monsyou/MAP/map1_<NN>.png` (Book 1), trang danh sách `kouryaku_1_1.html` (ch1–10), `kouryaku_1_2.html` (ch11–20), `kouryaku_2_1.html`, `kouryaku_2_2.html` (Book 2) | Loại địa hình từng ô (màu theo chú giải dưới lưới), vị trí quân (chữ trong ô) | Lưới đúng bằng vùng chơi, không có viền |
| Ảnh FE3 gốc: `Original/01_Maps/Book_1/Cm_fe03_b1_<N>.png` (gốc repo, gitignore) | Kiểm chéo hình dạng: cổng, làng, núi, bờ biển | Ảnh có viền 1 ô 16px mỗi phía: ô chơi `(x,y)` nằm ở pixel `((x+1)*16, (y+1)*16)`. Ví dụ Ch1 512×240 = 32×15 ô = 30×13 + viền |

## Các bước

1. **Mở sơ đồ** của chương trên trình duyệt (mở thẳng URL ảnh `.png`).
2. **Đọc chú giải** dưới lưới (chụp màn hình). Ghi nghĩa từng ô màu. Chú ý màu đổi nghĩa theo chương: `cfbda5` là がれき (rubble) ở Ch1 nhưng là 橋 (bridge) ở Ch2; `00b0f0` là 川 (river). Màu mới chưa có trong `BASE_COLORS` thì thêm vào `CHAPTER_COLORS` theo đúng chú giải của ảnh đó.
3. **Chạy `extract_diagram.js`** trong console của trang ảnh đó. Script tự dò vạch lưới (các hàng/cột tối), lấy màu xuất hiện nhiều nhất trong mỗi ô (chữ ký hiệu quân chỉ là màu phụ, không ảnh hưởng) và trả `{ width, height, rows, unknown }`. `unknown` phải rỗng.
4. **Kiểm kích thước** `width × height` khớp với kích thước ảnh FE3 gốc trừ viền (`ảnh/16 − 2`).
5. **Ghi tham chiếu** `data/reference/fe3/<map-id>.json` theo mẫu file Ch1–3: `mapId`, `book`, `chapter`, `width`, `height`, `sources` (URL sơ đồ, ảnh gốc, ngày kiểm), `legend` (ký tự → terrain id) và `rows` (mỗi hàng một chuỗi ký tự). Ký tự dùng: `.` plains, `=` road, `F` forest, `m` mountain, `M` peak, `~` sea, `r` river, `b` bridge, `u` rubble, `W` wall, `C` castle, `G` gate, `T` fort, `H` house, `S` shop, `V` village. Loại địa hình mới: thêm ký tự mới và thêm terrain vào `data/terrains.json` nếu chưa có.
6. **Kiểm chéo bằng ảnh gốc**: đối chiếu ít nhất cổng thành, làng, tiệm, pháo đài và vùng núi với ảnh `Original/...`. Ô nào sơ đồ và ảnh gốc mâu thuẫn thì ghi vào `sources.uncertain` của file tham chiếu, không tự chọn.
7. **So với game**: từ `Water-Emblem/` chạy `node tools/fe3_map_reference/compare.mjs <map-id>`. Kết quả phải là `MATCH`. Ô lệch thì sửa `data/maps/<map-id>.json` theo tham chiếu, không sửa tham chiếu cho khớp game.
8. **Ghi bằng chứng** vào `PLAN.md`: lệnh đã chạy và dòng `MATCH`.

## Kết quả lần lập đầu (2026-11-17)

Chương 1–3 Book 1: lưới 30×13, 30×15, 30×20, khớp kích thước ảnh gốc. JSON game lệch 11 ô, cùng một lỗi: pháo đài (砦, chú giải "20% + hồi máu") bị ghi là `rock`; đã sửa thành `fort`. Sau khi sửa, `compare.mjs` báo `MATCH` cả ba chương.

## Giới hạn

- Sơ đồ là nguồn cộng đồng, chưa so ROM. Hình dạng đã kiểm chéo với ảnh FE3 gốc.
- Tham chiếu này chỉ cho địa hình. Vị trí quân, vật phẩm, sự kiện đối chiếu theo `PLAN.md` mục 53 (chữ ký hiệu quân trong sơ đồ là một nguồn, cần thêm nguồn thứ hai).
