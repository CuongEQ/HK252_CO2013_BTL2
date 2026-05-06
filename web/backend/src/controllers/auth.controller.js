const asyncHandler = require('../utils/asyncHandler');
const { callProcedure, query } = require('../services/db.service');

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

function resolvePrimaryRole({ isStaff, isManager, isDriver, isCustomer, staffRole }) {
    const normalizedStaffRole = String(staffRole || '').toLowerCase();

    if (normalizedStaffRole.includes('admin')) {
        return 'admin';
    }

    if (isStaff) {
        return isManager ? 'manager' : 'staff';
    }

    if (isDriver) {
        return 'driver';
    }

    if (isCustomer) {
        return 'customer';
    }

    return 'unknown';
}

const login = asyncHandler(async (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        return res.status(400).json({ success: false, message: 'userId and password are required' });
    }

    const users = await query(
        `SELECT User_ID, Phone, First_Name, Last_Name, Password
         FROM \`USER\`
         WHERE User_ID = ? OR Phone = ?`,
        [userId, userId]
    );

    if (users.length === 0 || users[0].Password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const actualUserId = users[0].User_ID;

    const roleRows = await query(
        `SELECT
            EXISTS(SELECT 1 FROM CUSTOMER c WHERE c.User_ID = ?) AS isCustomer,
            EXISTS(SELECT 1 FROM DRIVER d WHERE d.User_ID = ?) AS isDriver,
            EXISTS(SELECT 1 FROM STAFF s WHERE s.User_ID = ?) AS isStaff,
            EXISTS(
                SELECT 1
                FROM HUB_MANAGER hm
                WHERE hm.Staff_ID = ?
            ) AS isManager,
            (SELECT s.Role FROM STAFF s WHERE s.User_ID = ? LIMIT 1) AS staffRole,
            (SELECT s.Hub_ID_Works FROM STAFF s WHERE s.User_ID = ? LIMIT 1) AS hubId`,
        [actualUserId, actualUserId, actualUserId, actualUserId, actualUserId, actualUserId]
    );

    const roleInfo = roleRows[0] || {};
    const primaryRole = resolvePrimaryRole(roleInfo);

    let balance = 0;
    const hasBalance = await hasUserBalanceColumn();
    if (hasBalance) {
        const balanceRows = await query('SELECT Balance FROM `USER` WHERE User_ID = ?', [actualUserId]);
        balance = Number(balanceRows[0]?.Balance || 0);
    }

    const tierRows = await query('SELECT Customer_Tier, Create_Date FROM CUSTOMER WHERE User_ID = ?', [actualUserId]);
    const customerTier = tierRows[0]?.Customer_Tier || null;
    const createDate = tierRows[0]?.Create_Date || null;

    return res.json({
        success: true,
        data: {
            userId: users[0].User_ID,
            phone: users[0].Phone,
            firstName: users[0].First_Name,
            lastName: users[0].Last_Name,
            primaryRole,
            staffRole: roleInfo.staffRole || null,
            hubId: roleInfo.hubId || null,
            balance,
            customerTier,
            createDate
        }
    });
});

const register = asyncHandler(async (req, res) => {
    const { userId, phone, password, firstName, lastName } = req.body;

    if (!phone || !password || !firstName) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    // Check if phone already exists
    const existing = await query('SELECT User_ID, Password FROM `USER` WHERE Phone = ?', [phone]);

    if (existing.length > 0) {
        if (existing[0].Password === 'dummy') {
            // Dummy account – tell frontend to switch to "activate" mode
            return res.status(409).json({
                success: false,
                isDummy: true,
                userId: existing[0].User_ID,
                message: 'Số điện thoại này đã được đăng ký tự động khi bạn sử dụng dịch vụ. Vui lòng bổ sung thông tin để kích hoạt tài khoản.'
            });
        }

        return res.status(409).json({ success: false, message: 'Số điện thoại đã được sử dụng bởi tài khoản khác' });
    }

    await callProcedure('Create_New_User', [userId, phone, password, firstName, lastName || '']);

    return res.status(201).json({
        success: true,
        message: `Đăng ký thành công! Mã tài khoản của bạn là ${userId}. Hãy đăng nhập ngay.`,
        userId: userId
    });
});

const activateDummy = asyncHandler(async (req, res) => {
    const { userId, password, firstName, lastName } = req.body;

    if (!userId || !password) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    const existing = await query('SELECT User_ID, Password, First_Name, Last_Name FROM `USER` WHERE User_ID = ?', [userId]);

    if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    if (existing[0].Password !== 'dummy') {
        return res.status(400).json({ success: false, message: 'Tài khoản này đã được kích hoạt' });
    }

    const finalFirstName = firstName || existing[0].First_Name || '';
    const finalLastName = lastName || existing[0].Last_Name || '';

    await query(
        'CALL Update_Current_User(?, ?, ?, ?)',
        [userId, finalFirstName, finalLastName, password]
    );

    return res.json({
        success: true,
        message: `Kích hoạt tài khoản thành công! Mã tài khoản: ${userId}. Hãy đăng nhập ngay.`
    });
});

const getMe = asyncHandler(async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const users = await query(
        `SELECT User_ID, Phone, First_Name, Last_Name
         FROM \`USER\`
         WHERE User_ID = ?`,
        [userId]
    );

    if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const actualUserId = users[0].User_ID;

    const roleRows = await query(
        `SELECT
            EXISTS(SELECT 1 FROM CUSTOMER c WHERE c.User_ID = ?) AS isCustomer,
            EXISTS(SELECT 1 FROM DRIVER d WHERE d.User_ID = ?) AS isDriver,
            EXISTS(SELECT 1 FROM STAFF s WHERE s.User_ID = ?) AS isStaff,
            EXISTS(
                SELECT 1
                FROM HUB_MANAGER hm
                WHERE hm.Staff_ID = ?
            ) AS isManager,
            (SELECT s.Role FROM STAFF s WHERE s.User_ID = ? LIMIT 1) AS staffRole,
            (SELECT s.Hub_ID_Works FROM STAFF s WHERE s.User_ID = ? LIMIT 1) AS hubId`,
        [actualUserId, actualUserId, actualUserId, actualUserId, actualUserId, actualUserId]
    );

    const roleInfo = roleRows[0] || {};
    const primaryRole = resolvePrimaryRole(roleInfo);

    let balance = 0;
    const hasBalance = await hasUserBalanceColumn();
    if (hasBalance) {
        const balanceRows = await query('SELECT Balance FROM `USER` WHERE User_ID = ?', [actualUserId]);
        balance = Number(balanceRows[0]?.Balance || 0);
    }

    const tierRows = await query('SELECT Customer_Tier, Create_Date FROM CUSTOMER WHERE User_ID = ?', [actualUserId]);
    const customerTier = tierRows[0]?.Customer_Tier || null;
    const createDate = tierRows[0]?.Create_Date || null;

    return res.json({
        success: true,
        data: {
            userId: users[0].User_ID,
            phone: users[0].Phone,
            firstName: users[0].First_Name,
            lastName: users[0].Last_Name,
            primaryRole,
            staffRole: roleInfo.staffRole || null,
            hubId: roleInfo.hubId || null,
            balance,
            customerTier,
            createDate
        }
    });
});

const checkPhone = asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số điện thoại hoặc ID' });
    }

    const users = await query('SELECT User_ID, Password FROM `USER` WHERE Phone = ? OR User_ID = ?', [phone, phone]);

    if (users.length === 0) {
        return res.json({ success: true, exists: false });
    }

    const user = users[0];
    if (user.Password === 'dummy') {
        return res.json({ success: true, exists: true, isDummy: true, userId: user.User_ID });
    }

    return res.json({ success: true, exists: true, isDummy: false, userId: user.User_ID });
});

module.exports = {
    login,
    register,
    activateDummy,
    checkPhone,
    getMe
};
