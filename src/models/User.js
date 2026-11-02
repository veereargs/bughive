const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981'];

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength:[2, 'Name must be at least 2 characters'],
        maxlength:[50, 'Name must be at most 50 characters']    
    },
    email:{
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Email is invalid']
    },
    password:{
        type: String,
        required: [true, 'Password is required'],
        minlength:[6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'developer', 'reporter'],
        default: 'developer'
    },
    avatarColor:{
        type: String,
        default: () => COLORS[Math.floor(Math.random() * COLORS.length)]
    },
    isActive: { type: Boolean, default: true },
},
    { timestamps: true }

);


userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});


userSchema.methods.matchPassword = function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema);