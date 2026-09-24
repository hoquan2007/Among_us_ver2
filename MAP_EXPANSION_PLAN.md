# Kế hoạch mở rộng bản đồ và tài nguyên hình ảnh

## Trạng thái triển khai

- Đã mở map 3.600 × 2.400 với 22 phòng cho ván từ bảy người; ván 4–6 người giữ lõi 16 phòng. Biến thể được chốt khi bắt đầu và gửi trong snapshot giao thức v3; phòng cũ không có trường này vẫn dùng lõi.
- Đã thêm sáu phòng, sáu nền SVG nguyên bản, lớp hành lang có biển/vạch/đèn, 12 chi tiết nhỏ tái sử dụng mỗi phòng, màu và thiết bị đặc trưng; thêm cửa thứ hai cho ba điểm sửa sự cố quan trọng.
- Đã thêm bốn nhiệm vụ ở cánh mới (Lưu trữ, Lá chắn, Robot, Xử lý nước), một cặp thông hơi; Worker giao hai nhiệm vụ cánh mới cho mỗi phi hành đoàn trong ván đông người và xoay vòng nhiệm vụ lõi.
- Đã sửa camera, minimap theo tỷ lệ map, giới hạn di chuyển, phạm vi phòng và chỉ vẽ lưới/cảnh trong vùng nhìn thấy. Kiểm tra hình học cho cả hai biến thể, phòng 10 người, nhiệm vụ mới và phá hoại đã qua.
- Cần đo FPS trên một nhóm máy desktop và theo dõi nhịp chơi thực tế trước khi quyết định thêm chi tiết động hoặc chuyển renderer. Âm thanh theo khu và thanh âm lượng riêng là phần nâng cấp tiếp theo; âm nền hiện có vẫn hoạt động.

## Hiện trạng và mục tiêu

- Hiện tại: bản đồ 2.800 × 1.800, 16 phòng, tám trạm nhiệm vụ, ba phòng có SVG riêng. Nhiều sàn, tường, hành lang và vật thể được vẽ bằng Canvas mỗi khung hình.
- Mục tiêu bản mở rộng đầu tiên: 3.600 × 2.400 (diện tích tăng khoảng 71%), 22 phòng, vẫn chơi tốt với 4–10 người trên desktop. Mở rộng tiếp chỉ sau khi đo thời lượng di chuyển và mật độ gặp nhau trong trận thật.
- Với 4–6 người, dùng biến thể lõi 16 phòng để người chơi không bị rải quá thưa; từ 7 người trở lên mở đủ 22 phòng. Worker chỉ giao nhiệm vụ và đặt điểm phá hoại trong phần map đang mở. Chốt biến thể lúc bắt đầu ván để không đổi bố cục giữa trận.
- Giữ nhận diện tàu nghiên cứu riêng của Starship Suspects. Toàn bộ đồ họa và âm thanh mới cần là tài nguyên tự tạo hoặc có quyền sử dụng rõ ràng.

## Bố cục đề xuất

Giữ Phòng họp ở lõi trung tâm. Xây ba tuyến hành lang chính nối thành vòng, thêm ít nhất hai đường tiếp cận mỗi khu quan trọng. Các cửa phòng và hành lang phải đủ rộng để nhiều người đi ngược chiều; tránh đặt vật trang trí chắn lối hoặc che trạm tương tác.

| Khu vực | Phòng hiện có | Phòng thêm | Vai trò hình ảnh và gameplay |
| --- | --- | --- | --- |
| Bắc — nghiên cứu | Y tế, Liên lạc, Dữ liệu, Bảo an | Định vị, Lưu trữ | Màn hình, máy quét, anten, tủ máy; nhiệm vụ thông tin và điều tra. |
| Trung tâm — vận hành | Phòng họp, Lò phản ứng, Quan sát, Nhà kính, Phòng điện | Lá chắn, Bảo trì | Lõi năng lượng, ống dẫn, cửa tự động, bàn họp; sự cố và các điểm gặp nhau. |
| Nam — hậu cần | Kho nhiên liệu, Điều khiển, Kho hàng, Không khí, Động cơ, Khoang hàng, Nhà chứa | Phòng robot, Xử lý nước | Hàng hóa, cánh tay máy, bồn nước, động cơ; nhiệm vụ thao tác và tuyến vòng phụ. |

Sơ đồ này là định hướng, không phải tọa độ cuối. Trước khi đặt art, vẽ sơ đồ phòng/cửa theo dữ liệu và dùng kiểm thử tìm đường để chắc chắn tất cả phòng, trạm, lối thông hơi và điểm sửa phá hoại đều tới được. Hai trạm sửa lò phản ứng phải tiếp tục có lối tiếp cận hợp lý trong giới hạn 90 giây báo động và 30 giây phối hợp.

## Tài nguyên cần làm

1. **Bộ sàn và tường:** sáu bảng màu/chất liệu theo khu vực, đường ống, vết mòn, vạch chỉ hướng, cửa và góc tường. Dùng lớp/tile tái sử dụng thay vì vẽ mỗi phòng như một ảnh rất lớn.
2. **Vật thể:** khoảng 30 mẫu có thể đổi màu/hướng/kích thước, như console, tủ, bàn, ghế, ống, bồn, thùng, máy phát, robot, cây, camera. Từ đó phối thành ít nhất 200 vị trí trang trí. Chỉ vật lớn được chọn mới có va chạm; vật nhỏ là chi tiết thị giác.
3. **Điểm nhấn phòng:** sáu phòng mới có cụm vật thể riêng; nâng 13 phòng hiện chưa có SVG riêng bằng bộ tile/prop chung và một điểm nhấn đặc trưng mỗi phòng. Bố trí sao cho trạm nhiệm vụ nhận ra ngay khi nhìn.
4. **Chuyển động và ánh sáng:** đèn trạng thái, màn hình, hơi nước, quạt, lõi phản ứng và cảnh báo. Giữ hiệu ứng động ở lớp riêng, không vẽ lại toàn bộ nền tĩnh mỗi khung hình.
5. **Nội dung chơi:** thêm ít nhất bốn trạm nhiệm vụ và hai kiểu mini game để phòng mới có giá trị; cập nhật cách Worker phân bổ nhiệm vụ theo khu vực thay vì luôn lấy tám trạm đầu danh sách.
6. **Âm thanh:** âm nền nhẹ cho từng khu, tiếng console/cửa/cảnh báo riêng, có thanh âm lượng và tùy chọn tắt. Âm thanh không được là điều kiện bắt buộc để nhận ra sự cố.

## Lộ trình thực hiện

| Mốc | Công việc | Điều kiện nghiệm thu |
| --- | --- | --- |
| 1. Sơ đồ và luật di chuyển | Đưa phòng, cửa, hành lang, vật cản, trạm, thông hơi vào dữ liệu map dùng chung; thiết kế 3.600 × 2.400 và vẽ sơ đồ tuyến vòng. | Kiểm thử tự động xác nhận mọi điểm tương tác tới được; không có vật cản tạo ngõ cụt ngoài ý muốn. |
| 2. Mẫu hình ảnh | Hoàn thiện ba phòng mẫu (Phòng họp, Lò phản ứng, một phòng mới) bằng tile và prop tái sử dụng; thiết lập lớp sàn, vật thể, nhân vật, ánh sáng. | Ba phòng có nhận diện rõ, điểm tương tác dễ thấy, không che nhân vật và chơi mượt trên desktop. |
| 3. Mở rộng toàn tàu | Đặt sáu phòng mới và làm lại 13 phòng còn lại; thêm nhiệm vụ/trạm, cập nhật spawn, camera, minimap đúng tỷ lệ và chỉ đường. | 4–10 người chơi trọn ván; nhịp nhiệm vụ, họp và phá hoại còn hợp lý trên map mới. |
| 4. Hiệu năng và phát hành | Lưu nền tĩnh theo vùng, chỉ vẽ vật thể trong camera, giảm lần kiểm tra va chạm; thử FPS, tải asset và mạng. | Mục tiêu 60 FPS ở 1080p trên máy thử chuẩn, không giật đáng kể khi 10 người chơi; bài kiểm thử WebSocket/map và build đều qua. |

## Ràng buộc kỹ thuật và phát hành

- Không chỉ đổi `MAP.width`/`height`: phải đồng bộ tọa độ phòng, tường, cửa, spawn, trạm, thông hơi, hai điểm sửa lò phản ứng, camera và minimap. Minimap hiện dùng chiều rộng cố định nên phải tính tỷ lệ cả hai trục từ kích thước map mới.
- Hiện Canvas vẽ lưới nền trải cả map mỗi khung hình. Khi mở rộng, chia nền tĩnh thành vùng lưu sẵn và chỉ vẽ các vùng nhìn thấy; đo trước khi quyết định có cần chuyển renderer.
- Phòng đang chơi trong Durable Object lưu vị trí theo map cũ. Khi phát hành map mới, gắn `mapVersion` cho phòng và để trận cũ kết thúc bằng map cũ, hoặc phát hành lúc không còn phòng hoạt động; tăng phiên bản giao thức nếu dữ liệu snapshot thay đổi.
- Giữ Vercel cho asset tĩnh và Cloudflare Worker cho trạng thái trận. Không đồng bộ tài nguyên hình ảnh qua WebSocket. Đặt ngân sách tải ban đầu dưới 8 MB cho bản desktop đầu tiên, sau đó đo thực tế và tải dần tài nguyên ngoài vùng khởi đầu nếu cần.
- Dùng các chỉ số để quyết định mở rộng tiếp: thời gian đi giữa hai trạm xa nhất, số lần người chơi gặp nhau, thời lượng ván, tỷ lệ thắng hai phe, FPS và dung lượng tải trang.
