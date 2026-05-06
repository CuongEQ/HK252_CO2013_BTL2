DROP DATABASE IF EXISTS `HeThongVanChuyen`;

CREATE DATABASE HeThongVanChuyen;

USE HeThongVanChuyen;

CREATE TABLE `USER` (
    User_ID VARCHAR(100) PRIMARY KEY,
    Phone VARCHAR(100) UNIQUE,
    Password VARCHAR(100) NOT NULL,
    First_Name VARCHAR(100),
    Last_Name VARCHAR(100),
    Balance FLOAT NOT NULL
);

CREATE TABLE HUB (
    Hub_ID VARCHAR(100) PRIMARY KEY,
    Hub_Name VARCHAR(100) NOT NULL,
    Hub_Address VARCHAR(255) NOT NULL,
    Current_Order_Count INT NOT NULL,
    Max_Capacity INT NOT NULL
);

CREATE TABLE VOUCHER (
    Voucher_ID VARCHAR(100) PRIMARY KEY,
    Value FLOAT NOT NULL,
    Check (Value > 0),
    Remain_Uses INT NOT NULL,
    Check (Remain_Uses >= 0),
    Visible BOOLEAN NOT NULL,
    Expire DATETIME NOT NULL
);

CREATE TABLE CUSTOMER (
    User_ID VARCHAR(100) PRIMARY KEY,
    Create_Date DATETIME NOT NULL,
    Customer_Tier VARCHAR(100) NOT NULL,
    CHECK (
        Customer_Tier IN (
            'Đồng',
            'Bạc',
            'Vàng',
            'Kim cương'
        )
    ),
    FOREIGN KEY (User_ID) REFERENCES `USER` (User_ID)
);

CREATE TABLE DRIVER (
    User_ID VARCHAR(100) PRIMARY KEY,
    Experience INT,
    Start_Date DATETIME,
    FOREIGN KEY (User_ID) REFERENCES `USER` (User_ID)
);

CREATE TABLE STAFF (
    User_ID VARCHAR(100) PRIMARY KEY,
    Role VARCHAR(100),
    Supervisor_ID VARCHAR(100),
    Hub_ID_Works VARCHAR(100),
    FOREIGN KEY (User_ID) REFERENCES `USER` (User_ID),
    FOREIGN KEY (Supervisor_ID) REFERENCES STAFF (User_ID),
    FOREIGN KEY (Hub_ID_Works) REFERENCES HUB (Hub_ID)
);

CREATE TABLE `L1_ADDRESS` (
    `ID` VARCHAR(10) PRIMARY KEY,
    `Name` VARCHAR(100) NOT NULL
);

CREATE TABLE `L2_ADDRESS` (
    `ID` VARCHAR(10) PRIMARY KEY,
    `L1_ID` VARCHAR(10),
    `Name` VARCHAR(100) NOT NULL,
    `Local_Hub_ID` VARCHAR(100) NOT NULL, -- Local HUB for this L2 area
    FOREIGN KEY (`L1_ID`) REFERENCES `L1_ADDRESS` (`ID`),
    FOREIGN KEY (`Local_Hub_ID`) REFERENCES `HUB` (`Hub_ID`)
);

CREATE TABLE `ORDER` (
    `Order_ID` VARCHAR(100) PRIMARY KEY,
    `Status` VARCHAR(100),
    CHECK (
        `Status` IN (
            'Chờ lấy hàng',
            'Đang xử lí',
            'Đang giao',
            'Giao thành công',
            'Đã huỷ',
            'Đang hoàn hàng'
        )
    ),
    -- Package details
    `Weight` FLOAT NOT NULL,
    CHECK (`Weight` > 0),
    `COD` FLOAT NOT NULL,
    CHECK (`COD` >= 0),
    -- Sender and Receiver information
    `Sender_ID` VARCHAR(100) NOT NULL,
    `Sender_Address` VARCHAR(255) NOT NULL,
    `Sender_L1_Address_ID` VARCHAR(10) NOT NULL,
    `Sender_L2_Address_ID` VARCHAR(10) NOT NULL,
    `Source_Hub_ID` VARCHAR(100) NOT NULL,
    `Receiver_ID` VARCHAR(100) NOT NULL,
    `Receiver_Address` VARCHAR(255) NOT NULL,
    `Receiver_L1_Address_ID` VARCHAR(10) NOT NULL,
    `Receiver_L2_Address_ID` VARCHAR(10) NOT NULL,
    `Destination_Hub_ID` VARCHAR(100) NOT NULL,
    CHECK (`Sender_ID` != `Receiver_ID`),
    -- Voucher and Shipping Fee
    `Voucher_ID` VARCHAR(100),
    Shipping_Fee FLOAT NOT NULL,
    -- Foreign keys -->
    FOREIGN KEY (`Sender_ID`) REFERENCES `USER` (`User_ID`),
    FOREIGN KEY (`Sender_L1_Address_ID`) REFERENCES `L1_ADDRESS` (`ID`),
    FOREIGN KEY (`Sender_L2_Address_ID`) REFERENCES `L2_ADDRESS` (`ID`),
    FOREIGN KEY (`Source_Hub_ID`) REFERENCES `HUB` (`Hub_ID`),
    FOREIGN KEY (`Receiver_ID`) REFERENCES `USER` (`User_ID`),
    FOREIGN KEY (`Receiver_L1_Address_ID`) REFERENCES `L1_ADDRESS` (`ID`),
    FOREIGN KEY (`Receiver_L2_Address_ID`) REFERENCES `L2_ADDRESS` (`ID`),
    FOREIGN KEY (`Destination_Hub_ID`) REFERENCES `HUB` (`Hub_ID`),
    FOREIGN KEY (`Voucher_ID`) REFERENCES `VOUCHER` (`Voucher_ID`)
);

CREATE TABLE DRIVER_WORK_AREA (
    User_ID VARCHAR(100),
    Work_Area_ID VARCHAR(100),
    PRIMARY KEY (User_ID, Work_Area_ID),
    FOREIGN KEY (User_ID) REFERENCES DRIVER (User_ID),
    FOREIGN KEY (Work_Area_ID) REFERENCES `L2_ADDRESS` (ID)
);

CREATE TABLE DRIVER_CERTIFICATE (
    User_ID VARCHAR(100),
    Certificate VARCHAR(100),
    PRIMARY KEY (User_ID, Certificate),
    FOREIGN KEY (User_ID) REFERENCES DRIVER (User_ID)
);

CREATE TABLE PICKUP_ORDER (
    Driver_ID VARCHAR(100),
    Order_ID VARCHAR(100),
    Start_Time DATETIME,
    Pickup_Time DATETIME,
    CHECK (Pickup_Time > Start_Time),
    Pickup_Count INT,
    Status VARCHAR(100),
    CHECK (
        Status IN (
            'Đang lấy hàng',
            'Đã lấy hàng',
            'Không lấy được hàng'
        )
    ),
    PRIMARY KEY (Driver_ID, Order_ID),
    FOREIGN KEY (Driver_ID) REFERENCES DRIVER (User_ID),
    FOREIGN KEY (Order_ID) REFERENCES `ORDER` (Order_ID)
);

CREATE TABLE DELIVERY_ORDER (
    Driver_ID VARCHAR(100),
    Order_ID VARCHAR(100),
    Start_Time DATETIME,
    Delivery_Time DATETIME,
    CHECK (Delivery_Time > Start_Time),
    Delivery_Count INT,
    Status VARCHAR(100),
    CHECK (
        Status IN (
            'Đang giao hàng',
            'Đã giao hàng',
            'Không giao được hàng'
        )
    ),
    PRIMARY KEY (Driver_ID, Order_ID),
    FOREIGN KEY (Driver_ID) REFERENCES DRIVER (User_ID),
    FOREIGN KEY (Order_ID) REFERENCES `ORDER` (Order_ID)
);

CREATE TABLE SHIPMENT (
    Driver_ID VARCHAR(100),
    Shipment_ID VARCHAR(100),
    Start_Time DATETIME,
    End_Time DATETIME,
    Destination_Hub_ID VARCHAR(100) NOT NULL,
    CHECK (End_Time >= Start_Time),
    PRIMARY KEY (Driver_ID, Shipment_ID),
    FOREIGN KEY (Driver_ID) REFERENCES DRIVER (User_ID),
    FOREIGN KEY (Destination_Hub_ID) REFERENCES HUB (Hub_ID)
);

CREATE TABLE HUB_MANAGER (
    Hub_ID VARCHAR(100),
    Staff_ID VARCHAR(100),
    Experience INT,
    PRIMARY KEY (Hub_ID, Staff_ID),
    FOREIGN KEY (Hub_ID) REFERENCES HUB (Hub_ID),
    FOREIGN KEY (Staff_ID) REFERENCES STAFF (User_ID)
);

CREATE TABLE RATING (
    Rating_ID VARCHAR(100) PRIMARY KEY,
    Score INT,
    CHECK (
        Score >= 1
        AND Score <= 5
    ),
    Comment TEXT,
    Customer_ID VARCHAR(100),
    Order_ID VARCHAR(100),
    FOREIGN KEY (Customer_ID) REFERENCES CUSTOMER (User_ID),
    FOREIGN KEY (Order_ID) REFERENCES `ORDER` (Order_ID)
);

CREATE TABLE PAYMENT (
    Payment_ID VARCHAR(100) PRIMARY KEY,
    User_ID VARCHAR(100) NOT NULL,
    Amount FLOAT NOT NULL,
    Status VARCHAR(100) NOT NULL,
    CHECK (
        Status IN (
            'Đang xử lí',
            'Thành công',
            'Thất bại'
        )
    ),
    `Payment_Time` DATETIME NOT NULL,
    `Type` VARCHAR(100) NOT NULL,
    CHECK (
        `Type` IN (
            'Customer Order',
            'Order Income',
            'Staff Bonus',
            'Shipment Bonus',
            'Salary',
            'Topup',
            'Withdraw',
            'Refund'
        )
    ),
    Details TEXT,
    -- Additional fields for specific payment types
    Order_ID VARCHAR(100) NULL,
    Shipment_ID VARCHAR(100) NULL,
    -- Foreign keys
    FOREIGN KEY (User_ID) REFERENCES `USER` (User_ID),
    FOREIGN KEY (Order_ID) REFERENCES `ORDER` (Order_ID),
    FOREIGN KEY (User_ID, Shipment_ID) REFERENCES SHIPMENT (Driver_ID, Shipment_ID)
);

CREATE TABLE SHIPMENT_ORDER (
    Driver_ID VARCHAR(100),
    Shipment_ID VARCHAR(100),
    Order_ID VARCHAR(100),
    PRIMARY KEY (
        Driver_ID,
        Shipment_ID,
        Order_ID
    ),
    FOREIGN KEY (Driver_ID) REFERENCES DRIVER (User_ID),
    FOREIGN KEY (Order_ID) REFERENCES `ORDER` (Order_ID),
    FOREIGN KEY (Driver_ID, Shipment_ID) REFERENCES SHIPMENT (Driver_ID, Shipment_ID)
);

CREATE TABLE ORDER_TRACKING (
    Order_ID VARCHAR(100) NOT NULL,
    Hub_ID VARCHAR(100) NOT NULL,
    Arrival DATETIME NOT NULL,
    Departure DATETIME,
    CHECK (Departure >= Arrival),
    PRIMARY KEY (Order_ID, Hub_ID),
    FOREIGN KEY (Order_ID) REFERENCES `ORDER` (Order_ID),
    FOREIGN KEY (Hub_ID) REFERENCES HUB (Hub_ID)
);