const asyncHandler = require('../utils/asyncHandler');
const { callProcedure, getFunctionValue, query } = require('../services/db.service');

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

async function generateUniqueOrderId() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = `ORD_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const rows = await query('SELECT 1 FROM `ORDER` WHERE Order_ID = ? LIMIT 1', [candidate]);
        if (rows.length === 0) {
            return candidate;
        }
    }

    throw new Error('Không thể tạo mã đơn hàng duy nhất, vui lòng thử lại');
}

function generatePaymentId(prefix = 'PAY') {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

async function hasUserBalanceColumn() {
    const rows = await query(
        `SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'USER'
           AND COLUMN_NAME = 'Balance'
         LIMIT 1`
    );
    return rows.length > 0;
}

const getOrders = asyncHandler(async (req, res) => {
    const { userId, type = 'sent', status, phoneFilter } = req.query;
    const normalizedStatus = status || 'ALL';
    const normalizedPhoneFilter = phoneFilter || 'ALL';

    if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required' });
    }

    let orders;
    if (type === 'received') {
        const rows = await callProcedure('Get_Received_Orders', [userId, normalizedStatus, normalizedPhoneFilter]);
        orders = rows[0] || [];
    } else {
        const rows = await callProcedure('Get_Sent_Orders', [userId, normalizedStatus, normalizedPhoneFilter]);
        orders = rows[0] || [];
    }

    return res.json({ success: true, data: orders });
});

const createOrder = asyncHandler(async (req, res) => {
    const {
        orderId,
        weight,
        cod,
        senderId,
        senderAddress,
        senderL1,
        senderL2,
        receiverAddress,
        receiverL1,
        receiverL2,
        receiverPhone,
        receiverFirstName,
        receiverLastName,
        voucherId = null
    } = req.body;

    let finalReceiverId = req.body.receiverId;
    if (!finalReceiverId && receiverPhone) {
        const existingUsers = await query('SELECT User_ID FROM `USER` WHERE Phone = ?', [receiverPhone]);
        if (existingUsers.length > 0) {
            finalReceiverId = existingUsers[0].User_ID;
        } else {
            finalReceiverId = `U${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
            const firstName = (receiverFirstName || '').trim();
            const lastName = (receiverLastName || '').trim();

            await callProcedure('Create_New_User', [
                finalReceiverId,
                receiverPhone,
                'dummy',
                firstName,
                lastName
            ]);
        }
    }

    if (!finalReceiverId) {
        return res.status(400).json({ success: false, message: 'receiverId or receiverPhone is required' });
    }

    await query(
        'INSERT IGNORE INTO CUSTOMER (User_ID, Create_Date, Customer_Tier) VALUES (?, NOW(), \'Đồng\')',
        [finalReceiverId]
    );

    const originalCod = normalizeNumber(cod, 0);

    // Calculate shipping fee (voucher is applied inside the stored procedure).
    const parsedWeight = normalizeNumber(weight, 0);
    const baseFee = 15000;
    const weightFee = parsedWeight * 5000;
    const distanceFee = senderL1 === receiverL1 ? 0 : 20000;
    const shippingFee = baseFee + weightFee + distanceFee;

    const appliedVoucher = voucherId || null;
    const resolvedOrderId = orderId || await generateUniqueOrderId();
    const paymentId = generatePaymentId('PAY_ORDER');

    await callProcedure('Create_New_Order', [
        resolvedOrderId,
        parsedWeight,
        originalCod,
        senderId,
        senderAddress,
        senderL1,
        senderL2,
        finalReceiverId,
        receiverAddress,
        receiverL1,
        receiverL2,
        appliedVoucher,
        shippingFee,
        paymentId
    ]);

    return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
            orderId: resolvedOrderId,
            originalCod,
            shippingFee,
            appliedVoucher
        }
    });
});

const updateOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { cod, receiverL2 } = req.body;

    const originalCod = normalizeNumber(cod, 0);

    await callProcedure('Edit_Current_Order', [id, originalCod, receiverL2]);

    return res.json({ success: true, message: 'Order updated successfully' });
});

const deleteOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const refundPaymentId = generatePaymentId('PAY_REFUND');
    await callProcedure('Cancel_Current_Order', [id, refundPaymentId]);

    return res.json({ success: true, message: 'Order deleted successfully' });
});

const getAvailableVouchers = asyncHandler(async (req, res) => {
    const vouchers = await query(
        `SELECT Voucher_ID, Value, Remain_Uses, Expire
         FROM VOUCHER
         WHERE Remain_Uses > 0 AND Expire > NOW()
         ORDER BY Expire ASC`
    );

    return res.json({ success: true, data: vouchers });
});

const getFinanceDashboard = asyncHandler(async (req, res) => {
    const { customerId } = req.query;

    if (!customerId) {
        return res.status(400).json({ success: false, message: 'customerId is required' });
    }

    const revenueRows = await query(
        `SELECT COALESCE(SUM(COD), 0) AS totalCodIncome, COUNT(*) AS deliveredOrders
    FROM \`ORDER\`
     WHERE Sender_ID = ? AND Status = 'Giao thành công'`,
        [customerId]
    );

    const now = new Date();
    const tier = await getFunctionValue('Get_Customer_Membership_Tier', [
        customerId,
        now.getMonth() + 1,
        now.getFullYear()
    ]);

    return res.json({
        success: true,
        data: {
            totalCodIncome: Number(revenueRows[0].totalCodIncome || 0),
            deliveredOrders: Number(revenueRows[0].deliveredOrders || 0),
            tier
        }
    });
});

const getOrderDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const rows = await query(
        `SELECT
            o.Order_ID,
            o.Status,
            o.Weight,
            o.COD,
            o.Receiver_Address,
            o.Shipping_Fee,
            o.Receiver_L1_Address_ID,
            o.Receiver_L2_Address_ID,
            l1.Name AS Receiver_L1_Name,
            l2.Name AS Receiver_L2_Name,
            u.First_Name,
            u.Last_Name,
            u.Phone AS Receiver_Phone,
            sh.Hub_ID AS Source_Hub_ID,
            sh.Hub_Name AS Source_Hub_Name,
            dh.Hub_ID AS Destination_Hub_ID,
            dh.Hub_Name AS Destination_Hub_Name,
            v.Value AS Voucher_Value
         FROM \`ORDER\` o
         LEFT JOIN \`USER\` u ON o.Receiver_ID = u.User_ID
         LEFT JOIN HUB sh ON o.Source_Hub_ID = sh.Hub_ID
         LEFT JOIN HUB dh ON o.Destination_Hub_ID = dh.Hub_ID
         LEFT JOIN VOUCHER v ON o.Voucher_ID = v.Voucher_ID
         LEFT JOIN L1_ADDRESS l1 ON o.Receiver_L1_Address_ID = l1.ID
         LEFT JOIN L2_ADDRESS l2 ON o.Receiver_L2_Address_ID = l2.ID
         WHERE o.Order_ID = ?`,
        [id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderDetails = rows[0];

    const trackingRows = await query(
        `SELECT ot.Hub_ID, h.Hub_Name, ot.Arrival, ot.Departure
         FROM ORDER_TRACKING ot
         JOIN HUB h ON ot.Hub_ID = h.Hub_ID
         WHERE ot.Order_ID = ?
         ORDER BY ot.Arrival ASC`,
        [id]
    );

    orderDetails.tracking = trackingRows;

    return res.json({ success: true, data: orderDetails });
});

const getPayments = asyncHandler(async (req, res) => {
    const { senderId, userId } = req.query;
    const resolvedUserId = senderId || userId;

    if (!resolvedUserId) {
        return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const payments = await query(
        `SELECT Payment_ID, Order_ID, Shipment_ID, Amount, Payment_Time, Status, \`Type\`, Details
         FROM PAYMENT
         WHERE User_ID = ?
         ORDER BY Payment_Time DESC`,
        [resolvedUserId]
    );

    return res.json({ success: true, data: payments });
});

const getProfileContext = asyncHandler(async (req, res) => {
    const { customerId } = req.query;

    if (!customerId) {
        return res.status(400).json({ success: false, message: 'customerId is required' });
    }

    const hasBalance = await hasUserBalanceColumn();
    const balanceSelect = hasBalance ? 'u.Balance' : '0';

    const rows = await query(
        `SELECT
            u.User_ID,
            u.First_Name AS firstName,
            u.Last_Name AS lastName,
            CONCAT(COALESCE(u.Last_Name, ''), ' ', COALESCE(u.First_Name, '')) AS fullName,
            u.Phone AS phoneNumber,
            ${balanceSelect} AS balance,
            c.Customer_Tier AS customerTier,
            c.Create_Date AS createDate
         FROM \`USER\` u
         LEFT JOIN CUSTOMER c ON c.User_ID = u.User_ID
         WHERE u.User_ID = ?`,
        [customerId]
    );

    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: rows[0] });
});

const refreshCustomerTier = asyncHandler(async (req, res) => {
    const { customerId } = req.body;

    if (!customerId) {
        return res.status(400).json({ success: false, message: 'customerId is required' });
    }

    const now = new Date();
    const tier = await getFunctionValue('Get_Customer_Membership_Tier', [
        customerId,
        now.getMonth() + 1,
        now.getFullYear()
    ]);

    await query('UPDATE CUSTOMER SET Customer_Tier = ? WHERE User_ID = ?', [tier, customerId]);

    return res.json({ success: true, data: { tier } });
});


const getHubs = asyncHandler(async (req, res) => {
    const hubs = await query(
        `SELECT Hub_ID, Hub_Name, Hub_Address
         FROM HUB
         ORDER BY Hub_Name ASC`
    );

    return res.json({ success: true, data: hubs });
});

const getL1Addresses = asyncHandler(async (req, res) => {
    const addresses = await query('SELECT ID, Name FROM L1_ADDRESS ORDER BY Name ASC');
    return res.json({ success: true, data: addresses });
});

const getL2Addresses = asyncHandler(async (req, res) => {
    const { l1Id } = req.query;
    let queryString = 'SELECT ID, Name, Local_Hub_ID, L1_ID FROM L2_ADDRESS';
    const params = [];

    if (l1Id) {
        queryString += ' WHERE L1_ID = ?';
        params.push(l1Id);
    }

    queryString += ' ORDER BY Name ASC';
    const addresses = await query(queryString, params);
    return res.json({ success: true, data: addresses });
});

module.exports = {
    getOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    getAvailableVouchers,
    getFinanceDashboard,
    getProfileContext,
    getHubs,
    getL1Addresses,
    getL2Addresses,
    getOrderDetails,
    getPayments,
    refreshCustomerTier
};
