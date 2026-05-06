const asyncHandler = require('../utils/asyncHandler');
const { callProcedure, query } = require('../services/db.service');

const getHubOrders = asyncHandler(async (req, res) => {
    const { hubId } = req.query;

    if (!hubId) {
        return res.status(400).json({ success: false, message: 'hubId is required' });
    }

    // Comprehensive query for orders related to the hub
    const orders = await query(
        `SELECT DISTINCT 
            o.Order_ID, 
            ot.Arrival, 
            ot.Departure, 
            o.Status as DB_Status,
            po.Status as Pickup_Status,
            do.Status as Delivery_Status,
            o.Destination_Hub_ID,
            dh.Hub_Name as Destination_Hub_Name,
            CASE 
                WHEN o.Status = 'Giao thành công' THEN 'Đã giao hàng'
                WHEN o.Status = 'Đang giao' THEN 'Đang giao hàng'
                WHEN ot.Departure IS NOT NULL THEN 'Đã xuất kho'
                WHEN ot.Arrival IS NOT NULL AND ot.Departure IS NULL THEN 'Đã nhập kho'
                WHEN o.Status = 'Chờ lấy hàng' AND po.Status = 'Đang lấy hàng' THEN 'Chờ lấy hàng'
                WHEN o.Status = 'Chờ lấy hàng' THEN 'Chờ xác nhận'
                ELSE o.Status
            END as Display_Status
        FROM \`ORDER\` o
        LEFT JOIN ORDER_TRACKING ot ON o.Order_ID = ot.Order_ID AND ot.Hub_ID = ?
        LEFT JOIN HUB dh ON o.Destination_Hub_ID = dh.Hub_ID
        LEFT JOIN (SELECT Order_ID, Status FROM PICKUP_ORDER ORDER BY Start_Time DESC LIMIT 1) po ON o.Order_ID = po.Order_ID
        LEFT JOIN (SELECT Order_ID, Status FROM DELIVERY_ORDER ORDER BY Start_Time DESC LIMIT 1) do ON o.Order_ID = do.Order_ID
        WHERE o.Source_Hub_ID = ? OR ot.Hub_ID = ?
        ORDER BY o.Order_ID DESC`,
        [hubId, hubId, hubId]
    );

    return res.json({ success: true, data: orders });
});

const getHubCapacity = asyncHandler(async (req, res) => {
    const { hubId } = req.query;

    if (!hubId) {
        return res.status(400).json({ success: false, message: 'hubId is required' });
    }

    const rows = await query(
        `SELECT Hub_ID, Hub_Name, Current_Order_Count, Max_Capacity
     FROM HUB
     WHERE Hub_ID = ?`,
        [hubId]
    );

    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Hub not found' });
    }

    const hub = rows[0];
    const usageRate = hub.Max_Capacity > 0 ? hub.Current_Order_Count / hub.Max_Capacity : 0;

    return res.json({
        success: true,
        data: {
            ...hub,
            usageRate,
            warning: usageRate >= 0.9 ? 'Hub is close to maximum capacity' : null
        }
    });
});

const orderCheckin = asyncHandler(async (req, res) => {
    const { hubId, orderId } = req.body;
    await callProcedure('Order_Checkin', [hubId, orderId]);
    return res.json({ success: true, message: 'Nhập kho thành công' });
});

const orderCheckinShipment = asyncHandler(async (req, res) => {
    const { hubId, shipmentId } = req.body;
    await callProcedure('Order_Checkin_Shipment', [hubId, shipmentId]);
    return res.json({ success: true, message: 'Nhập kho toàn bộ shipment thành công' });
});

const orderCheckout = asyncHandler(async (req, res) => {
    const { hubId: currentHub, destinationHubId: destHub, shipmentId, driverId, orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách mã đơn hàng không hợp lệ' });
    }

    // Call checkout for each order (or update procedure to handle batch if needed)
    // For simplicity, we loop here
    await query('START TRANSACTION');
    try {
        for (const orderId of orderIds) {
            await callProcedure('Order_Checkout', [currentHub, destHub, shipmentId, driverId, orderId]);
        }
        await query('COMMIT');
        return res.json({ success: true, message: 'Xuất kho thành công', shipmentId });
    } catch (error) {
        await query('ROLLBACK');
        return res.status(400).json({ success: false, message: error.message });
    }
});

const pickupCoordinate = asyncHandler(async (req, res) => {
    const { driverId, orderIds } = req.body;
    await query('START TRANSACTION');
    try {
        for (const id of orderIds) {
            await callProcedure('Create_Pickup_Order', [driverId, id]);
        }
        await query('COMMIT');
        return res.json({ success: true, message: 'Điều phối lấy hàng thành công' });
    } catch (error) {
        await query('ROLLBACK');
        return res.status(400).json({ success: false, message: error.message });
    }
});

const deliveryCoordinate = asyncHandler(async (req, res) => {
    const { driverId, orderIds } = req.body;
    await query('START TRANSACTION');
    try {
        for (const id of orderIds) {
            await callProcedure('Create_Delivery_Order', [driverId, id]);
        }
        await query('COMMIT');
        return res.json({ success: true, message: 'Điều phối giao hàng thành công' });
    } catch (error) {
        await query('ROLLBACK');
        return res.status(400).json({ success: false, message: error.message });
    }
});

const getHubRevenueStatistics = asyncHandler(async (req, res) => {
    const minTotalRevenue = Number(req.query.minTotalRevenue || 0);
    const rows = await callProcedure('Get_Hub_Revenue_Statistics', [minTotalRevenue]);

    return res.json({ success: true, data: rows[0] || [] });
});

const getMonthlyBonus = asyncHandler(async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required' });
    }
    
    const now = new Date();
    const { getFunctionValue } = require('../services/db.service');
    const bonus = await getFunctionValue('Calculate_Total_Monthly_Bonus', [
        userId,
        now.getMonth() + 1,
        now.getFullYear()
    ]);
    
    return res.json({ success: true, bonus: Number(bonus || 0) });
});

// Staff Management for Managers
const getStaffByHub = asyncHandler(async (req, res) => {
    const { hubId } = req.query;
    if (!hubId) return res.status(400).json({ success: false, message: 'hubId is required' });

    const staff = await query(
        `SELECT u.User_ID, u.First_Name, u.Last_Name, u.Phone, s.Role
         FROM STAFF s
         JOIN USER u ON s.User_ID = u.User_ID
         WHERE s.Hub_ID_Works = ?`,
        [hubId]
    );
    return res.json({ success: true, data: staff });
});

const addStaff = asyncHandler(async (req, res) => {
    const { hubId, phone, role } = req.body;

    if (!phone || !role) {
        return res.status(400).json({ success: false, message: 'Số điện thoại và chức vụ là bắt buộc' });
    }

    try {
        // Find user by phone
        const users = await query('SELECT User_ID FROM USER WHERE Phone = ?', [phone]);
        let userId;

        if (users.length === 0) {
            // Create dummy user via stored procedure
            userId = 'STF_' + phone;
            await callProcedure('Create_New_User', [userId, phone, 'dummy', 'Nhân viên mới', '']);
        } else {
            userId = users[0].User_ID;
        }

        // Add to STAFF table
        await query(
            `INSERT INTO STAFF (User_ID, Role, Hub_ID_Works) VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE Role = VALUES(Role), Hub_ID_Works = VALUES(Hub_ID_Works)`,
            [userId, role, hubId]
        );

        // Ensure customer profile exists
        await query(
            `INSERT IGNORE INTO CUSTOMER (User_ID, Create_Date, Customer_Tier) VALUES (?, NOW(), 'Đồng')`,
            [userId]
        );

        return res.json({ success: true, message: 'Thêm nhân viên thành công', userId });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
});

const addDriver = asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, message: 'Số điện thoại là bắt buộc' });
    }

    try {
        const users = await query('SELECT User_ID FROM USER WHERE Phone = ?', [phone]);
        let userId;

        if (users.length === 0) {
            userId = 'DRV_' + phone;
            await callProcedure('Create_New_User', [userId, phone, 'dummy', 'Tài xế mới', '']);
        } else {
            userId = users[0].User_ID;
        }

        // Add to DRIVER table
        await query(
            `INSERT INTO DRIVER (User_ID, Start_Date) VALUES (?, NOW()) 
             ON DUPLICATE KEY UPDATE Start_Date = VALUES(Start_Date)`,
            [userId]
        );

        // Ensure CUSTOMER profile
        await query(
            `INSERT IGNORE INTO CUSTOMER (User_ID, Create_Date, Customer_Tier) VALUES (?, NOW(), 'Đồng')`,
            [userId]
        );

        return res.json({ success: true, message: 'Thêm tài xế thành công', userId });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
});

const updateStaffRole = asyncHandler(async (req, res) => {
    const { userId, role } = req.body;
    await query('UPDATE STAFF SET Role = ? WHERE User_ID = ?', [role, userId]);
    return res.json({ success: true, message: 'Cập nhật chức vụ thành công' });
});

const removeStaff = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await query('DELETE FROM STAFF WHERE User_ID = ?', [userId]);
    return res.json({ success: true, message: 'Đã xóa nhân viên khỏi bưu cục' });
});

const updateHubCapacity = asyncHandler(async (req, res) => {
    const { hubId, maxCapacity } = req.body;
    if (!hubId || maxCapacity === undefined) {
        return res.status(400).json({ success: false, message: 'hubId and maxCapacity are required' });
    }

    await query('UPDATE HUB SET Max_Capacity = ? WHERE Hub_ID = ?', [maxCapacity, hubId]);
    return res.json({ success: true, message: 'Cập nhật sức chứa bưu cục thành công' });
});

const getHubPerformance = asyncHandler(async (req, res) => {
    let { month, year } = req.query;
    
    const now = new Date();
    month = month ? parseInt(month) : now.getMonth() + 1;
    year = year ? parseInt(year) : now.getFullYear();

    const performance = await callProcedure('Rank_Hub_Performance', [month, year]);
    return res.json({ success: true, data: performance });
});

module.exports = {
    getHubOrders,
    getHubCapacity,
    orderCheckin,
    orderCheckinShipment,
    orderCheckout,
    pickupCoordinate,
    deliveryCoordinate,
    getHubRevenueStatistics,
    getMonthlyBonus,
    getStaffByHub,
    addStaff,
    addDriver,
    updateStaffRole,
    removeStaff,
    updateHubCapacity,
    getHubPerformance
};

