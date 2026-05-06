DELIMITER /

-- Procedure to get sent orders by a customer with optional status and phone number filters
CREATE PROCEDURE Get_Sent_Orders (
    IN p_Sender_ID VARCHAR(100),
    IN p_Status VARCHAR(100),
    IN p_Phone_Filter VARCHAR(100)
)
BEGIN
    SELECT 
        o.Order_ID,
        o.Status,
        o.Weight,
        o.COD,
        o.Shipping_Fee,
        u_send.Phone AS Sender_Phone,
        u_recv.First_Name AS Receiver_First_Name,
        u_recv.Phone AS Receiver_Phone
    FROM `ORDER` o
    JOIN `USER` u_send ON o.Sender_ID = u_send.User_ID
    JOIN `USER` u_recv ON o.Receiver_ID = u_recv.User_ID
    WHERE o.Sender_ID = p_Sender_ID
      AND (p_Status = 'ALL' OR p_Status = '' OR o.Status = p_Status)
      AND (p_Phone_Filter = 'ALL' OR p_Phone_Filter = '' OR u_recv.Phone LIKE CONCAT('%', p_Phone_Filter, '%'))
    ORDER BY u_recv.Phone ASC, o.Order_ID DESC;
END /

-- Procedure to get received orders by a customer with optional status and phone number filters
CREATE PROCEDURE Get_Received_Orders (
    IN p_Receiver_ID VARCHAR(100),
    IN p_Status VARCHAR(100),
    IN p_Phone_Filter VARCHAR(100)
)
BEGIN
    SELECT 
        o.Order_ID,
        o.Status,
        o.Weight,
        o.COD,
        o.Shipping_Fee,
        u_send.First_Name AS Sender_First_Name,
        u_send.Phone AS Sender_Phone,
        u_recv.Phone AS Receiver_Phone
    FROM `ORDER` o
    JOIN `USER` u_send ON o.Sender_ID = u_send.User_ID
    JOIN `USER` u_recv ON o.Receiver_ID = u_recv.User_ID
    WHERE o.Receiver_ID = p_Receiver_ID
      AND (p_Status = 'ALL' OR p_Status = '' OR o.Status = p_Status)
      AND (p_Phone_Filter = 'ALL' OR p_Phone_Filter = '' OR u_send.Phone LIKE CONCAT('%', p_Phone_Filter, '%'))
    ORDER BY u_send.Phone ASC, o.Order_ID DESC;
END /

-- Procedure to rank hubs based on the number of successful deliveries in a given month and year
CREATE PROCEDURE Rank_Hub_Performance (
    IN p_Month INT,
    IN p_Year INT
)
BEGIN
    SELECT 
        h.Hub_ID, 
        h.Hub_Name, 
        COUNT(o.Order_ID) AS Total_Successful_Orders
    FROM HUB h
    JOIN `ORDER` o ON h.Hub_ID = o.Source_Hub_ID
    JOIN DELIVERY_ORDER do ON o.Order_ID = do.Order_ID
    WHERE o.Status = 'Giao thành công'
      AND do.Status = 'Đã giao hàng'
      AND MONTH(do.Delivery_Time) = p_Month
      AND YEAR(do.Delivery_Time) = p_Year
    GROUP BY h.Hub_ID, h.Hub_Name
    ORDER BY Total_Successful_Orders DESC;
END /

DELIMITER;