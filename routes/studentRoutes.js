// routes/studentRoutes.js
const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);

// ── Get Student Profile ──
router.get('/profile', async (req, res) => {
    try {
        const [students] = await pool.query(
            'SELECT id, student_id, first_name, last_name, email, program, level, phone, status, created_at FROM students WHERE id = ?',
            [parseInt(req.user.id)]
        );
        if (students.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, student: students[0] });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Submit Complaint ──
router.post('/complaints', async (req, res) => {
    try {
        const { category_id, subject, description, priority, is_anonymous } = req.body;

        if (!category_id || !subject || !description) {
            return res.status(400).json({ success: false, message: 'Category, subject, and description are required' });
        }

        if (subject.length < 5 || subject.length > 200) {
            return res.status(400).json({ success: false, message: 'Subject must be 5-200 characters' });
        }

        if (description.length < 20) {
            return res.status(400).json({ success: false, message: 'Description must be at least 20 characters' });
        }

        // Generate unique reference number
        const year = new Date().getFullYear();
        const [countResult] = await pool.query('SELECT COUNT(*) as count FROM complaints');
        const refNum = 'CMP-' + year + '-' + String(countResult[0].count + 1).padStart(4, '0');

        const [result] = await pool.query(
            'INSERT INTO complaints (reference_number, student_id, category_id, subject, description, priority, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [refNum, parseInt(req.user.id), parseInt(category_id), subject, description, priority || 'medium', is_anonymous ? 1 : 0]
        );

        // Create notification for admins
        const [admins] = await pool.query('SELECT id FROM admins WHERE is_active = TRUE');
        for (const admin of admins) {
            await pool.query(
                'INSERT INTO notifications (user_id, user_type, title, message, link) VALUES (?, "admin", ?, ?, ?)',
                [admin.id, 'New Complaint Submitted', 'A new complaint (' + refNum + ') has been submitted and requires attention.', '/admin#complaint-' + result.insertId]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully',
            complaint: { id: result.insertId, reference_number: refNum, status: 'submitted' }
        });

    } catch (error) {
        console.error('Submit complaint error:', error);
        res.status(500).json({ success: false, message: 'Server error submitting complaint' });
    }
});

// ── Get My Complaints ──
router.get('/complaints', async (req, res) => {
    try {
        const status = req.query.status || '';
        const category_id = req.query.category_id || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        let query = `
            SELECT c.*, cat.name as category_name, cat.icon as category_icon,
                   (SELECT COUNT(*) FROM complaint_responses cr WHERE cr.complaint_id = c.id) as response_count
            FROM complaints c
            JOIN categories cat ON c.category_id = cat.id
            WHERE c.student_id = ?`;
        const params = [parseInt(req.user.id)];

        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }
        if (category_id) {
            query += ' AND c.category_id = ?';
            params.push(parseInt(category_id));
        }

        query += ' ORDER BY c.created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;

        const [complaints] = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM complaints WHERE student_id = ?';
        const countParams = [parseInt(req.user.id)];
        if (status) { countQuery += ' AND status = ?'; countParams.push(status); }
        if (category_id) { countQuery += ' AND category_id = ?'; countParams.push(parseInt(category_id)); }
        const [countResult] = await pool.query(countQuery, countParams);

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

// ── Get Single Complaint Detail ──
router.get('/complaints/:id', async (req, res) => {
    try {
        const complaintId = parseInt(req.params.id);
        const studentId = parseInt(req.user.id);

        const [complaints] = await pool.query(
            `SELECT c.*, cat.name as category_name, cat.icon as category_icon,
                    a.full_name as assigned_admin_name
             FROM complaints c
             JOIN categories cat ON c.category_id = cat.id
             LEFT JOIN admins a ON c.assigned_admin_id = a.id
             WHERE c.id = ? AND c.student_id = ?`,
            [complaintId, studentId]
        );

        if (complaints.length === 0) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        // Get responses
        const [responses] = await pool.query(
            `SELECT cr.*, 
                    CASE WHEN cr.responder_type = 'admin' THEN a.full_name ELSE CONCAT(s.first_name, ' ', s.last_name) END as responder_name
             FROM complaint_responses cr
             LEFT JOIN admins a ON cr.admin_id = a.id
             LEFT JOIN students s ON cr.student_id = s.id
             WHERE cr.complaint_id = ?
             ORDER BY cr.created_at ASC`,
            [complaintId]
        );

        res.json({ success: true, complaint: complaints[0], responses });

    } catch (error) {
        console.error('Get complaint detail error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Add Response to Own Complaint ──
router.post('/complaints/:id/respond', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Response must be at least 5 characters' });
        }

        const complaintId = parseInt(req.params.id);
        const studentId = parseInt(req.user.id);

        // Verify complaint belongs to student
        const [complaints] = await pool.query(
            'SELECT id, status FROM complaints WHERE id = ? AND student_id = ?',
            [complaintId, studentId]
        );

        if (complaints.length === 0) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }
        if (complaints[0].status === 'resolved' || complaints[0].status === 'rejected') {
            return res.status(400).json({ success: false, message: 'Cannot respond to a closed complaint' });
        }

        await pool.query(
            'INSERT INTO complaint_responses (complaint_id, student_id, message, responder_type) VALUES (?, ?, ?, "student")',
            [complaintId, studentId, message]
        );

        res.status(201).json({ success: true, message: 'Response added successfully' });

    } catch (error) {
        console.error('Respond error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Get Student Dashboard Stats ──
router.get('/dashboard/stats', async (req, res) => {
    try {
        const studentId = parseInt(req.user.id);

        const [stats] = await pool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
             FROM complaints WHERE student_id = ?`,
            [studentId]
        );

        res.json({ success: true, stats: stats[0] });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Get Categories ──
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY name');
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Get Notifications ──
router.get('/notifications', async (req, res) => {
    try {
        const [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? AND user_type = "student" ORDER BY created_at DESC LIMIT 20',
            [parseInt(req.user.id)]
        );
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;