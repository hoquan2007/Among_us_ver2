# Kiểm tra chất lượng và lộ trình Starship Suspects

## Phạm vi kiểm tra phiên này

Đã đọc luồng giao thức, Worker/Durable Object, giao diện và renderer bản đồ; kiểm thử hình học cả map 16/22 phòng, nhiệm vụ cánh mới, ván 10 người, chat, họp, kết nối lại và ba kiểu phá hoại bằng nhiều WebSocket. Đây là các lỗi tìm được trong phạm vi trên; việc chạy hết các kịch bản không chứng minh game không còn lỗi nào.

| Mức | Phát hiện | Xử lý |
| --- | --- | --- |
| Cao | Client gửi lại `taskStart` mỗi 700 ms khiến Worker xóa tiến độ mini game và đặt lại thời điểm bắt đầu; nhiệm vụ dài dễ không hoàn thành. | Cố định mã phiên cho mỗi lần mở nhiệm vụ; retry cùng phiên không xóa bước; đóng nhiệm vụ gửi `taskCancel`; gói bước/hoàn thành phiên cũ bị bỏ qua. |
| Trung bình | Hai người trùng tên dùng chung hạn mức chat 5 tin/10 giây. | Hạn mức tính bằng ID người chơi; kiểm tra với hai người tên Echo. |
| Trung bình | WebSocket cũ có thể trả snapshot sau khi người chơi chuyển phòng, ghi đè giao diện phòng mới. | Đóng socket trước khi nối phòng khác; chỉ xử lý sự kiện từ socket hiện hành. |
| Trung bình | Bấm tạo phòng nhiều lần khi yêu cầu mạng đang chờ có thể tạo nhiều phòng. | Khóa nút và hàm tạo phòng trong lúc chờ. |
| Trung bình | Hành động đến ngay sau hạn nổ lò có thể được xử lý trước khi alarm chạy. | Kiểm tra hạn lò ở đầu mỗi hành động. |
| Trải nghiệm | Map rộng 22 phòng nhưng không có sơ đồ toàn tàu hoặc chỉ dẫn trực quan đến nhiệm vụ. | Thêm bản đồ chiến thuật bằng phím M, hiển thị hành lang, phòng, vị trí bản thân, nhiệm vụ còn lại và trạm sửa sự cố. |
| Hình ảnh | Các phòng thiếu phân lớp ánh sáng, biển tên nổi bật và mép cửa dễ đọc. | Bổ sung ánh sáng, biển phòng và khung cửa ở Canvas. |

## Kế hoạch triển khai và nghiệm thu

1. **Ổn định gameplay (đã triển khai):** phiên nhiệm vụ có định danh, chống gói tin cũ, chat theo ID, chống tạo phòng trùng, kiểm tra hạn lò. Nghiệm thu bằng kịch bản 10 người, nhiệm vụ và phá hoại.
2. **Điều hướng và hình ảnh map (đã triển khai):** sơ đồ 16/22 phòng, nhiệm vụ và sự cố; tăng độ sâu màu, ánh sáng và vật thể trong phòng, giữ hình học va chạm ở thư viện chung. Nghiệm thu trên desktop: người chơi tìm được phòng họp, nhiệm vụ và hai trạm lò bằng map.
3. **Đo và tối ưu (tiếp theo):** đo FPS ở 1080p trên thiết bị tầm trung, thời gian tải asset và độ trễ 10 người; lưu nền tĩnh theo vùng nếu renderer không giữ được 60 FPS. Chỉ tăng kích thước bản đồ sau khi đo thời gian di chuyển và tỷ lệ gặp nhau trong trận thật.
4. **Nội dung và giữ chân (tiếp theo):** thêm nhiệm vụ có cơ chế mới cho các phòng hiện chưa có trạm, tín hiệu âm riêng theo khu, hướng dẫn ván đầu và chế độ khán giả rõ ràng. Cân bằng số nhiệm vụ và thời gian phá hoại từ số liệu ván thật.
5. **Phát hành an toàn (tiếp theo):** kiểm thử tự động tạo/vào phòng, nhiệm vụ, họp và sự cố trong CI; theo dõi lỗi client và Worker, ghi phiên bản giao thức trong log. Giữ Vercel cho web và Cloudflare Worker/Durable Object trong hạn mức miễn phí, theo dõi hạn mức khi số người chơi tăng.

## Rủi ro còn lại

- Chưa có đo FPS thực trên nhiều máy, vì vậy mức mượt của map nhiều hiệu ứng cần kiểm chứng với người chơi thật.
- Ván và phòng đang hoạt động lúc deploy phiên bản giao thức mới có thể yêu cầu tải lại trang; nên phát hành ngoài giờ đông người.
- Map hiện có 22 phòng ở ván từ 7 người; mở thêm phòng ngay sẽ kéo dài quãng di chuyển. Ưu tiên làm phòng hiện tại giàu chi tiết và có nhiệm vụ riêng trước khi mở rộng tiếp.
