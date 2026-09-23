# Kế hoạch nâng cấp Starship Suspects lên bản “Pro Max”

## Điểm xuất phát

Game hiện chạy trên desktop bằng React, Vite và Canvas 2D; mỗi phòng dùng một Cloudflare Durable Object để xử lý WebSocket. Tàu có 16 phòng, 8 nhiệm vụ, 3 phá hoại, họp và bỏ phiếu, tối đa 10 người. Website tĩnh ở Vercel.

## Ba phương án

| Phương án | Phạm vi | Công sức ước tính khi làm một mình | Đánh đổi |
| --- | --- | --- | --- |
| A. Nâng cấp Canvas hiện tại | Giữ trình vẽ, thay tài nguyên hình ảnh/âm thanh, tăng nhiệm vụ và tối ưu mạng | 4–6 tuần | Ra bản mới nhanh; hiệu ứng phức tạp và quản lý scene sẽ tốn công thủ công. |
| B. Game 2D chất lượng cao **(đề xuất)** | Dùng renderer 2D WebGL cho bản đồ và sprite; giữ React cho UI, Worker cho luật chơi | 8–12 tuần | Nâng chất lượng hình ảnh, hoạt ảnh và mở rộng map tốt hơn; cần giai đoạn chuyển renderer và bộ asset. |
| C. Đổi sang 2.5D/3D | Xây lại cảnh, nhân vật, camera và asset | Ít nhất 4–6 tháng | Tiềm năng hình ảnh cao nhưng chi phí sản xuất asset và rủi ro hiệu năng lớn; chưa phù hợp mục tiêu miễn phí. |

Các mốc thời gian chỉ để xếp thứ tự, không phải cam kết tiến độ. Chọn B nhưng triển khai từng lát: giữ bản production chơi được trong khi chuyển từng hệ thống.

## Tầm nhìn sản phẩm

- Một game suy luận xã hội có nhận diện riêng: tàu nghiên cứu bỏ hoang, bảng màu từng khu vực, bảng điều khiển và nhân vật nguyên bản. Không dùng tên, hình hay âm thanh lấy từ game khác.
- Ván chơi 8–12 phút, người mới hiểu mục tiêu trong 60 giây đầu, người chơi lâu có đủ tình huống để suy luận và đánh lừa.
- Máy tính là nền tảng chính; bàn phím và chuột đều dùng trơn tru. Người chơi có cấu hình thấp vẫn đạt mục tiêu 60 FPS ở độ phân giải 1080p.

## Lộ trình đề xuất

### Mốc 0 — Nền tảng vững trước khi thêm nội dung (1–2 tuần)

1. Chốt tài liệu luật và sơ đồ trạng thái ván chơi: sảnh, chơi, họp, bỏ phiếu, kết quả, kết thúc.
2. Phiên bản hóa thông điệp client/server, xác thực mọi hành động và điều kiện thắng ở Worker. Nhiệm vụ hiện chủ yếu xác nhận vị trí/thời gian; chuyển sang kiểm tra kết quả mini game ở server.
3. Bot kiểm thử 10 kết nối chạy trọn một ván: di chuyển, mất mạng, nối lại, phá hoại, báo cáo, bỏ phiếu, hết giờ.
4. Đo FPS, kích thước bundle, số tin WebSocket và CPU trước khi tối ưu. Chỉ gửi trạng thái thay đổi hoặc trạng thái cần thiết cho tầm nhìn của người chơi.

**Nghiệm thu:** 10 người có thể chơi trọn 20 ván tự động liên tiếp; không kẹt phòng, lộ vai hoặc mất đồng bộ trạng thái.

### Mốc 1 — Hình ảnh và cảm giác điều khiển (2–4 tuần)

1. Làm một *vertical slice* của ba phòng: phòng họp, lò phản ứng, phòng điện. Bộ asset nguyên bản gồm sàn/tường theo lớp, console, ống dẫn, cửa, ánh sáng, biển báo, hiệu ứng tương tác.
2. Chuyển renderer từ Canvas thủ công sang PixiJS WebGL theo từng scene; React tiếp tục giữ sảnh, HUD, họp và menu. Chưa chuyển toàn bộ map trước khi ba phòng mẫu đạt chất lượng mong muốn.
3. Nhân vật có sprite sheet: đứng, đi 8 hướng, tương tác, hạ gục, chết, đi thông hơi. Thêm bóng, chiều sâu lớp vẽ và hiệu ứng âm thanh riêng.
4. Camera mượt, culling đối tượng ngoài màn hình, sprite atlas và preload có tiến độ để tránh giật khi chuyển phòng.

**Nghiệm thu:** ba phòng mẫu đạt 60 FPS trên desktop mục tiêu; thao tác phản hồi ngay; không giật khi 10 người cùng di chuyển và có hiệu ứng.

### Mốc 2 — Gameplay sâu và công bằng (2–3 tuần)

1. Nâng từ 5 lên 10–12 nhiệm vụ với 6–8 kiểu mini game khác nhau; chia nhiệm vụ ngắn, dài và chung. Có phản hồi thành công rõ ràng, tránh lặp liên tục một thao tác.
2. Thêm phá hoại oxy và liên lạc, camera an ninh và bảng quản lý vị trí. Mỗi hệ thống tạo thông tin mới để suy luận và có cách đối phó cụ thể.
3. Host chỉnh số kẻ phá hoại, số nhiệm vụ, thời gian họp/bỏ phiếu, hồi chiêu, tốc độ. Có preset “Nhanh”, “Chuẩn”, “Căng thẳng”, kèm giới hạn giá trị trên server.
4. Cải thiện cân bằng bằng dữ liệu: tỷ lệ thắng hai phe, thời lượng ván, số lần hoàn thành nhiệm vụ, số cuộc họp không loại ai.

**Nghiệm thu:** mọi nhiệm vụ và phá hoại có đường đi, chỉ dẫn, âm thanh và test tự động; preset chuẩn không bị một phe áp đảo rõ qua các buổi chơi thử.

### Mốc 3 — Trải nghiệm người chơi (1–2 tuần)

1. Onboarding tương tác trong sảnh và ván tập với bot; minimap đánh dấu nhiệm vụ, sự cố và hướng đi.
2. Giao diện họp: lịch sử chat, trạng thái đã bỏ phiếu, kết quả rõ, phím tắt và đồng hồ dễ đọc. Có tùy chọn giảm chuyển động, họa tiết bổ trợ cho người khó phân biệt màu.
3. Âm thanh theo khu vực và trạng thái: ambient nhẹ, tiếng bước chân, cửa, console, phá hoại, họp; thanh âm lượng nhạc/hiệu ứng riêng.
4. Sảnh và màn kết thúc có thống kê ván, đổi màu/phụ kiện cơ bản lưu trên máy, nút chơi lại nhanh.

**Nghiệm thu:** người mới tự tạo phòng, mời bạn và hoàn thành nhiệm vụ đầu tiên mà không cần hướng dẫn ngoài game.

### Mốc 4 — Tối ưu và phát hành rộng hơn (1–2 tuần)

1. Theo dõi lỗi client và Worker ở mức ẩn danh, không lưu nội dung chat lâu dài. Kiểm tra load nhiều phòng và thiết lập ngưỡng cảnh báo tài nguyên.
2. Thử trên các trình duyệt desktop chính, mạng chậm và màn hình nhỏ. Dùng mức đồ họa Thấp/Vừa/Cao.
3. Tạo trang hướng dẫn luật, changelog, kênh nhận báo lỗi; triển khai theo từng phiên bản nhỏ có khả năng quay lại bản cũ.

**Nghiệm thu:** cùng một build qua bài test tính năng, hiệu năng và kết nối lại trước khi đẩy production.

## Hạ tầng miễn phí và giới hạn thiết kế

- Giữ Vercel cho frontend tĩnh và Cloudflare Worker/Durable Objects cho trận đấu. Durable Objects với WebSocket Hibernation phù hợp phòng chơi ngắn; không cần database tài khoản trong các mốc đầu.
- Không gửi ảnh/âm thanh qua WebSocket; đưa asset tĩnh vào bundle/CDN và chỉ đồng bộ hành động/trạng thái. Giảm tin di chuyển khi đứng yên, gộp thông điệp khi thích hợp, cân nhắc delta snapshot sau khi đo thực tế.
- Vercel Hobby dành cho dự án cá nhân phi thương mại. Cloudflare Free có giới hạn request và Durable Object theo ngày; theo dõi Usage trước khi mở phòng công khai hoặc marketing rộng.
- Hoãn voice chat, matchmaking công khai, tài khoản và lưu replay dài hạn: các mục này tăng chi phí vận hành, moderation và độ phức tạp hơn nhiều so với giá trị trước mắt.

## Việc nên làm đầu tiên

Mở một nhánh phát triển cho mốc 0 và một prototype hình ảnh của ba phòng mốc 1. Chốt phong cách hình, sprite mẫu và KPI hiệu năng trước khi vẽ lại cả 16 phòng. Sau khi prototype được duyệt, chuyển các phòng còn lại theo cùng bộ quy tắc art và layout.

## Tiến độ triển khai

- Đã bổ sung xác thực chuỗi thao tác nhiệm vụ trên Worker và ba nhiệm vụ mới: oxy, kho hàng, tần số. Bài kiểm thử xác nhận Worker từ chối hoàn thành thiếu bước.
- Đã kiểm thử 10 kết nối, hai vai phá hoại bí mật, biểu quyết và nối lại. Chưa đạt tiêu chí 20 ván tự động trọn vẹn.
- Đã tạo bộ nền đồ họa mẫu cho phòng họp, lò phản ứng và phòng điện, đồng thời cắt giảm số phòng/vật thể vẽ ngoài camera. Renderer vẫn là Canvas; chuyển sang WebGL/PixiJS còn là bước tiếp theo.
- Minimap đã chỉ nhiệm vụ chưa làm và điểm sửa phá hoại. Các mục còn lại của mốc 1–4 tiếp tục là backlog, chưa được coi là hoàn thành.
- Host có thể chọn ba preset nhịp chơi; Worker quyết định số nhiệm vụ và đồng hồ họp/bỏ phiếu, hồi chiêu cho toàn phòng. Giao thức snapshot có phiên bản để báo lỗi khi client/server không tương thích.
