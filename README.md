# Hệ Thống Quản Lý Vận Chuyển (Logistics Management System)

Đây là mã nguồn hệ thống quản lý giao nhận và vận chuyển hàng hóa, được thiết kế để theo dõi và vận hành toàn bộ luồng luân chuyển hàng hóa giữa các Bưu cục (Hub), điều phối tài xế lấy/giao hàng, và xử lý các giao dịch tài chính (COD, thanh toán, trả lương/thưởng).

## 🚀 Công Nghệ Sử Dụng

- **Cơ sở dữ liệu:** MySQL (Sử dụng toàn bộ Store Procedures & Triggers để xử lý logic nghiệp vụ)
- **Backend:** Node.js, Express.js (RESTful APIs)
- **Frontend:** React.js, Vite, Tailwind CSS

## ✨ Chức Năng Chính

Hệ thống được chia thành nhiều module dựa trên vai trò của người dùng:

1. **Khách hàng (Customer):**
   - Đặt đơn hàng mới, theo dõi hành trình đơn hàng.
   - Quản lý ví cá nhân (Nạp tiền, thanh toán cước phí, nhận tiền thu hộ COD).
   - Đánh giá dịch vụ sau khi nhận hàng.

2. **Tài xế (Driver):**
   - Nhận nhiệm vụ lấy hàng (Pickup), giao hàng (Delivery) từ bưu cục.
   - Thực hiện các chuyến hàng luân chuyển liên bưu cục (Shipment).
   - Nhận tiền thưởng dựa trên các chuyến hàng hoàn thành.

3. **Nhân viên Bưu cục (Staff):**
   - Kiểm soát sức chứa và lượng đơn hàng hiện tại của bưu cục.
   - Điều phối tài xế đi lấy/giao hàng.
   - Quản lý quá trình nhập/xuất kho của hàng hóa.

4. **Quản lý (Manager) & Quản trị viên (Admin):**
   - Quản lý sơ đồ bưu cục, mạng lưới hệ thống.
   - Quản lý nhân sự và phân bổ tài khoản.
   - Xem các báo cáo, số liệu tổng quan.

## 🛠 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu cầu hệ thống
- Node.js (phiên bản v16 trở lên)
- MySQL Server (phiên bản 8.0 trở lên)
- Python 3.x (dành cho script nạp dữ liệu mẫu)

### 1. Khởi tạo Cơ sở dữ liệu
1. Đăng nhập vào MySQL và tạo cơ sở dữ liệu.
2. Thực thi script khởi tạo cấu trúc và các logic Procedure/Trigger:
   ```bash
   mysql -u root -p < database/Init.sql
   mysql -u root -p HeThongVanChuyen < database/Function.sql
   mysql -u root -p HeThongVanChuyen < database/Procedure.sql
   mysql -u root -p HeThongVanChuyen < database/User.sql
   mysql -u root -p HeThongVanChuyen < database/Order.sql
   mysql -u root -p HeThongVanChuyen < database/Order_Checkin_Checkout.sql
   mysql -u root -p HeThongVanChuyen < database/Pickup.sql
   mysql -u root -p HeThongVanChuyen < database/Delivery.sql
   mysql -u root -p HeThongVanChuyen < database/Payment.sql
   ```
3. Nạp dữ liệu mẫu (Seeding):
   ```bash
   python3 seed_data.py
   ```

### 2. Cài đặt và Chạy Backend
Backend sẽ kết nối trực tiếp với MySQL thông qua cổng mặc định.
```bash
cd web/backend
npm install
# Tạo file .env và cấu hình DB (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
npm run dev
```

### 3. Cài đặt và Chạy Frontend
Frontend cung cấp giao diện tương tác cho toàn bộ các vai trò người dùng.
```bash
cd web/frontend
npm install
npm run dev
```
Mở trình duyệt ở địa chỉ hiển thị trên terminal (thường là `http://localhost:5173`) để sử dụng ứng dụng.

## 📂 Cấu Trúc Thư Mục

```
.
├── database/        # Chứa toàn bộ mã nguồn SQL (Tables, Procedures, Triggers)
├── seeding/         # Thư mục chứa các tệp CSV dùng để Seeding dữ liệu
├── web/
│   ├── backend/     # Máy chủ REST API (Node.js & Express)
│   └── frontend/    # Ứng dụng Web tĩnh (React & Tailwind CSS)
├── seed_data.py     # Script Python tự động nạp dữ liệu từ CSV vào MySQL
└── README.md        # Tài liệu hướng dẫn hiện tại
```
