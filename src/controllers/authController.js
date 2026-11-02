const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const sendAuthResponse = (user, statusCode, res) => {
    res.status(statusCode).json({
        success: true,
        token: generateToken(user._id),
        user
    });
};

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // Security: public signup can NEVER create an admin
    const safeRole = ['developer', 'reporter'].includes(role) ? role : 'developer';

    const user = await User.create({ name, email, password, role: safeRole });
    sendAuthResponse(user, 201, res);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
        // Same message for both cases: do not reveal which one was wrong
        throw new AppError('Invalid email or password', 401);
    }
    if (!user.isActive) throw new AppError('Your account is deactivated', 403);

    sendAuthResponse(user, 200, res);
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
    res.json({ success: true, user: req.user });
});

// PUT /api/auth/me   (update profile name)
exports.updateMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (req.body.name) user.name = req.body.name;
    await user.save();
    res.json({ success: true, user });
});

// PUT /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
        throw new AppError('Current password is incorrect', 401);
    }
    user.password = newPassword; // pre-save hook hashes it
    await user.save();

    sendAuthResponse(user, 200, res);
});