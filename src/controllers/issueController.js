const Issue = require('../models/Issue');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
    canManage,
    getProjectOrFail,
    accessibleProjectIds
} = require('../utils/projectAccess');

const populateOpts = [
    { path: 'project', select: 'name key' },
    { path: 'reporter', select: 'name avatarColor' },
    { path: 'assignee', select: 'name avatarColor' },
    { path: 'activity.user', select: 'name avatarColor' }
];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parseLabels = (value) =>
    typeof value === 'string'
        ? value.split(',').map((s) => s.trim()).filter(Boolean)
        : value;

// POST /api/issues
exports.createIssue = asyncHandler(async (req, res) => {
    const { project: projectId, title, description, type, priority, assignee, labels, dueDate } = req.body;

    const project = await getProjectOrFail(projectId, req.user);

    if (assignee && !project.members.some((m) => m.equals(assignee))) {
        throw new AppError('Assignee must be a member of the project', 400);
    }

    // Atomic counter: safe even when 2 users create issues at the same time
    const updated = await Project.findByIdAndUpdate(
        project._id,
        { $inc: { issueCounter: 1 } },
        { new: true }
    );
    const code = `${updated.key}-${updated.issueCounter}`;

    const issue = await Issue.create({
        code,
        project: project._id,
        title,
        description,
        type,
        priority,
        assignee: assignee || null,
        labels: parseLabels(labels),
        dueDate: dueDate || null,
        reporter: req.user._id,
        activity: [{ user: req.user._id, message: 'created this issue' }]
    });

    await issue.populate(populateOpts);
    res.status(201).json({ success: true, data: issue });
});

// GET /api/issues?project=&status=&priority=&type=&assignee=me&search=&sort=&page=&limit=
exports.getIssues = asyncHandler(async (req, res) => {
    const { project, status, priority, type, assignee, search } = req.query;
    const filter = {};

    // Restrict to projects this user can see
    if (project) {
        const p = await getProjectOrFail(project, req.user);
        filter.project = p._id;
    } else {
        filter.project = { $in: await accessibleProjectIds(req.user) };
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (assignee) filter.assignee = assignee === 'me' ? req.user._id : assignee;
    if (search) {
        const rx = new RegExp(escapeRegex(search), 'i');
        filter.$or = [{ title: rx }, { code: rx }, { labels: rx }];
    }

    // Pagination
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    // Sorting (whitelist to avoid sorting by random fields)
    const allowedSort = ['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'dueDate', '-dueDate'];
    const sort = allowedSort.includes(req.query.sort) ? req.query.sort : '-createdAt';

    const [total, issues] = await Promise.all([
        Issue.countDocuments(filter),
        Issue.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('project', 'name key')
            .populate('reporter', 'name avatarColor')
            .populate('assignee', 'name avatarColor')
    ]);

    res.json({
        success: true,
        count: issues.length,
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        data: issues
    });
});

// GET /api/issues/:id
exports.getIssue = asyncHandler(async (req, res) => {
    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new AppError('Issue not found', 404);

    await getProjectOrFail(issue.project, req.user); // access check
    await issue.populate(populateOpts);

    res.json({ success: true, data: issue });
});

// PUT /api/issues/:id
exports.updateIssue = asyncHandler(async (req, res) => {
    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new AppError('Issue not found', 404);

    const project = await getProjectOrFail(issue.project, req.user);

    const editable = ['title', 'description', 'type', 'priority', 'status', 'assignee', 'labels', 'dueDate'];

    for (const field of editable) {
        if (req.body[field] === undefined) continue;
        let value = req.body[field];

        if (field === 'assignee') {
            value = value || null;
            if (value && !project.members.some((m) => m.equals(value))) {
                throw new AppError('Assignee must be a member of the project', 400);
            }
        }
        if (field === 'labels') value = parseLabels(value);
        if (field === 'dueDate' && !value) value = null;

        // Write activity log for important changes
        const oldValue = issue[field] ? String(issue[field]) : 'none';
        const newValue = value ? String(value) : 'none';
        if (oldValue !== newValue) {
            if (field === 'status') {
                issue.activity.push({
                    user: req.user._id,
                    message: `moved status from "${oldValue}" to "${newValue}"`
                });
                issue.resolvedAt = value === 'done' ? new Date() : null;
            }
            if (field === 'priority') {
                issue.activity.push({
                    user: req.user._id,
                    message: `changed priority from "${oldValue}" to "${newValue}"`
                });
            }
            if (field === 'assignee') {
                issue.activity.push({ user: req.user._id, message: 'changed the assignee' });
            }
        }

        issue[field] = value;
    }

    await issue.save(); // save() runs validators
    await issue.populate(populateOpts);
    res.json({ success: true, data: issue });
});

// PATCH /api/issues/:id/status   (used by kanban drag & drop)
exports.updateStatus = asyncHandler(async (req, res) => {
    req.body = { status: req.body.status };
    return exports.updateIssue(req, res);
});

// DELETE /api/issues/:id   (reporter / project owner / admin)
exports.deleteIssue = asyncHandler(async (req, res) => {
    const issue = await Issue.findById(req.params.id);
    if (!issue) throw new AppError('Issue not found', 404);

    const project = await getProjectOrFail(issue.project, req.user);
    const isReporter = issue.reporter.equals(req.user._id);
    if (!isReporter && !canManage(project, req.user)) {
        throw new AppError('Only the reporter or project owner can delete this issue', 403);
    }

    await Comment.deleteMany({ issue: issue._id });
    await issue.deleteOne();
    res.json({ success: true, message: 'Issue deleted' });
});
