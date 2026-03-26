// routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const router = express.Router();

// ── Student Registration ──
router.post('/register', async (req, res) => {
    try {
        const { student_id, first_name, last_name, email, password, program, level, phone } = req.body;

        // Validation
        if (!student_id || !first_name || !last_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }

        // Validate UPSA email
        if (!email.endsWith('@st.upsa.edu.gh')) {
            return res.status(400).json({ success: false, message: 'Please use your UPSA student email (@st.upsa.edu.gh)' });
        }

        // Validate student ID format
        if (!/^[0-9]{8}$/.test(student_id)) {
            return res.status(400).json({ success: false, message: 'Student ID must be 8 digits' });
        }

        // Password strength
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        // Check if student already exists
        const [existing] = await pool.execute(
            'SELECT id FROM students WHERE student_id = ? OR email = ?',
            [student_id, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Student ID or email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert student
        const [result] = await pool.execute(
            `INSERT INTO students (student_id, first_name, last_name, email, password, program, level, phone)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, first_name, last_name, email, hashedPassword, program || null, level || 100, phone || null]
        );

        // Generate token
        const token = jwt.sign(
            { id: result.insertId, student_id, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: { id: result.insertId, student_id, first_name, last_name, email, role: 'student' }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// ── Student Login ──
router.post('/student/login', async (req, res) => {
    try {
        const { student_id, password } = req.body;

        if (!student_id || !password) {
            return res.status(400).json({ success: false, message: 'Student ID and password are required' });
        }

        const [students] = await pool.execute(
            'SELECT * FROM students WHERE student_id = ? AND status = "active"',
            [student_id]
        );

        if (students.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or account suspended' });
        }

        const student = students[0];
        const isMatch = await bcrypt.compare(password, student.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: student.id, student_id: student.student_id, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: student.id,
                student_id: student.student_id,
                first_name: student.first_name,
                last_name: student.last_name,
                email: student.email,
                program: student.program,
                level: student.level,
                role: 'student'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// ── Admin Login ──
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const [admins] = await pool.execute(
            'SELECT * FROM admins WHERE username = ? AND is_active = TRUE',
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'Admin login successful',
            token,
            user: {
                id: admin.id,
                username: admin.username,
                full_name: admin.full_name,
                email: admin.email,
                role: admin.role,
                department: admin.department
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

module.exports = router;