const mongoose = require('mongoose');


const activitySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
},
    { _id: false }
);

const issueSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Project',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ''
    },
    type: {
        type: String,
        enum: ['bug', 'feature', 'task'],
        default: 'task'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'in-review', 'done'],
        default: 'todo'
    },
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', default: null
    },
    labels: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    dueDate: {
        type: Date,
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    },
    activity: [
        activitySchema
    ]
},
{ timestamps: true }
);
issueSchema.index({ project: 1, status: 1 });
issueSchema.index({ assignee: 1, status: 1 });
issueSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Issue', issueSchema);