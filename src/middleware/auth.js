const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

exports.protect = asyncHandler(async (req, res, next) => {
    let token;
    const header = req.headers.authorization;

    if (header && header.startsWith('Bearer ')) {
        token = header.split(' ')[1];
    }
    if (!token) throw new AppError('You are not logged in. Please login first.', 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
        throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    req.user = user;
    next();
});

exports.restrictTo = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
};
