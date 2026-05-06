const asyncHandler = require('../utils/asyncHandler');
const { callProcedure, getFunctionValue, query } = require('../services/db.service');

function generatePaymentId(prefix = 'PAY') {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

const getAssignedOrders = asyncHandler(async (req, res) => {
    const { driverId } = req.query;

    if (!driverId) {
        return res.status(400).json({ success: false, message: 'driverId is required' });
    }

    const pickupOrders = await query(
        `SELECT p.Order_ID, p.Status AS assignmentStatus, o.Status AS orderStatus, 'PICKUP' AS taskType, o.COD,
                u.First_Name, u.Last_Name, o.Sender_Address AS address, u.Phone AS phone,
                l1.Name AS l1Address, l2.Name AS l2Address
         FROM PICKUP_ORDER p
         JOIN \`ORDER\` o ON o.Order_ID = p.Order_ID
         JOIN USER u ON o.Sender_ID = u.User_ID
         JOIN L1_ADDRESS l1 ON o.Sender_L1_Address_ID = l1.ID
         JOIN L2_ADDRESS l2 ON o.Sender_L2_Address_ID = l2.ID
         WHERE p.Driver_ID = ? AND p.Status = 'Đang lấy hàng'`,
        [driverId]
    );

    const deliveryOrders = await query(
        `SELECT d.Order_ID, d.Status AS assignmentStatus, o.Status AS orderStatus, 'DELIVERY' AS taskType, o.COD,
                u.First_Name, u.Last_Name, o.Receiver_Address AS address, u.Phone AS phone,
                l1.Name AS l1Address, l2.Name AS l2Address
         FROM DELIVERY_ORDER d
         JOIN \`ORDER\` o ON o.Order_ID = d.Order_ID
         JOIN USER u ON o.Receiver_ID = u.User_ID
         JOIN L1_ADDRESS l1 ON o.Receiver_L1_Address_ID = l1.ID
         JOIN L2_ADDRESS l2 ON o.Receiver_L2_Address_ID = l2.ID
         WHERE d.Driver_ID = ? AND d.Status = 'Đang giao hàng'`,
        [driverId]
    );

    const now = new Date();
    const bonus = await getFunctionValue('Calculate_Total_Monthly_Bonus', [
        driverId,
        now.getMonth() + 1,
        now.getFullYear()
    ]);

    return res.json({
        success: true,
        data: {
            assignedOrders: [...pickupOrders, ...deliveryOrders],
            estimatedBonus: Number(bonus || 0)
        }
    });
});

const getActiveShipment = asyncHandler(async (req, res) => {
    const { driverId } = req.query;
    if (!driverId) return res.status(400).json({ success: false, message: 'driverId is required' });

    const shipments = await query(
        `SELECT s.Shipment_ID, s.Destination_Hub_ID, h.Hub_Name, s.Start_Time
         FROM SHIPMENT s
         JOIN HUB h ON s.Destination_Hub_ID = h.Hub_ID
         WHERE s.Driver_ID = ? AND s.End_Time IS NULL
         ORDER BY s.Start_Time DESC LIMIT 1`,
        [driverId]
    );

    if (shipments.length === 0) {
        return res.json({ success: true, data: null });
    }

    const shipment = shipments[0];
    const orders = await query(
        `SELECT Order_ID FROM SHIPMENT_ORDER WHERE Shipment_ID = ?`,
        [shipment.Shipment_ID]
    );

    return res.json({
        success: true,
        data: {
            ...shipment,
            orders
        }
    });
});

const createPickupOrder = asyncHandler(async (req, res) => {
    const { driverId, orderId } = req.body;
    await callProcedure('Create_Pickup_Order', [driverId, orderId]);

    return res.status(201).json({ success: true, message: 'Đã nhận đơn lấy hàng' });
});

const pickupComplete = asyncHandler(async (req, res) => {
    const { driverId, orderId } = req.body;
    await callProcedure('Pickup_Complete', [driverId, orderId]);

    return res.json({ success: true, message: 'Xác nhận lấy hàng thành công' });
});

const pickupFailed = asyncHandler(async (req, res) => {
    const { driverId, orderId } = req.body;
    const refundPaymentId = generatePaymentId('PAY_REFUND');
    await callProcedure('Pickup_Failed', [driverId, orderId, refundPaymentId]);

    return res.json({ success: true, message: 'Xác nhận lấy hàng thất bại' });
});

const createDeliveryOrder = asyncHandler(async (req, res) => {
    const { driverId, orderId } = req.body;
    await callProcedure('Create_Delivery_Order', [driverId, orderId]);

    return res.status(201).json({ success: true, message: 'Đã nhận đơn giao hàng' });
});

const deliveryComplete = asyncHandler(async (req, res) => {
    const { driverId, orderId } = req.body;
    const paymentId = generatePaymentId('PAY_COD');
    await callProcedure('Delivery_Complete', [driverId, orderId, paymentId]);

    return res.json({ success: true, message: 'Xác nhận giao hàng thành công' });
});

const deliveryFailed = asyncHandler(async (req, res) => {
    const { driverId, orderId } = req.body;
    const refundPaymentId = generatePaymentId('PAY_REFUND');
    await callProcedure('Delivery_Failed', [driverId, orderId, refundPaymentId]);

    return res.json({ success: true, message: 'Xác nhận giao hàng thất bại' });
});

module.exports = {
    getAssignedOrders,
    getActiveShipment,
    createPickupOrder,
    pickupComplete,
    pickupFailed,
    createDeliveryOrder,
    deliveryComplete,
    deliveryFailed
};
