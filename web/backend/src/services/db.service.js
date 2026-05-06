const pool = require('../config/db');

async function callProcedure(name, args = []) {
    const placeholders = args.map(() => '?').join(', ');
    const sql = `CALL ${name}(${placeholders})`;
    const [rows] = await pool.query(sql, args);
    return rows;
}

async function query(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

async function getFunctionValue(functionName, params = []) {
    const placeholders = params.map(() => '?').join(', ');
    const [rows] = await pool.query(`SELECT ${functionName}(${placeholders}) AS result`, params);
    return rows[0] ? rows[0].result : null;
}

module.exports = {
    callProcedure,
    getFunctionValue,
    query
};
