# Starship Suspects

Game suy luận xã hội 2D, chơi 4–10 người qua trình duyệt desktop. Mỗi trận nằm trong phòng riêng với mã 6 ký tự hoặc link mời. Luật cốt lõi dựa trên thể loại của Among Us; đồ họa, tên và bản đồ được tạo riêng.

## Có thể chơi gì?

- Phe phi hành đoàn: làm 5 nhiệm vụ, báo cáo xác, họp và bỏ phiếu tìm kẻ phá hoại. Ma vẫn có thể làm nhiệm vụ.
- Phe phá hoại: hạ gục, dùng lỗ thông hơi, giả làm nhiệm vụ, tắt đèn, khóa cửa hoặc kích hoạt lò phản ứng.
- Thắng bằng nhiệm vụ, loại hết kẻ phá hoại, đạt thế cân bằng quân số hoặc để lò phản ứng hết giờ.
- Phòng có host, chơi lại, kết nối lại trong 60 giây và chat trong họp. Vai chỉ được gửi riêng cho người chơi tương ứng.

## Chạy trên máy

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run dev:server
```

Mở terminal thứ hai:

```bash
npm run dev:web
```

Truy cập `http://localhost:5173`. Mặc định frontend kết nối Worker ở `http://localhost:8787`. Để thử 4 người, mở các trình duyệt hoặc cửa sổ riêng rồi vào cùng mã phòng. Có thể chạy `npm run smoke` khi Worker đang hoạt động; kiểm thử này tạo 4 WebSocket, bắt đầu ván, mở họp, bỏ phiếu và kiểm tra trở lại trận.

Điều khiển: **WASD** hoặc phím mũi tên để di chuyển, **E** tương tác, **Q** hạ gục, **V** đi thông hơi. Các hành động cũng có nút trong bảng bên phải.

Tàu hiện có 7 khu vực và camera theo người chơi. Trước khi deploy, chạy `node scripts/check-map.mjs` để kiểm tra đường đi tới các trạm. Khi Worker đang chạy, dùng `node scripts/smoke.mjs --task --quick` để thử hoàn thành nhiệm vụ và `node scripts/smoke.mjs --kill` để thử hạ gục. Các bước nâng cấp và tiêu chí nghiệm thu nằm trong `UPGRADE_PLAN.md`.

## Deploy miễn phí

Hệ thống gồm hai phần: website tĩnh trên Vercel Hobby và Worker/Durable Object trên Cloudflare Workers Free. Không cần mua domain.

### 1. Cloudflare realtime

1. Tạo tài khoản Cloudflare và đăng nhập Wrangler: `npx wrangler login`.
2. `WEB_ORIGIN` trong `apps/realtime/wrangler.jsonc` đang đặt là `https://amongusver2.vercel.app`. Nếu đổi domain production, cập nhật giá trị này cho khớp chính xác (không có `/` cuối) rồi deploy Worker lại.
3. Chạy `npm run deploy:server`. Ghi lại URL `https://starship-suspects-realtime.<subdomain>.workers.dev` mà Wrangler trả về.
4. Worker dùng migration `new_sqlite_classes`, nên Durable Objects hoạt động trên gói Free. Không thêm database ngoài.

### 2. Vercel frontend

1. Đẩy repo lên tài khoản Git cá nhân rồi import vào Vercel. Khuyến nghị **Root Directory là thư mục gốc repo**; `vercel.json` đã chỉ định lệnh build, thư mục output và `npm ci --include=dev` để TypeScript có mặt khi build. Nếu Root Directory là `apps/web`, cấu hình tương ứng nằm trong `apps/web/vercel.json`; hãy bật **Include source files outside of the Root Directory in the Build Step** vì frontend dùng `packages/protocol`.
2. Trong Environment Variables, đặt `VITE_REALTIME_URL` là URL Worker ở bước 1, bắt đầu bằng `https://` và không có `/` cuối.
3. Deploy production. Nếu URL Vercel thực tế khác giá trị `WEB_ORIGIN`, sửa giá trị đó trong Wrangler và deploy Worker lại.
4. Mở URL Vercel trên hai máy/mạng khác nhau, tạo phòng và vào bằng link để kiểm tra HTTPS/WSS.

Preview deployment dùng domain khác production sẽ bị Worker từ chối vì `WEB_ORIGIN` chỉ cho phép một origin. Khi thử preview, tạm cấu hình origin preview tương ứng hoặc dùng Worker riêng cho preview.

### Hạn mức miễn phí

Vercel Hobby dành cho dự án cá nhân phi thương mại. Cloudflare Workers Free và Durable Objects Free có giới hạn request/ngày. Game gửi input khi di chuyển khoảng 8 lần/giây, và Durable Objects tính tin nhắn WebSocket đến theo tỷ lệ 20:1. Chơi nhiều phòng liên tục có thể chạm hạn mức; khi đó phòng mới/kết nối có thể lỗi đến lúc hạn mức reset. Theo dõi usage trong dashboard Cloudflare trước khi chia sẻ rộng.

## Kiểm tra trước khi phát hành

```bash
npm run check
npm run build
npm run smoke
```

`smoke` cần Worker local chạy ở cổng 8787. Kế hoạch và tiêu chí nghiệm thu chi tiết nằm trong [PLAN.md](PLAN.md).

## Cấu trúc

- `apps/web`: React, Vite và bản đồ Canvas.
- `apps/realtime`: Cloudflare Worker và Durable Object, giữ trạng thái mỗi phòng.
- `packages/protocol`: kiểu thông điệp, tọa độ bản đồ và tham số luật dùng chung.

Game hiện tập trung desktop và phòng riêng. Chưa có voice chat, phòng công khai, tài khoản hoặc giao diện cảm ứng hoàn chỉnh.
