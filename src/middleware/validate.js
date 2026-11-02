
const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
        return next();
    }

    const message = errors.array()
        .map((error) => error.msg)
        .join(', ');

    next(new AppError(message, 400));
};

module.exports = validate;
