const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
    {
        issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: {
            type: String,
            required: [true, 'Comment cannot be empty'],
            trim: true,
            maxlength: [1000, 'Comment cannot exceed 1000 characters']
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);