DELIMITER /

-- Procedure to validate voucher before applying it to an order
CREATE PROCEDURE Validate_Voucher (
    IN p_Voucher_ID VARCHAR(100)
)
proc_validate: BEGIN
    DECLARE Is_Exist INT;
    DECLARE Voucher_Remain_Uses INT;
    DECLARE Voucher_Expire DATE;

    -- If Voucher_ID is NULL, skip validation
    IF (p_Voucher_ID IS NULL) THEN
        LEAVE proc_validate;
    END IF;

    -- Check if voucher exists
    SELECT COUNT(*) INTO Is_Exist
    FROM VOUCHER
    WHERE Voucher_ID = p_Voucher_ID;

    IF (Is_Exist = 0) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Voucher không tồn tại';
    END IF;

    SELECT `Expire`, `Remain_Uses` INTO Voucher_Expire, Voucher_Remain_Uses
    FROM VOUCHER
    WHERE Voucher_ID = p_Voucher_ID;

    IF (Voucher_Remain_Uses <= 0) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Voucher này đã hết lượt sử dụng';
    END IF;

    IF (Voucher_Expire < CURRENT_DATE) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Voucher này đã hết hạn';
    END IF;
END /

-- Procedure to return voucher to customer when order is cancelled
CREATE PROCEDURE Return_Voucher (
    IN p_Voucher_ID VARCHAR(100)
)
proc_return: BEGIN
    -- If Voucher_ID is NULL, skip returning voucher
    IF (p_Voucher_ID IS NULL) THEN
        LEAVE proc_return;
    END IF;

    -- Increment the Remain_Uses of the voucher by 1
    UPDATE VOUCHER
    SET Remain_Uses = Remain_Uses + 1
    WHERE Voucher_ID = p_Voucher_ID;
END /

DELIMITER ;