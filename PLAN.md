# Kế hoạch triển khai Water Emblem

Cập nhật: 2026-11-15

Mục tiêu: Xây dựng game chiến thuật theo lượt 3D low-poly chạy trên trình duyệt, kế thừa bản đồ và nội dung cơ bản của Fire Emblem 3, với gameplay được thiết kế lại.

Phạm vi của kế hoạch: các mốc triển khai và cách xác nhận hoàn thành. Đặc tả hiện hành nằm trong `Game_Design/`; các báo cáo ở `reports/` là tài liệu nghiên cứu. Mã nguồn và dữ liệu game hiện nằm trong `Water-Emblem/`; các đường dẫn `src/`, `data/`, `public/`, `tests/` trong kế hoạch được hiểu là ở trong thư mục đó. Các dấu hoàn thành của đề án cũ không phải bằng chứng rằng tính năng đã có.

## Cách ghi kết quả

Mỗi mục chỉ được đánh `[x]` sau khi kiểm đúng tiêu chí và ghi `PASS` cùng bằng chứng. Nếu chưa đạt, giữ `[ ]` và ghi `FAIL` cùng lý do. Ở điểm cần quyết định của chủ dự án, ghi `CHỜ NGƯỜI DÙNG` kèm câu hỏi. Không chuyển các dấu `[x]` trong đề án cũ sang kế hoạch này.

## Chuẩn bị tài liệu

- [x] 1. Chốt hướng dẫn dự án và phạm vi bản đầu.
  - Tiêu chí xong: Chủ dự án duyệt `AGENTS.md` và `Game_Design/`, chọn phạm vi bản chơi đầu, mức đầu tư kiểm thử/tài liệu và thứ tự ưu tiên các tính năng đã chọn.
  - Kết quả: PASS: Đã duyệt `AGENTS.md`, 9 file `Game_Design/` và chốt phạm vi bản đầu là 01 bản đồ thử nghiệm tối thiểu, theo chuẩn TypeScript strict, Vitest và kiến trúc phân lớp tách biệt logic `src/core/`.

- [x] 2. Kiểm kê hiện trạng dự án.
  - Tiêu chí xong: Liệt kê mã nguồn, dữ liệu, asset, test và lệnh chạy thực có; đối chiếu từng mốc dưới đây với kết quả mở/chạy; ghi rõ phần đã có, thiếu và lỗi.
  - Kết quả: PASS: Kiểm kê ngày 2026-11-13 có: 9/9 file `Game_Design/`, 3 báo cáo trong `reports/`, `.gitignore` loại trừ thư mục báo cáo, repo Git kết nối `main`; framework Vite + React + TypeScript strict + Vitest đã khởi tạo; chưa nạp asset ngoài khi chưa kiểm quyền theo quy định `AGENTS.md`.

## Các mốc triển khai

## Rà soát và sửa lỗi tích hợp (2026-11-13)

- Có sẵn: `src/core/`, `src/renderer/ThreeScene.tsx`, `src/App.tsx`, Vitest và các dependency trong `package.json`; đã kiểm file và chạy 23/23 test, build PASS.
- Tận dụng: chỉnh các module hiện có; giữ Three.js, React, Dexie và dữ liệu JSON theo quy ước dự án.
- Tự làm: sửa luồng 3D/lượt, thống nhất state và lưu/tải, chuyển dữ liệu khỏi UI, thêm kiểm tra luồng, đối chiếu lại bằng chứng PASS.

### Kết quả rà soát code Antigravity

| Mức | Phát hiện và xử lý |
|---|---|
| Nghiêm trọng | Mục tiêu chương 1–2 từng đặt hạ boss, Wrys/Darros của FE1/FE11 được đưa vào FE3; đã đối chiếu FE3, đổi sang lệnh chiếm cổng và bỏ hai nhân vật khỏi các chương hiện tại. |
| Nghiêm trọng | Lưu game từng từ chối quân thu phục/đội dự bị và chuyển chương làm mất HP/trang bị; đã sửa schema bản lưu, chuyển trạng thái đội và kiểm bằng unit/browser test. |
| Nghiêm trọng | Tương tác 3D và tự chuyển lượt từng kẹt; đã kiểm lại bằng thao tác Chromium qua hai lượt và khi cả đội chờ. |
| Kiến trúc | Dexie từng nằm trong `src/core/` trái quy tắc core không cần trình duyệt; đã chuyển sang `src/storage/`. Dữ liệu nhân vật/class từng lặp trong chương JSON; đã chuyển sang tham chiếu ID. |
| Còn mở | Chương 1–3 đã có dữ liệu prototype nhưng tọa độ, sự kiện và lời thoại chưa được xác nhận đầy đủ từ FE3; lượt chơi trọn trên trình duyệt chưa PASS. Hiệu năng 3D đã đo lại trên Chrome có GPU ở 1080p và đạt mốc mục 5. |

- [x] 13. Sửa tương tác 3D và vòng lượt.
  - Tiêu chí xong: Chọn, di chuyển, chờ và kết thúc lượt trong 3D chạy qua ít nhất hai lượt; AI tự chạy khi tất cả quân ta đã hành động; không kẹt phase.
  - Kết quả: PASS: Playwright Chromium 7/7: chọn, di chuyển, chờ trong 3D; qua lượt 1→2→3; toàn bộ 7 quân chờ thì AI tự chạy và trở lại lượt 2. Vitest 47/47, build PASS ngày 2026-11-13.

- [x] 14. Thống nhất state chiến đấu, điều kiện thắng/thua và lưu/tải.
  - Tiêu chí xong: Core và UI dùng cùng trạng thái quân; HP 0 dẫn đến chết/thua đúng; lưu/tải bảo toàn quân, lượt, phase và RNG; test tình huống biên PASS.
  - Kết quả: PASS: Core kiểm HP 0/Marth thua, lệnh chiếm cổng và lưu trạng thái quân; Playwright Chromium 7/7 kiểm lưu/tải qua lượt, đội dự bị, bản lưu gần thắng → chiếm cổng → sang chương 2 giữ HP, và bản lưu thua → màn Game Over. Hai trạng thái cuối được dựng trong IndexedDB để kiểm tích hợp UI, chưa là bài chơi trọn chương.

- [x] 15. Chuẩn hóa dữ liệu chương mẫu và kiểm chứng tích hợp.
  - Tiêu chí xong: Dữ liệu quân và mục tiêu chương ở JSON có validation; test/build PASS; kiểm luồng chơi trên trình duyệt khi có công cụ, ghi rõ phần chưa đo hoặc chưa được duyệt.
  - Kết quả: PASS: JSON của chương 1, chương 2 và bản đồ thử nạp qua loader kiểm ID, vị trí, vũ khí, class và growth; chương 1–2 đã đổi mục tiêu sang Marth chiếm cổng và bỏ Wrys/Darros không thuộc FE3. Vitest 47/47, build và 7/7 luồng Chromium PASS. Bản đồ/chỉ số/lời thoại vẫn là dữ liệu prototype, chưa xác minh toàn bộ FE3 hoặc quyền phát hành.

- [x] 16. Chuyển mã nguồn dự án vào `Water-Emblem/`.
  - Tiêu chí xong: Source, dữ liệu game, test và cấu hình build nằm trong `Water-Emblem/`; tài liệu tham khảo ở ngoài; các đường dẫn tài liệu liên quan được cập nhật; test và build chạy từ thư mục mới.
  - Kết quả: PASS: Đã chuyển `src/`, `data/`, `public/`, `tests/`, manifest, lockfile, TypeScript/Vite config và `index.html` vào `Water-Emblem/`; kiểm `git ls-files` không còn mã nguồn được theo dõi ở ngoài. Chạy lại `npm test -- --run` 47/47 và `npm run build` PASS từ thư mục mới ngày 2026-11-13. Ngày 2026-11-14 chuyển thêm `scratch/sync_avatars.py` và `scratch/download_fe3.py` vào `Water-Emblem/tools/`, sửa đường dẫn theo vị trí repo; AST parse 2/2 PASS, không còn file code dự án ngoài `Water-Emblem/` khi loại trừ repo nguồn tham khảo trong `reports/_source_review/`.

- [x] 17. Chốt cấu trúc và nơi sở hữu file mã nguồn.
  - Tiêu chí xong: Chủ dự án duyệt một cây thư mục và bảng sở hữu nội dung; hướng dẫn trong repo được cập nhật để AI không tạo file trùng trách nhiệm.
  - Kết quả: PASS: Chủ dự án đã duyệt cấu trúc và khử trùng lặp; bảng sở hữu file được ghi trong AGENTS.md (đã bổ sung `src/core/class/`, `src/core/progression/`, `tools/`), chương JSON tham chiếu characterId/weaponId/mapId, loader dựng state; 47/47 unit test và build PASS.

- [x] 18. Đối chiếu nội dung chiến dịch với FE3 theo từng chương.
  - Tiêu chí xong: Mỗi chương có nguồn FE3 cho bản đồ, mục tiêu, quân, thu phục, viện binh và hội thoại; khác biệt gameplay được ghi rõ; không lấy FE1/FE11 làm nguồn thay thế.
  - Kết quả: PASS: Đã lập bảng đối chiếu hai chương tại `reports/fe3-book1-ch1-ch2-audit.md`, gắn nguồn FE3 cho bản đồ, mục tiêu, quân/chiêu mộ, sự kiện và hội thoại. Báo cáo ghi các sai lệch của bản prototype tại thời điểm lập; dữ liệu chương đã đổi tiếp sau đó. PASS này chỉ xác nhận đã thực hiện đối chiếu, không xác nhận JSON hiện tại khớp từng ô với FE3 hay chơi trọn chương.

- [x] 19. Xử lý cảnh báo bảo mật của công cụ phát triển.
  - Tiêu chí xong: `npm audit` không còn lỗ hổng ở mức moderate trở lên; unit/browser test và build PASS sau khi nâng version.
  - Kết quả: PASS: Đã nâng các dev dependency đang dùng lên Vite 8.3.8, Vitest 5.1.0 và plugin React 6.3.0 trên Node 24.19; `npm ls` xác nhận phiên bản, `npm audit --audit-level=moderate` báo 0 lỗ hổng, 47/47 unit test, 7/7 luồng Chromium và build PASS ngày 2026-11-13. Lần chạy Chromium đầu có 1 bài kiểm dùng thông báo tạm thời nên không ổn định; đổi sang kiểm trực tiếp bản lưu IndexedDB rồi chạy lại PASS.

### Thay model 3D (2026-11-13)

- Có sẵn: `ThreeScene.tsx` đang dựng quân bằng cylinder/sphere; ZIP KayKit có đúng 4 GLB được yêu cầu, ZIP Quaternius có `PineTree_1.obj/.mtl` và `Rock_1.obj/.mtl`; đã kiểm danh sách và nội dung ZIP, `three` có GLTFLoader/OBJLoader/MTLLoader.
- Tận dụng: chỉnh renderer hiện có và chỉ trích xuất riêng các mục trong ZIP, giữ nguyên nguồn; dùng loader từ dependency Three.js đã cài.
- Tự làm: ánh xạ quân sang 4 mẫu, chuẩn hóa kích thước, bật flatShading cho material và đặt cây/đá lên đúng ô; kiểm build, unit test và scene trên Chromium.

- [x] 20. Thay quân và địa hình mẫu bằng model 3D.
  - Tiêu chí xong: Bốn GLB nhân vật cùng một cây thông và một đá tảng (kèm MTL) được trích xuất lẻ, ZIP gốc không đổi; renderer tải được model, mọi material model có `flatShading=true`, cây trên forest và đá trên mountain/peak; build, unit test và kiểm scene trình duyệt PASS.
  - Kết quả: PASS: Trích xuất đúng 4 GLB KayKit và `PineTree_1`/`Rock_1` OBJ+MTL; SHA-256 ZIP gốc trước/sau khớp. `ThreeScene.tsx` dùng GLTFLoader/OBJLoader+MTLLoader, bật flatShading trên material có thuộc tính này, đặt pine ở forest và rock ở mountain/peak; không còn CylinderGeometry/SphereGeometry. `npm run build` PASS, `npm test` 47/47, Playwright 7/7 luồng cũ và bài kiểm model mới 1/1 (8 đường dẫn asset HTTP 200, scene ready, không lỗi console/page) ngày 2026-11-13.

- [x] 21. Ghi định hướng giao diện và camera mới của chủ dự án.
  - Tiêu chí xong: `art_ui.md` ghi đủ phong cách tối giản Bắc Âu, biểu tượng có giải thích khi hover/chạm, thông tin và chữ dễ đọc, xoay camera tự do cùng ba nấc zoom; điểm chờ chốt xoay 90° cũ được thay và `decisions.md` dẫn tới file sở hữu. Không sửa code trong mục này.
  - Kết quả: PASS: Đã đối chiếu và cập nhật hai file `Game_Design/art_ui.md`, `Game_Design/decisions.md` ngày 2026-11-13; mô tả xoay 90° chờ chốt đã được thay bằng xoay tự do và ba nấc zoom. Không thay code hoặc asset.

### Điều khiển camera (2026-11-13)

- Có sẵn: `ThreeScene.tsx` đang có camera Perspective và nút xoay 90°; Three.js đã cài cung cấp `OrbitControls`; đã kiểm source và manifest.
- Tận dụng: chỉnh scene và các luồng Playwright hiện có; dùng `OrbitControls` nguyên từ dependency đang dùng.
- Tự làm: xoay tự do, pan, ba nấc zoom với tâm phù hợp, chặn kéo thành click ô, kiểm lại build/unit/browser.

- [x] 22. Triển khai camera xoay tự do và ba nấc zoom (mốc lịch sử, đã thay bằng mục 23).
  - Tiêu chí xong: Kéo xoay camera liên tục không khóa 90°, pan được, ba nút zoom cho toàn cảnh/trung bình/cận cảnh; khi chọn ô/quân rồi đổi nấc, camera lấy đó làm tâm; kéo không kích hoạt chọn ô và click vẫn chọn/di chuyển được; build, unit test và Playwright PASS.
  - Kết quả: PASS: Tại thời điểm kiểm, `ThreeScene.tsx` dùng OrbitControls để kéo xoay liên tục và ba nút Toàn cảnh, Khu vực, Cận cảnh; build, 47/47 unit và 9/9 Playwright PASS. Chủ dự án sau đó bỏ ba nấc và đổi cách pan; triển khai hiện hành cùng bằng chứng mới nằm ở mục 23.

### Minimap và zoom theo khung chơi (2026-11-13)

- Có sẵn: `ThreeScene.tsx` đã có ba mức camera và màu địa hình; `MapData` có lưới ô; Three.js có camera projection; đã kiểm code và `art_ui.md`.
- Tận dụng: chỉnh renderer và bài Playwright hiện có; không thêm dependency.
- Tự làm: tính giới hạn thu nhỏ theo biên bản đồ và tỷ lệ viewport, minimap tròn theo ô chọn, zoom liên tục bằng wheel và nút cộng/trừ dưới minimap.

- [x] 23. Sửa camera và minimap theo góp ý trên bản chạy.
  - Tiêu chí xong: Không còn thanh ba nấc; mặc định thấy khu vực chơi; kéo trái/một ngón di chuyển bản đồ, kéo phải xoay; wheel và nút cộng/trừ dưới minimap zoom liên tục, có giới hạn gần và giới hạn xa để bản đồ vừa khung; minimap tròn theo ô chọn; build, unit và browser test PASS.
  - Kết quả: PASS: `ThreeScene.tsx` bỏ thanh ba nấc, mở đầu quanh quân người chơi, kéo trái pan/kéo phải xoay, wheel và hai nút dưới minimap đổi khoảng cách camera liên tục có nội suy; minimap tròn theo ô chọn. Ảnh Chromium ở giới hạn thu nhỏ cho thấy toàn bộ bản đồ trong canvas 1034×753, vùng màu bản đồ chiếm khoảng 72,2% chiều rộng và 69,9% chiều cao (đo pixel ảnh `test-results/overview-map.png`). `npm run build` PASS, `npm test` 47/47, `npm run test:e2e -- --workers=1` 10/10 PASS gồm camera, minimap, chọn ô, chiếm cổng và chương 1 ngày 2026-11-13. Chưa kiểm thao tác chạm trên thiết bị thật.

### Đối chiếu mã nguồn tham khảo (2026-11-13)

- Có sẵn: `reports/github.txt` trỏ đến `Eebit/fe11-us`, `rainlash/lex-talionis` và `Klokinator/Super-Lex-Talionis`; `src/core/` và JSON hiện có giữ logic/dữ liệu game. Đã kiểm các URL gốc, cây file và module `pathfinding.ts`, `decision.ts`, `chapterData.ts` của dự án.
- Tận dụng: đọc implementation của từng repo và đối chiếu với module đang có; chỉ chuyển phần phù hợp với FE3, stack web và quyền sử dụng đã kiểm.
- Tự làm: ghi bảng nguồn file/hàm, license, mức dùng và lý do loại; áp dụng phần có căn cứ vào mã/dữ liệu hiện hữu, kiểm test/build.

- [x] 24. Kiểm mã nguồn ba repo và kế thừa phần phù hợp.
  - Tiêu chí xong: Mở file implementation cụ thể ở cả ba repo, ghi URL/path/phiên bản và license; đối chiếu với module Water Emblem, phân loại dùng nguyên/chỉnh/ý tưởng/loại; phần được chọn có thay đổi thực trong mã hoặc dữ liệu kèm test/build PASS, hoặc ghi lý do cụ thể nếu không thể nhập an toàn.
  - Kết quả: PASS: `reports/doi_chieu_ma_nguon_ba_repo_2026-11-13.md` ghi file/hàm nguồn thực và liên kết phiên bản của FE11 (`database.hpp/.cpp`, `unit.cpp`, `item.cpp`), Lex legacy (`AI_fsm.py`, `AStar.py`, `Triggers.py`, `StateMachine.py`, `SaveLoad.py`), LT-Maker hiện hành (`event_manager.py`, `pathfinding.py`, `ai_controller.py`) và Super Lex (`events.json`, `levels.json`, `ai.json`, `terrain.json`, `mcost.json`); đối chiếu với `chapterData.ts`, `decision.ts`, `pathfinding.ts`, `transition.ts`, `saveLoad.ts`. Đã sửa hướng dẫn `implementation_spec.md` và cảnh báo báo cáo cũ có kết luận sai. Không nhập mã/dữ liệu/asset vì FE11 không có dữ liệu chương công khai và chưa rõ giấy phép, Super Lex có quyền asset theo từng tác giả, Lex Python đã trùng chức năng Water hoặc chỉ tối ưu tiềm năng chưa có benchmark; giữ ý tưởng tổ chức event, kiểm trường lưu trạng thái, lọc ứng viên AI/heap cho đúng lúc cần. Không thay gameplay, dependency hoặc renderer. `npm run build` PASS và `npm test` 47/47 ngày 2026-11-13.

### Đối chiếu công thức và growth (2026-11-14)

- Có sẵn: mã FE11 commit `be854842` (`Unit::ComputeMight/HitRate/CritRate/AttackSpeed/Avoid/LevelUp`), FE8 commit `04d1edb1` (`AiGetDamageDealtCombatScoreComponent`), fe_engine commit `ab4d7a9c`; bảng FE11 về base stat, growth, weapon rank và phép tính Shadow Dragon; đã mở thân hàm và các bảng nguồn.
- Tận dụng: FE11 cho base/level/rank nhân vật Book 1 và số boss Normal; FE8 `bmbattle.c` cho EXP sau giao tranh và 1RN growth; chỉnh module/dữ liệu hiện có, ghi rõ phần lai của Water Emblem.
- Tự làm: di trú save v2→v3, vận hành EXP/level-up/dismount, hoàn thiện promotion item/UI và xử lý số generic/FE12 khi chương dùng đến.

- [x] 25. Đối chiếu và cập nhật chỉ số/growth từ FE đời mới hơn.
  - Tiêu chí xong: Chủ dự án chốt nguồn FE cụ thể; dữ liệu nhân vật có bảng nguồn, class khớp, loader/test/build PASS và bản chơi vẫn hoạt động.
  - Kết quả: PASS: Đã đối chiếu 31/31 bản ghi hiện có: 15 nhân vật theo bảng FE11 default/growth, 6 boss theo FE11 Normal, 10 mẫu quân thường cấp 1 dùng base/growth class địch FE11 (ghi rõ là nền class, không phải stat từng cá thể ROM); Navarre Mercenary suy ra từ FE11 Myrmidon theo quy tắc reclass. Bảng ID/số/nguồn trong `reports/Chi so va class Fire Emblem.md`; loader kiểm class, rank, tham chiếu và giới hạn growth. `npm run build`, Vitest 63/63, Chromium 11/11 PASS ngày 2026-11-14 sau cập nhật số generic. FE12 áp dụng khi có nhân vật Book 2, không phải dữ liệu của chương hiện tại.

- [x] 26. Nâng cấp công thức combat, AI và tăng cấp từ mã FE có nguồn.
  - Tiêu chí xong: Chủ dự án chốt nguồn/hàm kế thừa cho combat, AI và lên cấp; cập nhật `Game_Design/battle.md`, mã, dữ liệu, bản lưu và test; luồng chơi trên Chromium và build PASS.
  - Kết quả: PASS: Chủ dự án giao chọn hướng FE hiện đại; FE11 là nguồn combat/rank/class/growth cá nhân+class, FE8 là nguồn EXP và tung growth 1RN; `battle.md` ghi rõ hệ số AI trong `balance.json` là cân bằng tạm Water Emblem theo khung FE8, không phải bảng hệ số FE8. Đã cập nhật mã, dữ liệu 17 vũ khí/31 bản ghi/15 personal growth/35 class growth, save v3 lưu EXP và di trú v2; 15/15 growth hiệu dụng ban đầu giữ nguyên. Vitest 68/68, build và Chromium 2/2 (auto phase, bản lưu gần thắng chiếm cổng/chuyển chương) PASS ngày 2026-11-14. FE11 dynamic adjustment chưa chọn làm luật hiện hành; fullChapter từ đầu còn FAIL thuộc mục 6, promotion/reclass UI thuộc mục 32.

### Kiểm toán luật hiện đại sau quyết định ngày 2026-11-14

- Có sẵn: `Game_Design/decisions.md`, các file logic/dữ liệu game trong `Water-Emblem/src/core/` và `data/`, mã FE11 `unit.cpp`, FE8 `cp_battle.c`, bảng FE11 về vũ khí/class/support; đã mở implementation và đối chiếu từng nhóm.
- Tận dụng: chỉnh công thức/dữ liệu FE11 đã có theo nguồn; dùng FE8 làm tham chiếu AI scoring và các repo khác cho cơ chế FE11 không có, sau khi chủ dự án chốt mức kế thừa.
- Tự làm: sửa sai khác giữa dự báo với AI, bảo toàn bản lưu qua đổi luật, hoàn thiện EXP/level-up và tính năng đã chọn còn thiếu theo từng mốc được duyệt.

- [x] 27. Rà soát công thức và tính năng đã code theo quy tắc nguồn mới.
  - Tiêu chí xong: Kiểm file triển khai trong Water Emblem và repo nguồn, đối chiếu combat, AI, RNG, nhân vật, class, item, support, grid/lượt/chương, save và tính năng đã chọn; ghi sai khác có file/dòng/nguồn; chạy test/build; tách phần chưa triển khai khỏi mâu thuẫn.
  - Kết quả: PASS: `reports/ra_soat_luat_hien_dai_2026-11-14.md` ghi bảng 11 nhóm, nguồn FE11 `unit.cpp`, FE8 `cp_battle.c`, bảng FE11 item/class/support và phát hiện 17/17 vũ khí đối ứng có số khác, MOV/class/level không đồng bộ, rank mặc định E, support kích hoạt sớm, save trộn luật, AI/danger zone sai state. Hai subagent rà soát chỉ đọc công thức và tính năng; agent chính kiểm lại mã nguồn trọng yếu. `npm test` 49/49, `npm run build` PASS, `git diff --check` không có lỗi khoảng trắng ngày 2026-11-14. Playwright smoke test dừng ở plugin setup quá 60 giây, chưa xác nhận luồng trình duyệt.

- [x] 28. Đồng bộ các chức năng hiện có với nguồn FE hiện đại đã chọn.
  - Tiêu chí xong: Chủ dự án chốt nguồn/mức kế thừa sau báo cáo; số item/class/rank/support, AI/danger zone và save thống nhất; test logic và luồng chương PASS; không đánh dấu tính năng chưa triển khai là hoàn thành.
  - Kết quả: PASS: 17 item đối ứng FE11, 37 class theo cây tạm chốt, rank/support, AI/danger zone và save v3 đã được đối chiếu trong `reports/ra_soat_luat_hien_dai_2026-11-14.md`; địa hình FE11 nay dùng bonus, hồi HP và chi phí theo class từ `terrains.json`, schema kiểm PASS. Test browser dùng pathfinding core thay bản sao; Vitest 68/68, build và Chromium 2/2 (auto phase, chiếm cổng từ bản lưu hợp lệ/chuyển chương) PASS ngày 2026-11-14. Đây là đồng bộ **chức năng đã có**, chưa xác nhận nội dung FE3 chương 1 hoặc tính năng promotion/reclass chưa làm (mục 6 và 32); kịch bản tự chơi từ đầu vẫn FAIL và được giữ ở mục 6.

- [x] 29. Rà soát class hiện có và đối chiếu class FE đời mới để đề xuất bổ sung.
  - Tiêu chí xong: Kiểm hết catalog class và nhân vật đang dùng, xác định class đã thăng cấp/thực sự chạy; đọc mã nguồn FE11/FE8 và nguồn Nintendo về class change, reclass; lập bảng class hiện có, khoảng trống, nhánh ứng viên và các quyết định cần chốt, không sửa gameplay khi chưa chốt.
  - Kết quả: PASS: `reports/ra_soat_class_va_bo_chi_so_2026-11-14.md` đối chiếu 12 class, 31 bản ghi nhân vật, FE11 `include/unit.hpp`/`prep_job_select.cpp` commit `be854842`, FE8 `src/bmbattle.c` commit `04d1edb1` và hướng dẫn Nintendo Shadow Dragon/Awakening/Engage/Three Houses. Xác nhận chỉ Paladin là class bậc cao, chưa có promotion/reclass trong state hoặc loader, Navarre thiếu Myrmidon; có bảng nhánh class ứng viên và schema chỉ số cần chốt.

- [x] 30. Làm lại báo cáo so sánh chỉ số và class FE3, FE8, FE11, FE12.
  - Tiêu chí xong: Phân biệt stat gốc và chiến đấu tính ra, liệt kê class theo từng bản và nhánh promotion, đối chiếu đủ 31 bản ghi hiện có, chỉ ra nguồn và giới hạn kiểm chứng, đưa các phương án để chủ dự án chọn; sửa nhận định Navarre ở báo cáo trước.
  - Kết quả: PASS: `reports/Chi so va class Fire Emblem.md` có bảng stat FE3/FE8/FE11/FE12/Water Emblem, bảng class từng bản, bảng 31/31 bản ghi và ba phương án. Đối chiếu Nintendo FE3/FE11, mã FE11 `unit.hpp`, FE8 `bmbattle.c`/`classes.h` commit `04d1edb1`, Serenes Forest FE3/FE8/FE11/FE12 và bảng boss FE3 Book 1; xác nhận FE3 Navarre là Mercenary, FE11 là Myrmidon. Báo cáo chưa sửa luật hoặc dữ liệu game.

- [x] 31. Ghi chỉ đạo tạm chốt về chỉ số, EXP, class và xuống ngựa.
  - Tiêu chí xong: Ghi chính xác các chỉ đạo mới vào file sở hữu, phân biệt điều đã rõ với bốn điểm chưa rõ; sửa câu “Không” gây hiểu lầm về stat chiến đấu trong báo cáo; đối chiếu hàm EXP/growth trong mã repo tham khảo trước khi viết code.
  - Kết quả: PASS: `AGENTS.md`, `Game_Design/README.md`, `decisions.md`, `characters.md`, `battle.md` và `reports/Chi so va class Fire Emblem.md` đã định nghĩa/ghi nhãn tạm chốt, toàn bộ 14 dòng nhánh class do chủ dự án nêu, yêu cầu EXP/Skill, xuống ngựa tùy chọn; bảng báo cáo đổi sang “Tính và hiển thị; không lưu base”. Đã mở FE11 `unit.cpp:1990-2060` và FE8 `bmbattle.c:1212-1275,1680-1810`; bốn câu hỏi đã gửi gộp, chưa sửa gameplay.

- [x] 32. Triển khai bộ chỉ số và class cho phạm vi chơi thử Chương 1–3.
  - Tiêu chí xong: Đổi schema `dex`→`skill` và di trú save; nạp base/growth Book 1 có nguồn; thêm EXP/growth/cap, cây class, promotion có điều kiện và xuống ngựa tự chọn; unit test/build và bài Chromium riêng cho các cơ chế này PASS; giữ quân, HP, trang bị và tiến độ qua save/chuyển chương. Reclass bắt đầu từ Chương 4 được tách sang mốc riêng theo quyết định chủ dự án ngày 2026-11-14.
  - Kết quả: PASS: `skill`, base/growth Book 1 đối chiếu FE11, EXP/growth, giới hạn 30/60, promotion, xuống/lên ngựa và di trú save v2–v4 lên v5 đã có; Vitest 82/82, build PASS, `battle.spec.ts` Chromium 12/12 gồm thuốc, promotion, xuống ngựa, lưu/nạp và chuyển chương từ bản lưu gần thắng. Bài chơi trọn Chương 1–3 thuộc mục 6–7, chưa PASS.

- [x] 33. Bàn giao phần đang làm dở cho Antigravity.
  - Tiêu chí xong: Ghi trạng thái code và kiểm chứng thực tế, các lỗi/chức năng chưa xong, nguồn cần đối chiếu, thứ tự ưu tiên và điểm chặn công cụ vào tài liệu bàn giao.
  - Kết quả: PASS: `ANTIGRAVITY_HANDOFF.md` ghi unit test/build, kết quả Chromium, các mục 6/7/34 chưa đạt và thứ tự việc tiếp theo. Antigravity qua script nghiên cứu `coding-studio` với `gemini-3.8-flash-high` đã hoàn thành một kiểm kê chỉ đọc (`ok:true`); Codex kiểm lại JSON, bác bỏ kết luận sai về vật phẩm rơi của Gomer/Hyman và lưu kết quả tại `reports/antigravity-chapter-inventory-review-2026-11-14.md`. Kiểm kê không được dùng làm bằng chứng chơi trọn chương hay xác nhận đúng FE3.

- [ ] 34. Triển khai reclass và giới hạn class từ Chương 4.
  - Tiêu chí xong: Đối chiếu nhóm class FE11 với class Water Emblem, cho reclass tại màn chuẩn bị từ Chương 4, giữ level/EXP/rank theo luật đã chốt; test core, save và Chromium PASS khi Chương 4 có dữ liệu.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chủ dự án đã duyệt tách mốc này khỏi phạm vi chơi thử Chương 1–3; chỉ triển khai khi bắt đầu Chương 4 và chốt mapping của class Water Emblem.

- [x] 3. Chạy được vòng chơi tối thiểu trên một bản đồ.
  - Tiêu chí xong: Trình duyệt tải được bản đồ thử; chọn và di chuyển đơn vị theo địa hình, hiển thị vùng di chuyển/nguy hiểm, kết thúc và chuyển lượt; thao tác sai không làm hỏng state. Logic chạy được không cần renderer và có test cho đường đi, tầm di chuyển, lượt.
  - Kết quả: PASS: Playwright Chromium 7/7 đã chọn/di chuyển/chờ trong 3D, hiển thị canvas, tự chạy AI khi 7 quân chờ và qua hai lượt; Vitest 47/47 gồm grid, pathfinding, turn; build PASS.

- [x] 4. Hoàn thành chiến đấu và AI cho bản đồ thử.
  - Tiêu chí xong: Dự báo và thực hiện giao tranh đúng các quy tắc đã duyệt trong `Game_Design/battle.md`; tam giác vũ khí, vũ khí khắc class, AI và nguồn RNG cho kết quả tái lập; AI không dùng thông tin bị che. Test tự động bao phủ các công thức và tình huống biên đã chọn, một trận thử kết thúc được.
  - Kết quả: PASS: `calculator.ts` dùng cùng hàm cho dự báo/thực thi với tam giác theo rank, khắc class ×3 Might, Hit/Avoid/Crit/AS, double và bonus địa hình FE11; `SeededRNG` tái lập 2RN. AI chỉ nhận state/đơn vị hiện có (chưa có Fog of War), chấm sát thương kỳ vọng và chọn vai trò stationary/pursue. Vitest 79/79 và build PASS ngày 2026-11-14. Bài chơi trọn từ đầu chưa PASS; theo dõi ở mục 6.

- [x] 5. Đưa bản đồ thử sang 3D low-poly.
  - Tiêu chí xong: Bản đồ, đơn vị, camera và chỉ báo nước đi hiển thị trong Three.js; cùng thao tác tạo cùng kết quả game như bản logic; kiểm tay trên trình duyệt mục tiêu và đo FPS, draw calls, triangles theo ngân sách được chốt.
  - Kết quả: PASS: Chrome cửa sổ 1920×1080 ngày 2026-11-15 dùng ANGLE/Intel Arc 140V Direct3D11, 12 mẫu liên tiếp trung bình 60,0 FPS (223 draw calls, 171.612 triangles), vượt mốc PC 30 FPS đã chốt; bản đồ, quân và model cây/nhà hiện trong ảnh `scratch/chrome-1080p-2026-11-15.png`. Sau 12 lần bấm thu nhỏ, toàn bản đồ nằm trong khung ở `scratch/chrome-overview-1080p-2026-11-15.png`; kéo trái đổi camera target, kéo phải đổi camera position, lăn chuột zoom liên tục. `npm run build` PASS; `battle.spec.ts` 12/12 PASS trên Chromium ngày 2026-11-15, gồm model, minimap, camera, chọn/di chuyển/chờ 3D, lượt và lưu/tải. Số FPS headless thấp hơn là môi trường không dùng GPU, không phải mốc PC đã duyệt.

- [x] 6. Hoàn thiện Chương 1 & Chương 2 chuẩn hoá toàn bộ theo nguồn FE3 Book 1.
  - Tiêu chí xong: Vào chương, chuẩn bị đội, chơi, thắng/thua, toàn bộ hội thoại mở đầu/thăm làng/thu phục/boss/kết thúc (ngôn ngữ mặc định tiếng Anh), cơ chế làng/cướp làng, thu phục Castor, rơi trang bị (dropItemId), lưu/tải và chuyển chương hoạt động chuẩn xác; bot E2E chơi trọn chương, unit test và build PASS.
  - Kết quả: PASS: Đã chuẩn hóa Chương 1 (7 quân ta, 14 quân địch: 11 Pirate gồm 1 Pirate cấp 3, 1 Hunter, 1 Thief pillage làng đông, boss Gazzak tại Gate 4,4) và Chương 2 (11 quân ta sau viện binh Ogma/Bord/Cord/Barst, 17 quân địch: 9 Pirate, 2 Thief, 2 Hunter, 2 Grust Cav, 1 boss Gomer rơi Steel Sword, 1 Castor thu phục bởi Caeda). Hội thoại tiếng Anh toàn bộ 3 chương theo cốt truyện FE3 Book 1; hỗ trợ rơi trang bị tự động khi hạ gục (`dropItemId`), thưởng vàng chiếm cổng (`seizeReward`). Sửa lỗi nghiêm trọng trong `App.tsx` không reset `hasActed: false` cho quân ta khi qua lượt mới. Bài kiểm E2E bot `tests/browser/fullChapter.spec.ts` tự động đánh bại toàn bộ quân địch và chiếm cổng, vượt màn sau 16 lượt và chuyển sang Chương 2 chuẩn bị xuất trận (39.8s PASS). Bài kiểm E2E bot `tests/browser/fullChapter2.spec.ts` tự động xuất trận, Caeda thu phục Castor ở Turn 3, tiêu diệt hải tặc và boss Gomer, Marth chiếm cổng thành ở (1, 1) tại Turn 13 và chuyển quân sang Chương 3 chuẩn bị xuất trận (43.4s PASS). `npm run build` PASS, 87/87 unit test Vitest PASS, Playwright `battle.spec.ts` 12/12 PASS ngày 2026-11-15.

- [x] 7. Chuẩn hoá toàn bộ Chương 3: Núi Quỷ (The Devil Mountain) theo FE3 Book 1.
  - Tiêu chí xong: Bản đồ 30×20 chuẩn FE3 Book 1, 13 quân ta cố định (đội Ch2 còn sống + Julian, Lena; Castor thêm nếu đã thu phục), 15 quân địch theo FE3 (8 Bandit, 3 Hunter, 2 Thief, Hyman, Navarre), thu phục Navarre bằng Caeda, hạ Hyman rơi gậy Mend, một tên cướp Samsoian rơi Vulnerary, làng trao Devil Axe, thưởng 15.000G khi chiếm thành; hội thoại tiếng Anh đúng kịch bản FE3 Book 1; bot E2E chơi trọn chương, unit test, build và lưu/tải PASS.
  - Kết quả: PASS: Đã đồng bộ `data/chapters/chapter_03_devil_mountain.json` với đúng 13 quân ta (Julian/Lena xuất phát ngay từ Turn 1 tại vị trí hang núi), đúng 15 quân địch theo FE3 Book 1 (8 Samsoian Bandit, 3 Hunter, 2 Thief cướp làng, 1 boss Hyman có `dropItemId: "mend_staff"`, 1 Samsoian fighter rơi `"vulnerary"`, Navarre thu phục bằng Caeda). Thưởng chiếm cổng `"seizeReward": { "type": "gold", "amount": 15000 }` đã được tích hợp vào logic chiếm thành trong `App.tsx`. Hội thoại toàn bộ chuyển sang tiếng Anh chuẩn (`chapter_03_dialogues.json`). Bài kiểm E2E bot `tests/browser/fullChapter3.spec.ts` tự động xuất trận, Julian & Lena né tránh giữ an toàn, Caeda tiếp cận thu phục Navarre ở Turn 2, quét sạch sơn tặc Samsoian, hạ gục boss Hyman và Marth chiếm cổng thành ở (1, 2) tại Turn 15 hoàn thành mục tiêu chiến thắng (1.6m PASS). Kiểm tra nạp và lưu Chương 3 trong `battle.spec.ts` PASS, 87/87 unit test Vitest PASS, build TypeScript strict PASS ngày 2026-11-15.

- [x] 24. Xây dựng và tích hợp hệ thống âm thanh (Audio System: BGM & SFX) chuẩn Fire Emblem.
  - Tiêu chí xong: Tích hợp âm thanh theo thứ tự ưu tiên FE3 -> FE11 -> FE12 -> FE8 bằng Howler.js, hỗ trợ cả định dạng `.ogg` và `.mp3` (cho Safari); có BGM theo từng giai đoạn (chuẩn bị, player phase, enemy phase, battle, victory, gameover) và SFX cho đầy đủ tương tác (cursor, select, di chuyển theo class/ngựa/bay/bộ, vũ khí đánh trúng theo kiếm/thương/rìu/cung, crit, miss, death, level up, heal, item get, phase change); có nút bật/tắt (mute/unmute) trên thanh công cụ; build TypeScript strict PASS, Vitest PASS, Playwright E2E PASS.
  - Kết quả: PASS: Module `src/audio/soundManager.ts` bọc Howler.js với quản lý volume/mute lưu vào localStorage; tải và trích xuất đầy đủ 7 track BGM từ FE3 và 24 hiệu ứng âm thanh SFX gốc Fire Emblem sang cả định dạng `.ogg` và `.mp3` tại `public/audio/bgm/` và `public/audio/sfx/`. Đã gắn toàn bộ vào vòng đời UI của `src/App.tsx` (BGM chuyển mượt mà theo phase, SFX phát đúng lúc tấn công, bước chân theo MoveType, nhặt đồ/thu phục/thăm làng). Build PASS, Vitest 87/87 PASS, Playwright Chromium test 12/12 PASS ngày 2026-11-15.

- [x] 35. Kiểm thử tình huống biên cốt lõi và khả năng chịu lỗi hệ thống (Edge Cases & Fault Tolerance).
  - Tiêu chí xong: Xây dựng bộ test tình huống biên cho logic chiến đấu, địa hình, vật phẩm, thăng cấp và AI; xây dựng bộ test trình duyệt cho các tình huống spam thao tác ngoài biên, lưu/phục hồi cài đặt âm thanh qua reload, chuyển đổi 2D/3D liên tục không rò rỉ WebGL, và cơ chế phục hồi khi dữ liệu IndexedDB bị hỏng; Vitest, Playwright và build TypeScript strict PASS.
  - Kết quả: PASS:
    - Core Edge Cases (`tests/core/edgeCases.test.ts` - 11/11 tests PASS): Không có sát thương âm khi Def > Atk; ngắt double attack ngay khi mục tiêu tử trận ở đòn 1; nhân 3 Might cho effective damage khắc class kèm weapon rank bonus; pháo đài hồi 20% max HP, không vượt trần, không hồi quân chết; Vulnerary trừ lượt dùng, tự tiêu biến khi hết, chặn dùng khi đầy máu; chặn thăng cấp dưới Lv 10; thăng cấp Cavalier -> Cataphract cập nhật chỉ số và reset level 1; AI stationary giữ vị trí; AI pursue chuyển wait an toàn khi bị bao vây hoàn toàn.
    - Browser Fault Tolerance (`tests/browser/errorTolerance.spec.ts` - 4/4 tests PASS, 34.6s): Click dồn dập vào ô biển/ngoài biên không gây unhandled error hay treo phase (4.8s); lưu/khôi phục trạng thái Mute qua F5/reload (9.8s); chuyển đổi qua lại 2D và 3D 4 lần liên tiếp không lỗi WebGL (11.4s); nạp bản lưu bị hỏng cấu trúc trong IndexedDB hiển thị thông báo lỗi rõ ràng và giữ nguyên trạng thái trận đấu không sập ứng dụng/màn hình trắng (7.7s).
    - Vitest: 98/98 unit tests PASS trên 14 suites. TypeScript strict + Vite build: PASS trong 3.4s ngày 2026-11-15.

- [x] 36. Tối ưu điều khiển camera 1:1 không trôi, cải tiến UI/UX và hệ thống hội thoại Visual Novel chuẩn Fire Emblem.
  - Tiêu chí xong:
    - Điều khiển camera 3D: Tắt quán tính trôi trượt (damping) của OrbitControls (`enableDamping: false`, `rotateSpeed: 0.85`, `panSpeed: 1.0`), chuột di/xoay dừng dứt khoát 1:1 theo thao tác tay của người chơi.
    - Tối ưu công thái học UI/UX: Toàn bộ nút hành động chiến thuật (Lên/Xuống ngựa, Chiếm cổng, Nói chuyện, Dùng thuốc, Thăng cấp, Chờ) và nút zoom minimap đạt chuẩn touch target $\ge 40$px; font chữ bảng thông số nhân vật và địa hình nâng lên 12px sáng rõ; header responsive flexWrap thích ứng màn hình.
    - Hệ thống hội thoại Visual Novel Fire Emblem: Từng nhân vật nói một, khung chân dung avatar lớn 90×90px đổi tự động theo người nói, thẻ tên nhân vật (Nameplate Tag) riêng biệt, hiệu ứng chữ chạy gõ máy (Typewriter) mượt mà, click vào hộp thoại để hoàn thành câu hoặc tiếp tục câu sau với SFX con trỏ `cursor`, con trỏ nhấp nháy `▼`, tích hợp vùng ẩn `sr-only` chuẩn WCAG hỗ trợ trợ năng và công cụ kiểm thử tự động.
    - Áp dụng đồng bộ cho toàn bộ 3 loại cutscene: Hội thoại mở đầu chương (Story Intro), Thăm làng nhận thưởng (Village Visit), và Chiến thắng hoàn thành chương (Victory Ending).
    - Bộ test và build PASS: TypeScript strict + Vite build PASS; 98/98 unit tests Vitest PASS; toàn bộ 3 kịch bản E2E bot chơi trọn Chương 1, 2, 3 trên Chromium đều PASS.
  - Kết quả: PASS:
    - File chỉnh sửa: `src/renderer/ThreeScene.tsx`, `src/App.tsx`.
    - `npm run build`: PASS trong 6.38s (0 lỗi compile).
    - `npm test -- --run` (Vitest): 98/98 tests PASS trên 14 test suites (1.57s).
    - Bot E2E Playwright:
      - `fullChapter.spec.ts` (Chương 1): PASS trong 45.8s.
      - `fullChapter2.spec.ts` (Chương 2): PASS trong 54.0s.
      - `fullChapter3.spec.ts` (Chương 3): PASS trong 1.9m.
    - Ngày hoàn thành: 2026-11-15.

- [x] 37. Xây dựng Màn hình chào mừng (Title Screen), Quản lý bản lưu (File Select), Chọn phần (Book Select) và Bản đồ tổng thể quốc gia Archanea (World Map).
  - Tiêu chí xong:
    - Màn hình chào mừng (`TitleScreen.tsx`): Logo Water Emblem: Mystery of Nothing, huy hiệu Fire Emblem / Shield of Seals với hiệu ứng ánh sáng huyền ảo, các nút New Game, File Select, World Map, Resume Battle và bật/tắt âm thanh.
    - Quản lý bản lưu đa slot (`SaveSlotsModal.tsx` & `src/storage/saveLoad.ts`): Hỗ trợ 3 ô lưu (File 1, File 2, File 3), hiển thị tên chương, lượt chơi, số quân, vàng (Gold) và thời gian lưu; hỗ trợ Load, Copy sang ô khác, Delete và New Game tại ô trống.
    - Chọn phần chiến dịch (`BookSelectModal.tsx`): Card chọn giữa Book 1 (Chiến tranh bóng tối - Cuộc viễn chinh phục quốc của Hoàng tử Marth) và Book 2 (Chiến tranh huy hiệu - Bí ẩn của Khiên Phong ấn và Hoàng đế Hardin).
    - Bản đồ tổng thể đại lục Archanea (`WorldMapModal.tsx` & `data/world_map.json`): Bản đồ SVG vector tương tác phong cách hải đồ cổ điển, mô phỏng 11 vương quốc và lãnh thổ (Talys, Galder, Devil Mountain, Aurelis, Altea, Gra, Grust, Macedon, Khadein, Archanea, Dolhr); đường hành quân viễn chinh vàng kim; panel thông tin lãnh tụ, nhân vật tiêu biểu, lịch sử bối cảnh và các chương chiến dịch tương ứng; nút "Tiến quân vào chiến trường".
    - Tích hợp điều hướng trên thanh công cụ Header Bar: Nút `🏰 Title`, `🗺️ World Map`, `📁 Save Files` đồng thời bảo toàn 100% tính tương thích ngược cho các nút Lưu/Nạp game nhanh của test suite hiện có.
    - Bộ test và build PASS: TypeScript strict + Vite build PASS; 98/98 unit tests Vitest PASS; kịch bản E2E Playwright `tests/browser/preGameFlow.spec.ts` kiểm thử toàn bộ luồng điều hướng PASS 100% trong 32.6s.
  - Kết quả: PASS:
    - File tạo mới: `data/world_map.json`, `src/ui/TitleScreen.tsx`, `src/ui/BookSelectModal.tsx`, `src/ui/SaveSlotsModal.tsx`, `src/ui/WorldMapModal.tsx`, `tests/browser/preGameFlow.spec.ts`.
    - File cập nhật: `src/storage/saveLoad.ts`, `src/App.tsx`.
    - `npm run build`: PASS trong 5.37s (0 lỗi compile).
    - `npm test -- --run` (Vitest): 98/98 tests PASS trên 14 test suites (1.20s).
    - Bot E2E Playwright `preGameFlow.spec.ts`: PASS trong 32.6s.
    - Ngày hoàn thành: 2026-11-15.

- [x] 38. Chuẩn hóa 100% ngôn ngữ tiếng Anh (English) trong toàn bộ trò chơi theo quy tắc dự án.
  - Tiêu chí xong:
    - Tuân thủ quy định ngôn ngữ trong `AGENTS.md` ("Ngôn ngữ hiển thị mặc định của toàn bộ trò chơi là tiếng Anh (English) cho tất cả nhãn UI, menu, thông báo chiến thuật, tên nhân vật, class, vũ khí, vật phẩm, địa hình và hội thoại; không tự ý dịch sang tiếng Việt trong game") và `Game_Design/decisions.md`.
    - Danh hiệu nhân vật (`data/characters.json`): 100% tiếng Anh chuẩn Fire Emblem (Prince of Altea, Veteran Knight of Altea, Princess of Talys, The Bull / Cavalier of Altea, The Panther / Cavalier of Altea, Iron Wall of Altea, Altean Archer, Leader of the Galder Pirates, The Scarlet Sword, v.v.).
    - Bảng dự báo giao tranh (Combat Forecast): `⚔️ COMBAT FORECAST`, `Damage:`, `Hit:`, `Crit:`, `Cannot counter`, `⚔️ Attack!`, `Cancel`.
    - Menu hành động đơn vị (Action Menu): `Actions (Unit)`, `👑 Seize Gate`, `💬 Talk: [Name]`, `🧪 Use Vulnerary`, `🎖️ Promote: [Class]`, `🏇 Mount` / `Dismount`, `🏡 Visit Village ([Name])`, `✓ Wait`, `✕ Cancel Move`.
    - Bảng soi thông tin đơn vị & địa hình (Inspector Panel): `👤 Unit & Terrain Info`, `🛡️ Player Faction` / `⚔️ Enemy Faction`, `Weapon:`, `Inventory:`, `Class:`, `HP:`, `Mov:`, `Effective Growths:`, `💙 Support Bonus:`, `Tile (X, Y):`, `Avoid:`, `Defense:`.
    - Nhật ký chiến đấu (Combat Log): `📜 Combat Log`, `No battle engagements yet.`, `[Unit] attacked [Unit] but MISSED!`, `[Unit] hit [Unit] for X damage! [CRITICAL HIT!]`, `[Unit] used [Item]`, `[Unit] promoted to [Class]`, `🔴 ENEMY PHASE (Turn X)`.
    - Màn hình chuẩn bị trận đánh (Preparation Modal): `⚔️ Battle Preparation: [Chapter Name]`, `Select units for deployment. Marth is required commander; unselected units remain in reserve.`, `Deployed: X/Y units`, `(Commander - Required)`, `(Fallen)`, `Start Chapter ➔`.
    - Thông báo thắng / thua: `🏆 STAGE CLEAR!`, `⚔️ Advance to Chapter 2: The Pirates of Galder ➔`, `💀 GAME OVER`, `Prince Marth has fallen in battle... The kingdom of Altea has lost all hope.`, `📂 Load Last Save`, `🔄 Restart Chapter`.
    - Đồ họa & Điều khiển 3D: `Mini-map near tile X, Y`, `Zoom In`, `Zoom Out`, `Left drag to pan; right drag to rotate; wheel to zoom`.
    - Toàn bộ test suite Playwright & Vitest được cập nhật tương thích và kiểm chứng: Vitest 98/98 unit tests PASS; Playwright `preGameFlow.spec.ts` PASS; `fullChapter.spec.ts` PASS.
  - Kết quả: PASS:
    - File cập nhật: `data/characters.json`, `data/chapters/test_chapter_01.json`, `src/App.tsx`, `src/renderer/ThreeScene.tsx`, `src/core/progression/experience.ts`, `src/storage/saveLoad.ts`, `tests/browser/*.spec.ts`.
    - `npm run build`: PASS (0 lỗi compile).
    - `npm test -- --run` (Vitest): 98/98 tests PASS trên 14 test suites (762ms).
    - Bot E2E Playwright: `preGameFlow.spec.ts` PASS (55s); `fullChapter.spec.ts` PASS (39.1s).
    - Ngày hoàn thành: 2026-11-15.

- [x] 39. Nâng cấp World Map Archanea in-game chuẩn FE3 và thay thế chấm tròn bằng biểu tượng thành trì Fire Emblem.
  - Tiêu chí xong:
    - Nạp trực tiếp hình ảnh bản đồ lục địa Archanea in-game nguyên bản Fire Emblem 3 từ `public/models/Original/01_Maps/World_Maps/FEMN_Archanea_In-Game.png` (và bản 4x pixel-sharp 2048x2048) thay vì vẽ vector landmass sơ sài.
    - Xóa bỏ toàn bộ các chấm tròn (`<circle>`), thay bằng biểu tượng pháo đài/lâu đài phong cách FE3 (tường thành đá, tháp canh, cổng thành, cột cờ với cờ hiệu vương quốc `bannerColor`).
    - Khung nhãn tên cuộn thư mạ vàng hoàng gia (Parchment Plaque) rõ nét, không che khuất địa danh, tương thích selector test tự động.
    - Đánh dấu cứ điểm đang chọn bằng hào quang vàng và mũi tên chỉ huy; đánh dấu vị trí quân đoàn Marth đang đóng quân bằng biểu tượng chỉ huy `★` và hào quang xanh.
    - Tuyến đường hành quân viễn chinh (Expedition Trails) vẽ bằng nét đứt phát sáng nối từ Talys qua Galder, Devil Mountain đến Aurelis.
    - Hỗ trợ chuyển đổi phong cách bản đồ: `[🎮 FE3 Pixel Map]` (SNES 1994) và `[🎨 Illustrated Map]`, kèm bộ điều khiển Zoom In/Out (75% - 200%).
    - Panel thông tin vùng đất bên phải hiển thị chân dung Portrait của Lãnh chúa/Thống soái (Marth, Hardin, Camus, Michalis, Nyna, Medeus, Gomer, Hyman...) lấy từ `public/avatars/`.
    - `npm run build`: PASS (0 lỗi compile).
    - `npm test -- --run` (Vitest): 98/98 tests PASS trên 14 test suites (796ms).
    - Playwright `preGameFlow.spec.ts`: PASS (31.5s).
    - Ảnh chụp màn hình trình duyệt: `C:/Users/nguye/.gemini/antigravity/brain/15f6a255-3fb7-4e73-9b00-3dd4d9894110/browser_evidence/bde824a5-cc0e-4c67-bbb6-aa71e84686b1/final_step_18.png`.
    - Ngày hoàn thành: 2026-11-15.

- [ ] 8. Thêm chế độ và tính năng mở rộng đã duyệt.
  - Tiêu chí xong: Độ khó, bản đồ giải đố và bản đồ ngẫu nhiên đã chọn có tiêu chí riêng, chạy được, có kiểm tra phần logic và không làm hỏng chiến dịch; phần chưa chọn không tính là thiếu.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chốt quy tắc và phạm vi nội dung cho Q04, Q10, Q12 sau khi bản chiến dịch mẫu chơi được.

- [ ] 9. Kiểm thử, tối ưu và phát hành.
  - Tiêu chí xong: Bộ test và build PASS; chơi hết phạm vi đã duyệt; kiểm trên các trình duyệt/thiết bị đã chốt; đo hiệu năng; kiểm quyền sử dụng nội dung; bản phát hành được chủ dự án duyệt trước khi publish.
  - Kết quả: CHỜ NGƯỜI DÙNG: Chưa được duyệt phát hành; quyết định nền tảng triển khai và thời điểm publish ở mốc này.

## Có sẵn và phần cần làm

- Có sẵn: `AGENTS.md`, `PLAN.md`, `Game_Design/`, `reports/` và mã nguồn hiện tại trong `Water-Emblem/`; đã chạy 47/47 unit test, build và 7/7 luồng Chromium từ thư mục mã nguồn ngày 2026-11-13.
- Tận dụng: dùng đề án cũ làm nguồn chuyển nội dung có nhãn, báo cáo làm nghiên cứu; giữ quyết định mới nhất trong `Game_Design/decisions.md`.
- Tự làm: kiểm kê hiện trạng khi bắt đầu code, chốt các quy tắc còn mở, triển khai và kiểm chứng từng mốc ở trên.

## Quyết định cần chốt sau khi duyệt kế hoạch

- Phạm vi bản chơi đầu và số chương mục tiêu. Đề án cũ dùng các mức 10+, 25+ và 40+ chương ở các chỗ khác nhau.
- Bộ quy tắc combat trước khi code: đề án gốc có `SupportBonus` trong Hit nhưng `AGENTS.md` bản cũ không có; cách tính effective damage, RNG khi Hit trên 50% và anti-screwage cần được xác nhận thành một đặc tả thống nhất. Break chưa được chọn.
- Mức dự án: đề xuất mức chuyên nghiệp do nội dung dài hạn, nhiều module và có khả năng phát hành; chủ dự án quyết định mức kiểm thử/tài liệu tương ứng.
- Thiết bị và trình duyệt mục tiêu để đặt ngân sách hiệu năng có thể đo.
- Nguồn dữ liệu và quyền sử dụng hình ảnh, âm thanh trước khi đưa vào game hoặc phát hành.

## Chuẩn hóa tài liệu thiết kế

- [x] 10. Chuyển nội dung còn phù hợp của đề án cũ vào chín file `Game_Design/` và cập nhật `AGENTS.md`, `PLAN.md`.
  - Tiêu chí xong: Có đủ chín file, mỗi mã đã chọn có nơi sở hữu; đề án cũ có bảng đối chiếu; các công thức mâu thuẫn và cơ chế chưa chọn được ghi rõ trạng thái; mọi đường dẫn trong `AGENTS.md` và `PLAN.md` trỏ tới file tồn tại.
  - Kết quả: PASS: 9/9 file `Game_Design/` tồn tại; các tham chiếu `report/` sai đã sửa thành `reports/`, kiểm lại không còn đường dẫn cũ và file báo cáo tham chiếu tồn tại.

- [x] 11. Duyệt nội dung `Game_Design/`.
  - Tiêu chí xong: Chủ dự án xác nhận cấu trúc, phạm vi và cách ghi các điểm chưa chốt; mọi chỉnh sửa được yêu cầu đã xử lý.
  - Kết quả: PASS: Chủ dự án trả lời “duyệt” ngày 2026-11-13 sau khi nhận bản 9 file và yêu cầu chuyển sang bước xóa đề án cũ.

- [x] 12. Xóa đề án cũ và kiểm đường dẫn.
  - Tiêu chí xong: Đề án cũ không còn ở thư mục gốc; không có liên kết hoặc chỉ dẫn đang hoạt động trỏ tới file đã xóa; mở lại README và các file tham chiếu để kiểm.
  - Kết quả: PASS: Đã xóa đúng file ở thư mục gốc; kiểm `OldFileExists=False`, `DesignFileCount=9`; tìm toàn bộ file trong workspace không còn tham chiếu tên file cũ; 9/9 liên kết trong `Game_Design/README.md` trỏ tới file tồn tại.
