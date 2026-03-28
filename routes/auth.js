const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/database');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { first_name, last_name, username, email, mobile, password, confirm_password } = req.body;

    if (!first_name || !last_name || !username || !email || !mobile || !password || !confirm_password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email or username already registered.' });
        }

        const hashed = await bcrypt.hash(password, 12);
        const [result] = await pool.query(
            'INSERT INTO users (first_name, last_name, username, email, mobile, password) VALUES (?, ?, ?, ?, ?, ?)',
            [first_name, last_name, username, email, mobile, hashed]
        );

        const [rows] = await pool.query('SELECT id, first_name, last_name, username, email, mobile, balance FROM users WHERE id = ?', [result.insertId]);
        const user = rows[0];

        req.session.user = user;
        res.json({ success: true, message: 'Account created successfully!', user });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const safeUser = { id: user.id, first_name: user.first_name, last_name: user.last_name, username: user.username, email: user.email, mobile: user.mobile, balance: user.balance, role: user.role };
        req.session.user = safeUser;
        res.json({ success: true, message: 'Login successful!', user: safeUser });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: 'Logged out successfully.' });
    });
});

// Get current user
router.get('/me', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    try {
        const [rows] = await pool.query('SELECT id, first_name, last_name, username, email, mobile, balance, ff_uid, ff_name FROM users WHERE id = ?', [req.session.user.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
