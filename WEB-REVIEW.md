# Rà soát website

Phạm vi: mã nguồn định tuyến, đăng nhập/khôi phục phiên, quyền Pro, quản trị, import, thi thử, luyện tập, lịch sử bài thi và thanh toán. Đây là rà soát mã nguồn và kiểm tra tự động; chưa phải kiểm thử toàn bộ giao diện bằng tài khoản thực trên desktop/mobile.

## Cập nhật sửa lỗi 08/09/2026

- Backend trả quyền `accessible` và thứ tự `accessOrder` cho đề thi thử. Hai đề đầu mỗi kỹ năng (bao gồm FULL) được mở miễn phí theo số đề/tên/ID; đánh dấu nổi bật hoặc sửa nội dung không đổi thứ tự miễn phí. Đề bị khóa không trả `questionData`. Admin/Pro xem toàn bộ.
- Giao diện dùng quyền từ backend, Random chỉ chọn đề được mở. Bỏ nguồn nội dung dự phòng từ localStorage ở màn học viên để dữ liệu cũ không mở lại đề đã khóa. Khôi phục URL kiểm tra quyền; nút làm lại giữ quyền của đề đã chọn.
- Chấm Writing/Speaking AI giữ điều kiện tài khoản còn hạn. Tài khoản hết hạn vẫn làm 2 đề miễn phí, nhưng được thông báo rõ việc gia hạn để chấm AI. Không biến điểm chưa chấm thành 0/A1 hoặc tổng điểm hoàn chỉnh.
- Webhook khóa đơn và tài khoản trong giao dịch. Tra mã bằng truy vấn scalar trước khi khóa để tránh trạng thái PENDING bị cache trong persistence context. Kiểm tra đồng thời đã tái hiện được lỗi gia hạn hai lần trước khi sửa và đạt sau khi sửa.
- Backend kiểm tra số ngày/giá của 4 gói hiện có (7/40.000, 14/75.000, 30/140.000, 60/250.000). Khi thay giá cần cập nhật cả PaymentService và Renewal. Webhook từ chối xử lý nếu token chưa cấu hình hoặc còn giá trị mẫu.
- HTML đáp án mẫu được dựng lại chỉ với các thẻ định dạng cho phép, không sao chép thuộc tính, URL, script, SVG hoặc iframe.
- Tải các trang bằng lazy/Suspense; tách hằng dùng chung để AppLayout không kéo Dashboard vào gói chính. Gói chính giảm từ khoảng 1.054 KB còn 337 KB (chưa gzip). Có trang 404 và liên kết về trang chủ.

### Kiểm tra đợt sửa

- `mvn -o test -q`: 7 kiểm tra đạt, gồm callback trùng và hai đơn khác nhau chạy đồng thời trên database H2 cô lập; kiểm tra giá bị sửa và token sai; nội dung đề miễn phí/Pro; các kiểm tra import/AI có sẵn.
- `npm run build`, `node scripts/check-access-states.cjs`, `node scripts/check-full-test.cjs`, `node scripts/check-mock-access.cjs`.
- `node scripts/check-safe-html.cjs`: kiểm tra trên Chrome headless; giữ định dạng cơ bản, loại thuộc tính và nội dung có thể thực thi.
- Chưa triển khai lên máy chủ, chưa gửi thanh toán thật, chưa kiểm thử toàn bộ luồng AI/microphone bằng tài khoản thật. Kiểm tra concurrency dùng H2, chưa phải MySQL sản xuất.
- Khi triển khai cần cập nhật đồng thời frontend/backend và khởi động lại backend. Phải cấu hình token webhook SePay thực; giá trị trống hoặc mẫu sẽ bị từ chối.

## Các sửa đổi trước đó

- `frontend/src/routes/ProtectedRoute.tsx`: giữ màn hình chờ khi có refresh token nhưng chưa khôi phục user; tránh chuyển sang đăng nhập ngay ở lần render đầu.
- `frontend/src/routes/SubscriptionGate.tsx`: ưu tiên thông báo lỗi kiểm tra quyền khi API thất bại, thay vì yêu cầu người dùng mua Pro.
- `backend/src/main/java/com/example/aptis/service/MockTestService.java`: bỏ BOM trước khi đọc header CSV để giữ đúng external ID khi import lại. Bản sửa backend cần khởi động lại dịch vụ.

## Ghi nhận trước đợt sửa 08/09/2026

1. **Thanh toán — xử lý đồng thời:** `PaymentService.handleSepayWebhook` kiểm tra PAID rồi cập nhật và gia hạn; `PaymentOrderRepository.findByPaymentCode` chưa khóa bản ghi, entity chưa có version. Hai webhook đồng thời có thể cùng vượt bước kiểm tra. Cần kiểm thử concurrency, khóa đơn và bảo vệ cập nhật hạn dùng; chưa gửi webhook thử hay thay đổi giao dịch thật.
2. **Đáp án mẫu HTML:** `PracticeRunner.tsx` có chỗ đưa `current.answer1` và `question.answer1` trực tiếp vào `dangerouslySetInnerHTML`. Cần làm sạch HTML theo danh sách thẻ cho phép trước khi render dữ liệu import. Chưa kiểm chứng khả năng khai thác trên dữ liệu thật.
3. **Tải trang đầu:** router import đồng bộ các trang học viên và quản trị; build tạo gói JS khoảng 1 MB. Nên tách tải theo route, ưu tiên MockTests, PracticeRunner và các trang admin; đo tốc độ trên mạng chậm sau khi đổi.
4. **URL không tồn tại:** router chưa có route `*` cho trang không tìm thấy. Nên thêm trang 404 dễ hiểu và nút về trang chủ.
5. **Khả năng nhận diện đề:** màn hình thi chủ yếu hiện kỹ năng/part. Nên hiển thị tên đề đang chọn để dễ nhận biết, tránh nhầm nội dung trùng giữa các bộ đề.

## Các kiểm tra và giới hạn

- `check-access-states.cjs`: khôi phục phiên, khách chưa đăng nhập, lỗi API Pro.
- Lượt trước: kiểm tra Full Test chuyển phần/hết giờ/dữ liệu thiếu đạt; backend import có/không BOM đạt; 25 đề JSON hợp lệ, các ảnh cục bộ được tham chiếu đều tồn tại.
- Method security đã bật; các thao tác quản trị trong controller được đọc có `@PreAuthorize`; endpoint xem submission chuyển danh tính và quyền admin xuống service. Chưa kiểm thử ma trận quyền bằng tài khoản học viên/admin thực.
- Webhook có kiểm tra token, số tiền và trạng thái PAID; chưa kiểm thử giao dịch thật, hoàn tiền hay callback đồng thời.
- Chưa kiểm thử end-to-end gửi OTP/email, ghi âm với quyền microphone, chấm AI, lịch sử sau khi nộp bài, mobile và khả năng truy cập bằng bàn phím.
- Không nên kết luận toàn website đã hết lỗi từ build thành công hay HTTP 200.
