DELIMITER /
-- ALL PAYMENT CREATED WERE ASSUMED TO BE SUCCESSFUL FOR SIMPLICITY.

-- Procedure to top up balance for a user
CREATE PROCEDURE Top_Up_Balance (
    IN p_Payment_ID VARCHAR(100),
    IN p_User_ID VARCHAR(100),
    IN p_Amount FLOAT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validate the top-up amount
    IF p_Amount <= 0 OR p_Amount IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể nạp tiền: Số tiền nạp không hợp lệ.';
    END IF;

    START TRANSACTION;
    -- Insert a new payment record
    INSERT INTO PAYMENT (
        Payment_ID, User_ID, Amount, Status, `Payment_Time`, `Type`, Details
    ) VALUES (
        p_Payment_ID, p_User_ID, p_Amount, 'Thành công', NOW(), 'Topup', 'Nạp tiền vào tài khoản'
    );
    COMMIT;
END /

-- Procedure to withdraw balance for a user
CREATE PROCEDURE Withdraw_Balance (
    IN p_Payment_ID VARCHAR(100),
    IN p_User_ID VARCHAR(100),
    IN p_Amount FLOAT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validate the withdrawal amount
    IF p_Amount <= 0 OR p_Amount IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể rút tiền: Số tiền rút không hợp lệ.';
    END IF;

    START TRANSACTION;
    -- Insert a new payment record
    INSERT INTO PAYMENT (
        Payment_ID, User_ID, Amount, Status, `Payment_Time`, `Type`, Details
    ) VALUES (
        p_Payment_ID, p_User_ID, -p_Amount, 'Thành công', NOW(), 'Withdraw', 'Rút tiền từ tài khoản'
    );
    COMMIT;
END /

-- Wrapper for support calling Create_New_Payment_Customer_Order
CREATE PROCEDURE Create_New_Payment_Customer_Order (
    IN p_Payment_ID VARCHAR(100),
    IN p_Amount FLOAT,
    IN p_Order_ID VARCHAR(100),
    IN p_Customer_ID VARCHAR(100)
)
BEGIN
    -- Call Create_New_Payment_Customer_Order_Delivery with default value for p_Delivery_Success_Flag
    CALL Create_New_Payment_Customer_Order_Delivery(p_Payment_ID, p_Amount, p_Order_ID, p_Customer_ID, 0);
END /

-- Procedure to create a new payment record for a customer order
CREATE PROCEDURE Create_New_Payment_Customer_Order_Delivery (
    IN p_Payment_ID VARCHAR(100),
    IN p_Amount FLOAT,
    IN p_Order_ID VARCHAR(100),
    IN p_Customer_ID VARCHAR(100),
    IN p_Delivery_Success_Flag INT -- Support for creating a new payment record for a customer order delivery success
)
BEGIN
    -- WORKAROUND for create a new payment record for a customer order delivery success, by automatically topup money to customer inorder to make the balance always sufficient
    IF (p_Delivery_Success_Flag = 1) THEN
        UPDATE `USER`
        SET Balance = Balance + p_Amount
        WHERE User_ID = p_Customer_ID;
    END IF;
    
    -- Insert a new payment record
    INSERT INTO PAYMENT (
        Payment_ID, User_ID, Amount, Status, `Payment_Time`, `Type`, Details, Order_ID
    ) VALUES (
        p_Payment_ID, p_Customer_ID, -p_Amount, 'Thành công', NOW(), 'Customer Order', CONCAT('Thanh toán đơn hàng ', p_Order_ID), p_Order_ID
    );
END /

-- Procedure to create a new payment record for a COD income
CREATE PROCEDURE Create_New_Payment_Order_COD_Income (
    IN p_Payment_ID VARCHAR(100),
    IN p_Order_ID VARCHAR(100)
)
BEGIN
    DECLARE v_COD FLOAT;
    DECLARE v_Sender_ID VARCHAR(100);

    SELECT COD, Sender_ID 
    INTO v_COD, v_Sender_ID 
    FROM `ORDER` 
    WHERE Order_ID = p_Order_ID;
    
    -- Insert a new payment record
    INSERT INTO PAYMENT (
        Payment_ID, User_ID, Amount, Status, `Payment_Time`, `Type`, Details, `Order_ID`
    ) VALUES (
        p_Payment_ID, v_Sender_ID, v_COD, 'Thành công', NOW(), 'COD Income', CONCAT('Thu hộ COD đơn hàng ', p_Order_ID), p_Order_ID
    );
END /

-- Procedure to create a new payment record for a staff bonus
CREATE PROCEDURE Create_New_Payment_Staff_Bonus (
    IN p_Payment_ID VARCHAR(100),
    IN p_Amount FLOAT,
    IN p_Staff_ID VARCHAR(100),
    IN p_Order_ID VARCHAR(100)
)
BEGIN
    -- Insert a new payment record
    INSERT INTO PAYMENT (
        Payment_ID, User_ID, Amount, Status, `Payment_Time`, `Type`, Details, `Order_ID`
    ) VALUES (
        p_Payment_ID, p_Staff_ID, p_Amount, 'Thành công', NOW(), 'Staff Bonus', CONCAT('Thưởng đơn hàng ', p_Order_ID), p_Order_ID
    );
END /

CREATE PROCEDURE Create_New_Payment_Shipment_Bonus (
    IN p_Payment_ID VARCHAR(100),
    IN p_Amount FLOAT,
    IN p_Staff_ID VARCHAR(100),
    IN p_Shipment_ID VARCHAR(100)
)
BEGIN
    -- Insert a new payment record
    INSERT INTO PAYMENT (
        Payment_ID, User_ID, Amount, Status, `Payment_Time`, `Type`, Details, `Shipment_ID`
    ) VALUES (
        p_Payment_ID, p_Staff_ID, p_Amount, 'Thành công', NOW(), 'Shipment Bonus', CONCAT('Thưởng chuyến giao hàng ', p_Shipment_ID), p_Shipment_ID
    );
END /

-- Procedure to create a new payment record for a staff salary
CREATE PROCEDURE Create_New_Payment_Staff_Salary (
    IN p_Payment_ID VARCHAR(100),
    IN p_Staff_ID VARCHAR(100),
    IN p_Amount FLOAT
)
BEGIN
    INSERT INTO PAYMENT (
        Payment_ID, User_ID, Amount, Status, `Payment_Time`, `Type`, Details
    ) VALUES (
        p_Payment_ID, p_Staff_ID, p_Amount, 'Thành công', NOW(), 'Salary', 'Tiền lương tháng'
    );
END /

-- Procedure to process a refund for a given payment ID
CREATE PROCEDURE Refund_Payment (
    IN p_Refund_Payment_ID VARCHAR(100),
    IN p_Payment_ID VARCHAR(100)
)
refund_proc: BEGIN
    -- Retrieve details of the original payment
    DECLARE v_User_ID VARCHAR(100);
    DECLARE v_Amount FLOAT;
    DECLARE v_Status VARCHAR(100);
    DECLARE v_Type VARCHAR(100);
    DECLARE v_Order_ID VARCHAR(100);
    DECLARE v_Refund_Time DATETIME;

    -- SQL exceptions handler

    -- Retrieve the original payment details
    SELECT User_ID, Amount, Status, `Type`, `Order_ID`
    INTO v_User_ID, v_Amount, v_Status, v_Type, v_Order_ID
    FROM PAYMENT
    WHERE Payment_ID = p_Payment_ID;

    SELECT `Payment_Time`
    INTO v_Refund_Time
    FROM PAYMENT
    WHERE `Type` = 'Refund' AND `Order_ID` = v_Order_ID;

    -- Validate that the payment exists and can be refunded
    IF v_User_ID IS NULL THEN
        SIGNAL SQLSTATE '45000' SET
            MESSAGE_TEXT = 'Không thể hoàn tiền: Giao dịch không tồn tại.';
    END IF;

    IF (v_Refund_Time IS NOT NULL) THEN
        SIGNAL SQLSTATE '45000' SET
            MESSAGE_TEXT = 'Không thể hoàn tiền: Giao dịch đã được hoàn tiền trước đó.';
    END IF;

    IF(`v_Status` != 'Thành công' OR v_Type != 'Customer Order') THEN
        SIGNAL SQLSTATE '45000' SET
            MESSAGE_TEXT = 'Không thể hoàn tiền: Giao dịch không hợp lệ để hoàn tiền.';
    END IF;

    IF(`v_Amount` = 0) THEN
        LEAVE refund_proc; -- No refund needed for zero amount
    END IF;

    -- Insert a new payment record for the refund
    INSERT INTO PAYMENT (
        Payment_ID, User_ID, Amount, Status, `Payment_Time`, `Type`, Details, `Order_ID`
    ) VALUES (
        p_Refund_Payment_ID, v_User_ID, ABS(v_Amount), 'Thành công', NOW(), 'Refund', CONCAT('Hoàn tiền cho giao dịch ', p_Payment_ID), v_Order_ID
    );
END /

-- Trigger to check and update user balance after a payment record is inserted
CREATE TRIGGER Balance_Update_Trigger
    BEFORE INSERT ON PAYMENT
    FOR EACH ROW
BEGIN
    DECLARE v_Balance FLOAT;
    SELECT Balance INTO v_Balance FROM `USER` WHERE User_ID = NEW.User_ID;

    IF (v_Balance + NEW.Amount < 0) THEN
        SIGNAL SQLSTATE '45000' SET
            MESSAGE_TEXT = 'Không thể thực hiện giao dịch: Số dư không đủ.';
    END IF;

    UPDATE `USER`
    SET Balance = Balance + NEW.Amount
    WHERE User_ID = NEW.User_ID;
END /

DELIMITER ;