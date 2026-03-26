// public/js/admin.js
// Admin dashboard logic

const API = '/api/admin';
let currentAdminComplaintId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    setupAdminNav();
    setupAdminSidebar();
    loadAdminDashboard();
});

function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token || !user || !['super_admin', 'admin', 'moderator'].includes(user.role)) {
        localStorage.clear();
        window.location.href = '/admin-login';
        return;
    }
    document.getElementById('adminName').textContent = user.full_name || user.username;
    document.getElementById('adminDept').textContent = user.department || user.role;
    document.getElementById('adminAvatar').textContent = (user.full_name || user.username)?.[0] || 'A';
}

function getHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}

function setupAdminSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('open'));

    document.getElementById('adminLogoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/admin-login';
    });
}

function setupAdminNav() {
    document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showAdminPage(link.dataset.page);
            document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.getElementById('sidebar').classList.remove('open');
        });
    });

    // Filters
    ['adminFilterStatus', 'adminFilterPriority'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', loadAllComplaints);
    });

    let searchTimeout;
    document.getElementById('adminSearch')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadAllComplaints, 400);
    });
}

function showAdminPage(page) {
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`page-${page}`);
    if (target) target.style.display = 'block';

    const titles = {
        'overview': ['Dashboard', 'System overview and recent activity'],
        'complaints': ['All Complaints', 'Manage and respond to student complaints'],
        'students': ['Students', 'View registered students'],
        'notifications': ['Notifications', 'System notifications'],
        'complaint-detail': ['Complaint Detail', 'Manage complaint']
    };
    const [title, subtitle] = titles[page] || ['', ''];
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;

    if (page === 'overview') loadAdminDashboard();
    if (page === 'complaints') loadAllComplaints();
    if (page === 'students') loadStudents();
    if (page === 'notifications') loadAdminNotifications();
}

async function loadAdminDashboard() {
    try {
        const res = await fetch(`${API}/dashboard/stats`, { headers: getHeaders() });
        const data = await res.json();
        if (!data.success) return;

        const s = data.stats.complaints;

        document.getElementById('adminDashStats').innerHTML = `
            <div class="dash-stat-card"><div class="stat-icon-box blue">📝</div><div class="stat-info"><div class="stat-number">${s.total}</div><div class="stat-label">Total Complaints</div></div></div>
            <div class="dash-stat-card"><div class="stat-icon-box yellow">⏳</div><div class="stat-info"><div class="stat-number">${(s.submitted || 0) + (s.under_review || 0)}</div><div class="stat-label">Pending</div></div></div>
            <div class="dash-stat-card"><div class="stat-icon-box purple">🔄</div><div class="stat-info"><div class="stat-number">${s.in_progress || 0}</div><div class="stat-label">In Progress</div></div></div>
            <div class="dash-stat-card"><div class="stat-icon-box green">✅</div><div class="stat-info"><div class="stat-number">${s.resolved || 0}</div><div class="stat-label">Resolved</div></div></div>
            <div class="dash-stat-card"><div class="stat-icon-box red">❌</div><div class="stat-info"><div class="stat-number">${s.rejected || 0}</div><div class="stat-label">Rejected</div></div></div>
            <div class="dash-stat-card"><div class="stat-icon-box blue">👥</div><div class="stat-info"><div class="stat-number">${data.stats.total_students}</div><div class="stat-label">Students</div></div></div>
        `;

        // Category stats
        document.getElementById('categoryStats').innerHTML = data.stats.by_category.map(c => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #e5e7eb">
                <span>${c.icon} ${c.name}</span>
                <strong>${c.count}</strong>
            </div>
        `).join('');

        // Recent complaints
        document.getElementById('adminRecentComplaints').innerHTML = data.stats.recent_complaints.map(c => `
            <tr style="cursor:pointer" onclick="viewAdminComplaint(${c.id})">
                <td><strong>${c.reference_number}</strong></td>
                <td>${escapeHtml(c.subject.substring(0, 30))}</td>
                <td><span class="status-badge status-${c.status}">${c.status.replace('_', ' ')}</span></td>
                <td>${formatDate(c.created_at)}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;color:#999">No complaints yet</td></tr>';
    } catch (e) { console.error(e); }
}

async function loadAllComplaints() {
    try {
        const status = document.getElementById('adminFilterStatus')?.value || '';
        const priority = document.getElementById('adminFilterPriority')?.value || '';
        const search = document.getElementById('adminSearch')?.value || '';

        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (search) params.append('search', search);
        params.append('limit', '50');

        const res = await fetch(`${API}/complaints?${params}`, { headers: getHeaders() });
        const data = await res.json();
        const tbody = document.getElementById('allComplaintsTable');

        if (data.complaints?.length) {
            tbody.innerHTML = data.complaints.map(c => `
                <tr>
                    <td><strong>${c.reference_number}</strong></td>
                    <td>${c.student_name}<br><small style="color:#9ca3af">${c.student_id_display}</small></td>
                    <td>${escapeHtml(c.subject.substring(0, 30))}${c.subject.length > 30 ? '...' : ''}</td>
                    <td>${c.category_icon} ${c.category_name}</td>
                    <td><span class="priority-badge priority-${c.priority}">${c.priority}</span></td>
                    <td><span class="status-badge status-${c.status}">${c.status.replace('_', ' ')}</span></td>
                    <td>${formatDate(c.created_at)}</td>
                    <td><button class="btn btn-primary btn-sm" onclick="viewAdminComplaint(${c.id})">Manage</button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📭</div><h3>No Complaints Found</h3></div></td></tr>';
        }
    } catch (e) { console.error(e); }
}

async function viewAdminComplaint(id) {
    showAdminPage('complaint-detail');
    const container = document.getElementById('adminComplaintDetail');
    container.innerHTML = '<div class="spinner"></div>';
    currentAdminComplaintId = id;

    try {
        const res = await fetch(`${API}/complaints/${id}`, { headers: getHeaders() });
        const data = await res.json();
        if (!data.success) { container.innerHTML = '<p>Not found</p>'; return; }

        const c = data.complaint;
        container.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="showAdminPage('complaints')" style="margin-bottom:20px">← Back</button>
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px">
                <div>
                    <div class="card" style="margin-bottom:24px">
                        <div class="card-header">
                            <h3>${c.category_icon} ${c.reference_number}</h3>
                            <div style="display:flex;gap:8px">
                                <span class="status-badge status-${c.status}">${c.status.replace('_', ' ')}</span>
                                <span class="priority-badge priority-${c.priority}">${c.priority}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="info-group"><label>Subject</label><div class="value"><strong>${escapeHtml(c.subject)}</strong></div></div>
                            <div class="info-group"><label>Description</label><div class="value">${escapeHtml(c.description)}</div></div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <h3>💬 Responses (${data.responses.length})</h3>
                            <button class="btn btn-primary btn-sm" onclick="openModal('adminRespondModal')">Respond</button>
                        </div>
                        <div class="card-body">
                            ${data.responses.length ? `<div class="response-timeline">${data.responses.map(r => `
                                <div class="response-item">
                                    <div class="resp-avatar ${r.responder_type}">${r.responder_type === 'admin' ? '🛡️' : '👤'}</div>
                                    <div class="resp-content">
                                        <div class="resp-header"><strong>${r.responder_name}</strong><time>${formatDate(r.created_at)}</time></div>
                                        <div class="resp-body">${escapeHtml(r.message)}</div>
                                    </div>
                                </div>
                            `).join('')}</div>` : '<p style="color:#999;text-align:center">No responses yet</p>'}
                        </div>
                    </div>
                </div>
                <div>
                    <div class="card" style="margin-bottom:24px">
                        <div class="card-header"><h3>Student Info</h3></div>
                        <div class="card-body">
                            <div class="info-group"><label>Name</label><div class="value">${c.student_name}</div></div>
                            <div class="info-group"><label>Student ID</label><div class="value">${c.student_id_display}</div></div>
                            <div class="info-group"><label>Email</label><div class="value">${c.student_email || '—'}</div></div>
                            <div class="info-group"><label>Programme</label><div class="value">${c.program || '—'}</div></div>
                            <div class="info-group"><label>Level</label><div class="value">${c.level || '—'}</div></div>
                        </div>
                    </div>
                    <div class="card" style="margin-bottom:24px">
                        <div class="card-header"><h3>Details</h3></div>
                        <div class="card-body">
                            <div class="info-group"><label>Category</label><div class="value">${c.category_icon} ${c.category_name}</div></div>
                            <div class="info-group"><label>Submitted</label><div class="value">${formatDate(c.created_at)}</div></div>
                            <div class="info-group"><label>Last Updated</label><div class="value">${formatDate(c.updated_at)}</div></div>
                            ${c.resolved_at ? `<div class="info-group"><label>Resolved</label><div class="value">${formatDate(c.resolved_at)}</div></div>` : ''}
                            ${c.assigned_admin_name ? `<div class="info-group"><label>Assigned To</label><div class="value">${c.assigned_admin_name}</div></div>` : ''}
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header"><h3>Actions</h3></div>
                        <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
                            <button class="btn btn-primary btn-sm btn-block" onclick="openStatusModal()">Update Status</button>
                            <button class="btn ${c.is_highlighted ? 'btn-danger' : 'btn-gold'} btn-sm btn-block" onclick="toggleHighlight(${c.id})">${c.is_highlighted ? 'Remove Highlight' : 'Add to Highlights'}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (e) { console.error(e); }
}

function openStatusModal() { openModal('statusModal'); }

document.getElementById('updateStatusBtn')?.addEventListener('click', async () => {
    const status = document.getElementById('newStatus').value;
    const feedback = document.getElementById('statusFeedback').value.trim();

    try {
        const res = await fetch(`${API}/complaints/${currentAdminComplaintId}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ status, feedback: feedback || undefined })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('statusModal');
            document.getElementById('statusFeedback').value = '';
            viewAdminComplaint(currentAdminComplaintId);
        } else { alert(data.message); }
    } catch (e) { alert('Error updating status'); }
});

document.getElementById('adminSendResponseBtn')?.addEventListener('click', async () => {
    const message = document.getElementById('adminResponseMsg').value.trim();
    if (!message || message.length < 5) { alert('Response must be at least 5 characters'); return; }

    try {
        const res = await fetch(`${API}/complaints/${currentAdminComplaintId}/respond`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('adminRespondModal');
            document.getElementById('adminResponseMsg').value = '';
            viewAdminComplaint(currentAdminComplaintId);
        } else { alert(data.message); }
    } catch (e) { alert('Error sending response'); }
});

async function toggleHighlight(id) {
    try {
        await fetch(`${API}/complaints/${id}/highlight`, { method: 'PUT', headers: getHeaders() });
        viewAdminComplaint(id);
    } catch (e) { alert('Error toggling highlight'); }
}

async function loadStudents() {
    try {
        const res = await fetch(`${API}/students`, { headers: getHeaders() });
        const data = await res.json();
        const tbody = document.getElementById('studentsTable');

        tbody.innerHTML = data.students?.map(s => `
            <tr>
                <td><strong>${s.student_id}</strong></td>
                <td>${s.first_name} ${s.last_name}</td>
                <td>${s.email}</td>
                <td>${s.program || '—'}</td>
                <td>${s.level}</td>
                <td><strong>${s.complaint_count}</strong></td>
                <td><span class="status-badge status-${s.status === 'active' ? 'resolved' : 'rejected'}">${s.status}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="7">No students found</td></tr>';
    } catch (e) { console.error(e); }
}

async function loadAdminNotifications() {
    try {
        const res = await fetch(`${API}/notifications`, { headers: getHeaders() });
        const data = await res.json();
        const container = document.getElementById('adminNotifications');

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

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

// Add this function to public/js/admin.js

function openComplaintPage(id) {
    window.location.href = `/complaint?id=${id}`;
}