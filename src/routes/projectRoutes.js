
const express = require('express');
const { body } = require('express-validator');

const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const {
    createProject,
    getProjects,
    getProject,
    updateProject,
    deleteProject,
    addMember,
    removeMember
} = require('../controllers/projectController');

const router = express.Router();

router.use(protect);

router.get('/', getProjects);

router.post(
    '/',
    [
        body('name').trim().notEmpty().withMessage('Project name is required')
            .isLength({ max: 60 }).withMessage('Project name cannot exceed 60 characters'),
        body('key').trim().matches(/^[A-Za-z]{2,5}$/)
            .withMessage('Project key must be 2 to 5 letters'),
        body('description').optional().trim().isLength({ max: 300 })
            .withMessage('Project description cannot exceed 300 characters')
    ],
    validate,
    createProject
);

router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

router.post(
    '/:id/members',
    [body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail()],
    validate,
    addMember
);

router.delete('/:id/members/:userId', removeMember);

module.exports = router;
