DELIMITER /

-- Function to get the membership tier of a customer based on their total spending in a given month and year
CREATE FUNCTION Get_Customer_Membership_Tier (
    p_Customer_ID VARCHAR(100),
    p_Month INT,
    p_Year INT
) RETURNS VARCHAR(50)
DETERMINISTIC
BEGIN
    DECLARE v_Total_Spent FLOAT DEFAULT 0;
    DECLARE v_Fee FLOAT;
    DECLARE v_Tier VARCHAR(50);
    DECLARE done INT DEFAULT FALSE;

    -- Retrieve all successful orders for the customer in the given month and year
    DECLARE cur_orders CURSOR FOR
        SELECT o.Shipping_Fee
        FROM `ORDER` o
        JOIN DELIVERY_ORDER do ON o.Order_ID = do.Order_ID
        WHERE o.Sender_ID = p_Customer_ID
          AND o.Status = 'Giao thành công'
          AND MONTH(do.Delivery_Time) = p_Month
          AND YEAR(do.Delivery_Time) = p_Year;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_orders;
    read_loop: LOOP
        FETCH cur_orders INTO v_Fee;
        IF done THEN 
            LEAVE read_loop; 
        END IF;
        
        SET v_Total_Spent = v_Total_Spent + v_Fee;
    END LOOP;
    CLOSE cur_orders;

    -- Determine the membership tier based on total spending
    IF v_Total_Spent >= 1000000 THEN 
        SET v_Tier = 'Kim Cương';
    ELSEIF v_Total_Spent >= 500000 THEN 
        SET v_Tier = 'Vàng';
    ELSEIF v_Total_Spent >= 200000 THEN 
        SET v_Tier = 'Bạc';
    ELSE 
        SET v_Tier = 'Đồng';
    END IF;

    RETURN v_Tier;
END /

DELIMITER /

-- Function to calculate the total bonus amount a staff has received in a given month and year
CREATE FUNCTION Calculate_Total_Monthly_Bonus (
    p_User_ID VARCHAR(100),
    p_Month INT,
    p_Year INT
) RETURNS FLOAT
DETERMINISTIC
BEGIN
    DECLARE v_Total_Bonus FLOAT DEFAULT 0;
    DECLARE v_Amount FLOAT;
    DECLARE done INT DEFAULT FALSE;

    -- Retrieve all successful bonus payments for the staff in the given month and year
    DECLARE cur_bonus CURSOR FOR
        SELECT Amount
        FROM PAYMENT
        WHERE User_ID = p_User_ID
          AND Status = 'Thành công'
          AND `Type` LIKE '%Bonus'
          AND MONTH(Payment_Time) = p_Month
          AND YEAR(Payment_Time) = p_Year;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_bonus;
    read_loop: LOOP
        FETCH cur_bonus INTO v_Amount;
        IF done THEN 
            LEAVE read_loop; 
        END IF;
        
        SET v_Total_Bonus = v_Total_Bonus + v_Amount;
    END LOOP;
    CLOSE cur_bonus;

    RETURN v_Total_Bonus;
END /

DELIMITER;