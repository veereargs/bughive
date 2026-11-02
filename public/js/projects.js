const me = requireAuth();
let currentProjectId = null;

async function loadProjects() {
    try {
        const { data } = await api('/projects');
        if (!data.length) {
            $('projectGrid').innerHTML = '<p class="muted">No projects yet. Click "New Project" to start.</p>';
            return;
        }
        $('projectGrid').innerHTML = data
            .map((p) => {
                const pct = p.issueStats.total ? Math.round((p.issueStats.done / p.issueStats.total) * 100) : 0;
                return `
                <div class="card project-card">
                    <div class="flex between">
                        <h3>${escapeHtml(p.name)}</h3>
                        <span class="badge badge-feature">${escapeHtml(p.key)}</span>
                    </div>
                    <p class="muted small">${escapeHtml(p.description || 'No description')}</p>
                    <div class="progress"><div style="width:${pct}%"></div></div>
                    <div class="small muted">${p.issueStats.done}/${p.issueStats.total} issues done (${pct}%)</div>
                    <div class="flex between mt">
                        <div class="avatars">${p.members.slice(0, 5).map((m) => avatar(m)).join('')}</div>
                        <div class="flex">
                            <button class="btn btn-ghost btn-sm" data-manage="${p._id}">Manage</button>
                            <a class="btn btn-primary btn-sm" href="/issues.html?project=${p._id}">Open board</a>
                        </div>
                    </div>
                </div>`;
            })
            .join('');

        document.querySelectorAll('[data-manage]').forEach((btn) =>
            btn.addEventListener('click', () => openManage(btn.dataset.manage))
        );
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function openManage(id) {
    currentProjectId = id;
    try {
        const { data: p } = await api(`/projects/${id}`);
        const canManage = me.role === 'admin' || p.owner._id === me._id;

        $('manageBox').innerHTML = `
            <h2>${escapeHtml(p.name)} <span class="code">${escapeHtml(p.key)}</span></h2>
            <p class="muted small">Owner: ${escapeHtml(p.owner.name)} | Status: ${badge(p.status === 'active' ? 'done' : 'todo')} ${escapeHtml(p.status)}</p>

            <h3 class="mt">Members (${p.members.length})</h3>
            ${p.members
                .map(
                    (m) => `
                <div class="member-row">
                    ${avatar(m)}
                    <div class="grow">${escapeHtml(m.name)}<div class="small muted">${escapeHtml(m.email)}</div></div>
                    ${badge(m.role)}
                    ${canManage && m._id !== p.owner._id ? `<button class="btn btn-ghost btn-sm" data-remove="${m._id}">Remove</button>` : ''}
                </div>`
                )
                .join('')}

            ${
                canManage
                    ? `
            <form id="addMemberForm" class="flex mt">
                <input type="email" id="memberEmail" placeholder="Add member by email" required>
                <button class="btn btn-primary" type="submit">Add</button>
            </form>
            <div class="modal-actions" style="justify-content:space-between">
                <div class="flex">
                    <button class="btn btn-danger btn-sm" id="deleteProjectBtn">Delete project</button>
                    <button class="btn btn-ghost btn-sm" id="toggleStatusBtn">${p.status === 'active' ? 'Archive' : 'Re-activate'}</button>
                </div>
                <button class="btn btn-ghost" data-close="manageModal">Close</button>
            </div>`
                    : `<div class="modal-actions"><button class="btn btn-ghost" data-close="manageModal">Close</button></div>`
            }`;

        openModal('manageModal');

        document.querySelectorAll('[data-remove]').forEach((btn) =>
            btn.addEventListener('click', async () => {
                try {
                    await api(`/projects/${id}/members/${btn.dataset.remove}`, { method: 'DELETE' });
                    toast('Member removed');
                    openManage(id);
                    loadProjects();
                } catch (err) { toast(err.message, 'error'); }
            })
        );

        if (canManage) {
            $('addMemberForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await api(`/projects/${id}/members`, { method: 'POST', body: { email: $('memberEmail').value } });
                    toast('Member added');
                    openManage(id);
                    loadProjects();
                } catch (err) { toast(err.message, 'error'); }
            });

            $('toggleStatusBtn').addEventListener('click', async () => {
                try {
                    await api(`/projects/${id}`, { method: 'PUT', body: { status: p.status === 'active' ? 'archived' : 'active' } });
                    toast('Project updated');
                    openManage(id);
                    loadProjects();
                } catch (err) { toast(err.message, 'error'); }
            });

            $('deleteProjectBtn').addEventListener('click', async () => {
                if (!confirm('Delete this project and ALL its issues? This cannot be undone.')) return;
                try {
                    await api(`/projects/${id}`, { method: 'DELETE' });
                    toast('Project deleted');
                    closeModal('manageModal');
                    loadProjects();
                } catch (err) { toast(err.message, 'error'); }
            });
        }
    } catch (err) {
        toast(err.message, 'error');
    }
}

if (me) {
    renderNavbar('projects');
    loadProjects();

    $('newProjectBtn').addEventListener('click', () => {
        $('createForm').reset();
        openModal('createModal');
    });

    $('createForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await api('/projects', {
                method: 'POST',
                body: { name: $('pName').value, key: $('pKey').value, description: $('pDesc').value }
            });
            toast('Project created');
            closeModal('createModal');
            loadProjects();
        } catch (err) { toast(err.message, 'error'); }
    });
}
