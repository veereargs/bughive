const Issue = require('../models/Issue');
const asyncHandler = require('../utils/asyncHandler');
const { accessibleProjectIds } = require('../utils/projectAccess');

// [{_id:'todo',count:3}, ...]  ->  { todo: 3, ... }
const toMap = (rows) => rows.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});

// GET /api/dashboard/stats
exports.getStats = asyncHandler(async (req, res) => {
    const projectIds = await accessibleProjectIds(req.user);
    const match = { project: { $in: projectIds } };

    const groupBy = (field) => [
        { $match: match },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } }
    ];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [byStatus, byPriority, byType, trendRows, myOpen, overdue, recent] = await Promise.all([
        Issue.aggregate(groupBy('status')),
        Issue.aggregate(groupBy('priority')),
        Issue.aggregate(groupBy('type')),
        // Issues created per day in the last 7 days
        Issue.aggregate([
            { $match: { ...match, createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            }
        ]),
        Issue.countDocuments({ ...match, assignee: req.user._id, status: { $ne: 'done' } }),
        Issue.countDocuments({ ...match, dueDate: { $lt: new Date() }, status: { $ne: 'done' } }),
        Issue.find(match)
            .sort('-createdAt')
            .limit(6)
            .populate('project', 'name key')
            .populate('assignee', 'name avatarColor')
    ]);

    // Fill missing days with 0 so the chart always shows 7 bars
    const trendMap = toMap(trendRows);
    const trend = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(sevenDaysAgo.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        trend.push({ date: key, count: trendMap[key] || 0 });
    }

    const statusMap = toMap(byStatus);
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

    res.json({
        success: true,
        data: {
            totals: { total, done: statusMap.done || 0, myOpen, overdue },
            byStatus: statusMap,
            byPriority: toMap(byPriority),
            byType: toMap(byType),
            trend,
            recent
        }
    });
});
