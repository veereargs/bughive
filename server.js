require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');


const connectDB = require('./src/config/db');
const AppError = require('./src/utils/AppError');
const errorHandler = require('./src/middleware/errorHandler');


const authRoutes = require('./src/routes/authRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const issueRoutes = require('./src/routes/issueRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

const app = express();

app.use(
    helmet({
        contentSecurityPolicy:{
            useDefaults: true,
            directives: { 'upgrade-insecure-requests': null }
        }
    })
);

app.use(cors());

app.use(express.json({ limit: '10kb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

const apiLimiter = rateLimit({
    windowMs: 15*60*1000,
    max: 500,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many login attempts, please try again later.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);


app.use('/api/auth',authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/dashboard', dashboardRoutes);


app.use('/api',(req,res,next) =>{
     next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

app.use(express.static(path.join(__dirname, 'public')));


app.use(errorHandler);


const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`BugHive running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`);
    });
});
