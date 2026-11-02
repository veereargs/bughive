const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Project name is required'],
            trim: true,
            maxlength: [60, 'Project name cannot exceed 60 characters']
        },
        key: {
            type: String,
            required: [true, 'Project key is required'],
            unique: true,
            uppercase: true,
            trim: true,
            match: [/^[A-Z]{2,5}$/, 'Key must be 2 to 5 letters (example: BH)']
        },
        description: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ''
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true
        },
        members: [{
            type: mongoose.Schema.Types.ObjectId, ref: 'User'
        }],
        status: {
            type: String,
            enum: ['active', 'archived'],
            default: 'active'
        },
        issueCounter: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);