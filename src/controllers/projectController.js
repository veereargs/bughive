const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { canManage, getProjectOrFail } = require('../utils/projectAccess');

// POST /api/projects
exports.createProject = asyncHandler(async (req, res) => {
    const { name, key, description } = req.body;
    const project = await Project.create({
        name,
        key,
        description,
        owner: req.user._id,
        members: [req.user._id]
    });
    res.status(201).json({ success: true, data: project });
});

// GET /api/projects   (only the projects I can access, with issue stats)
exports.getProjects = asyncHandler(async (req, res) => {
    const filter =
        req.user.role === 'admin'
            ? {}
            : { $or: [{ owner: req.user._id }, { members: req.user._id }] };

    const projects = await Project.find(filter)
        .sort('-createdAt')
        .populate('owner', 'name email avatarColor')
        .populate('members', 'name avatarColor')
        .lean();

    // Aggregation: count total + done issues for all these projects in ONE query
    const ids = projects.map((p) => p._id);
    const stats = await Issue.aggregate([
        { $match: { project: { $in: ids } } },
        {
            $group: {
                _id: '$project',
                total: { $sum: 1 },
                done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } }
            }
        }
    ]);
    const statMap = {};
    stats.forEach((s) => (statMap[s._id.toString()] = s));

    const data = projects.map((p) => ({
        ...p,
        issueStats: {
            total: statMap[p._id.toString()] ? statMap[p._id.toString()].total : 0,
            done: statMap[p._id.toString()] ? statMap[p._id.toString()].done : 0
        }
    }));

    res.json({ success: true, count: data.length, data });
});

// GET /api/projects/:id
exports.getProject = asyncHandler(async (req, res) => {
    const project = await getProjectOrFail(req.params.id, req.user);
    await project.populate([
        { path: 'owner', select: 'name email avatarColor' },
        { path: 'members', select: 'name email avatarColor role' }
    ]);
    res.json({ success: true, data: project });
});

// PUT /api/projects/:id   (owner / admin)
exports.updateProject = asyncHandler(async (req, res) => {
    const project = await getProjectOrFail(req.params.id, req.user);
    if (!canManage(project, req.user)) {
        throw new AppError('Only the project owner can update this project', 403);
    }

    ['name', 'description', 'status'].forEach((field) => {
        if (req.body[field] !== undefined) project[field] = req.body[field];
    });
    await project.save();
    res.json({ success: true, data: project });
});

// DELETE /api/projects/:id   (owner / admin) -> cascade delete
exports.deleteProject = asyncHandler(async (req, res) => {
    const project = await getProjectOrFail(req.params.id, req.user);
    if (!canManage(project, req.user)) {
        throw new AppError('Only the project owner can delete this project', 403);
    }

    const issueIds = await Issue.find({ project: project._id }).distinct('_id');
    await Comment.deleteMany({ issue: { $in: issueIds } });
    await Issue.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ success: true, message: 'Project and all its issues deleted' });
});

// POST /api/projects/:id/members   body: { email }
exports.addMember = asyncHandler(async (req, res) => {
    const project = await getProjectOrFail(req.params.id, req.user);
    if (!canManage(project, req.user)) {
        throw new AppError('Only the project owner can add members', 403);
    }

    const email = (req.body.email || '').toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) throw new AppError('No user found with that email', 404);

    project.members.addToSet(user._id); // addToSet avoids duplicates
    await project.save();
    await project.populate('members', 'name email avatarColor role');

    res.json({ success: true, data: project });
});

// DELETE /api/projects/:id/members/:userId
exports.removeMember = asyncHandler(async (req, res) => {
    const project = await getProjectOrFail(req.params.id, req.user);
    if (!canManage(project, req.user)) {
        throw new AppError('Only the project owner can remove members', 403);
    }
    if (project.owner.equals(req.params.userId)) {
        throw new AppError('The project owner cannot be removed', 400);
    }

    project.members.pull(req.params.userId);
    await project.save();

    // Unassign this person from the project's issues
    await Issue.updateMany(
        { project: project._id, assignee: req.params.userId },
        { assignee: null }
    );

    await project.populate('members', 'name email avatarColor role');
    res.json({ success: true, data: project });
});