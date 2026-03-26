// routes/adminRoutes.js
const express = require('express');
const pool = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// ── Admin Dashboard Stats ──
router.get('/dashboard/stats', async (req, res) => {
    try {
        const [complaintStats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM complaints
        `);

        const [studentCount] = await pool.query('SELECT COUNT(*) as total FROM students WHERE status = "active"');
        const [todayCount] = await pool.query('SELECT COUNT(*) as total FROM complaints WHERE DATE(created_at) = CURDATE()');
        const [categoryStats] = await pool.query(`
            SELECT cat.name, cat.icon, COUNT(c.id) as count
            FROM categories cat
            LEFT JOIN complaints c ON cat.id = c.category_id
            GROUP BY cat.id, cat.name, cat.icon ORDER BY count DESC
        `);

        // Recent complaints
        const [recent] = await pool.query(`
            SELECT c.id, c.reference_number, c.subject, c.status, c.priority, c.created_at,
                   cat.name as category_name, cat.icon as category_icon,
                   CASE WHEN c.is_anonymous THEN 'Anonymous' ELSE CONCAT(s.first_name, ' ', s.last_name) END as student_name,
                   CASE WHEN c.is_anonymous THEN '--------' ELSE s.student_id END as student_id_display
            FROM complaints c
            JOIN categories cat ON c.category_id = cat.id
            JOIN students s ON c.student_id = s.id
            ORDER BY c.created_at DESC LIMIT 5
        `);

        res.json({
            success: true,
            stats: {
                complaints: complaintStats[0],
                total_students: studentCount[0].total,
                today_complaints: todayCount[0].total,
                by_category: categoryStats,
                recent_complaints: recent
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Get All Complaints ──
router.get('/complaints', async (req, res) => {
    try {
        const status = req.query.status || '';
        const category_id = req.query.category_id || '';
        const priority = req.query.priority || '';
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;

        let query = `
            SELECT c.*, cat.name as category_name, cat.icon as category_icon,
                   CASE WHEN c.is_anonymous THEN 'Anonymous Student' ELSE CONCAT(s.first_name, ' ', s.last_name) END as student_name,
                   CASE WHEN c.is_anonymous THEN '--------' ELSE s.student_id END as student_id_display,
                   s.program, s.level,
                   a.full_name as assigned_admin_name,
                   (SELECT COUNT(*) FROM complaint_responses cr WHERE cr.complaint_id = c.id) as response_count
            FROM complaints c
            JOIN categories cat ON c.category_id = cat.id
            JOIN students s ON c.student_id = s.id
            LEFT JOIN admins a ON c.assigned_admin_id = a.id
            WHERE 1=1`;
        const params = [];

        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }
        if (category_id) {
            query += ' AND c.category_id = ?';
            params.push(parseInt(category_id));
        }
        if (priority) {
            query += ' AND c.priority = ?';
            params.push(priority);
        }
        if (search) {
            query += ' AND (c.reference_number LIKE ? OR c.subject LIKE ? OR s.student_id LIKE ?)';
            params.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
        }

        query += ' ORDER BY c.created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;

        const [complaints] = await pool.query(query, params);

        // Total count
        let countQ = 'SELECT COUNT(*) as total FROM complaints c JOIN students s ON c.student_id = s.id WHERE 1=1';
        const countP = [];
        if (status) { countQ += ' AND c.status = ?'; countP.push(status); }
        if (category_id) { countQ += ' AND c.category_id = ?'; countP.push(parseInt(category_id)); }
        if (priority) { countQ += ' AND c.priority = ?'; countP.push(priority); }
        if (search) {
            countQ += ' AND (c.reference_number LIKE ? OR c.subject LIKE ? OR s.student_id LIKE ?)';
            countP.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
        }
        const [countResult] = await pool.query(countQ, countP);

        res.json({
            success: true,
            complaints,
            pagination: {
                total: countResult[0].total,
                page: page,
                limit: limit,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Get Single Complaint ──
router.get('/complaints/:id', async (req, res) => {
    try {
        const [complaints] = await pool.query(
            `SELECT c.*, cat.name as category_name, cat.icon as category_icon,
                    CASE WHEN c.is_anonymous THEN 'Anonymous Student' ELSE CONCAT(s.first_name, ' ', s.last_name) END as student_name,
                    CASE WHEN c.is_anonymous THEN '--------' ELSE s.student_id END as student_id_display,
                    s.email as student_email, s.program, s.level, s.phone as student_phone,
                    a.full_name as assigned_admin_name
             FROM complaints c
             JOIN categories cat ON c.category_id = cat.id
             JOIN students s ON c.student_id = s.id
             LEFT JOIN admins a ON c.assigned_admin_id = a.id
             WHERE c.id = ?`,
            [parseInt(req.params.id)]
        );

        if (complaints.length === 0) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        const [responses] = await pool.query(
            `SELECT cr.*,
                    CASE WHEN cr.responder_type = 'admin' THEN a.full_name ELSE 'Student' END as responder_name
             FROM complaint_responses cr
             LEFT JOIN admins a ON cr.admin_id = a.id
             WHERE cr.complaint_id = ? ORDER BY cr.created_at ASC`,
            [parseInt(req.params.id)]
        );

        res.json({ success: true, complaint: complaints[0], responses });
    } catch (error) {
        console.error('Get complaint error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Update Complaint Status ──
router.put('/complaints/:id/status', async (req, res) => {
    try {
        const { status, feedback } = req.body;
        const validStatuses = ['submitted', 'under_review', 'in_progress', 'resolved', 'rejected'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const complaintId = parseInt(req.params.id);
        const adminId = parseInt(req.user.id);

        if (status === 'resolved' || status === 'rejected') {
            if (feedback) {
                await pool.query(
                    'UPDATE complaints SET status = ?, assigned_admin_id = ?, admin_feedback = ?, resolved_at = NOW() WHERE id = ?',
                    [status, adminId, feedback, complaintId]
                );
            } else {
                await pool.query(
                    'UPDATE complaints SET status = ?, assigned_admin_id = ?, resolved_at = NOW() WHERE id = ?',
                    [status, adminId, complaintId]
                );
            }
        } else {
            if (feedback) {
                await pool.query(
                    'UPDATE complaints SET status = ?, assigned_admin_id = ?, admin_feedback = ? WHERE id = ?',
                    [status, adminId, feedback, complaintId]
                );
            } else {
                await pool.query(
                    'UPDATE complaints SET status = ?, assigned_admin_id = ? WHERE id = ?',
                    [status, adminId, complaintId]
                );
            }
        }

        // Auto-create response when feedback is provided
        if (feedback) {
            await pool.query(
                'INSERT INTO complaint_responses (complaint_id, admin_id, message, responder_type) VALUES (?, ?, ?, "admin")',
                [complaintId, adminId, feedback]
            );
        }

        // Notify student
        const [complaint] = await pool.query(
            'SELECT student_id, reference_number FROM complaints WHERE id = ?',
            [complaintId]
        );
        if (complaint.length > 0) {
            await pool.query(
                'INSERT INTO notifications (user_id, user_type, title, message) VALUES (?, "student", ?, ?)',
                [complaint[0].student_id, 'Complaint ' + complaint[0].reference_number + ' Updated', 'Your complaint status has been changed to: ' + status.replace('_', ' ').toUpperCase()]
            );
        }

        res.json({ success: true, message: 'Complaint status updated to ' + status });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Admin Respond to Complaint ──
router.post('/complaints/:id/respond', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Response must be at least 5 characters' });
        }

        const complaintId = parseInt(req.params.id);
        const adminId = parseInt(req.user.id);

        await pool.query(
            'INSERT INTO complaint_responses (complaint_id, admin_id, message, responder_type) VALUES (?, ?, ?, "admin")',
            [complaintId, adminId, message]
        );

        // Notify student
        const [complaint] = await pool.query(
            'SELECT student_id, reference_number FROM complaints WHERE id = ?',
            [complaintId]
        );
        if (complaint.length > 0) {
            await pool.query(
                'INSERT INTO notifications (user_id, user_type, title, message) VALUES (?, "student", ?, ?)',
                [complaint[0].student_id, 'New Response on Your Complaint', 'An admin has responded to complaint ' + complaint[0].reference_number + '.']
            );
        }

        res.status(201).json({ success: true, message: 'Response sent successfully' });
    } catch (error) {
        console.error('Respond error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Toggle Highlight ──
router.put('/complaints/:id/highlight', async (req, res) => {
    try {
        await pool.query(
            'UPDATE complaints SET is_highlighted = NOT is_highlighted WHERE id = ?',
            [parseInt(req.params.id)]
        );
        res.json({ success: true, message: 'Highlight status toggled' });
    } catch (error) {
        console.error('Highlight error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Get All Students ──
router.get('/students', async (req, res) => {
    try {
        const [students] = await pool.query(
            `SELECT s.id, s.student_id, s.first_name, s.last_name, s.email, 
                    s.program, s.level, s.phone, s.status, s.created_at,
                    (SELECT COUNT(*) FROM complaints c WHERE c.student_id = s.id) as complaint_count
             FROM students s ORDER BY s.created_at DESC`
        );
        res.json({ success: true, students });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Get Categories ──
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Admin Notifications ──
router.get('/notifications', async (req, res) => {
    try {
        const [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? AND user_type = "admin" ORDER BY created_at DESC LIMIT 20',
            [parseInt(req.user.id)]
        );
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;