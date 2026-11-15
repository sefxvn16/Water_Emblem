# Thư viện hình ảnh gốc Fire Emblem 3 (SNES / Super Famicom - Monshō no Nazo)

Thư mục này chứa toàn bộ hình ảnh tài nguyên nguyên bản của tựa game **Fire Emblem: Mystery of the Emblem (FE3 / Super Famicom)** được tải về và phân loại phục vụ việc làm reference cho đồ họa 3D low-poly và thiết kế map của dự án **Water Emblem**.

> **Lưu ý quan trọng**: Tuyệt đối không chứa bất kỳ hình ảnh nào của FE11 (Shadow Dragon DS) và FE12 (New Mystery of the Emblem DS). Toàn bộ 100% hình ảnh là từ phiên bản FE3 SNES gốc và sách hướng dẫn chính thức FE3 của Nhật Bản.

---

## Cấu trúc thư mục

### 1. `01_Maps/` (Toàn bộ bản đồ chương)
- **`Book_1/`**: Toàn bộ bản đồ từ Chương 1 đến Chương 20 của Book 1 (War of Darkness).
- **`Book_2/`**: Toàn bộ bản đồ từ Chương 1 đến Chương 22 và các màn Endgame (e1, e2-1, e2-2, e2-3) của Book 2 (War of Heroes).
- **`Castles_and_Palaces/`**: Bản đồ chi tiết lâu đài Altea Castle, Palace Castle, Archanea.
- **`World_Maps/`**: Bản đồ thế giới lục địa Akaneia (bản đồ họa cao từ Serenes Forest và bản in-game).
- **`Upscaled_PixelSharp/`**:
  - `2x/` và `4x/`: Các phiên bản phóng to độ nét cao sử dụng thuật toán **Nearest-Neighbor** (giữ nguyên pixel sắc nét 100%, không bị mờ nhòe chống răng cưa) để nhìn rõ từng ô lưới 16x16 pixel phục vụ dựng hình 3D.

### 2. `02_Buildings_and_Structures/` (Công trình kiến trúc)
Chứa các mẫu công trình được trích xuất trực tiếp từ các màn chơi FE3, có kèm bản phóng to **4x Sharp**:
- **`Castles_and_Citadels/`**: Lâu đài Talys, pháo đài hải tặc Galder, lâu đài Aurelis, hoàng cung Archanea Palace, ngai vàng Hoàng đế Hardin, v.v.
- **`Houses_and_Villages/`**: Nhà dân làng Talys, nhà cảng Galder, làng thảo nguyên Aurelis, phố xá thành thị Ch10 (cửa đóng, cửa mở, mái đỏ/mái xanh).
- **`Forts_and_Tents/`**: Pháo đài trên núi, đồn phòng thủ bờ biển, cụm lều trại du mục/quân địch thảo nguyên Aurelis.
- **`Arenas/`**: Đấu trường La Mã (Gladiator Arena) Ch10, Ch15, Book 2 Ch8.
- **`Walls_and_Gates/`**: Cổng thành, tường thành bằng đá, tháp canh, đoạn tường nứt có thể phá hủy (cracked wall).
- **`Temples_and_Altars/`**: Đền rồng băng (Ice Dragon Temple), điện thờ cổ Fane of Raman, Bàn thờ rồng (Dragon Altar).
- **`Chests_and_Doors/`**: Rương báu mở/đóng, cửa sắt, cửa gỗ phòng kho báu.

### 3. `03_Landscape_and_Terrain/` (Cảnh quan & Vật thể tự nhiên)
Có kèm bản phóng to **4x Sharp**:
- **`Bridges/`**: Cầu gỗ bắc qua sông, cầu gỗ trên biển, cầu vòm đá, cầu nối hào thành hoàng cung.
- **`Trees_and_Forests/`**: Cây đơn đồng bằng, rừng rậm rạp, cây cọ đảo biển, rừng thông tuyết.
- **`Mountains_and_Peaks/`**: Núi đá nâu, đỉnh núi cao hiểm trở, dãy núi phủ tuyết, rặng núi miệng núi lửa.
- **`Water_Rivers_and_Sea/`**: Bờ biển cát, lòng sông & cửa sông, nước biển sâu, hào nước bao quanh thành.
- **`Desert_Lava_and_Swamp/`**: Đồi cát sa mạc & ốc đảo Con đường Anri (Anri's Way), dòng dung nham núi lửa lửa Ch12.

### 4. `04_Battle_Backgrounds/` (Bối cảnh màn hình chiến đấu)
- Bối cảnh giao chiến bên trong các lâu đài, pháo đài: Altea, Arverne, Aurelis, Dolhr, Dragon Altar, Fane of Raman, Gra Bastion, Ice Dragon Temple, Khadein, Archanea Palace, Temple of Thabes.
- Bối cảnh sàn đá (Floor), cột trụ (Pillar), ngai vàng (Throne), đấu trường (Arena).
- Giao diện UI in-game, bảng dự báo sát thương, hòm đồ, màn hình chọn chương.

### 5. `05_Map_Animations_Sprites/` (Sprite quân lính trên ô cờ bản đồ)
- 74 ảnh gif/png hoạt ảnh di chuyển và đứng yên của tất cả các class trên bản đồ (Phe người chơi & phe địch: Lord, Cavalier, Knight, Archer, Mage, Mercenary, Pegasus Knight, Dragon, Thief, v.v.).

### 6. `06_Battle_Sprites/` (Sprite chiến đấu cận cảnh)
- 100 sprite đòn đánh chiến đấu của các nhân vật và chức nghiệp khi tấn công với từng loại vũ khí (kiếm, giáo, rìu, cung, phép, gậy, rồng hóa).
- Thư mục `Unused/` chứa các battle sprite ẩn chưa qua sử dụng trong ROM gốc.

### 7. `07_Cutscenes_and_CG/` (Cắt cảnh & Tranh minh họa cốt truyện)
- 45 tranh CG cắt cảnh intro, đầu chương, dẫn truyện, chọn Book, kết thúc Book 1 và Book 2.

### 8. `08_Items_and_Weapons/` (Biểu tượng vật phẩm & vũ khí)
- 126 icon 16x16 pixel của toàn bộ vũ khí, gậy phép, ngọc phong ấn (Fire Emblem / Binding Shield), các mảnh ngọc 12 chòm sao (Star Shards), khiên rồng, nhẫn thăng cấp.

### 9. `09_Character_Portraits/` (Chân dung nhân vật)
- 145 ảnh chân dung nhân vật FE3 (bao gồm toàn bộ tướng quân đồng minh, tướng địch, trùm, vua chúa và các chân dung NPC thường dân/lính).

### 10. `10_Official_Artwork_and_Concept/` (Tranh vẽ chính thức & Concept Art)
- **`APE_Guide_Artwork/`**: Tranh minh họa thiết kế nhân vật, vũ khí, trang bị, vật phẩm từ sách hướng dẫn chính thức *APE Fire Emblem: Monshou no Nazo*.
- **`25th_Anniversary_Artwork/`**: Bản thảo kỷ niệm 25 năm từ đội ngũ phát triển gốc.
- **`Characters_and_Classes/`**: Tranh vẽ phác thảo toàn thân các nhân vật FE3.
- **`Kingdoms_and_Locations/`**: Tranh minh họa các vương quốc (Archanea, Altea, Macedon, Grust, Gra, Khadein, Dolhr, Aurelis, Talys).
- **`Factions_and_Emblems/`**: Quốc huy, biểu tượng cờ hiệu các phe phái.
- **`Items_and_Equipment_Art/`**: Tranh vẽ chi tiết các món trang bị truyền thuyết (Falchion, Gradivus, Mercurius, Parthia, Khiên phong ấn).
