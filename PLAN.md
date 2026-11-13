# Kế hoạch triển khai Water Emblem

Cập nhật: 2026-11-13

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
| Còn mở | Bản đồ, chỉ số và lời thoại vẫn là prototype chưa đối chiếu đầy đủ FE3; chương 2 đang 30×13 thay vì 30×15 theo nguồn FE3. Hai bản đồ từng không có đường đi bộ tới cổng; đã nối cầu và kiểm bằng test. Chương 1 nay chơi trọn trên Chromium, nhưng độ trung thực nội dung FE3, công thức combat/AI và ngân sách hiệu năng chưa đạt. |

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
  - Kết quả: PASS: Đã chuyển `src/`, `data/`, `public/`, `tests/`, manifest, lockfile, TypeScript/Vite config và `index.html` vào `Water-Emblem/`; kiểm `git ls-files` không còn mã nguồn được theo dõi ở ngoài. Chạy lại `npm test -- --run` 47/47 và `npm run build` PASS từ thư mục mới ngày 2026-11-13.

- [x] 17. Chốt cấu trúc và nơi sở hữu file mã nguồn.
  - Tiêu chí xong: Chủ dự án duyệt một cây thư mục và bảng sở hữu nội dung; hướng dẫn trong repo được cập nhật để AI không tạo file trùng trách nhiệm.
  - Kết quả: PASS: Chủ dự án đã duyệt cấu trúc và khử trùng lặp; bảng sở hữu file được ghi trong AGENTS.md, chương JSON tham chiếu characterId/weaponId/mapId, loader dựng state; 47/47 unit test và build PASS.

- [x] 18. Đối chiếu nội dung chiến dịch với FE3 theo từng chương.
  - Tiêu chí xong: Mỗi chương có nguồn FE3 cho bản đồ, mục tiêu, quân, thu phục, viện binh và hội thoại; khác biệt gameplay được ghi rõ; không lấy FE1/FE11 làm nguồn thay thế.
  - Kết quả: PASS: Đã lập bảng đối chiếu hai chương đang có tại `reports/fe3-book1-ch1-ch2-audit.md`, gắn nguồn FE3 riêng cho bản đồ, mục tiêu, quân/chiêu mộ, sự kiện và hội thoại, ghi sai lệch dữ liệu rõ ràng; không lấy FE1/FE11 thay nguồn FE3. Đã sửa mục tiêu, đội ban đầu, trang bị/chỉ số boss, Slim Lance và hội thoại chính; kiểm 47/47 unit test và bài chơi trọn chương 1 Chromium. PASS này xác nhận công việc **đối chiếu**, không xác nhận dữ liệu prototype đã giống FE3: chương 1 còn thiếu 8 địch, chương 2 mới 30×13 thay vì 30×15 và thiếu 11 địch, vị trí ô và hệ thống vật phẩm/làng chưa hoàn thiện.

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

- [x] 3. Chạy được vòng chơi tối thiểu trên một bản đồ.
  - Tiêu chí xong: Trình duyệt tải được bản đồ thử; chọn và di chuyển đơn vị theo địa hình, hiển thị vùng di chuyển/nguy hiểm, kết thúc và chuyển lượt; thao tác sai không làm hỏng state. Logic chạy được không cần renderer và có test cho đường đi, tầm di chuyển, lượt.
  - Kết quả: PASS: Playwright Chromium 7/7 đã chọn/di chuyển/chờ trong 3D, hiển thị canvas, tự chạy AI khi 7 quân chờ và qua hai lượt; Vitest 47/47 gồm grid, pathfinding, turn; build PASS.

- [ ] 4. Hoàn thành chiến đấu và AI cho bản đồ thử.
  - Tiêu chí xong: Dự báo và thực hiện giao tranh đúng các quy tắc đã duyệt trong `Game_Design/battle.md`; tam giác vũ khí, vũ khí khắc class, AI và nguồn RNG cho kết quả tái lập; AI không dùng thông tin bị che. Test tự động bao phủ các công thức và tình huống biên đã chọn, một trận thử kết thúc được.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chủ dự án chốt công thức combat, support, RNG và trọng số AI trong Game_Design/battle.md. Bài chơi trọn chương 1 trên Chromium và unit test đã PASS với công thức prototype; các kết quả đó chưa xác nhận công thức là luật đã duyệt.

- [ ] 5. Đưa bản đồ thử sang 3D low-poly.
  - Tiêu chí xong: Bản đồ, đơn vị, camera và chỉ báo nước đi hiển thị trong Three.js; cùng thao tác tạo cùng kết quả game như bản logic; kiểm tay trên trình duyệt mục tiêu và đo FPS, draw calls, triangles theo ngân sách được chốt.
  - Kết quả: CHỜ NGƯỜI DÙNG: 3D tương tác trên Chromium đã PASS, nhưng cần chủ dự án chốt thiết bị/trình duyệt mục tiêu và ngân sách FPS, draw calls, triangles để đo hiệu năng theo tiêu chí.

- [x] 6. Hoàn thiện một chương chơi được từ đầu đến cuối.
  - Tiêu chí xong: Vào chương, chuẩn bị đội, chơi, thắng/thua, hội thoại cần thiết, viện binh có cảnh báo khi chương FE3 có sự kiện đó, lưu/tải và chuyển chương hoạt động; có bài kiểm tra luồng chính trên trình duyệt. Dữ liệu và quyền sử dụng asset của chương được kiểm trước khi đưa vào bản phát hành.
  - Kết quả: PASS: Playwright Chromium đã chơi trọn chương 1 trên bản đồ prototype từ hội thoại mở đầu, di chuyển/giao tranh thực, hạ Gazzak, chiếm cổng, hội thoại kết chương đến màn chuẩn bị và vào trận chương 2; bài này chỉ đọc bản lưu để quyết định nước đi, không sửa bản lưu. Các bài Chromium khác kiểm thua/chơi lại, lưu/tải, đội dự bị và quân thu phục; tổng 7/7 PASS, Vitest 47/47, build PASS. Chương 1–2 FE3 không có viện binh giữa trận nên không tạo sự kiện giả. Độ trung thực dữ liệu FE3 và chuẩn bị trang bị/vị trí còn ở mục 18; chưa dùng kết quả này làm bằng chứng phát hành.

- [ ] 7. Mở rộng chiến dịch theo phạm vi được duyệt.
  - Tiêu chí xong: Mỗi chương trong danh sách đã duyệt có dữ liệu bản đồ, nhân vật, mục tiêu, sự kiện và bài chơi thử đạt; lưu/tải qua ranh giới chương không mất tiến độ. Ghi số chương thực tế, không dùng số chương ước tính trong đề án làm kết quả.
  - Kết quả: CHỜ NGƯỜI DÙNG: Cần chủ dự án chốt số chương và thứ tự ưu tiên sau khi mục 6 đạt tiêu chí.

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
