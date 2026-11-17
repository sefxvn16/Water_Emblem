# Ghi lại kịch bản e2e cố định cho từng chương

`tests/browser/chapterReplay.spec.ts` phát lại một chuỗi thao tác cố định (`tests/browser/fixtures/chapterN.replay.json`) với seed RNG cố định (`/?seed=<n>`). Chuỗi đó được ghi một lần từ bot tự chơi trong thư mục này. Bot không chạy trong gate.

## Khi nào phải ghi lại

Khi thay đổi làm chuỗi cũ không còn thắng: sửa bản đồ, vị trí quân, chỉ số, công thức, AI, hoặc tên nút. Ghi lại là thay test fixture, nên phải ghi lý do trong `PLAN.md` và được chủ dự án duyệt (theo `AGENTS.md`, mục Kiểm thử).

## Cách ghi

Từ `Water-Emblem/`:

```bash
npx playwright test -c tools/e2e_record/playwright.record.config.ts --reporter=line
```

- `recorder.ts` bắt mọi click ở mức `document`: ô (`data-testid="tile-x-y"`), nút (text của nút), `select`. Bước loại `unknown` trong fixture nghĩa là bot bấm vào phần tử khác; phải sửa recorder hoặc spec phát lại trước khi dùng.
- Seed nằm ở `SEED` trong `recorder.ts`. Fixture lưu cùng seed.
- Sau khi ghi: chạy `npx playwright test tests/browser/chapterReplay.spec.ts` ít nhất hai lần; cả hai phải PASS mới commit fixture.

## Giới hạn

Fixture chỉ chứng minh luồng 2D chạy được đến STAGE CLEAR với một chuỗi nước đi. Luật chơi được kiểm bằng unit test trong `tests/core/`. Lượt ghi ngày 2026-11-17 (seed 20261117) không có bước chiêu mộ Castor/Navarre; chiêu mộ được kiểm ở `tests/core/chapterEvents.test.ts`.
