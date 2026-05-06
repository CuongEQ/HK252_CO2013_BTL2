DELIMITER /

CREATE PROCEDURE Order_Checkin (
    IN p_Hub_ID VARCHAR(100),
    IN p_Order_ID VARCHAR(100)
)
BEGIN
    -- Declare variables
    DECLARE p_Status VARCHAR(100);
    DECLARE p_Source_Hub_ID VARCHAR(100);
    DECLARE p_End_Time DATETIME;
    DECLARE p_Shipment_ID VARCHAR(100);
    DECLARE p_Current_Shipment_Hub_ID VARCHAR(100);

    -- Error handling: Rollback transaction if any SQL error occurs
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Prevent check-in if the order is the first time check-in but not in source hub
    SELECT `Status`, Source_Hub_ID INTO p_Status, p_Source_Hub_ID
    FROM `ORDER`
    WHERE Order_ID = p_Order_ID;

    IF (p_Status = 'Chờ lấy hàng' AND p_Hub_ID != p_Source_Hub_ID) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không thể xác nhận đơn hàng: Đơn hàng không được gửi tại HUB này.';
    END IF;

    -- Prevent check-in if the order is in completed or cancelled status    
    IF (p_Status = 'Đã giao hàng' OR p_Status = 'Đã huỷ') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không thể xác nhận đơn hàng: Đơn hàng không ở trạng thái hợp lệ';
    END IF;

    START TRANSACTION;

    -- Check if the order is already in the hub
    IF EXISTS (SELECT 1 FROM ORDER_TRACKING WHERE Order_ID = p_Order_ID AND Hub_ID = p_Hub_ID AND Departure IS NULL) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Đơn hàng đã được nhập kho tại bưu cục này.';
    END IF;

    -- Increment the HUB current order count
    UPDATE HUB
    SET Current_Order_Count = Current_Order_Count + 1
    WHERE Hub_ID = p_Hub_ID;

    -- Insert a new record into ORDER_TRACKING to log the check-in event
    INSERT INTO ORDER_TRACKING (
        Order_ID, Hub_ID, Arrival, Departure
    ) VALUES (
        p_Order_ID, p_Hub_ID, NOW(), NULL
    );

    IF (p_Status != 'Chờ lấy hàng') THEN
        -- Retrieve current shipment if the order is in processing status
        SELECT so.Shipment_ID INTO p_Shipment_ID
        FROM SHIPMENT_ORDER so
        JOIN SHIPMENT s ON so.Shipment_ID = s.Shipment_ID
        AND so.Driver_ID = s.Driver_ID
        WHERE so.Order_ID = p_Order_ID
        ORDER BY s.Start_Time DESC
        LIMIT 1;

        -- Check if destination hub of current shipment is current hub
        SELECT Destination_Hub_ID INTO p_Current_Shipment_Hub_ID
        FROM SHIPMENT
        WHERE Shipment_ID = p_Shipment_ID;

        IF (p_Current_Shipment_Hub_ID != p_Hub_ID) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Không thể xác nhận đơn hàng: Đơn hàng không được gửi tại HUB này.';
        END IF;

        -- Update the SHIPMENT record to set the End_Time for the shipment if it is not already set
        SELECT End_Time INTO p_End_Time
        FROM SHIPMENT
        WHERE Shipment_ID = p_Shipment_ID;

        IF(p_End_Time IS NULL) THEN
            UPDATE SHIPMENT
            SET End_Time = NOW()
            WHERE Shipment_ID = p_Shipment_ID;
        END IF;
    END IF;
    
    COMMIT;
END /

DROP PROCEDURE IF EXISTS Order_Checkout;

CREATE PROCEDURE Order_Checkout (
    IN p_Current_Hub_ID VARCHAR(100),
    IN p_Destination_Hub_ID VARCHAR(100),
    IN p_Shipment_ID VARCHAR(100),
    IN p_Driver_ID VARCHAR(100),
    IN p_Order_ID VARCHAR(100)
)
BEGIN
    -- Declare variables
    DECLARE v_Error_Message VARCHAR(255); -- Variable to store error message
    -- Error handling: Rollback transaction if any SQL error occurs
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check if the order is currently checked-in at this hub and hasn't departed yet
    IF NOT EXISTS (SELECT 1 FROM ORDER_TRACKING WHERE Order_ID = p_Order_ID AND Hub_ID = p_Current_Hub_ID AND Departure IS NULL) THEN
        SET v_Error_Message = CONCAT('Không thể xuất kho: Đơn hàng ', p_Order_ID, ' không tồn tại tại HUB này.');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_Error_Message;
    END IF;

    -- Check if the driver was frees from the previous shipment
    IF EXISTS (SELECT 1 FROM SHIPMENT WHERE Driver_ID = p_Driver_ID AND End_Time IS NULL) THEN
        SET v_Error_Message = CONCAT('Không thể xuất kho: Tài xế ', p_Driver_ID, ' đang bận.');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_Error_Message;
    END IF;

    -- Check if the destination hub has capacity to accept the new order
    CALL Hub_Capacity_Check(p_Destination_Hub_ID);

    -- Decrement the current order count of the current hub
    UPDATE `HUB`
    SET Current_Order_Count = Current_Order_Count - 1
    WHERE Hub_ID = p_Current_Hub_ID;

    -- Update the ORDER_TRACKING record to set the Departure time for the current hub
    UPDATE ORDER_TRACKING
    SET Departure = NOW() 
    WHERE Order_ID = p_Order_ID AND Hub_ID = p_Current_Hub_ID AND Departure IS NULL;

    -- Insert a new record into SHIPMENT to log the shipment details if it does not already exist
    INSERT IGNORE INTO SHIPMENT (
        Driver_ID, Shipment_ID, Start_Time, End_Time, Destination_Hub_ID
    ) VALUES (
        p_Driver_ID, p_Shipment_ID, NOW(), NULL, p_Destination_Hub_ID
    );

    -- Insert a new record into SHIPMENT_ORDER to link the shipment with the order
    INSERT INTO SHIPMENT_ORDER (
        Driver_ID, Shipment_ID, Order_ID
    ) VALUES (
        p_Driver_ID, p_Shipment_ID, p_Order_ID
    );
    COMMIT;
END /

CREATE PROCEDURE Hub_Capacity_Check(
    IN p_Hub_ID VARCHAR(100)
)
BEGIN
    DECLARE p_Current_Order_Count INT;
    DECLARE p_Max_Capacity INT;
    
    -- Get current order count and max capacity
    SELECT Current_Order_Count, Max_Capacity 
    INTO p_Current_Order_Count, p_Max_Capacity
    FROM `HUB`
    WHERE Hub_ID = p_Hub_ID;
    
    -- Check if destination hub has capacity
    IF p_Current_Order_Count >= p_Max_Capacity THEN
        SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Không thể xác nhận đơn hàng: HUB đã đầy.';
    END IF;
END /

-- Procedure for batch check-in by Shipment ID
CREATE PROCEDURE Order_Checkin_Shipment (
    IN p_Hub_ID VARCHAR(100),
    IN p_Shipment_ID VARCHAR(100)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_Order_ID VARCHAR(100);
    DECLARE cur_orders CURSOR FOR 
        SELECT Order_ID FROM SHIPMENT_ORDER WHERE Shipment_ID = p_Shipment_ID;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Error handling
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    OPEN cur_orders;
    read_loop: LOOP
        FETCH cur_orders INTO v_Order_ID;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Call check-in for each order
        -- We ignore if an order is already checked in to allow partial shipment check-in retry
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            CALL Order_Checkin(p_Hub_ID, v_Order_ID);
        END;
    END LOOP;
    CLOSE cur_orders;
END /

DELIMITER;