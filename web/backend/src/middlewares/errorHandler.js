function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    if (err && err.sqlState === '45000') {
        return res.status(400).json({
            success: false,
            message: err.sqlMessage || err.message || 'Business rule validation failed'
        });
    }

    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error'
    });
}

module.exports = errorHandler;
