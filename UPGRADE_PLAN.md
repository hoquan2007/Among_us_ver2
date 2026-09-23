# Nâng cấp trải nghiệm chơi desktop

## Mục tiêu

Người chơi nhận ra đường đi, vị trí nhiệm vụ và phòng họp ngay trong trận; di chuyển mượt giữa các bản tin WebSocket; mỗi nhiệm vụ hoàn thành được và có xác nhận từ server; hạ gục có chuyển động rõ ràng. Giữ mô hình miễn phí Vercel + Cloudflare Worker.

## Các bước thực hiện

1. **Sửa luồng nhiệm vụ.** Chỉnh ghép dây đúng màu, chặn phím hành động và di chuyển khi mini game mở, chỉ đóng nhiệm vụ khi snapshot xác nhận hoàn thành. Kiểm thử đi tới trạm và hoàn tất một nhiệm vụ với 4 client.
2. **Thiết kế lại tàu.** Mở rộng bản đồ lên 1600 × 1000, tạo 7 phòng với lối vào thực và phòng họp trung tâm. Dùng chung hình học va chạm giữa trình duyệt và Worker. Kiểm tra mọi trạm, lỗ thông hơi và điểm sửa lò đều đi tới được.
3. **Làm mượt chuyển động.** Camera theo người chơi; nội suy vị trí trên mỗi khung hình; bước chân, nhịp thân và kính nhân vật chuyển động. Server vẫn quyết định vị trí và luật chơi.
4. **Hiệu ứng hạ gục.** Worker phát sự kiện hạ gục ngắn hạn, trình duyệt dựng cú lao, vệt chém, vòng xung và xác. Không tiết lộ danh tính hoặc vị trí ngoài phạm vi quan sát.
5. **Hoàn thiện UX/UI.** Màn vào phòng, sảnh, HUD, danh sách nhiệm vụ theo phòng, bản đồ nhỏ, nút và mini game cùng một ngôn ngữ hình ảnh. Ưu tiên màn hình desktop.
6. **Kiểm thử và triển khai.** Typecheck, build, smoke test phòng, nhiệm vụ và hạ gục; kiểm tra bằng trình duyệt; deploy Worker rồi đẩy frontend lên GitHub để Vercel build.

## Tiêu chí nghiệm thu

- Có thể đi từ phòng họp đến cả năm trạm nhiệm vụ, làm nhiệm vụ và nhìn thấy tiến độ tăng.
- Có thể tạo phòng, vào bằng mã/link, bắt đầu trận, họp và bỏ phiếu như trước.
- Di chuyển không giật theo chu kỳ bản tin; hạ gục có hiệu ứng đồng bộ với xác trên bản đồ.
- Website production và Worker dùng cùng một phiên bản hình học bản đồ.
