DELIMITER /

-- Procedure to create a new user
CREATE PROCEDURE Create_New_User (
    IN p_User_ID VARCHAR(100),
    IN p_Phone VARCHAR(20),
    IN p_Password VARCHAR(100),
    IN p_First_Name VARCHAR(100),
    IN p_Last_Name VARCHAR(100)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    INSERT INTO `USER` (
        User_ID, Phone, Password, First_Name, Last_Name, Balance
    ) VALUES (
        p_User_ID, p_Phone, p_Password, p_First_Name, p_Last_Name, 0
    );

    INSERT INTO CUSTOMER (User_ID, Create_Date, Customer_Tier) 
    VALUES (p_User_ID, NOW(), 'Đồng');
    COMMIT;
END /

-- Procedure to update current user information
CREATE PROCEDURE Update_Current_User(
    IN p_User_ID VARCHAR(100),
    IN p_First_Name VARCHAR(100),
    IN p_Last_Name VARCHAR(100),
    IN p_Password VARCHAR(100)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    UPDATE `USER`
    SET First_Name = p_First_Name,
        Last_Name = p_Last_Name,
        Password = p_Password
    WHERE User_ID = p_User_ID;
    COMMIT;
END /

-- FOR DRIVER: Trigger to automatically calculate and update the experience of a driver based on the start date
CREATE TRIGGER Calculate_Experience_Insert
BEFORE INSERT ON DRIVER
FOR EACH ROW
BEGIN
    SET NEW.Experience = YEAR(CURRENT_DATE) - YEAR(NEW.Start_Date);
END /

CREATE TRIGGER Calculate_Experience_Update
BEFORE UPDATE ON DRIVER
FOR EACH ROW
BEGIN
    SET NEW.Experience = YEAR(CURRENT_DATE) - YEAR(NEW.Start_Date);
END /

DELIMITER;