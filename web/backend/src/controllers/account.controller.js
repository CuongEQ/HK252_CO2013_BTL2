const asyncHandler = require('../utils/asyncHandler');
const { callProcedure, query } = require('../services/db.service');

function generatePaymentId(prefix = 'PAY') {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

const updateProfile = asyncHandler(async (req, res) => {
    const { userId, firstName, lastName } = req.body;

    const rows = await query('SELECT Password FROM \`USER\` WHERE User_ID = ?', [userId]);
    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    const currentPassword = rows[0].Password;

    await query('CALL Update_Current_User(?, ?, ?, ?)', [userId, firstName, lastName, currentPassword]);

    return res.json({ success: true, message: 'Profile updated successfully' });
});

const changePassword = asyncHandler(async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    const rows = await query('SELECT First_Name, Last_Name, Password FROM \`USER\` WHERE User_ID = ?', [userId]);
    if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (rows[0].Password !== oldPassword) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    await query('CALL Update_Current_User(?, ?, ?, ?)', [userId, rows[0].First_Name, rows[0].Last_Name, newPassword]);
    return res.json({ success: true, message: 'Password changed successfully' });
});

const topUpBalance = asyncHandler(async (req, res) => {
    const { userId, amount } = req.body;

    if (!userId || amount === undefined) {
        return res.status(400).json({ success: false, message: 'userId and amount are required' });
    }

    const paymentId = generatePaymentId('PAY_TOPUP');
    await callProcedure('Top_Up_Balance', [paymentId, userId, Number(amount)]);

    return res.json({ success: true, message: 'Nạp tiền thành công', paymentId });
});

const withdrawBalance = asyncHandler(async (req, res) => {
    const { userId, amount } = req.body;

    if (!userId || amount === undefined) {
        return res.status(400).json({ success: false, message: 'userId and amount are required' });
    }

    const paymentId = generatePaymentId('PAY_WITHDRAW');
    await callProcedure('Withdraw_Balance', [paymentId, userId, Number(amount)]);

    return res.json({ success: true, message: 'Rút tiền thành công', paymentId });
});

module.exports = {
    updateProfile,
    changePassword,
    topUpBalance,
    withdrawBalance
};
