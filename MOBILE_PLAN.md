# Kế hoạch đưa Starship Suspects lên mobile

## Trạng thái thực hiện

- Đã thêm joystick cảm ứng, nút tương tác theo tình huống, hạ gục/thông hơi và bảng phá hoại; input cảm ứng dùng cùng gói di chuyển và luật tương tác với desktop.
- Đã làm bố cục màn dọc/ngang, sảnh, thanh điều khiển, ngăn nhiệm vụ, mini game, họp theo tab và bản đồ chiến thuật có nút phóng to cùng vùng vuốt để xem.
- Canvas đã theo kích thước vùng chơi, giảm số pixel vẽ trên mobile và xử lý xoay màn; nút chia sẻ dùng Web Share API nếu thiết bị hỗ trợ.
- Đã kiểm tra trực quan viewport 320 × 640, 390 × 844, 844 × 390 và một ván bốn người local. Còn cần đo FPS, pin và thao tác thực trên Safari iPhone/Chrome Android trước khi khẳng định mục tiêu hiệu năng ở mọi máy.

## Mục tiêu

Chơi trọn ván 4–10 người trên điện thoại bằng cảm ứng, ở cả màn dọc và ngang; vẫn dùng cùng phòng, luật, Worker và tài nguyên miễn phí với desktop. Màn ngang là bố cục ưu tiên cho lúc di chuyển; màn dọc vẫn phải chơi được, không ép xoay máy. Không giảm thông tin quan trọng về nhiệm vụ, sự cố, họp hoặc bỏ phiếu.

## Vấn đề trong bản hiện tại

- Di chuyển chỉ đọc WASD/phím mũi tên trong `main.tsx`; mobile không có joystick.
- `GameScene.tsx` vẽ canvas và camera theo `VIEW` cố định 1080 × 660, bộ đệm ở 2×; khi CSS thu xuống điện thoại, nhân vật và trạm trở nên nhỏ trong khi vẫn trả giá vẽ theo độ phân giải desktop.
- Nút hành động/phá hoại ở sidebar dưới map. Người chơi phải cuộn trang để tương tác; lúc họp modal, danh sách phiếu và chat tranh chiều cao.
- Các mini game, sơ đồ tàu và nút đóng dùng kích thước desktop; một số nút và văn bản sẽ khó chạm/đọc.
- Lưới phòng và nhiều chi tiết nhỏ được vẽ mỗi khung hình; chưa đo FPS, tải pin và dữ liệu trên điện thoại thật.

## Thiết kế tương tác

| Màn | Bố cục mobile |
| --- | --- |
| Vào game, sảnh | Một cột, mã phòng lớn, nút chia sẻ bằng Web Share API nếu có, nút sao chép dự phòng; người chơi và preset cuộn độc lập. |
| Chơi màn ngang | Canvas chiếm vùng trung tâm; joystick nổi cố định bên trái, cụm `Tương tác`, `Báo cáo`/`Hạ gục`, `Thông hơi` bên phải; thanh trạng thái và bản đồ ở mép trên. |
| Chơi màn dọc | Canvas chiếm phần lớn chiều cao khả dụng; camera hẹp hơn nhưng vẫn giữ khoảng nhìn đủ thấy cửa/trạm gần; joystick và hành động phủ lên vùng rìa an toàn; nhiệm vụ trong ngăn kéo thu gọn. |
| Mini game | Modal gần toàn màn, phần thao tác lớn, nút đóng dễ chạm; nối dây có thể chạm chọn hai đầu và kéo thả, cùng hiển thị màu lẫn ký hiệu. |
| Họp, bỏ phiếu | Toàn màn với ba tab `Người chơi`, `Chat`, `Kết quả`; đồng hồ và nút kết thúc họp luôn nhìn thấy; ô nhập chat tránh bàn phím ảo. |
| Bản đồ chiến thuật | Toàn màn, nút phóng to/thu nhỏ và vuốt để xem từng khu; dấu nhiệm vụ, trạm lò và vị trí mình đủ lớn để đọc khi phóng to. |

## Kiến trúc đề xuất

1. **Một mô hình input chung:** gom bàn phím và joystick vào một vector chuyển động rồi gửi nhịp 125 ms hiện có. `pointerdown/move/up/cancel` giữ riêng `pointerId`, thả ngón hoặc mất focus thì lập tức về vector 0. Nút hành động gọi cùng hàm kiểm tra tương tác của desktop để không sinh hai bộ luật.
2. **Vùng chạm được kiểm soát:** chỉ joystick/canvas trò chơi dùng `touch-action: none`; khu sảnh, danh sách và chat vẫn cuộn tự nhiên. Vị trí điều khiển tính với `env(safe-area-inset-*)`; các nút chính đặt mục tiêu vùng chạm ít nhất 48 × 48 CSS px.
3. **Camera và canvas co theo vùng chơi:** lấy kích thước bằng `ResizeObserver`, tính khung nhìn theo tỷ lệ màn hình, giữ tọa độ thế giới và va chạm ở protocol chung. Tách độ phân giải hiển thị khỏi kích thước CSS; giới hạn pixel ratio theo năng lực máy, đo trước khi chọn mặc định.
4. **Giảm tải renderer:** lưu nền/tile tĩnh theo vùng, chỉ vẽ vùng camera, giữ animation cần thiết; khi tab ẩn hoặc modal họp mở thì giảm/dừng khung vẽ. Không giảm nhịp logic server hoặc phạm vi nhìn hợp lệ của phe chơi.
5. **Responsive theo trạng thái trận:** HUD và bảng nhiệm vụ thành lớp phủ/ngăn kéo, chỉ hiện hành động khả dụng; trên desktop giữ bố cục hiện tại. Dùng chiều cao viewport động để tránh thanh địa chỉ và bàn phím ảo che nút.

## Thứ tự thực hiện

| Mốc | Công việc | Điều kiện nghiệm thu |
| --- | --- | --- |
| 1. Chơi được | Joystick, nút hành động nổi, sảnh một cột, vùng an toàn, không cuộn trang khi điều khiển. | Tạo/vào phòng, đi, làm nhiệm vụ, báo cáo, họp, bỏ phiếu trên điện thoại không cần bàn phím. |
| 2. Dễ dùng | Camera theo tỷ lệ, HUD gọn, mini game và họp mobile, bản đồ chiến thuật có thao tác chạm. | Người mới tìm được phòng/trạm, không có nút bị che hay chữ quá nhỏ ở màn dọc và ngang. |
| 3. Mượt | Đo frame time, độ trễ input, bộ nhớ và kích thước tải; tối ưu renderer theo kết quả. | Mục tiêu 60 FPS trên máy tầm trung, mức chấp nhận 30 FPS ổn định trên máy yếu; không giật đáng kể khi 10 người cùng phòng. |
| 4. Phát hành | Kiểm thử nhiều thiết bị, hồi quy desktop, cập nhật chỉ dẫn trong game; phát hành Vercel. | Một phòng có người chơi desktop và mobile cùng chơi trọn ván; kết nối lại sau chuyển app vẫn đúng vai trò/trạng thái. |

## Ma trận kiểm thử tối thiểu

- Màn dọc 360 × 800 và 390 × 844; màn ngang 844 × 390; tablet khoảng 768 × 1024.
- Safari iPhone và Chrome Android trên thiết bị thật, thêm kiểm tra mô phỏng viewport trên desktop.
- Hai ngón cùng lúc: vừa di chuyển vừa chạm hành động; thả ngón ngoài joystick; nhận cuộc gọi/chuyển tab rồi quay lại; xoay màn hình giữa trận.
- 4 và 10 người, map 16 và 22 phòng, cả hai vai trò, ba phá hoại, nhiệm vụ nối dây, họp/chat/bỏ phiếu, ma và chơi lại.
- Theo dõi FPS ở khu nhiều vật thể, bộ nhớ, dung lượng tải và mức dùng mạng. Chỉ kết luận “mượt” sau khi đo trên máy thật.

## Giới hạn phạm vi

Giai đoạn mobile không thay luật, tọa độ map, giao thức hay hạ tầng. PWA/cài biểu tượng lên màn hình chính có thể làm sau khi trải nghiệm trong trình duyệt ổn định; không cần ứng dụng native hoặc dịch vụ trả phí.
