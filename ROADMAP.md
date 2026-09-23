# Kế hoạch phát triển Starship Suspects

## Bản cập nhật hiện tại

- Bản đồ 2.800 × 1.800 với 16 phòng; mỗi phòng có cửa và nhóm đồ vật nhận diện riêng. Bổ sung nhà kính, kho hàng, hệ thống không khí, khoang hàng và nhà chứa.
- Ba phá hoại: tắt đèn giảm tầm nhìn và sửa tại phòng điện; khóa toàn bộ cửa phòng trong 12 giây; lò phản ứng có 90 giây để hai người sửa tại hai đầu tàu, hai thao tác cách nhau tối đa 20 giây.
- Người còn sống có thể biểu quyết kết thúc cuộc họp trong giai đoạn thảo luận. Cần quá nửa số người còn sống và đang kết nối; kết thúc sớm thì không loại ai.
- Nhạc nền tổng hợp trong trình duyệt, âm lượng nhỏ, có nút bật/tắt và lưu lựa chọn trên máy người chơi.

## Giai đoạn tiếp theo

| Ưu tiên | Tính năng | Điều kiện hoàn thành |
| --- | --- | --- |
| 1 | Mini game nhiệm vụ đa dạng hơn | Ít nhất 8 nhiệm vụ với thao tác khác nhau, mỗi nhiệm vụ có kiểm tra kết quả trên server và hướng dẫn trong game. |
| 1 | Bản đồ và nhiệm vụ hỗ trợ định hướng | Minimap hiển thị vị trí nhiệm vụ, cảnh báo phá hoại và đường tới trạm cần sửa; người mới tìm được mục tiêu mà không cần đọc hướng dẫn ngoài game. |
| 1 | Chống gian lận và ổn định kết nối | Giới hạn tần suất cho mọi hành động, kiểm tra di chuyển/tương tác trên server, tự nối lại sau mất mạng; bài test nhiều người chạy qua trọn một ván. |
| 2 | Âm thanh sự kiện và thiết lập | Âm riêng cho họp, phá hoại, nhiệm vụ, hạ gục; điều chỉnh âm lượng nhạc/hiệu ứng và tôn trọng tùy chọn của trình duyệt. |
| 2 | Phòng tùy chỉnh | Host chỉnh thời gian họp, số kẻ phá hoại, tốc độ và hồi chiêu trước khi bắt đầu; cài đặt được đồng bộ cho mọi người trong phòng. |
| 2 | Tương tác với bản đồ | Camera an ninh, bảng tình trạng các phòng, cửa airlock có hoạt ảnh; trạng thái hiển thị thống nhất cho tất cả người chơi. |
| 3 | Tiến trình và cá nhân hóa | Màu, phụ kiện và thống kê lưu cục bộ trước; chỉ cân nhắc tài khoản khi có nhu cầu và hạ tầng phù hợp. |

## Giới hạn hạ tầng miễn phí

Frontend tiếp tục ở Vercel, realtime ở Cloudflare Worker và Durable Objects. Ưu tiên trạng thái phòng ngắn hạn, số người mỗi phòng tối đa 10, không lưu video/ghi âm hay dữ liệu cá nhân. Theo dõi giới hạn sử dụng của gói miễn phí trước khi tăng số phòng hoặc thêm lịch sử ván đấu.
