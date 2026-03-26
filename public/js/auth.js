// public/js/auth.js
// Authentication logic for login and register pages

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user) {
        if (user.role === 'student') window.location.href = '/dashboard';
        else window.location.href = '/admin';
    }

    // Student Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            btn.disabled = true;
            btn.textContent = 'Signing in...';
            hideAlerts();

            try {
                const res = await fetch('/api/auth/student/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_id: document.getElementById('studentId').value.trim(),
                        password: document.getElementById('password').value
                    })
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/dashboard';
                } else {
                    showAlert('error', data.message);
                }
            } catch (err) {
                showAlert('error', 'Network error. Please try again.');
            }
            btn.disabled = false;
            btn.textContent = 'Sign In';
        });
    }

    // Student Registration
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('registerBtn');

            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                showAlert('error', 'Passwords do not match');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating account...';
            hideAlerts();

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student_id: document.getElementById('studentId').value.trim(),
                        first_name: document.getElementById('firstName').value.trim(),
                        last_name: document.getElementById('lastName').value.trim(),
                        email: document.getElementById('email').value.trim(),
                        password: password,
                        program: document.getElementById('program').value,
                        level: document.getElementById('level').value,
                        phone: document.getElementById('phone').value.trim()
                    })
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    showAlert('success', 'Registration successful! Redirecting...');
                    setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
                } else {
                    showAlert('error', data.message);
                }
            } catch (err) {
                showAlert('error', 'Network error. Please try again.');
            }
            btn.disabled = false;
            btn.textContent = 'Create Account';
        });
    }

    // Admin Login
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('adminLoginBtn');
            btn.disabled = true;
            btn.textContent = 'Signing in...';
            hideAlerts();

            try {
                const res = await fetch('/api/auth/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: document.getElementById('username').value.trim(),
                        password: document.getElementById('password').value
                    })
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/admin';
                } else {
                    showAlert('error', data.message);
                }
            } catch (err) {
                showAlert('error', 'Network error. Please try again.');
            }
            btn.disabled = false;
            btn.textContent = 'Sign In to Admin Panel';
        });
    }
});

function showAlert(type, message) {
    const el = document.getElementById(type === 'error' ? 'alertError' : 'alertSuccess');
    if (el) { el.textContent = message; el.style.display = 'block'; }
}

function hideAlerts() {
    document.querySelectorAll('.alert').forEach(a => a.style.display = 'none');
}