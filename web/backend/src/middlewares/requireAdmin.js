function requireAdmin(req, res, next) {
    const role = String(req.headers['x-user-role'] || '').toLowerCase();

    if (role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin role is required to access this resource'
        });
    }

    return next();
}

module.exports = requireAdmin;
