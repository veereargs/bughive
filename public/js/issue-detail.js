const viewer = requireAuth();
const issueId = new URLSearchParams(window.location.search).get('id');

async function loadIssue() {
    try {
        const { data: issue } = await api(`/issues/${issueId}`);
        const { data: project } = await api(`/projects/${issue.project._id}`);
        const { data: comments } = await api(`/issues/${issueId}/comments`);
        render(issue, project, comments);
    } catch (err) {
        $('issueRoot').innerHTML = `<div class="card"><p>${escapeHtml(err.message)}</p></div>`;
    }
}

function render(issue, project, comments) {
    const canDelete =
        viewer.role === 'admin' ||
        issue.reporter._id === viewer._id ||
        project.owner._id === viewer._id;

    $('issueRoot').innerHTML = `
    <div class="detail-layout">
        <div>
            <div class="card">
                <div class="flex"><span class="code">${escapeHtml(issue.code)}</span> ${badge(issue.type)} ${isOverdue(issue) ? '<span class="badge badge-critical">overdue</span>' : ''}</div>
                <h1 class="mt" style="font-size:24px">${escapeHtml(issue.title)}</h1>
                <p class="mt muted" style="white-space:pre-wrap">${escapeHtml(issue.description || 'No description provided.')}</p>
                <div class="mt">${(issue.labels || []).map((l) => `<span class="badge">${escapeHtml(l)}</span>`).join(' ')}</div>
            </div>

            <div class="card mt">
                <h3>Comments (${comments.length})</h3>
                <div>
                    ${
                        comments
                            .map(
                                (c) => `
                    <div class="comment">
                        ${avatar(c.author)}
                        <div class="body">
                            <strong>${escapeHtml(c.author.name)}</strong>
                            <span class="small muted"> ${timeAgo(c.createdAt)}</span>
                            <p style="white-space:pre-wrap">${escapeHtml(c.text)}</p>
                        </div>
                        ${c.author._id === viewer._id || viewer.role === 'admin' ? `<button class="btn btn-ghost btn-sm" data-del-comment="${c._id}">Delete</button>` : ''}
                    </div>`
                            )
                            .join('') || '<p class="muted mt">No comments yet. Start the discussion!</p>'
                    }
                </div>
                <form id="commentForm" class="mt">
                    <textarea id="commentText" placeholder="Write a comment..." required maxlength="1000"></textarea>
                    <div class="modal-actions"><button class="btn btn-primary" type="submit">Post comment</button></div>
                </form>
            </div>
        </div>

        <div>
            <div class="card">
                <h3>Details</h3>
                <div class="form-group mt"><label>Status</label>
                    <select id="eStatus">${STATUSES.map((s) => `<option value="${s.key}" ${issue.status === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label>Priority</label>
                    <select id="ePriority">${PRIORITIES.map((p) => `<option ${issue.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
                </div>
                <div class="form-group"><label>Assignee</label>
                    <select id="eAssignee">
                        <option value="">Unassigned</option>
                        ${project.members.map((m) => `<option value="${m._id}" ${issue.assignee && issue.assignee._id === m._id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group"><label>Due date</label>
                    <input type="date" id="eDue" value="${issue.dueDate ? issue.dueDate.slice(0, 10) : ''}">
                </div>
                <button class="btn btn-primary btn-block" id="saveBtn">Save changes</button>
                <hr style="border:0;border-top:1px solid var(--border);margin:16px 0">
                <div class="small muted">
                    <div>Project: <strong>${escapeHtml(issue.project.name)}</strong></div>
                    <div>Reporter: ${escapeHtml(issue.reporter.name)}</div>
                    <div>Created: ${formatDate(issue.createdAt)}</div>
                    ${issue.resolvedAt ? `<div>Resolved: ${formatDate(issue.resolvedAt)}</div>` : ''}
                </div>
                ${canDelete ? '<button class="btn btn-danger btn-sm mt" id="deleteBtn">Delete issue</button>' : ''}
            </div>

            <div class="card mt">
                <h3>Activity</h3>
                <div class="mt">
                    ${issue.activity
                        .slice()
                        .reverse()
                        .map((a) => `<div class="activity-item"><strong>${escapeHtml(a.user ? a.user.name : 'Someone')}</strong> ${escapeHtml(a.message)} <span>- ${timeAgo(a.createdAt)}</span></div>`)
                        .join('')}
                </div>
            </div>
        </div>
    </div>`;

    $('saveBtn').addEventListener('click', async () => {
        try {
            await api(`/issues/${issueId}`, {
                method: 'PUT',
                body: {
                    status: $('eStatus').value,
                    priority: $('ePriority').value,
                    assignee: $('eAssignee').value || null,
                    dueDate: $('eDue').value || null
                }
            });
            toast('Issue updated');
            loadIssue();
        } catch (err) { toast(err.message, 'error'); }
    });

    $('commentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await api(`/issues/${issueId}/comments`, { method: 'POST', body: { text: $('commentText').value } });
            loadIssue();
        } catch (err) { toast(err.message, 'error'); }
    });

    document.querySelectorAll('[data-del-comment]').forEach((btn) =>
        btn.addEventListener('click', async () => {
            try {
                await api(`/issues/${issueId}/comments/${btn.dataset.delComment}`, { method: 'DELETE' });
                loadIssue();
            } catch (err) { toast(err.message, 'error'); }
        })
    );

    if ($('deleteBtn')) {
        $('deleteBtn').addEventListener('click', async () => {
            if (!confirm('Delete this issue permanently?')) return;
            try {
                await api(`/issues/${issueId}`, { method: 'DELETE' });
                window.location.href = '/issues.html';
            } catch (err) { toast(err.message, 'error'); }
        });
    }
}

if (viewer) {
    renderNavbar('issues');
    if (!issueId) window.location.href = '/issues.html';
    else loadIssue();
}
