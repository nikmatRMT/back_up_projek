const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
    } catch {
        return res.status(401).json({ success: false, message: 'Sesi tidak valid atau sudah kedaluwarsa.' });
    }
};
