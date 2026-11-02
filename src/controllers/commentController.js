const Comment = require('../models/Comment');
const Issue = require('../models/Issue');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getProjectOrFail } = require('../utils/projectAccess');

// helper: load issue + check project access
const loadIssue = async (issueId, user) => {
    const issue = await Issue.findById(issueId);
    if (!issue) throw new AppError('Issue not found', 404);
    await getProjectOrFail(issue.project, user);
    return issue;
};

// GET /api/issues/:issueId/comments
exports.getComments = asyncHandler(async (req, res) => {
    const issue = await loadIssue(req.params.issueId, req.user);
    const comments = await Comment.find({ issue: issue._id })
        .sort('createdAt')
        .populate('author', 'name avatarColor role');
    res.json({ success: true, count: comments.length, data: comments });
});

// POST /api/issues/:issueId/comments
exports.addComment = asyncHandler(async (req, res) => {
    const issue = await loadIssue(req.params.issueId, req.user);
    const comment = await Comment.create({
        issue: issue._id,
        author: req.user._id,
        text: req.body.text
    });
    await comment.populate('author', 'name avatarColor role');
    res.status(201).json({ success: true, data: comment });
});

// DELETE /api/issues/:issueId/comments/:commentId
exports.deleteComment = asyncHandler(async (req, res) => {
    const issue = await loadIssue(req.params.issueId, req.user);
    const comment = await Comment.findOne({ _id: req.params.commentId, issue: issue._id });
    if (!comment) throw new AppError('Comment not found', 404);

    if (!comment.author.equals(req.user._id) && req.user.role !== 'admin') {
        throw new AppError('You can only delete your own comments', 403);
    }
    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted' });
});
