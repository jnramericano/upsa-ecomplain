// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

// ── Rate Limiting ──
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// ── Body Parsers ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static Files ──
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// ── Serve Frontend Pages ──
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student-dashboard.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html')));

// ── 404 Handler ──
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error Handler ──
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 UPSA E-Complaint System running on http://localhost:${PORT}`);
});

// Add this with the other app.get() routes in server.js:
app.get('/complaint', (req, res) => res.sendFile(path.join(__dirname, 'public', 'complaint-detail.html')));