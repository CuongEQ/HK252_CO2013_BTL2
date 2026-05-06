DELIMITER /

-- Trigger to check if the order is in the correct status before creating a delivery order
DROP TRIGGER IF EXISTS Delivery_Order_Assignment_Check_Insert /
CREATE TRIGGER Delivery_Order_Assignment_Check_Insert
BEFORE INSERT ON DELIVERY_ORDER
FOR EACH ROW
BEGIN
    DECLARE Is_Arrived INT DEFAULT 0;
    DECLARE t_Destination_Hub_ID VARCHAR(100);

    SELECT Destination_Hub_ID INTO t_Destination_Hub_ID
    FROM `ORDER`
    WHERE Order_ID = NEW.Order_ID;

    SELECT COUNT(*) INTO Is_Arrived
    FROM ORDER_TRACKING
    WHERE
        Order_ID = NEW.Order_ID AND
        Hub_ID = t_Destination_Hub_ID AND
        Arrival IS NOT NULL AND
        Departure IS NULL;

    IF(Is_Arrived = 0) THEN
        SIGNAL SQLSTATE '45000'
        SET
            MESSAGE_TEXT = 'Không thể tạo yêu cầu giao hàng: Đơn hàng chưa đến HUB đích';
    END IF;
END /

DROP TRIGGER IF EXISTS Driver_Busy_Check_Insert /
CREATE TRIGGER Driver_Busy_Check_Insert
BEFORE INSERT ON DELIVERY_ORDER
FOR EACH ROW
BEGIN
    -- Check if the driver was frees from the previous shipment
    IF EXISTS (
        SELECT 1
        FROM SHIPMENT
        WHERE Driver_ID = NEW.Driver_ID AND End_Time IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể tạo yêu cầu giao hàng: Tài xế đang bận.';
    END IF;
END /

DROP PROCEDURE IF EXISTS Create_Delivery_Order /
-- Create Delivery Order
CREATE PROCEDURE Create_Delivery_Order (
    IN p_Driver_ID VARCHAR(100),
    IN p_Order_ID VARCHAR(100)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Insert a new delivery order or update the existing one if it already exists
    INSERT INTO DELIVERY_ORDER (
        Driver_ID, Order_ID, Start_Time, Delivery_Time, Delivery_Count, Status
    ) VALUES (
        p_Driver_ID, p_Order_ID, NOW(), NULL, 1, 'Đang giao hàng'
    )
    ON DUPLICATE KEY UPDATE
        Start_Time = NOW(),
        Delivery_Time = NULL,
        Delivery_Count = Delivery_Count + 1,
        Status = 'Đang giao hàng';
    COMMIT;
END /

DROP PROCEDURE IF EXISTS Delivery_Complete /
-- Mark the current delivery order as completed when the driver successfully delivers the order
CREATE PROCEDURE Delivery_Complete (
    IN p_Driver_ID VARCHAR(100),
    IN p_Order_ID VARCHAR(100),
    IN p_Payment_ID VARCHAR(100)
)
BEGIN
    -- Declare variables to store the COD amount
    DECLARE v_COD FLOAT;
    DECLARE v_Receiver_ID VARCHAR(100);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT COD, Receiver_ID INTO v_COD, v_Receiver_ID
    FROM `ORDER`
    WHERE Order_ID = p_Order_ID;

    -- Create payment request for the order's COD
    CALL `Create_New_Payment_Customer_Order_Delivery`(p_Payment_ID, v_COD, p_Order_ID, v_Receiver_ID, 1);

    -- Update the delivery order to mark it as completed when the driver successfully delivers the order
    UPDATE DELIVERY_ORDER
    SET Delivery_Time = NOW(), Status = 'Đã giao hàng'
    WHERE Driver_ID = p_Driver_ID AND Order_ID = p_Order_ID;

    -- Create payment request for the sender's COD income
    IF v_COD > 0 THEN
        CALL Create_New_Payment_Order_COD_Income(CONCAT(p_Payment_ID, '_COD'), p_Order_ID);
    END IF;

    -- Update the order status to 'Giao thành công' when the delivery is completed
    UPDATE `ORDER`
    SET Status = 'Giao thành công'
    WHERE Order_ID = p_Order_ID;
    COMMIT;
END /

DROP PROCEDURE IF EXISTS Delivery_Failed /
-- Mark the current delivery order as failed if the driver cannot deliver the order
CREATE PROCEDURE Delivery_Failed (
    IN p_Driver_ID VARCHAR(100),
    IN p_Order_ID VARCHAR(100),
    IN p_Refund_Payment_ID VARCHAR(100)
)
BEGIN
    -- Declare a variable to store the current delivery count for the order
    DECLARE Current_Delivery_Count INT;

    START TRANSACTION;

    -- Update the delivery order to mark it as failed if the driver cannot deliver the order
    UPDATE DELIVERY_ORDER
    SET Delivery_Time = NOW(), Status = 'Không giao được hàng'
    WHERE Driver_ID = p_Driver_ID AND Order_ID = p_Order_ID;

    -- Retrieve the current delivery count for the order
    SELECT Delivery_Count INTO Current_Delivery_Count
    FROM DELIVERY_ORDER
    WHERE Driver_ID = p_Driver_ID AND Order_ID = p_Order_ID;

    -- Cancel the order if the driver has failed to deliver the order 3 times
    IF (Current_Delivery_Count >= 3) THEN
        CALL `Cancel_Current_Order_Delivery`(p_Order_ID, p_Refund_Payment_ID, 1);
        SIGNAL SQLSTATE '45000' SET
            MESSAGE_TEXT = 'Đơn hàng đã bị huỷ do giao hàng thất bại 3 lần';
    END IF;
    COMMIT;
END /

DELIMITER ;