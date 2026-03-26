// public/js/student.js
// Student dashboard logic

const API = '/api/student';
let currentComplaintId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth('student');
    setupNavigation();
    setupSidebar();
    loadDashboard();
    loadCategories();
});

function checkAuth(role) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token || !user || (role === 'student' && user.role !== 'student')) {
        localStorage.clear();
        window.location.href = '/login';
        return;
    }

    document.getElementById('sidebarName').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('sidebarProgram').textContent = user.program || 'Student';
    document.getElementById('userAvatar').textContent = user.first_name?.[0] || 'S';
}

function getHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}

function setupSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('open'));

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/login';
    });
}

function setupNavigation() {
    document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            showPage(page);

            document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const sidebar = document.getElementById('sidebar');
            sidebar.classList.remove('open');
        });
    });

    document.getElementById('filterStatus')?.addEventListener('change', loadMyComplaints);
}

function showPage(page) {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`page-${page}`);
    if (target) target.style.display = 'block';

    const titles = {
        'overview': ['Overview', 'Welcome to your complaint dashboard'],
        'new-complaint': ['New Complaint', 'Submit a new complaint'],
        'my-complaints': ['My Complaints', 'View and track all your complaints'],
        'notifications': ['Notifications', 'Your recent notifications'],
        'complaint-detail': ['Complaint Detail', 'View complaint information']
    };
    const [title, subtitle] = titles[page] || ['', ''];
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;

    if (page === 'overview') loadDashboard();
    if (page === 'my-complaints') loadMyComplaints();
    if (page === 'notifications') loadNotifications();
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API}/dashboard/stats`, { headers: getHeaders() });
        const data = await res.json();
        if (!data.success) return;

        const s = data.stats;
        document.getElementById('dashStats').innerHTML = `
            <div class="dash-stat-card"><div class="stat-icon-box blue">📝</div><div class="stat-info"><div class="stat-number">${s.total}</div><div class="stat-label">Total Complaints</div></div></div>
            <div class="dash-stat-card"><div class="stat-icon-box yellow">⏳</div><div class="stat-info"><div class="stat-number">${(s.submitted || 0) + (s.under_review || 0)}</div><div class="stat-label">Pending</div></div></div>
            <div class="dash-stat-card"><div class="stat-icon-box purple">🔄</div><div class="stat-info"><div class="stat-number">${s.in_progress || 0}</div><div class="stat-label">In Progress</div></div></div>
            <div class="dash-stat-card"><div class="stat-icon-box green">✅</div><div class="stat-info"><div class="stat-number">${s.resolved || 0}</div><div class="stat-label">Resolved</div></div></div>
        `;

        // Load recent
        const res2 = await fetch(`${API}/complaints?limit=5`, { headers: getHeaders() });
        const data2 = await res2.json();
        document.getElementById('recentComplaints').innerHTML = data2.complaints?.length
            ? data2.complaints.map(c => `
                <tr style="cursor:pointer" onclick="viewComplaint(${c.id})">
                    <td><strong>${c.reference_number}</strong></td>
                    <td>${escapeHtml(c.subject)}</td>
                    <td>${c.category_icon} ${c.category_name}</td>
                    <td><span class="status-badge status-${c.status}">${c.status.replace('_', ' ')}</span></td>
                    <td>${formatDate(c.created_at)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" style="text-align:center;padding:40px;color:#999">No complaints yet. <a href="#" onclick="event.preventDefault();document.querySelector(\'[data-page=new-complaint]\').click()">Submit one now!</a></td></tr>';
    } catch (e) { console.error(e); }
}

async function loadCategories() {
    try {
        const res = await fetch(`${API}/categories`, { headers: getHeaders() });
        const data = await res.json();
        if (!data.success) return;
        const select = document.getElementById('complaintCategory');
        if (select) {
            data.categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.icon} ${c.name}`;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error(e); }
}

async function loadMyComplaints() {
    try {
        const status = document.getElementById('filterStatus')?.value || '';
        const res = await fetch(`${API}/complaints?status=${status}&limit=50`, { headers: getHeaders() });
        const data = await res.json();
        const tbody = document.getElementById('myComplaintsTable');

        if (data.complaints?.length) {
            tbody.innerHTML = data.complaints.map(c => `
                <tr>
                    <td><strong>${c.reference_number}</strong></td>
                    <td>${escapeHtml(c.subject.substring(0, 40))}${c.subject.length > 40 ? '...' : ''}</td>
                    <td>${c.category_icon} ${c.category_name}</td>
                    <td><span class="priority-badge priority-${c.priority}">${c.priority}</span></td>
                    <td><span class="status-badge status-${c.status}">${c.status.replace('_', ' ')}</span></td>
                    <td>${formatDate(c.created_at)}</td>
                    <td><button class="btn btn-primary btn-sm" onclick="viewComplaint(${c.id})">View</button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📭</div><h3>No Complaints Found</h3></div></td></tr>';
        }
    } catch (e) { console.error(e); }
}

async function viewComplaint(id) {
    showPage('complaint-detail');
    const container = document.getElementById('complaintDetailContent');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const res = await fetch(`${API}/complaints/${id}`, { headers: getHeaders() });
        const data = await res.json();
        if (!data.success) { container.innerHTML = '<p>Complaint not found.</p>'; return; }

        const c = data.complaint;
        currentComplaintId = c.id;
        const statusSteps = ['submitted', 'under_review', 'in_progress', 'resolved'];
        const currentIdx = statusSteps.indexOf(c.status);

        container.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="showPage('my-complaints')" style="margin-bottom:20px">← Back to Complaints</button>

            <div class="card" style="margin-bottom:24px">
                <div class="card-header">
                    <h3>${c.category_icon} ${c.reference_number}</h3>
                    <span class="status-badge status-${c.status}">${c.status.replace('_', ' ')}</span>
                </div>
                <div class="card-body">
                    <div class="progress-tracker">
                        ${statusSteps.map((step, i) => `
                            <div class="progress-step ${i < currentIdx ? 'completed' : i === currentIdx ? 'active' : ''}">
                                <div class="step-circle">${i < currentIdx ? '✓' : i + 1}</div>
                                <div class="step-label">${step.replace('_', ' ')}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="complaint-detail-grid" style="margin-top:24px">
                        <div>
                            <div class="info-group"><label>Subject</label><div class="value"><strong>${escapeHtml(c.subject)}</strong></div></div>
                            <div class="info-group"><label>Description</label><div class="value">${escapeHtml(c.description)}</div></div>
                            ${c.admin_feedback ? `<div class="info-group"><label>Admin Feedback</label><div class="value" style="background:#D1FAE5;padding:12px;border-radius:8px">${escapeHtml(c.admin_feedback)}</div></div>` : ''}
                        </div>
                        <div>
                            <div class="info-group"><label>Category</label><div class="value">${c.category_icon} ${c.category_name}</div></div>
                            <div class="info-group"><label>Priority</label><div class="value"><span class="priority-badge priority-${c.priority}">${c.priority}</span></div></div>
                            <div class="info-group"><label>Submitted</label><div class="value">${formatDate(c.created_at)}</div></div>
                            ${c.resolved_at ? `<div class="info-group"><label>Resolved</label><div class="value">${formatDate(c.resolved_at)}</div></div>` : ''}
                            ${c.assigned_admin_name ? `<div class="info-group"><label>Assigned To</label><div class="value">${c.assigned_admin_name}</div></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>💬 Responses (${data.responses.length})</h3>
                    ${c.status !== 'resolved' && c.status !== 'rejected' ? `<button class="btn btn-primary btn-sm" onclick="openModal('responseModal')">Add Response</button>` : ''}
                </div>
                <div class="card-body">
                    ${data.responses.length ? `
                        <div class="response-timeline">
                            ${data.responses.map(r => `
                                <div class="response-item">
                                    <div class="resp-avatar ${r.responder_type}">${r.responder_type === 'admin' ? '🛡️' : '👤'}</div>
                                    <div class="resp-content">
                                        <div class="resp-header">
                                            <strong>${r.responder_name}</strong>
                                            <time>${formatDate(r.created_at)}</time>
                                        </div>
                                        <div class="resp-body">${escapeHtml(r.message)}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div class="empty-state"><div class="empty-icon">💬</div><h3>No Responses Yet</h3><p>Waiting for admin response.</p></div>'}
                </div>
            </div>
        `;
    } catch (e) { console.error(e); container.innerHTML = '<p>Error loading complaint.</p>'; }
}

// Complaint Form Submission
document.getElementById('complaintForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitComplaintBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
        const res = await fetch(`${API}/complaints`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                category_id: document.getElementById('complaintCategory').value,
                subject: document.getElementById('complaintSubject').value.trim(),
                description: document.getElementById('complaintDescription').value.trim(),
                priority: document.getElementById('complaintPriority').value,
                is_anonymous: document.getElementById('complaintAnonymous').checked
            })
        });
        const data = await res.json();

        if (data.success) {
            const el = document.getElementById('complaintSuccess');
            el.textContent = `Complaint submitted! Reference: ${data.complaint.reference_number}`;
            el.style.display = 'block';
            document.getElementById('complaintForm').reset();
            document.getElementById('complaintError').style.display = 'none';
        } else {
            const el = document.getElementById('complaintError');
            el.textContent = data.message;
            el.style.display = 'block';
        }
    } catch (err) {
        document.getElementById('complaintError').textContent = 'Network error';
        document.getElementById('complaintError').style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Submit Complaint';
});

// Send Response
document.getElementById('sendResponseBtn')?.addEventListener('click', async () => {
    const message = document.getElementById('responseMessage').value.trim();
    if (!message || message.length < 5) { alert('Response must be at least 5 characters'); return; }

    try {
        const res = await fetch(`${API}/complaints/${currentComplaintId}/respond`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('responseModal');
            document.getElementById('responseMessage').value = '';
            viewComplaint(currentComplaintId);
        } else { alert(data.message); }
    } catch (e) { alert('Error sending response'); }
});

async function loadNotifications() {
    try {
        const res = await fetch(`${API}/notifications`, { headers: getHeaders() });
        const data = await res.json();
        const container = document.getElementById('notificationsContainer');

        if (data.notifications?.length) {
            container.innerHTML = data.notifications.map(n => `
                <div style="padding:16px;border-bottom:1px solid #e5e7eb;${n.is_read ? '' : 'background:#EFF6FF;'}">
                    <strong>${escapeHtml(n.title)}</strong>
                    <p style="color:#6b7280;margin:4px 0;font-size:0.9rem">${escapeHtml(n.message)}</p>
                    <small style="color:#9ca3af">${formatDate(n.created_at)}</small>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><h3>No Notifications</h3></div>';
        }
    } catch (e) { console.error(e); }
}

// Utility functions
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

// Add this function to public/js/student.js

function openComplaintPage(id) {
    // Opens the standalone complaint detail page in a new context
    window.location.href = `/complaint?id=${id}`;
}

// You can now use either:
//   onclick="viewComplaint(${c.id})"       → loads inline in dashboard
//   onclick="openComplaintPage(${c.id})"   → opens standalone page