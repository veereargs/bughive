const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { register, login, getMe, updateMe, changePassword } = require('../controllers/authController');

const router = express.Router();

router.post(
    '/register',
    [
        body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
        body('email').trim().isEmail().withMessage('Valid email is required').toLowerCase(),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    ],
    validate,
    register
);

router.post(
    '/login',
    [
        body('email').trim().isEmail().withMessage('Valid email is required').toLowerCase(),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validate,
    login
);

router.get('/me', protect, getMe);
router.put(
    '/me',
    protect,
    [body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')],
    validate,
    updateMe
);
router.put(
    '/change-password',
    protect,
    [body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')],
    validate,
    changePassword
);

module.exports = router;