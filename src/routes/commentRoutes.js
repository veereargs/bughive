const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { getComments, addComment, deleteComment } = require('../controllers/commentController');

// mergeParams: lets us read :issueId from the parent router
const router = express.Router({ mergeParams: true });

router
    .route('/')
    .get(getComments)
    .post([body('text').trim().notEmpty().withMessage('Comment cannot be empty')], validate, addComment);

router.delete('/:commentId', deleteComment);

module.exports = router;