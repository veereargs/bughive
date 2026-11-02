const STATUSES = [
    { key: 'todo', label: 'To Do' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'in-review', label: 'In Review' },
    { key: 'done', label: 'Done' }
];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const TYPES = ['bug', 'feature', 'task'];

const $ = (id) => document.getElementById(id);

/* ---------- Auth storage (token + user in localStorage) ---------- */
const Auth = {
    getToken: () => localStorage.getItem('bh_token'),
    getUser: () => JSON.parse(localStorage.getItem('bh_user') || 'null'),
    save(token, user) {
        localStorage.setItem('bh_token', token);
        localStorage.setItem('bh_user', JSON.stringify(user));
    },
    saveUser(user) {
        localStorage.setItem('bh_user', JSON.stringify(user));
    },
    clear() {
        localStorage.removeItem('bh_token');
        localStorage.removeItem('bh_user');
    },
    isLoggedIn() {
        return !!localStorage.getItem('bh_token');
    }
};

/* ---------- fetch wrapper: adds token, parses JSON, handles errors ---------- */
async function api(endpoint, options = {}) {
    const { method = 'GET', body } = options;
    const headers = { 'Content-Type': 'application/json' };
    const token = Auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    let data = {};
    try { data = await res.json(); } catch (e) { /* empty body */ }

    // Token expired / invalid -> force logout (but not on the login form itself)
    if (res.status === 401 && !endpoint.startsWith('/auth/login')) {
        Auth.clear();
        window.location.href = '/login.html';
        throw new Error(data.message || 'Session expired');
    }
    if (!res.ok) throw new Error(data.message || 'Something went wrong');
    return data;
}

/* ---------- Route guard: call at the top of every private page ---------- */
function requireAuth() {
    if (!Auth.isLoggedIn()) {
        window.location.href = '/login.html';
        return null;
    }
    return Auth.getUser();
}

/* ---------- Small UI helpers ---------- */
// XSS protection: ALWAYS escape user text before putting it into innerHTML
function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [name, secs] of units) {
        const n = Math.floor(seconds / secs);
        if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
    return 'just now';
}

function initials(name = '?') {
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function avatar(user, extraClass = '') {
    if (!user) return `<span class="avatar ${extraClass}" style="background:#475569" title="Unassigned">?</span>`;
    return `<span class="avatar ${extraClass}" style="background:${escapeHtml(user.avatarColor)}" title="${escapeHtml(user.name)}">${escapeHtml(initials(user.name))}</span>`;
}

function badge(value) {
    const label = String(value).replace('-', ' ');
    return `<span class="badge badge-${escapeHtml(value)}">${escapeHtml(label)}</span>`;
}

function isOverdue(issue) {
    return issue.dueDate && issue.status !== 'done' && new Date(issue.dueDate) < new Date();
}

function toast(message, type = 'success') {
    let box = $('toasts');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toasts';
        document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast ${type === 'error' ? 'error' : ''}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

/* ---------- Modal helpers ---------- */
function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }
document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal')) e.target.classList.remove('open');
    if (e.target.dataset && e.target.dataset.close) closeModal(e.target.dataset.close);
});

/* ---------- Navbar (same on every private page) ---------- */
function renderNavbar(active) {
    const user = Auth.getUser();
    const el = $('navbar');
    if (!el || !user) return;
    const link = (href, key, label) =>
        `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`;

    el.innerHTML = `
        <nav class="navbar">
            <a href="/" class="brand">🐝 BugHive</a>
            <div class="nav-links">
                ${link('/dashboard.html', 'dashboard', 'Dashboard')}
                ${link('/projects.html', 'projects', 'Projects')}
                ${link('/issues.html', 'issues', 'Issues')}
                ${link('/profile.html', 'profile', 'Profile')}
            </div>
            <div class="nav-user">
                ${avatar(user)}
                <span>${escapeHtml(user.name)}</span>
                ${badge(user.role)}
                <button id="logoutBtn" class="btn btn-ghost btn-sm">Logout</button>
            </div>
        </nav>`;

    $('logoutBtn').addEventListener('click', () => {
        Auth.clear();
        window.location.href = '/login.html';
    });
}
