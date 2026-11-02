require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Project = require('./models/Project');
const Issue = require('./models/Issue');
const Comment = require('./models/Comment');

const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
};

(async () => {
    await connectDB();

    await Promise.all([User.deleteMany(), Project.deleteMany(), Issue.deleteMany(), Comment.deleteMany()]);
    console.log('Old data cleared');

    // create() (not insertMany) so the password hashing hook runs
    const admin = await User.create({ name: 'Veer Admin', email: 'admin@bughive.com', password: 'Admin@123', role: 'admin' });
    const aarav = await User.create({ name: 'Aarav Sharma', email: 'aarav@bughive.com', password: 'Dev@1234', role: 'developer' });
    const riya = await User.create({ name: 'Riya Patil', email: 'riya@bughive.com', password: 'Rep@1234', role: 'reporter' });
    console.log('3 users created');

    const project = await Project.create({
        name: 'BugHive Platform',
        key: 'BH',
        description: 'Main product: the issue tracker itself',
        owner: admin._id,
        members: [admin._id, aarav._id, riya._id]
    });
    console.log('1 project created (BH)');

    const samples = [
        ['Login button not responding on mobile', 'bug', 'high', 'todo', riya, aarav, ['mobile', 'ui'], 3],
        ['Add dark mode toggle', 'feature', 'medium', 'in-progress', admin, aarav, ['ui'], 10],
        ['Write API documentation', 'task', 'low', 'todo', admin, null, ['docs'], 14],
        ['Fix wrong date format on dashboard', 'bug', 'medium', 'in-review', riya, aarav, ['dashboard'], 2],
        ['Password reset email', 'feature', 'high', 'todo', admin, aarav, ['auth', 'email'], -2],
        ['Optimise slow issue search query', 'task', 'critical', 'in-progress', aarav, aarav, ['performance', 'db'], 1],
        ['Typo on landing page', 'bug', 'low', 'done', riya, aarav, ['content'], -5],
        ['Set up CI pipeline', 'task', 'medium', 'done', admin, admin, ['devops'], -7]
    ];

    let counter = 0;
    for (const [title, type, priority, status, reporter, assignee, labels, due] of samples) {
        counter++;
        await Issue.create({
            code: `BH-${counter}`,
            project: project._id,
            title,
            description: `Details for: ${title}`,
            type,
            priority,
            status,
            reporter: reporter._id,
            assignee: assignee ? assignee._id : null,
            labels,
            dueDate: daysFromNow(due),
            resolvedAt: status === 'done' ? new Date() : null,
            activity: [{ user: reporter._id, message: 'created this issue' }]
        });
    }
    project.issueCounter = counter;
    await project.save();
    console.log(`${counter} issues created`);

    console.log('---------------------------------');
    console.log('Admin     : admin@bughive.com / Admin@123');
    console.log('Developer : aarav@bughive.com / Dev@1234');
    console.log('Reporter  : riya@bughive.com / Rep@1234');

    await mongoose.disconnect();
})();