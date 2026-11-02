const AppError = require('../utils/AppError');

module.exports = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server error';

    // Invalid ObjectId  (/api/issues/abc)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }
    // Duplicate key (unique email / project key)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        statusCode = 409;
        message = `${field} already exists. Please use another value.`;
    }
    // Mongoose schema validation errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token. Please login again.';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Your session has expired. Please login again.';
    }

    if (statusCode === 500) {
        console.error('UNEXPECTED ERROR:', err);
        if (process.env.NODE_ENV === 'production') message = 'Something went wrong on the server.';
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && statusCode === 500 && { stack: err.stack })
    });
};
