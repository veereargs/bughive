const currentUser = requireAuth();

function renderBars(containerId, map, order) {
    const max = Math.max(...order.map((k) => map[k] || 0), 1);
    $(containerId).innerHTML = order
        .map((key) => {
            const count = map[key] || 0;
            return `
            <div class="bar-row">
                <span>${key.replace('-', ' ')}</span>
                <div class="bar-track"><div class="bar-fill fill-${key}" style="width:${(count / max) * 100}%"></div></div>
                <strong>${count}</strong>
            </div>`;
        })
        .join('');
}

async function loadDashboard() {
    renderNavbar('dashboard');
    $('welcome').textContent = `Welcome back, ${currentUser.name.split(' ')[0]} 👋`;

    try {
        const { data } = await api('/dashboard/stats');
        const t = data.totals;

        $('statCards').innerHTML = `
            <div class="card stat-card"><div class="label">Total Issues</div><div class="value">${t.total}</div></div>
            <div class="card stat-card"><div class="label">Assigned to me (open)</div><div class="value">${t.myOpen}</div></div>
            <div class="card stat-card danger"><div class="label">Overdue</div><div class="value">${t.overdue}</div></div>
            <div class="card stat-card success"><div class="label">Completed</div><div class="value">${t.done}</div></div>`;

        renderBars('statusBars', data.byStatus, STATUSES.map((s) => s.key));
        renderBars('priorityBars', data.byPriority, PRIORITIES);
        renderBars('typeBars', data.byType, TYPES);

        const maxTrend = Math.max(...data.trend.map((d) => d.count), 1);
        $('trend').innerHTML = data.trend
            .map((d) => {
                const day = new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' });
                return `
                <div class="trend-col">
                    <span>${d.count}</span>
                    <div class="trend-bar" style="height:${(d.count / maxTrend) * 100}px"></div>
                    <span>${day}</span>
                </div>`;
            })
            .join('');

        $('recent').innerHTML =
            data.recent
                .map(
                    (i) => `
                <div class="member-row">
                    <div class="grow">
                        <a href="/issue.html?id=${i._id}"><span class="code">${escapeHtml(i.code)}</span> ${escapeHtml(i.title)}</a>
                        <div class="small muted">${badge(i.status)} ${badge(i.priority)}</div>
                    </div>
                    ${avatar(i.assignee)}
                </div>`
                )
                .join('') || '<p class="muted">No issues yet.</p>';
    } catch (err) {
        toast(err.message, 'error');
    }
}

if (currentUser) loadDashboard();