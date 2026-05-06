DELIMITER /

-- Trigger to check if the order is in the correct status before creating a pickup order
CREATE TRIGGER Pickup_Order_Creation_Check
BEFORE INSERT ON PICKUP_ORDER
FOR EACH ROW
BEGIN
    DECLARE Order_Status VARCHAR(100);

    SELECT Status INTO Order_Status
    FROM `ORDER`
    WHERE Order_ID = NEW.Order_ID;

    IF (Order_Status != 'Chờ lấy hàng') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không thể tạo yêu cầu lấy hàng: Đơn hàng không ở trạng thái "Chờ lấy hàng"';
    END IF;
END /

CREATE TRIGGER Driver_Busy_Check
BEFORE INSERT ON PICKUP_ORDER
FOR EACH ROW
BEGIN
    -- Check if the driver was frees from the previous shipment
    IF EXISTS (
        SELECT 1
        FROM SHIPMENT
        WHERE Driver_ID = NEW.Driver_ID AND End_Time IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Không thể tạo yêu cầu lấy hàng: Tài xế đang bận.';
    END IF;
END /

-- Create Pickup Order
CREATE PROCEDURE Create_Pickup_Order (
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

    -- Insert a new pickup order or update the existing one if it already exists
    INSERT INTO PICKUP_ORDER (
        Driver_ID, Order_ID, Start_Time, Pickup_Time, Pickup_Count, Status
    ) VALUES (
        p_Driver_ID, p_Order_ID, NOW(), NULL, 1, 'Đang lấy hàng'
    )
    ON DUPLICATE KEY UPDATE
        Start_Time = NOW(),
        Pickup_Time = NULL,
        Pickup_Count = Pickup_Count + 1,
        Status = 'Đang lấy hàng';
    COMMIT;
END /

-- Mark the current pickup order as completed when the driver successfully picks up the order
CREATE PROCEDURE Pickup_Complete (
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
    UPDATE PICKUP_ORDER
    SET Pickup_Time = NOW(), Status = 'Đã lấy hàng'
    WHERE Driver_ID = p_Driver_ID AND Order_ID = p_Order_ID;
    COMMIT;
END /

-- Mark the current pickup order as failed if the driver cannot pick up the order
CREATE PROCEDURE Pickup_Failed (
    IN p_Driver_ID VARCHAR(100),
    IN p_Order_ID VARCHAR(100),
    IN p_Refund_Payment_ID VARCHAR(100)
)
BEGIN
    -- Declare a variable to store the current pickup count for the order
    DECLARE Current_Pickup_Count INT;

    -- Update the pickup order to mark it as failed and increment the pickup count
    START TRANSACTION;
    UPDATE PICKUP_ORDER
    SET 
        Pickup_Time = NOW(),
        Status = 'Không lấy được hàng'
    WHERE Driver_ID = p_Driver_ID AND Order_ID = p_Order_ID;

    -- Retrieve the current pickup count for the order
    SELECT Pickup_Count INTO Current_Pickup_Count
    FROM PICKUP_ORDER
    WHERE Driver_ID = p_Driver_ID AND Order_ID = p_Order_ID;

    -- Cancel the order if the driver has failed to pick up the order 3 times
    IF (Current_Pickup_Count >= 3) THEN
        CALL Cancel_Current_Order(p_Order_ID, p_Refund_Payment_ID);
        SIGNAL SQLSTATE '45000' SET
            MESSAGE_TEXT = 'Đơn hàng đã bị huỷ sau 3 lần không lấy được hàng';
    END IF;
    COMMIT;
END /

-- Trigger to automatically update the order status to Processing when the order was checkin at the Source HUB (Support for sender to send the order to the HUB by themselves)
CREATE TRIGGER Order_Status_Update
AFTER INSERT ON ORDER_TRACKING
FOR EACH ROW
BEGIN
    DECLARE t_Source_Hub_ID VARCHAR(100);
    DECLARE Order_Status VARCHAR(100);

    SELECT Source_Hub_ID INTO t_Source_Hub_ID
    FROM `ORDER`
    WHERE Order_ID = NEW.Order_ID;

    SELECT Status INTO Order_Status
    FROM `ORDER`
    WHERE Order_ID = NEW.Order_ID;

    IF (Order_Status = 'Chờ lấy hàng' AND NEW.Hub_ID = t_Source_Hub_ID) THEN
        UPDATE `ORDER`
        SET Status = 'Đang xử lí'
        WHERE Order_ID = NEW.Order_ID;
    END IF;
END /

DELIMITER;