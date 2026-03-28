const express = require('express');
const { pool } = require('../db/database');
const router = express.Router();

// Get all results
router.get('/', async (req, res) => {
    const { search, category } = req.query;
    let query = `
        SELECT r.*, m.category, m.match_uid, m.entry_fee, m.prize_pool, m.slots
        FROM results r
        JOIN matches m ON r.match_id = m.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ' AND (r.title LIKE ? OR m.match_uid LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'all') {
        query += ' AND m.category = ?';
        params.push(category);
    }

    query += ' ORDER BY r.completed_at DESC LIMIT 50';

    try {
        const [rows] = await pool.query(query, params);
        res.json({ success: true, results: rows });
    } catch (err) {
        console.error('Results error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Get single result
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.*, m.category, m.match_uid, m.title as match_title, m.entry_fee, m.prize_pool, m.slots
             FROM results r JOIN matches m ON r.match_id = m.id WHERE r.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Result not found.' });
        res.json({ success: true, result: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Get notice
router.get('/misc/notice', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM notices WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
        res.json({ success: true, notice: rows[0] || null });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
