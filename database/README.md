# CƠ SỞ DỮ LIỆU HỆ THỐNG QUẢN LÝ VÀ ĐIỀU PHỐI HÀNG HÓA - SPX EXPRESS

Tài liệu này mô tả chi tiết kiến trúc, cấu trúc tệp, và luồng hoạt động của Hệ thống Cơ sở dữ liệu Điều phối hàng hóa mô phỏng mô hình hoạt động của SPX Express. Hệ thống được thiết kế theo chuẩn CSDL quan hệ (RDBMS) trên môi trường MySQL, đáp ứng khả năng quản lý người dùng, luân chuyển đơn hàng qua các bưu cục (HUB), điều phối tài xế và hạch toán tài chính tập trung.

---

## 1. TỔNG QUAN KIẾN TRÚC (ARCHITECTURE OVERVIEW)

Hệ thống bao gồm 15 bảng thực thể được chuẩn hóa mức cao, chia thành 4 phân hệ lõi:

* **Phân hệ Quản lý Người dùng (User Management):** Kế thừa từ thực thể trung tâm `USER` ra các nhóm `CUSTOMER` (Khách hàng), `DRIVER` (Tài xế), và `STAFF` (Nhân viên). Quản lý thông tin xác thực, thông tin cá nhân và số dư ví điện tử (Balance).
* **Phân hệ Mạng lưới & Định tuyến (Network & Routing):** Quản lý cấu trúc phân cấp địa lý `L1_ADDRESS` (Tỉnh/Thành), `L2_ADDRESS` (Quận/Huyện) ánh xạ trực tiếp đến các Bưu cục `HUB`.
* **Phân hệ Quản lý Đơn hàng & Vận chuyển (Order & Logistics):** Theo dõi vòng đời đơn hàng (`ORDER`) từ lúc yêu cầu lấy hàng (`PICKUP_ORDER`), luân chuyển qua các kho bãi (`ORDER_TRACKING`, `SHIPMENT`), cho đến khi giao hàng (`DELIVERY_ORDER`).
* **Phân hệ Tài chính - Sổ cái (Ledger/Financial):** Thay vì phân mảnh, mọi dòng tiền (Nạp, Rút, Phí vận chuyển, Thưởng, Lương, Hoàn tiền) đều được quy tụ về một Sổ cái duy nhất là bảng `PAYMENT`.

### Các thiết kế kỹ thuật nổi bật

* **Single Ledger (Sổ cái kế toán):** Bảng `PAYMENT` kết hợp với Trigger `Balance_Update_Trigger` đảm bảo mọi biến động tài chính đều được hạch toán chặt chẽ vào ví người dùng, ngăn chặn tuyệt đối tình trạng âm số dư hoặc Double-Charge [trừ tiền 2 lần].
* **Defensive Programming (Phòng thủ chiều sâu):** 100% các thủ tục (Stored Procedures) thay đổi dữ liệu đều được bọc trong khối `START TRANSACTION ... COMMIT` đi kèm cơ chế `ROLLBACK` và bắt lỗi `SIGNAL SQLSTATE` khắt khe.

---

## 2. CẤU TRÚC TỆP MÃ NGUỒN (FILE STRUCTURE)

Mã nguồn được chia module hóa (Modulization) thành các tệp `.sql` riêng biệt để dễ dàng bảo trì và phát triển:

| Tên Tệp | Chức năng chính | Ghi chú |
| :--- | :--- | :--- |
| `Init.sql` | Khởi tạo toàn bộ Database, Tables, Primary Keys, Foreign Keys và các ràng buộc `CHECK` mức bảng. | Chạy đầu tiên |
| `User.sql` | Chứa các thủ tục tạo mới, cập nhật thông tin người dùng và Trigger tự động tính toán thâm niên (`Experience`) cho tài xế. | |
| `Order.sql` | Xử lý CRUD Đơn hàng: `Create_New_Order`, `Edit_Current_Order`, `Cancel_Current_Order` kèm tích hợp kiểm tra/hoàn trả Voucher và hạch toán phí ship. | |
| `Pickup.sql` | Quản lý quy trình tài xế lấy hàng từ người gửi: `Create_Pickup_Order`, `Pickup_Complete`, `Pickup_Failed`. Tự động đánh rớt đơn nếu lấy hụt 3 lần. | |
| `Order_Checkin_Checkout.sql` | Quản lý kiểm kê kho bãi tại `HUB`: `Order_Checkin`, `Order_Checkout`, tạo lô hàng luân chuyển (`SHIPMENT`) và kiểm tra giới hạn sức chứa (`Max_Capacity`). | |
| `Delivery.sql` | Quản lý quy trình tài xế giao hàng chặng cuối: `Create_Delivery_Order`, `Delivery_Complete`, `Delivery_Failed`. Tự động tạo thanh toán COD khi giao thành công. | |
| `Payment.sql` | Xử lý Sổ cái tài chính: Nạp/rút tiền, trả lương, thưởng, thanh toán đơn, hoàn tiền (`Refund_Payment`), và Trigger đồng bộ số dư ví (`Balance_Update_Trigger`). | |
| `Voucher.sql` | Validate tính hợp lệ của mã giảm giá (Tồn tại, Hết hạn, Lượt dùng) và thủ tục hoàn lại Voucher khi hủy đơn. | |
| `Procedure.sql` | Trích xuất báo cáo thống kê kết nối đa bảng (JOIN, GROUP BY): Lịch sử đơn hàng, Xếp hạng hiệu suất Bưu cục. | Yêu cầu 2.3 BTL2 |
| `Function.sql` | Hàm tính toán logic nghiệp vụ dùng Cursor/Loop: Phân hạng thành viên (Customer Tier), Tính tổng tiền thưởng tháng của tài xế/nhân viên. | Yêu cầu 2.4 BTL2 |

---

## 3. LUỒNG NGHIỆP VỤ CỐT LÕI (CORE WORKFLOWS)

### 3.1. Vòng đời luân chuyển Đơn hàng (Order Lifecycle)

1. **Tạo đơn (`Create_New_Order`):** Khách hàng tạo đơn. Hệ thống tự động kiểm tra khoảng cách, tính toán `Source_Hub` và `Destination_Hub`.
2. **Thanh toán cước (`Payment`):** Thủ tục tự gọi trừ tiền cước vận chuyển vào ví người gửi và ghi vào Sổ cái `PAYMENT`.
3. **Lấy hàng (`Pickup`):** Tài xế nhận lệnh lấy hàng. Nếu thành công, trạng thái chuyển sang 'Đã lấy hàng'. Nếu thất bại 3 lần, đơn tự động hủy (`Cancel_Current_Order`) và hoàn tiền (`Refund_Payment`).
4. **Lưu kho & Trung chuyển (`Checkin_Checkout`):** Đơn hàng nhập kho (`Arrival`) và xuất kho (`Departure`). Gắn vào các chuyến xe luân chuyển (`SHIPMENT_ORDER`) giữa các Hub.
5. **Giao hàng (`Delivery`):** Tài xế chặng cuối nhận lệnh. Giao thành công sẽ tự động tạo yêu cầu thanh toán trừ tiền thu hộ (COD) từ ví người nhận.
6. **Đánh giá (`Rating`):** Khách hàng (Gửi/Nhận) có quyền tạo đánh giá dịch vụ cho đơn hàng 'Giao thành công' (Thông qua `Rating_Create_Check` trigger).

### 3.2. Luồng hoạt động Sổ cái Kế toán (Ledger Flow)

* Quy tắc bảo toàn: `Amount > 0` = Tiền vào (Nạp ví, Thưởng, Lương). `Amount < 0` = Tiền ra (Rút, Thanh toán cước, Trả COD).
* Ví dụ luồng Hoàn tiền (`Refund_Payment`): Nhận đầu vào là `Payment_ID` gốc. Lấy ra số tiền đã trừ (số âm). Đảo dấu thành số dương bằng hàm `ABS()`. Tạo dòng giao dịch mới loại `Refund`. Trigger tự động rà soát Sổ cái và cộng lại tiền vào ví người dùng.

---

## 4. HƯỚNG DẪN TRIỂN KHAI (DEPLOYMENT)

Để khởi chạy hệ thống, thực thi các tệp `.sql` theo đúng thứ tự sau trên công cụ quản trị CSDL (SSMS, MySQL Workbench, DataGrip, v.v.):

1. Thực thi `Init.sql` để xây dựng cấu trúc nền móng.
2. Thực thi các script Python `seed_data.py` để Seeding dữ liệu từ `./seeding` vào CSDL.
3. Lần lượt thực thi các tệp Procedures, Functions và Triggers: `User.sql`, `Order.sql`, `Payment.sql`, `Pickup.sql`, `Delivery.sql`, `Order_Checkin_Checkout.sql`, `Voucher.sql`, `Procedure.sql`, `Function.sql`.

*Lưu ý: Mọi giao dịch (Transaction) đều trả về lỗi chuẩn hóa tiếng Việt qua cơ chế `SIGNAL SQLSTATE`, giúp Frontend/Backend dễ dàng bắt và hiển thị lỗi trực tiếp lên giao diện người dùng.*
