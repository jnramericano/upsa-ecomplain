// public/js/main.js
// Landing page logic

document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    loadPublicStats();
    loadHighlights();
    loadCategories();
});

async function loadPublicStats() {
    try {
        const res = await fetch('/api/public/stats');
        const data = await res.json();
        if (data.success) {
            const s = data.stats;
            // Hero card
            setText('heroTotal', s.total_complaints);
            setText('heroResolved', s.resolved);
            setText('heroRate', s.resolution_rate + '%');
            setText('heroAvg', (s.avg_resolution_hours || 0) + 'h');
            // Stats bar
            setText('statStudents', s.total_students);
            setText('statTotal', s.total_complaints);
            setText('statResolved', s.resolved);
            setText('statRate', s.resolution_rate + '%');
        }
    } catch (e) { console.error(e); }
}

async function loadHighlights() {
    try {
        const res = await fetch('/api/public/highlights');
        const data = await res.json();
        const grid = document.getElementById('highlightsGrid');
        if (!grid) return;

        if (data.success && data.highlights.length > 0) {
            grid.innerHTML = data.highlights.map(h => `
                <div class="highlight-card">
                    <div class="card-top">
                        <span class="category-tag">${h.category_icon} ${h.category_name}</span>
                        <span class="resolved-badge">✓ Resolved</span>
                    </div>
                    <h3>${escapeHtml(h.subject)}</h3>
                    <p class="description">${escapeHtml(h.description)}</p>
                    ${h.admin_feedback ? `<div class="resolution"><strong>Resolution:</strong>${escapeHtml(h.admin_feedback)}</div>` : ''}
                    <div class="card-footer">
                        <span>Ref: ${h.reference_number}</span>
                        <span>Resolved: ${formatDate(h.resolved_at)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><h3>No Highlights Yet</h3><p>Resolved complaints will appear here as a transparency measure.</p></div>';
        }
    } catch (e) {
        console.error(e);
        document.getElementById('highlightsGrid').innerHTML = '<p style="text-align:center;color:#999">Unable to load highlights.</p>';
    }
}

async function loadCategories() {
    try {
        const res = await fetch('/api/public/categories');
        const data = await res.json();
        const grid = document.getElementById('categoriesGrid');
        if (!grid || !data.success) return;

        grid.innerHTML = data.categories.map(c => `
            <div class="highlight-card" style="border-left-color:var(--primary)">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                    <span style="font-size:2rem">${c.icon}</span>
                    <h3 style="margin:0">${c.name}</h3>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}