# Kế hoạch xây dựng game suy luận xã hội nhiều người chơi trên web

## 1. Hiện trạng và mục tiêu

Repo hiện chỉ có `README.md`; chưa có ứng dụng hay hạ tầng. Mục tiêu bản phát hành đầu là một game 2D nhìn từ trên xuống, chơi trực tiếp trên trình duyệt bằng mã phòng/link mời. Người chơi không cần tài khoản. Giao diện và hình ảnh sẽ có tên, bản đồ, nhân vật và âm thanh riêng. Luật cốt lõi bám sát Among Us; tên, asset và bản đồ được tự thiết kế để không phân phối bản sao trực tiếp nội dung của Innersloth.

**Phạm vi bản hoàn chỉnh đầu tiên:** 4–10 người/phòng; 1 bản đồ; 2 phe; phòng chờ và cài đặt; phân vai bí mật; di chuyển, tầm nhìn, nhiệm vụ, hạ gục, báo cáo, họp, thảo luận, bỏ phiếu, lỗ thông hơi, phá hoại, thắng/thua, chơi lại; tự nối lại khi mất mạng. Ưu tiên bàn phím + chuột trên desktop; hỗ trợ điện thoại là giai đoạn sau. Có thể chơi qua mạng thật, không phụ thuộc các tab trên cùng một máy.

**Ngoài phạm vi đợt đầu:** ghép trận công khai, tài khoản, bảng xếp hạng, voice chat, nhiều bản đồ, skin trả phí, ứng dụng native và giao diện điều khiển cảm ứng hoàn chỉnh. Những phần này chỉ thêm sau khi vòng chơi cơ bản ổn định.

## 2. Kiến trúc đề xuất

```text
Trình duyệt (React + Phaser)
  ├─ HTTPS → ứng dụng tĩnh trên Vercel
  └─ WSS   → Cloudflare Worker → Durable Object của từng phòng
                                  └─ SQLite của Durable Object: trạng thái phòng
```

- **Frontend:** Vite + React + TypeScript cho màn hình, menu, chat và UI; Canvas 2D cho bản đồ, nhân vật và hiệu ứng tầm nhìn. Deploy frontend tĩnh lên Vercel Hobby, không dùng Vercel Functions trong luồng chơi.
- **Realtime:** Cloudflare Worker nhận kết nối WebSocket; mỗi phòng có một Durable Object làm máy chủ có thẩm quyền. Object xử lý hành động theo thứ tự, giữ timer và phát trạng thái phù hợp cho từng người. Deploy Worker riêng qua Wrangler.
- **Lưu trữ:** SQLite gắn với Durable Object lưu cấu hình/phân vai/tiến trình cần phục hồi; thông tin phiên người chơi và trạng thái ngắn hạn được khôi phục khi object khởi động lại. Tự xóa phòng hết hạn.
- **Chia sẻ mã:** monorepo TypeScript với `apps/web`, `apps/realtime`, `packages/protocol`, `packages/game-rules`. Client và server cùng kiểu thông điệp, nhưng kiểm tra luật và bí mật chỉ thực hiện ở server.

Vercel đã công bố WebSocket trong Functions ở **public beta** (22/06/2026). Dù vậy, Function có thể chạy trên nhiều instance, nên không thể dùng biến trong bộ nhớ của một Function làm trạng thái phòng đáng tin cậy. Mô hình một Durable Object cho một phòng làm việc này trực tiếp hơn. Kết quả là **website ở Vercel, realtime ở Cloudflare**; cần hai lần cấu hình/deploy và một biến môi trường `VITE_REALTIME_URL` ở frontend. Nếu bắt buộc toàn bộ ở Vercel, phải thiết kế lại tầng trạng thái chung và đo thử giới hạn của beta trước khi cam kết vận hành.

**Điều kiện 0 đồng:** dùng Vercel Hobby cho dự án cá nhân phi thương mại, Cloudflare Workers Free và Durable Objects dùng SQLite. Không dùng dịch vụ trả phí, không cần domain riêng (`*.vercel.app` và `*.workers.dev`). Gói miễn phí có hạn mức, nên đây là kiến trúc để bạn bè chơi thử, chưa cam kết phục vụ lượng lớn người dùng cùng lúc. Workers Free và Durable Objects Free đều có mốc 100.000 request/ngày; tin nhắn WebSocket đến Durable Object được tính theo tỷ lệ 20:1. Ví dụ 10 người gửi input 10 lần/giây trong 1 giờ tạo khoảng 18.000 request tính phí cho Durable Object, chưa kể hành động khác. Vì vậy đặt nhịp input khoảng 5–8 Hz, chỉ gửi khi cần, giới hạn số phòng/người cùng lúc và theo dõi usage. Khi vượt ngưỡng free, yêu cầu có thể lỗi đến kỳ reset; không có phương án miễn phí nào bảo đảm vô hạn người chơi.

## 3. Luật chơi v1 cần chốt thành đặc tả

| Thành phần | Quy tắc đề xuất |
| --- | --- |
| Phòng | Phòng riêng bằng link mời hoặc mã 6 ký tự; host chuyển khi rời phòng, chỉ host bắt đầu khi đủ 4 người. |
| Vai | 1 kẻ phá hoại ở 4–6 người; 2 ở 7–10 người; phân vai ngẫu nhiên trên server. |
| Nhiệm vụ | Nhiệm vụ ngắn/dài/chung; 4 loại minigame ban đầu, số lượng tùy chỉnh; ma phe thiện tiếp tục làm nhiệm vụ. |
| Di chuyển | Client dự đoán để mượt; server kiểm tra tốc độ, va chạm, vị trí và tương tác. |
| Tầm nhìn | Server chỉ gửi thông tin được phép thấy; người chơi không nhận vai/vị trí bí mật của đối thủ. |
| Hạ gục và ma | Cự ly ngắn, thời gian hồi chiêu; xác được báo cáo; người chết thành ma, không bỏ phiếu và không nói chuyện với người sống. |
| Kẻ phá hoại | Đi qua lỗ thông hơi giữa các vị trí định sẵn; giả làm nhiệm vụ; phá đèn, cửa và một sự cố đếm ngược cần sửa tại hai điểm. |
| Họp | Báo cáo xác hoặc nút họp khẩn cấp có giới hạn; chat trong họp; thảo luận 60 giây, bỏ phiếu 30 giây, được bỏ qua; hòa phiếu hoặc đa số bỏ qua thì không ai bị loại. |
| Thắng | Phe thiện hoàn tất nhiệm vụ hoặc loại hết kẻ phá hoại; phe phá hoại thắng khi đạt thế cân bằng quân số hoặc sự cố đếm ngược hết hạn. |
| Mất kết nối | Giữ chỗ 60 giây bằng token phiên, cho nối lại; hết hạn thì áp dụng quy tắc rời trận. |

Các con số trên là mặc định để phát triển, được đưa vào cấu hình phòng và cân chỉnh qua playtest.

## 4. Các giai đoạn triển khai

### Giai đoạn 0 — Đặc tả và mẫu tương tác

- Chốt tên, phong cách hình ảnh riêng, sơ đồ bản đồ, vùng va chạm, vị trí nhiệm vụ và chuỗi màn hình.
- Vẽ state machine: `lobby → intro → playing → meeting/discussion → voting → result → playing/end`.
- Định nghĩa protocol có phiên bản, mã lỗi, hành động hợp lệ theo từng trạng thái; liệt kê dữ liệu riêng cho từng vai.
- **Hoàn thành khi:** có thể mô phỏng một ván trên giấy mà không còn luật mơ hồ.

### Giai đoạn 1 — Khung web và phòng chơi

- Tạo monorepo, frontend responsive, Worker/Durable Object, cấu hình local và CI.
- Tạo/join phòng bằng mã/link; nickname, màu nhân vật, quyền host, ready/start, giới hạn số người, xử lý trùng tên.
- Kết nối WebSocket, heartbeat, reconnect, đồng bộ snapshot khi vào lại, lỗi mạng dễ hiểu.
- **Hoàn thành khi:** 10 trình duyệt trên các thiết bị/mạng khác nhau vào cùng phòng và thấy danh sách nhất quán.

### Giai đoạn 2 — Vòng chơi realtime

- Bản đồ, camera, nhân vật, di chuyển WASD/phím mũi tên, tương tác chuột/phím tắt, va chạm, nội suy và dự đoán vị trí.
- Server nhận input và xác thực; phát trạng thái theo nhịp cố định, giảm gói gửi thừa.
- Phân vai; tầm nhìn theo vai; nhiệm vụ và tiến độ; hạ gục, xác, báo cáo, ma, lỗ thông hơi.
- **Hoàn thành khi:** một ván có thể đi từ bắt đầu đến kết thúc bằng nhiệm vụ hoặc hạ gục.

### Giai đoạn 3 — Họp, phá hoại và UX

- Họp, chat, bỏ phiếu, hòa phiếu, bỏ qua, loại người; các điều kiện thắng còn lại.
- Sự cố đèn, cửa và sự cố đếm ngược, sửa tại bản đồ; hướng dẫn đầu ván, âm thanh và accessibility cơ bản.
- **Hoàn thành khi:** mọi nhánh thắng/thua và quay lại phòng chờ chạy đúng ở 4–10 người.

### Giai đoạn 4 — Kiểm thử và phát hành

- Unit test cho state machine, điều kiện thắng, bỏ phiếu, timer; integration test cho nhiều client, reconnect và host rời phòng.
- Kiểm thử gian lận: gửi vị trí sai, hành động ngoài cự ly, spam thông điệp, đọc dữ liệu vai khác, dùng lại token.
- Playtest thật trên desktop; đo độ trễ, lưu lượng, CPU, lỗi reconnect và mức sử dụng free; chỉnh luật và UI.
- Deploy Worker production, đặt domain WSS, cấu hình CORS/origin; deploy frontend Vercel, biến môi trường, preview và production; kiểm tra hai người ở hai mạng khác nhau.
- **Hoàn thành khi:** chạy nhiều ván liên tiếp không kẹt trạng thái, có log lỗi và cách khởi động lại/phục hồi phòng.

## 5. Tiêu chí nghiệm thu phát hành

1. Tạo phòng, chia link và bắt đầu trận với 4–10 người ở các mạng khác nhau.
2. Không ai thấy vai bí mật của người khác qua UI hoặc payload mạng.
3. Hành động sai trạng thái, sai vị trí, quá tốc độ hoặc quá tần suất bị server từ chối.
4. Có thể hoàn thành một trận bằng từng điều kiện thắng; tất cả client nhận cùng kết quả.
5. Mất mạng ngắn và tải lại trang không phá ván; người chơi quay lại đúng vai/trạng thái.
6. Bỏ phiếu và timer cho kết quả nhất quán khi có người rời phòng.
7. Giao diện chơi được trên desktop bằng bàn phím/chuột, có hướng dẫn điều khiển.
8. Bản production trên Vercel kết nối realtime production qua HTTPS/WSS và có log để tra lỗi.

## 6. Thứ tự ưu tiên và ước lượng

Ước lượng cho một người phát triển toàn thời gian với asset 2D tự làm hoặc dùng asset hợp lệ: **6–10 tuần** đến bản v1 có thể mời bạn bè chơi; thêm thời gian nếu cần đồ họa/âm thanh chất lượng cao hoặc cân bằng nhiều bản đồ. Phần tốn thời gian nhất là luật trạng thái, đồng bộ realtime, chống gian lận và playtest, không phải màn hình menu. Nên phát hành thử nội bộ sau giai đoạn 2, rồi hoàn thiện giai đoạn 3–4. Bỏ giao diện cảm ứng ở v1 giúp tập trung hoàn thiện desktop trước.

## 7. Các quyết định đã chốt

- Luật bám sát Among Us: hai phe, nhiệm vụ, hạ gục, báo cáo, họp, bỏ phiếu, thông hơi, phá hoại và các điều kiện thắng tương ứng.
- Ưu tiên desktop. Điều khiển cảm ứng sau bản phát hành đầu.
- Phòng riêng bằng link và mã; không ghép trận công khai.
- Hạ tầng miễn phí, không mua domain; phải thiết kế theo hạn mức và thử nghiệm tải trước khi mở rộng.

## Nguồn kỹ thuật đã kiểm tra (23/09/2026)

- Vercel WebSocket public beta: https://vercel.com/changelog/websocket-support-is-now-in-public-beta
- Vercel Fluid Compute và nhiều instance: https://vercel.com/docs/fluid-compute
- Cloudflare Durable Objects WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare mô hình một object cho một phòng: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Cloudflare Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Cloudflare Workers Free limits: https://developers.cloudflare.com/workers/platform/limits/
- Vercel Hobby: https://vercel.com/docs/plans/hobby
- Among Us gameplay overview: https://www.innersloth.com/games/among-us/
- Innersloth fan creation policy: https://www.innersloth.com/fan-creation-policy/
