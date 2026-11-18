# Nguồn Asset và Quy trình Trích xuất 3D (Asset Sources & Extraction Pipeline)

Tài liệu này lưu trữ vị trí kho tài nguyên gốc bên ngoài và quy định quy trình để AI tự động trích xuất asset phục vụ lập trình cho dự án **Water Emblem - Mystery of Nothing**.

---

## 1. Vị trí kho tài nguyên gốc (Source Repository)

Toàn bộ asset gốc đã kiểm tra bản quyền (CC0 / Free) được lưu trữ tại:
* **Đường dẫn tuyệt đối:** `D:\OneDrive\AI Relax\projects\Asset`
* **Trạng thái lưu trữ:** Tất cả các gói nằm dưới dạng file nén `.zip` nguyên bản.

Kho hình ảnh gốc FE3 (bản đồ chương, World Map, sprite, chân dung, artwork) nằm ở `Original/` tại gốc repo (`D:\OneDrive\AI Relax\projects\FE_to_web\Original`), được gitignore và không nằm trong `Water-Emblem/`. Ảnh bản đồ chương FE3: `Original/01_Maps/Book_1/Cm_fe03_b1_<chương>.png`. Game không nạp file từ kho này lúc chạy; file nào game dùng thì copy đơn lẻ vào `Water-Emblem/public/` (ví dụ World Map: `public/maps/world_map_archanea_4x.png`, giống hệt `Original/01_Maps/Upscaled_PixelSharp/4x/World_Maps/FEMN_Archanea_In-Game_4x.png`, kiểm bằng md5 ngày 2026-11-17).

---

## 2. Quy tắc thao tác bắt buộc cho AI (Critical Rules)

1. **CHỈ COPY (Trích xuất lẻ) – TUYỆT ĐỐI KHÔNG MOVE:**
   * Không bao giờ di chuyển hoặc xóa các file `.zip` gốc trong `D:\OneDrive\AI Relax\projects\Asset`.
   * **Không giải nén toàn bộ gói:** Chỉ trích xuất đơn lẻ đúng file model/texture cần dùng cho nhân vật hoặc tính năng đang code.
2. **Thư mục đích trong mã nguồn (Destination Directory):**
   * Mọi model 3D đưa vào game phải đặt trong: `Water-Emblem/public/models/<chuyên_mục>/`
     * `Water-Emblem/public/models/characters/` (Nhân vật)
     * `Water-Emblem/public/models/nature/` (Cây cối, đá, cảnh quan)
     * `Water-Emblem/public/models/buildings/` (Công trình, nhà cửa, lâu đài)
     * `Water-Emblem/public/models/weapons/` (Vũ khí, khiên)
     * `Water-Emblem/public/models/monsters/` (Quái vật, sinh vật)
3. **Quy chuẩn hiển thị Three.js (Rendering Standard):**
   * **Phong cách:** Faceted Low-Poly / Flat-Shaded.
   * Tất cả vật liệu nạp vào scene phải bật `flatShading: true` (hoặc tính lại flat normals) trên `MeshStandardMaterial` / `MeshLambertMaterial` để đảm bảo diện vát phản xạ ánh sáng góc cạnh đồng bộ với phong cách mỹ thuật.

---

## 3. Bảng Ánh xạ Tài nguyên (Asset Mapping Table)

### A. Nhân vật & Hoạt ảnh (Characters & Animations)
* **Gói nguồn:** `D:\OneDrive\AI Relax\projects\Asset\KayKit\characters\KayKit_Adventurers_2.0.zip`
* **Định dạng:** `.glb` (kèm animation đầy đủ).

| Nhân vật / Vai trò trong FE3 | Đường dẫn tương đối bên trong file ZIP | File đích trong game |
|---|---|---|
| **Marth / Jagen / Cavalier (Hiệp sĩ)** | `KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb` | `public/models/characters/knight.glb` |
| **Gordin / Castor / Archer (Cung thủ)** | `KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb` | `public/models/characters/ranger.glb` |
| **Merric / Wendell / Priest (Pháp sư/Trượng)** | `KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb` | `public/models/characters/mage.glb` |
| **Barst / Bord / Cord / Chiến binh búa** | `KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb` | `public/models/characters/barbarian.glb` |
| **Ogma / Navarre / Đạo tặc / Boss cướp** | `KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb` | `public/models/characters/rogue.glb` |
| **Bộ hoạt cảnh cơ bản (Đi lại, Đứng)** | `KayKit_Adventurers_2.0_FREE/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb` | `public/models/characters/anim_movement.glb` |
| **Bộ hoạt cảnh chiến đấu (Chém, Đỡ, Chết)** | `KayKit_Adventurers_2.0_FREE/Animations/gltf/Rig_Medium/Rig_Medium_General.glb` | `public/models/characters/anim_combat.glb` |

### B. Cây cối, Núi đá & Cảnh quan (Nature & Terrain)
* **Gói nguồn:** `D:\OneDrive\AI Relax\projects\Asset\Quaternius\terrain\Quaternius_Ultimate_Nature_Pack.zip`
* **Định dạng:** `.obj` / `.fbx` (chuẩn 100% Faceted Low-Poly).

| Địa hình trong game | Khối mô hình bên trong file ZIP | File đích trong game |
|---|---|---|
| **Rừng rậm (Forest tile)** | `OBJ/PineTree_1.obj` và `OBJ/PineTree_1.mtl` | `public/models/nature/PineTree_1.obj` và `.mtl` |
| **Núi & Cao độ (Mountain / Peak tile)** | `OBJ/Rock_1.obj` và `OBJ/Rock_1.mtl` | `public/models/nature/Rock_1.obj` và `.mtl` |
| **Cảnh hoang mạc / Mùa thu / Tuyết** | `Cactus_*.obj`, `Tree_Birch_*.obj`, `Tree_Snow_*.obj` | `public/models/nature/...` |

### C. Nhà cửa & Công trình kiến trúc (Buildings)
* **Gói nguồn:** `D:\OneDrive\AI Relax\projects\Asset\KayKit\buildings\KayKit_Medieval_Buildings.zip`
* **Định dạng:** `.gltf` / `.bin`.

| Địa hình / Điểm chiến lược | Đường dẫn tương đối bên trong file ZIP | File đích trong game |
|---|---|---|
| **Lâu đài / Cổng thành (Gate / Throne)** | `.../Assets/gltf/buildings/blue/building_castle_blue.gltf` | `public/models/buildings/castle.gltf` |
| **Pháo đài (Fort tile)** | `.../Assets/gltf/buildings/blue/building_barracks_blue.gltf` | `public/models/buildings/fort.gltf` |
| **Tháp canh (Watchtower)** | `.../Assets/gltf/buildings/blue/building_tower_blue.gltf` | `public/models/buildings/tower.gltf` |
| **Làng mạc (Village tile)** | `.../Assets/gltf/buildings/blue/building_home_A_blue.gltf` | `public/models/buildings/village_home.gltf` |

### D. Vũ khí & Khiên (Weapons & Shields)
* **Gói nguồn 1:** `D:\OneDrive\AI Relax\projects\Asset\Quaternius\weapons\Medieval_Weapons_Pack.zip` (Faceted)
* **Gói nguồn 2:** `D:\OneDrive\AI Relax\projects\Asset\KayKit\weapons\KayKit_Fantasy_Weapons_Bits.zip` (GLTF)

| Loại vũ khí | Tên mô hình tương ứng | Gói nguồn |
|---|---|---|
| **Kiếm (Iron Sword, Silver Sword)** | `Sword_*.obj` / `sword_1handed.gltf` | Quaternius / KayKit |
| **Khiên pha lê / Khiên sắt** | `Shield_*.obj` / `shield_badge.gltf` | Quaternius / KayKit |
| **Cung tên (Iron Bow, Bowgun)** | `Bow_*.obj` / `bow.gltf` | Quaternius / KayKit |
| **Rìu chiến (Iron Axe, Hand Axe)** | `Axe_*.obj` / `axe_1handed.gltf` | Quaternius / KayKit |
| **Trượng phép (Heal, Mend, Warp)** | `staff.gltf`, `wand.gltf` | KayKit |

### E. Quái vật & Động vật (Monsters & Animals)
* **Gói nguồn:** `D:\OneDrive\AI Relax\projects\Asset\Quaternius\monsters\Monster_Pack_Animated.zip` & `Quaternius\animals\`
* **Mô hình sẵn có:** Rồng (`Dragon`), Xương (`Skeleton`), Dơi (`Bat`), Slime, Ngựa chiến (`Horse`).

### F. Biểu tượng Vật phẩm & Vũ khí 2D (Item & Weapon Icons)
* **Thư mục nguồn gốc:** `Original/08_Items_and_Weapons/` (16×16 PNG sprites FE3 gốc).
* **Thư mục đích trong game:** `Water-Emblem/public/icons/items/`
* **Quy ước:** Giữ tên file `Is_fe03_<item_name>.png`, hiển thị pixelated trên bảng thông tin nhân vật FE3 (`UnitInspectorWindow`) và khung hover (`UnitHoverWindow`). Mapping qua `src/ui/itemIcon.ts`.

---

## 4. Lệnh PowerShell mẫu cho AI khi trích xuất đơn lẻ

Khi cần lấy bất kỳ model đơn lẻ nào từ file zip, AI chạy lệnh PowerShell sau:

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = "D:\OneDrive\AI Relax\projects\Asset\KayKit\characters\KayKit_Adventurers_2.0.zip"
$destDir = "d:\OneDrive\AI Relax\projects\FE_to_web\Water-Emblem\public\models\characters"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force }

$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$entry = $zip.Entries | Where-Object { $_.FullName -like "*Characters/gltf/Knight.glb" }
[System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $destDir "knight.glb"), $true)
$zip.Dispose()
```
*(Ghi đè `$true` nếu đã tồn tại, tuyệt đối không chỉnh sửa hay giải nén file `.zip` gốc).*
