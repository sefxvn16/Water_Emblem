# CHECKLIST — bắt buộc cho mọi AI và người làm trong repo này

Một trang này là luật tối thiểu. Claude, Antigravity, Muse hay người: cùng các bước, cùng các lệnh.
Không có bước nào trong đây được bỏ qua bằng cách "báo là đã làm". Mỗi bước có một lệnh tự chạy.

Bật cổng một lần cho mỗi clone (nếu chưa):

    git config core.hooksPath .githooks

## Trước khi làm

1. `git status` — còn thay đổi chưa commit thì hỏi chủ dự án, không gộp vào việc của mình.
2. Mở `PLAN.md`, tìm mục mà việc này thuộc về. Không có mục thì **thêm mục mới trước khi viết code**.
3. Mục mới phải có dòng `Tiêu chí xong:` với ít nhất một bằng chứng máy kiểm được:
   - `test: Water-Emblem/tests/core/<file>.test.ts > <tên test>` — việc có thể test tự động, hoặc
   - `manual: <đường dẫn ảnh/log trong repo>` — việc chỉ kiểm được bằng mắt (giao diện, bản đồ).
   Không có dòng này thì `done.mjs check` sẽ từ chối, nên không khai báo xong được.
4. Nhánh riêng: `git switch -c cs/<task-id>`. Không làm trực tiếp trên `main`.
5. Dòng `Kết quả:` của mục đang làm ghi `ĐANG LÀM: <đang làm gì>`.
6. **Khai báo phạm vi trước khi sửa code** — ghi `.studio/scope.json`:

       {
         "task_id": "<task-id>",
         "plan_items": [<số mục>],
         "declared_by": "<tên AI>",
         "allow": ["Water-Emblem/src/ui/ActionMenu.tsx", "Water-Emblem/tests/core/x.test.ts"]
       }

   `node .studio/done.mjs scope` chặn mọi file thay đổi ngoài `allow`, và **file mới phải ghi đúng
   đường dẫn** — glob như `src/ui/**` không cấp quyền tạo file mới. `plan_items` phải trỏ mục có thật.
   `allow` không được chứa `**`, `*`, `**/*`.

   Đây là chỗ chặn việc tự bịa thêm chức năng: màn hình mới, module mới, cơ chế mới đều là file mới
   hoặc file ngoài phạm vi, nên bị chặn commit. Thấy cần làm thêm: ghi mục mới vào `PLAN.md`, báo chủ
   dự án, chờ duyệt, rồi mới mở rộng `allow`. Tự nới `allow` để lọt việc không ai yêu cầu là vi phạm,
   và chủ dự án thấy ngay vì `scope.json` là một file nhỏ, mỗi dòng một đường dẫn.

## Khi làm

- Chỉ sửa đúng phạm vi mục được giao. Phát hiện thêm việc: ghi thành mục mới trong `PLAN.md`, không tự làm.
- **Không sửa, làm yếu, bỏ qua hay xóa test có sẵn để thay đổi pass.** `guard.mjs` đếm số `it()/test()`,
  số `expect()` và số `.skip/.only/.todo`; giảm test hoặc thêm skip là bị chặn commit và chặn push.
- **Không sửa `.studio/**`, `.githooks/**`, `.github/workflows/**`.** Đây là cổng kiểm; chỉ chủ dự án đổi.
- Cần đổi test hoặc cổng thật: dừng, báo chủ dự án, nêu lý do, chờ duyệt.
- `WE_GATE_CHANGE_OK=1` chỉ được dùng khi **chủ dự án ra lệnh đổi cổng ngay trong lượt đó**. Khi dùng,
  phải ghi nguyên văn câu lệnh của chủ vào commit message, để chủ soát lại được. Tự đặt biến này mà
  không có lệnh của chủ trong lượt đó là vi phạm nặng nhất trong repo này. CI không nhận biến này,
  nên cổng bị sửa vẫn FAIL trên GitHub cho tới khi chủ dự án duyệt PR.

## Khi khai báo xong — đúng 3 lệnh, đúng thứ tự

    git add -A && git commit -m "<mô tả thay đổi>"
    node .studio/done.mjs gate
    node .studio/done.mjs check <số mục>

- `gate` chạy test + build + e2e và ghi kết quả vào `.studio/last-gate.json` (kèm commit SHA).
- `check` chỉ in dòng `DONE-OK <mục> <sha> <ngày>` khi **đủ cả 5**: mục có tiêu chí; tiêu chí trích dẫn
  test/manual tồn tại thật và đã commit; gate PASS **0 lỗi**; gate chạy ở đúng commit HEAD hiện tại;
  cây làm việc sạch. Thiếu điều nào, nó in ra đúng điều đó và **exit 1**.
- Dán nguyên dòng nó in vào `PLAN.md`, rồi mới đánh `[x]`:

      - Kết quả: PASS: <bằng chứng ngắn> · DONE-OK 169 a1b2c3d4e5f6 2026-11-20

Không có token `DONE-OK` (hoặc `DONE-MANUAL`) thì mục **không được tính là xong**: `pre-commit` chặn commit,
`pre-push` chặn push, CI chặn merge. Tự gõ token bằng tay cũng vô dụng: `audit` kiểm commit trong token có
thật và có nằm trong lịch sử HEAD hay không.

Việc chỉ kiểm được bằng mắt thì `check` in `DONE-MANUAL`: vẫn phải có ảnh/log trong repo, và chủ dự án
còn phải tự xác nhận. Không dùng `manual:` cho việc test tự động được.

## Một cái bẫy khi viết mục PLAN

Trong một mục, chỉ dòng trạng thái được chứa nhãn trạng thái. Đừng trích dẫn nhãn đó trong dòng
`Tiêu chí xong`, `Nguồn` hay ghi chú: trình kiểm của Claude (`plan_gate.py`) lấy **dòng đầu tiên**
trong khối mục có chứa nhãn làm dòng trạng thái, nên nó sẽ đọc nhầm dòng trích dẫn và báo mục chưa xong.
Cần nói về định dạng thì viết diễn giải ("dòng trạng thái", "mục đã tích"), đừng chép nguyên nhãn.

## Chủ dự án kiểm trong một lệnh

    node .studio/done.mjs audit --rerun

Chạy lại toàn bộ gate, rồi soát mọi mục `[x]`: sai định dạng, thiếu token, token trỏ commit không tồn tại,
test được trích dẫn đã biến mất — in ra hết. `--all` để xem cả các mục cũ dưới ngưỡng.

## Ba lớp chặn (càng về sau càng khó lách)

| Lớp | Khi nào | Chặn gì | Lách được không |
|---|---|---|---|
| `pre-commit` | mỗi commit | sửa cổng, làm yếu test, ra ngoài phạm vi, mục `[x]` thiếu token | `--no-verify`, hoặc không bật `core.hooksPath` |
| `pre-push` | mỗi push | như trên + `PLAN.md` sai định dạng + gate đầy đủ | `--no-verify` |
| CI `gate.yml` | mỗi push/PR lên GitHub | cả ba thứ trên, chạy lại từ đầu | không, trừ khi chủ dự án tắt |

Định dạng `PLAN.md` còn được kiểm bằng test (`Water-Emblem/tests/core/planFormat.test.ts`), nên nó cũng
nằm trong `npm test` và trong gate: sai định dạng là test đỏ, không chỉ là hook cảnh báo.

Vì hai lớp đầu lách được từ máy, **CI là lớp quyết định**. Chủ dự án nên bật branch protection cho `main`:
yêu cầu check `gate` PASS mới merge được.

## Điều cổng này không làm được

Nó không đọc được code có đúng ý chủ dự án hay không. Nó bắt buộc phải có test và bắt buộc test phải
xanh 0 lỗi, nhưng một test rỗng vẫn qua được. Việc đọc xem test có kiểm đúng cái cần kiểm là của chủ dự án
và của người/AI rà soát. Đừng dùng cổng này làm lý do để nói "đã đủ".
