Bạn là một Full-stack Developer chuyên nghiệp (ReactJS/NextJS cho Frontend, Node.js/Express cho Backend, và MySQL cho Database).

Nhiệm vụ của bạn là hiện thực một ứng dụng web Quản lý Hệ thống Vận chuyển dựa trên một cơ sở dữ liệu MySQL có sẵn. Hãy cung cấp cấu trúc thư mục, mã nguồn Backend (các API endpoint gọi Stored Procedure) và mã nguồn Frontend (các Component giao diện) đáp ứng các yêu cầu sau:

### 1. Phân quyền Hệ thống (3 Nhóm đối tượng chính)

Hệ thống sử dụng chung một bảng `USER`, nhưng phân nhánh UI/UX dựa trên vai trò. Cả 3 nhóm đều có trang "Quản lý tài khoản" (Cập nhật thông tin cá nhân, đổi mật khẩu).

**A. Nhóm Người dùng (Customer/Sender)**

* **Quản lý đơn hàng:** Danh sách đơn (gọi procedure `Get_Orders_By_Sender`), cho phép lọc theo trạng thái. Cung cấp nút Sửa/Xóa cho các đơn ở trạng thái "Chờ lấy hàng" (gọi `Update_Order`, `Delete_Order`).
* **Tạo đơn hàng:** Form nhập chi tiết đơn hàng (người gửi, người nhận, kích thước, COD). Tích hợp dropdown chọn Voucher. Khi submit, gọi procedure `Create_New_Order` (Procedure này đã tự động xử lý `Apply_Voucher`).
* **Quản lý dòng tiền:** Dashboard hiển thị tổng thu nhập từ tiền thu hộ (COD) của các đơn "Giao thành công". Tích hợp gọi function `Get_Customer_Tier` để hiển thị hạng thành viên.

**B. Nhóm Tài xế (Driver)**

* **Quản lý đơn hàng vận chuyển:** Danh sách các đơn được phân công (`PICKUP_ORDER` và `DELIVERY_ORDER`). Hiển thị tiền thưởng dự kiến (gọi function `Calculate_Driver_Bonus`).
* **Xác nhận Lấy hàng (Pickup):** Giao diện quét mã/bấm nút để bắt đầu lấy hàng (`Create_Pickup_Order`). Cung cấp 2 nút báo cáo: Thành công (`Pickup_Complete`) hoặc Thất bại (`Pickup_Failed`).
* **Xác nhận Giao hàng (Delivery):** Giao diện tương tự Pickup nhưng dành cho tuyến giao cuối (`Create_Delivery_Order`, `Delivery_Complete`, `Delivery_Failed`).

**C. Nhóm Nhân viên Bưu cục (Hub Staff & Manager)**

* **Quản lý đơn hàng tại HUB:** Giao diện nhập/xuất kho. Khi mã vạch được quét, gọi `Order_Checkin` (hàng vào Hub) hoặc `Order_Checkout` (hàng xuất Hub). Giao diện hiển thị cảnh báo sức chứa dựa trên trigger `Hub_Capacity_Check_Order_Insert`.
* **Xác nhận giao/nhận trực tiếp:** Cho phép nhân viên thao tác đổi trạng thái đơn hàng khi khách hàng tự mang hàng đến Hub hoặc đến Hub nhận hàng.
* **Quản lý nhân viên & Thống kê (Chỉ dành cho Manager):** Giao diện xem doanh thu bưu cục (gọi `Get_Hub_Revenue_Statistics`).

---

### 2. Trang Đặc biệt: Trực quan hóa vòng đời Đơn hàng (Order Lifecycle)

Đây là yêu cầu cốt lõi để báo cáo đồ án môn Cơ sở dữ liệu. Thiết kế một trang `/order-lifecycle/:id` chia màn hình làm 2 phần:

* **Nửa bên trái (Visual Flow):** Hiển thị một Timeline/Stepper trực quan biểu diễn 5 giai đoạn của kiện hàng:
    1. Khởi tạo -> 2. Lấy hàng -> 3. Xử lý tại Hub -> 4. Giao hàng -> 5. Hoàn tất (Thanh toán & Đánh giá). Có hiệu ứng highlight giai đoạn hiện tại.
* **Nửa bên phải (Database Mapping Table):** Một bảng dữ liệu kỹ thuật thay đổi nội dung động dựa trên bước (step) đang được active ở nửa trái. Bảng này liệt kê chính xác các thao tác Database đang chạy ngầm.

**Dữ liệu ánh xạ cho bảng nửa bên phải:**

* **Bước 1 (Khởi tạo):** * Procedure: `Create_New_Order`
  * Trigger: `Voucher_Expiration_Apply_Check_Insert`
* **Bước 2 (Lấy hàng):** * Procedure: `Create_Pickup_Order`, `Pickup_Complete`
  * Trigger: `Pickup_Order_Assignment_Check_Insert`, `Pickup_Count_Limit_Check`, `Order_Status_Update` (Tự động chuyển 'Đang xử lí')
* **Bước 3 (Xử lý tại Hub):** * Procedure: `Order_Checkin`, `Order_Checkout`
  * Trigger: `Hub_Capacity_Check_Order_Insert`, `Current_Order_Count_Update...`
* **Bước 4 (Giao hàng):** * Procedure: `Create_Delivery_Order`, `Delivery_Complete`
  * Trigger: `Delivery_Order_Assignment_Check_Insert`, `Delivery_Count_Limit_Check`
* **Bước 5 (Hoàn tất):** * Procedure: `Make_Payment`, `Create_Rating`
  * Trigger: `Payment_Check_Insert` (Cộng điểm point), `Rating_Ownership_Check_Insert`

### Yêu cầu về mã nguồn

1. Viết code rõ ràng, chú thích đầy đủ. Sử dụng TailwindCSS cho UI.
2. Với các API gọi Stored Procedure, đảm bảo bắt được các lỗi từ lệnh `SIGNAL SQLSTATE '45000'` của MySQL và trả về HTTP 400 kèm `MESSAGE_TEXT` để hiển thị Toast Notification cho người dùng.
3. Cung cấp trước cấu trúc thư mục, sau đó hiện thực chi tiết file API Backend và file UI Component cho "Trang Đặc biệt (Order Lifecycle)".
