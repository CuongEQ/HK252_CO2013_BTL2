DELIMITER /

-- Create new Order procedure
CREATE PROCEDURE Create_New_Order (
    IN p_Order_ID VARCHAR(100),

    IN p_Weight FLOAT,
    IN p_COD FLOAT,

    IN p_Sender_ID VARCHAR(100),
    IN p_Sender_Address VARCHAR(255),
    IN p_Sender_L1_Address VARCHAR(10),
    IN p_Sender_L2_Address VARCHAR(10),

    IN p_Receiver_ID VARCHAR(100),
    IN p_Receiver_Address VARCHAR(255),
    IN p_Receiver_L1_Address VARCHAR(10),
    IN p_Receiver_L2_Address VARCHAR(10),

    IN p_Voucher_ID VARCHAR(100),
    IN p_Shipping_Fee FLOAT,
    IN p_Payment_ID VARCHAR(100)
)
BEGIN
    -- Declare variables to hold intermediate values
    DECLARE p_Source_Hub_ID VARCHAR(100);
    DECLARE p_Destination_Hub_ID VARCHAR(100);
    DECLARE p_Voucher_Value FLOAT;

    -- Error handling: Rollback transaction and re-raise error if any SQL exception occurs
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validate input parameters
    IF (p_Weight <= 0) THEN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Không thể tạo đơn hàng: Kích thước và trọng lượng phải lớn hơn 0';
    END IF;

    IF (p_COD < 0) THEN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Không thể tạo đơn hàng: Tiền thu hộ (COD) không được mang giá trị âm';
    END IF;

    IF (p_Sender_ID = p_Receiver_ID) THEN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Không thể tạo đơn hàng: Người gửi và người nhận không được trùng nhau';
    END IF;

    CALL Validate_Voucher(p_Voucher_ID);

    START TRANSACTION;

    -- Determine Source_Hub_ID and Destination_Hub_ID based on Sender_L2_Address and Receiver_L2_Address
    SET `p_Source_Hub_ID` = (SELECT Local_Hub_ID FROM L2_ADDRESS WHERE `ID` = p_Sender_L2_Address);
    
    SET `p_Destination_Hub_ID` = (SELECT Local_Hub_ID FROM L2_ADDRESS WHERE `ID` = p_Receiver_L2_Address);

    -- Apply voucher discount to shipping fee if a valid voucher is provided
    IF (p_Voucher_ID IS NOT NULL) THEN
        -- Get the value of the voucher
        SELECT `Value` INTO p_Voucher_Value
        FROM VOUCHER
        WHERE Voucher_ID = p_Voucher_ID;

        -- Apply voucher discount to shipping fee
        IF (p_Voucher_Value > p_Shipping_Fee) THEN
            SET p_Shipping_Fee = 0;
        ELSE
            SET p_Shipping_Fee = p_Shipping_Fee - p_Voucher_Value;
        END IF;

        -- Decrement the remaining uses of the voucher
        UPDATE VOUCHER
        SET Remain_Uses = Remain_Uses - 1
        WHERE Voucher_ID = p_Voucher_ID;
    END IF;

    -- Insert new order into ORDER table
    INSERT INTO `ORDER` (
        Order_ID, Status,
        Weight, COD,
        Sender_ID, Sender_Address, Sender_L1_Address_ID, Sender_L2_Address_ID, `Source_Hub_ID`,
        Receiver_ID,
        Receiver_Address, Receiver_L1_Address_ID, Receiver_L2_Address_ID, `Destination_Hub_ID`,
        Voucher_ID, Shipping_Fee
    ) VALUES (
        p_Order_ID, 'Chờ lấy hàng',
        p_Weight, p_COD,
        p_Sender_ID, p_Sender_Address, p_Sender_L1_Address, p_Sender_L2_Address, p_Source_Hub_ID,
        p_Receiver_ID,
        p_Receiver_Address, p_Receiver_L1_Address, p_Receiver_L2_Address, p_Destination_Hub_ID,
        p_Voucher_ID, p_Shipping_Fee
    );

    -- Create payment request for the order
    CALL Create_New_Payment_Customer_Order(p_Payment_ID, p_Shipping_Fee, p_Order_ID, p_Sender_ID);
    COMMIT;
END /

-- Edit Current Order
CREATE PROCEDURE Edit_Current_Order (
    IN p_Order_ID VARCHAR(100),

    IN p_COD FLOAT,

    IN p_Receiver_L2_Address VARCHAR(10)
)
BEGIN
    -- Declare variables to hold intermediate values
    DECLARE p_Destination_Hub_ID VARCHAR(100);
    DECLARE p_Status VARCHAR(100);

    -- Error handling: Rollback transaction and re-raise error if any SQL exception occurs
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Check if the order is in a state that allows editing
    SELECT Status INTO p_Status FROM `ORDER` WHERE Order_ID = p_Order_ID;
    IF (p_Status != 'Chờ lấy hàng') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không thể chỉnh sửa đơn hàng: Chỉ có thể chỉnh sửa đơn hàng ở trạng thái "Chờ lấy hàng"';
    END IF;

    START TRANSACTION;
    
    -- Get the Destination_Hub_ID based on the new Receiver_L2_Address
    SET `p_Destination_Hub_ID` = (SELECT Local_Hub_ID FROM L2_ADDRESS WHERE `ID` = p_Receiver_L2_Address);

    -- Update the order with new values
    UPDATE `ORDER`
    SET
        COD = p_COD,
        Receiver_L2_Address_ID = p_Receiver_L2_Address,
        Destination_Hub_ID = p_Destination_Hub_ID
    WHERE Order_ID = p_Order_ID;
    COMMIT;
END /

-- Wrapper procedure for support calling Cancel_Current_Order
CREATE PROCEDURE Cancel_Current_Order (
    IN p_Order_ID VARCHAR(100),
    IN p_Refund_Payment_ID VARCHAR(100)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
        -- Call Cancel_Current_Order_Delivery with default value for p_Delivery_Failed_3_Times_Flag
        CALL Cancel_Current_Order_Delivery(p_Order_ID, p_Refund_Payment_ID, 0);
    COMMIT;
END /

-- Cancel Current Order
CREATE PROCEDURE Cancel_Current_Order_Delivery (
    IN p_Order_ID VARCHAR(100),
    IN p_Refund_Payment_ID VARCHAR(100),
    IN p_Delivery_Failed_3_Times_Flag INT -- Support for canceling an order after 3 delivery failed times
)
BEGIN
    -- Declare variables for current order status, voucher ID, and payment ID
    DECLARE v_Current_Status VARCHAR(100);
    DECLARE v_Voucher_ID VARCHAR(100);
    DECLARE v_Payment_ID VARCHAR(100);

    -- Error handling: Rollback transaction and re-raise error if any SQL exception occurs
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Check if the order is in a cancellable state
    SELECT Status INTO v_Current_Status FROM `ORDER` WHERE Order_ID = p_Order_ID;
    IF (v_Current_Status != 'Chờ lấy hàng' AND p_Delivery_Failed_3_Times_Flag = 0) THEN
        SIGNAL SQLSTATE '45000' SET
            MESSAGE_TEXT = 'Không thể huỷ đơn hàng: Chỉ có thể huỷ đơn hàng không đang trong quá trình xử lí';
    END IF;

    START TRANSACTION;
    -- Retrieve Voucher_ID for the given Order_ID
    SELECT Voucher_ID INTO v_Voucher_ID
    FROM `ORDER`
    WHERE Order_ID = p_Order_ID;

    -- Retrieve Payment_ID for the given Order_ID
    SELECT Payment_ID INTO v_Payment_ID
    FROM PAYMENT
    WHERE Order_ID = p_Order_ID AND Type = 'Customer Order'
    LIMIT 1;

    CALL Return_Voucher(v_Voucher_ID); -- Return the voucher to the customer if it was used in the order
    CALL Refund_Payment(p_Refund_Payment_ID, v_Payment_ID); -- Refund the payment to the customer if it was made for the order

    -- Update the order status and reduce order count in the corresponding hub based on the reason for cancellation
    IF (p_Delivery_Failed_3_Times_Flag = 1) THEN
        UPDATE HUB
        SET Current_Order_Count = Current_Order_Count - 1
        WHERE Hub_ID = (SELECT `Destination_Hub_ID` FROM `ORDER` WHERE Order_ID = p_Order_ID);

        UPDATE `ORDER`
        SET Status = 'Đang hoàn hàng'
        WHERE Order_ID = p_Order_ID;
    ELSE
        UPDATE HUB
        SET Current_Order_Count = Current_Order_Count - 1
        WHERE Hub_ID = (SELECT `Source_Hub_ID` FROM `ORDER` WHERE Order_ID = p_Order_ID);

        UPDATE `ORDER`
        SET Status = 'Đã huỷ'
        WHERE Order_ID = p_Order_ID;
    END IF;
    COMMIT;
END /

-- Trigger to check if the rating was valid
CREATE TRIGGER Rating_Create_Check
BEFORE INSERT ON RATING
FOR EACH ROW
BEGIN
    -- Declare variables to hold intermediate values
    DECLARE t_Status VARCHAR(100);
    DECLARE t_Sender_ID VARCHAR(100);
    DECLARE t_Receiver_ID VARCHAR(100);

    -- Check if the order is in a state that allows rating
    SELECT Status INTO t_Status
    FROM `ORDER`
    WHERE Order_ID = NEW.Order_ID;

    IF (t_Status != 'Giao thành công') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không thể tạo đánh giá: Chỉ có thể đánh giá đơn hàng ở trạng thái "Giao thành công"';
    END IF;

    -- Check if the customer creating the rating is either the sender or the receiver of the order
    SELECT Sender_ID, Receiver_ID
    INTO t_Sender_ID, t_Receiver_ID
    FROM `ORDER`
    WHERE Order_ID = NEW.Order_ID;

    IF (t_Sender_ID != NEW.Customer_ID AND t_Receiver_ID != NEW.Customer_ID) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không thể tạo đánh giá: Chỉ có thể đánh giá đơn hàng nếu bạn là người gửi hoặc người nhận';
    END IF;
END /

DELIMITER;