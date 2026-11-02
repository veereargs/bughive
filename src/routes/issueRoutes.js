const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
    createIssue,
    getIssues,
    getIssue,
    updateIssue,
    updateStatus,
    deleteIssue
} = require('../controllers/issueController');
const commentRoutes = require('./commentRoutes');

const router = express.Router();

router.use(protect);

// Nested router:  /api/issues/:issueId/comments
router.use('/:issueId/comments', commentRoutes);

router
    .route('/')
    .get(getIssues)
    .post(
        [
            body('project').notEmpty().withMessage('Project is required'),
            body('title').trim().notEmpty().withMessage('Title is required'),
            body('type').optional().isIn(['bug', 'feature', 'task']).withMessage('Invalid type'),
            body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority')
        ],
        validate,
        createIssue
    );

router.route('/:id').get(getIssue).put(updateIssue).delete(deleteIssue);

router.patch(
    '/:id/status',
    [body('status').isIn(['todo', 'in-progress', 'in-review', 'done']).withMessage('Invalid status')],
    validate,
    updateStatus
);

module.exports = router;
