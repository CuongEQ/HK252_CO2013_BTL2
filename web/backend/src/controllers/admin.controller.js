const asyncHandler = require('../utils/asyncHandler');
const { query } = require('../services/db.service');

function isValidIdentifier(value) {
    return /^[A-Za-z0-9_]+$/.test(value);
}

async function ensureTableExists(tableName) {
    const rows = await query(
        `SELECT TABLE_NAME
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
    );

    return rows.length > 0;
}

const getTables = asyncHandler(async (req, res) => {
    const tables = await query(
        `SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
         ORDER BY TABLE_NAME ASC`
    );

    return res.json({ success: true, data: tables });
});

const getTableColumns = asyncHandler(async (req, res) => {
    const { tableName } = req.params;

    if (!isValidIdentifier(tableName)) {
        return res.status(400).json({ success: false, message: 'Invalid table name' });
    }

    const exists = await ensureTableExists(tableName);
    if (!exists) {
        return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const columns = await query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION ASC`,
        [tableName]
    );

    return res.json({ success: true, data: columns });
});

const getTableRows = asyncHandler(async (req, res) => {
    const { tableName } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    if (!isValidIdentifier(tableName)) {
        return res.status(400).json({ success: false, message: 'Invalid table name' });
    }

    const exists = await ensureTableExists(tableName);
    if (!exists) {
        return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const rows = await query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [limit, offset]);
    const countRows = await query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);

    return res.json({
        success: true,
        data: {
            rows,
            pagination: {
                total: Number(countRows[0]?.total || 0),
                limit,
                offset
            }
        }
    });
});

const getProcedures = asyncHandler(async (req, res) => {
    const procedures = await query(
        `SELECT ROUTINE_NAME, CREATED, LAST_ALTERED, ROUTINE_DEFINITION
         FROM information_schema.ROUTINES
         WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'
         ORDER BY ROUTINE_NAME ASC`
    );

    return res.json({ success: true, data: procedures });
});

const getFunctions = asyncHandler(async (req, res) => {
    const functions = await query(
        `SELECT ROUTINE_NAME, DTD_IDENTIFIER AS RETURNS_TYPE, CREATED, LAST_ALTERED, ROUTINE_DEFINITION
         FROM information_schema.ROUTINES
         WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'FUNCTION'
         ORDER BY ROUTINE_NAME ASC`
    );

    return res.json({ success: true, data: functions });
});

const getTriggers = asyncHandler(async (req, res) => {
    const triggers = await query(
        `SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING, ACTION_STATEMENT
         FROM information_schema.TRIGGERS
         WHERE TRIGGER_SCHEMA = DATABASE()
         ORDER BY TRIGGER_NAME ASC`
    );

    return res.json({ success: true, data: triggers });
});

module.exports = {
    getTables,
    getTableColumns,
    getTableRows,
    getProcedures,
    getFunctions,
    getTriggers
};
