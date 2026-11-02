const meUser = requireAuth();
const state = { view: 'board', page: 1, pages: 1, projects: [] };

function buildQuery() {
    const params = new URLSearchParams();
    const add = (key, value) => value && params.set(key, value);

    add('project', $('fProject').value);
    add('status', $('fStatus').value);
    add('priority', $('fPriority').value);
    add('type', $('fType').value);
    add('search', $('fSearch').value.trim());
    if ($('fMine').checked) params.set('assignee', 'me');

    params.set('page', state.view === 'board' ? 1 : state.page);
    params.set('limit', state.view === 'board' ? 100 : 10);
    return params.toString();
}

async function loadIssues() {
    try {
        const res = await api(`/issues?${buildQuery()}`);
        state.pages = res.pages;
        if (state.view === 'board') renderBoard(res.data);
        else renderList(res);
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ---------------- Kanban board ---------------- */
function cardHtml(i) {
    return `
    <a class="issue-card" draggable="true" data-id="${i._id}" href="/issue.html?id=${i._id}">
        <div class="flex between">
            <span class="code">${escapeHtml(i.code)}</span>
            ${badge(i.type)}
        </div>
        <div class="title">${escapeHtml(i.title)}</div>
        <div class="meta">
            <div>${badge(i.priority)} ${isOverdue(i) ? '<span class="badge badge-critical">overdue</span>' : ''}</div>
            ${avatar(i.assignee)}
        </div>
    </a>`;
}

function renderBoard(issues) {
    $('board').innerHTML = STATUSES.map((s) => {
        const items = issues.filter((i) => i.status === s.key);
        return `
        <div class="column" data-status="${s.key}">
            <div class="column-head"><span>${s.label}</span><span class="count">${items.length}</span></div>
            <div>${items.map(cardHtml).join('') || '<p class="muted small center">No issues</p>'}</div>
        </div>`;
    }).join('');

    // Drag & drop (HTML5 API)
    document.querySelectorAll('.issue-card').forEach((card) => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.id);
        });
    });

    document.querySelectorAll('.column').forEach((col) => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault(); // required to allow dropping
            col.classList.add('drag-over');
        });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', async (e) => {
            e.preventDefault();
            col.classList.remove('drag-over');
            const id = e.dataTransfer.getData('text/plain');
            if (!id) return;
            try {
                await api(`/issues/${id}/status`, { method: 'PATCH', body: { status: col.dataset.status } });
                toast('Status updated');
                loadIssues();
            } catch (err) {
                toast(err.message, 'error');
            }
        });
    });
}

/* ---------------- List view ---------------- */
function renderList(res) {
    $('listBody').innerHTML =
        res.data
            .map(
                (i) => `
        <tr>
            <td><span class="code">${escapeHtml(i.code)}</span></td>
            <td><a href="/issue.html?id=${i._id}">${escapeHtml(i.title)}</a></td>
            <td>${badge(i.type)}</td>
            <td>${badge(i.priority)}</td>
            <td>${badge(i.status)}</td>
            <td>${avatar(i.assignee)}</td>
            <td ${isOverdue(i) ? 'style="color:#f87171"' : ''}>${formatDate(i.dueDate)}</td>
        </tr>`
            )
            .join('') || '<tr><td colspan="7" class="muted center">No issues found</td></tr>';

    $('pageInfo').textContent = `Page ${res.page} of ${res.pages}  (${res.total} issues)`;
    $('prevBtn').disabled = res.page <= 1;
    $('nextBtn').disabled = res.page >= res.pages;
}

function setView(view) {
    state.view = view;
    state.page = 1;
    $('boardBtn').classList.toggle('active', view === 'board');
    $('listBtn').classList.toggle('active', view === 'list');
    $('boardView').style.display = view === 'board' ? 'block' : 'none';
    $('listView').style.display = view === 'list' ? 'block' : 'none';
    loadIssues();
}

/* ---------------- Create issue modal ---------------- */
async function loadAssignees(projectId) {
    $('nAssignee').innerHTML = '<option value="">Unassigned</option>';
    if (!projectId) return;
    try {
        const { data } = await api(`/projects/${projectId}`);
        $('nAssignee').innerHTML += data.members
            .map((m) => `<option value="${m._id}">${escapeHtml(m.name)}</option>`)
            .join('');
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function init() {
    renderNavbar('issues');

    try {
        const res = await api('/projects');
        state.projects = res.data;
    } catch (err) {
        toast(err.message, 'error');
    }

    const options = state.projects
        .map((p) => `<option value="${p._id}">${escapeHtml(p.name)} (${escapeHtml(p.key)})</option>`)
        .join('');
    $('fProject').innerHTML = '<option value="">All projects</option>' + options;
    $('nProject').innerHTML = '<option value="">Select project</option>' + options;

    const preselected = new URLSearchParams(window.location.search).get('project');
    if (preselected) $('fProject').value = preselected;

    // Filters: reload when anything changes
    ['fProject', 'fStatus', 'fPriority', 'fType', 'fMine'].forEach((id) =>
        $(id).addEventListener('change', () => { state.page = 1; loadIssues(); })
    );

    // Debounce: wait 400ms after the user stops typing
    let timer;
    $('fSearch').addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.page = 1; loadIssues(); }, 400);
    });

    $('boardBtn').addEventListener('click', () => setView('board'));
    $('listBtn').addEventListener('click', () => setView('list'));
    $('prevBtn').addEventListener('click', () => { state.page--; loadIssues(); });
    $('nextBtn').addEventListener('click', () => { state.page++; loadIssues(); });

    $('newIssueBtn').addEventListener('click', () => {
        if (!state.projects.length) return toast('Create a project first', 'error');
        $('issueForm').reset();
        if ($('fProject').value) $('nProject').value = $('fProject').value;
        loadAssignees($('nProject').value);
        openModal('issueModal');
    });
    $('nProject').addEventListener('change', () => loadAssignees($('nProject').value));

    $('issueForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await api('/issues', {
                method: 'POST',
                body: {
                    project: $('nProject').value,
                    title: $('nTitle').value,
                    description: $('nDesc').value,
                    type: $('nType').value,
                    priority: $('nPriority').value,
                    assignee: $('nAssignee').value || null,
                    dueDate: $('nDue').value || null,
                    labels: $('nLabels').value
                }
            });
            toast('Issue created');
            closeModal('issueModal');
            loadIssues();
        } catch (err) {
            toast(err.message, 'error');
        }
    });

    loadIssues();
}

if (meUser) init();