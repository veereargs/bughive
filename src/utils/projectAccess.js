const Project = require("../models/Project");
const AppError = require("./AppError");

const isMember = (project, user) => {
    return (
        user.role === "admin" ||
        project.owner.equals(user._id) ||
        project.members.some((member) => member.equals(user._id))
    );
};

const canManage = (project, user) => {
    return (
        user.role === "admin" ||
        project.owner.equals(user._id)
    );
};

async function getProjectOrFail(projectId, user) {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found', 404);
    if (!isMember(project, user)){ throw new AppError("You do not have access to this project", 403); }
    return project;
}

async function accessibleProjectIds(user) {
    if (user.role === "admin") return Project.find().distinct('_id');
     return Project.find({
        $or: [{ owner: user._id }, { members: user._id }]
    }).distinct('_id');
}

module.exports = {
    isMember,
    canManage,
    getProjectOrFail,
    accessibleProjectIds
};