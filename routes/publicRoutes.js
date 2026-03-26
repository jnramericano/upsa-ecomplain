// routes/publicRoutes.js
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// ── Highlighted / Resolved Complaints (Public) ──
router.get('/highlights', async (req, res) => {
    try {
        const [highlights] = await pool.query(`
            SELECT c.reference_number, c.subject, c.description, c.status, c.priority,
                   c.admin_feedback, c.created_at, c.resolved_at,
                   cat.name as category_name, cat.icon as category_icon
            FROM complaints c
            JOIN categories cat ON c.category_id = cat.id
            WHERE c.is_highlighted = TRUE AND c.status = 'resolved'
            ORDER BY c.resolved_at DESC
            LIMIT 10
        `);
        res.json({ success: true, highlights });
    } catch (error) {
        console.error('Highlights error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Public Stats ──
router.get('/stats', async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_complaints,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                ROUND(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) / COUNT(*) * 100) as resolution_rate
            FROM complaints
        `);
        const [studentCount] = await pool.query('SELECT COUNT(*) as total FROM students');
        const [avgTime] = await pool.query(`
            SELECT ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at))) as avg_hours
            FROM complaints WHERE status = 'resolved' AND resolved_at IS NOT NULL
        `);

        res.json({
            success: true,
            stats: {
                total_complaints: stats[0].total_complaints,
                resolved: stats[0].resolved,
                resolution_rate: stats[0].resolution_rate || 0,
                total_students: studentCount[0].total,
                avg_resolution_hours: avgTime[0].avg_hours || 0
            }
        });
    } catch (error) {
        console.error('Public stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── Public Categories ──
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT id, name, icon FROM categories WHERE is_active = TRUE ORDER BY name');
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;