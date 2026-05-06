const asyncHandler = require('../utils/asyncHandler');
const { query } = require('../services/db.service');

const DB_MAPPINGS = [
    {
        step: 1,
        title: 'Khoi tao',
        procedures: ['Create_New_Order', 'Validate_Voucher', 'Create_New_Payment_Customer_Order'],
        triggers: []
    },
    {
        step: 2,
        title: 'Lay hang',
        procedures: ['Create_Pickup_Order', 'Pickup_Complete', 'Pickup_Failed'],
        triggers: ['Pickup_Order_Creation_Check', 'Order_Status_Update']
    },
    {
        step: 3,
        title: 'Xu ly tai Hub',
        procedures: ['Order_Checkin', 'Order_Checkout', 'Order_Checkin_Shipment', 'Hub_Capacity_Check'],
        triggers: []
    },
    {
        step: 4,
        title: 'Giao hang',
        procedures: ['Create_Delivery_Order', 'Delivery_Complete', 'Delivery_Failed'],
        triggers: ['Delivery_Order_Assignment_Check_Insert']
    },
    {
        step: 5,
        title: 'Hoan tat',
        procedures: ['Create_New_Payment_Customer_Order', 'Refund_Payment'],
        triggers: ['Balance_Update_Trigger', 'Rating_Create_Check']
    }
];

function calculateCurrentStep({ orderStatus, hasPickup, hasTracking, hasDelivery, hasPaymentOrRating }) {
    let step = 1;

    if (hasPickup) {
        step = Math.max(step, 2);
    }

    if (hasTracking || orderStatus === 'Đang xử lí') {
        step = Math.max(step, 3);
    }

    if (hasDelivery || orderStatus === 'Đang giao') {
        step = Math.max(step, 4);
    }

    if (hasPaymentOrRating || orderStatus === 'Giao thành công') {
        step = Math.max(step, 5);
    }

    return step;
}

const getOrderLifecycle = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const orderRows = await query(
        `SELECT o.Order_ID, o.Status, o.COD, o.Sender_ID, o.Receiver_ID,
            su.First_Name AS Sender_First_Name, su.Last_Name AS Sender_Last_Name,
            ru.First_Name AS Receiver_First_Name, ru.Last_Name AS Receiver_Last_Name
     FROM \`ORDER\` o
     JOIN \`USER\` su ON su.User_ID = o.Sender_ID
     JOIN \`USER\` ru ON ru.User_ID = o.Receiver_ID
     WHERE o.Order_ID = ?`,
        [id]
    );

    if (orderRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const [pickupRows, trackingRows, deliveryRows, paymentRows, ratingRows] = await Promise.all([
        query('SELECT Driver_ID, Start_Time, Pickup_Time, Status FROM PICKUP_ORDER WHERE Order_ID = ?', [id]),
        query('SELECT Hub_ID, Arrival, Departure FROM ORDER_TRACKING WHERE Order_ID = ? ORDER BY Arrival ASC', [id]),
        query('SELECT Driver_ID, Start_Time, Delivery_Time, Status FROM DELIVERY_ORDER WHERE Order_ID = ?', [id]),
        query('SELECT Payment_ID, Amount, Payment_Time FROM PAYMENT WHERE Order_ID = ?', [id]),
        query('SELECT Rating_ID, Score, Comment FROM RATING WHERE Order_ID = ?', [id])
    ]);

    const currentStep = calculateCurrentStep({
        orderStatus: orderRows[0].Status,
        hasPickup: pickupRows.length > 0,
        hasTracking: trackingRows.length > 0,
        hasDelivery: deliveryRows.length > 0,
        hasPaymentOrRating: paymentRows.length > 0 || ratingRows.length > 0
    });

    return res.json({
        success: true,
        data: {
            order: orderRows[0],
            currentStep,
            dbMappings: DB_MAPPINGS,
            events: {
                pickup: pickupRows,
                hubTracking: trackingRows,
                delivery: deliveryRows,
                payments: paymentRows,
                ratings: ratingRows
            }
        }
    });
});

module.exports = {
    getOrderLifecycle
};
