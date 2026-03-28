const express = require('express');
const { pool } = require('../db/database');
const router = express.Router();

// Get all matches with optional category filter
router.get('/', async (req, res) => {
    const { category, status } = req.query;
    let query = 'SELECT * FROM matches WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
    }
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY scheduled_at ASC';

    try {
        const [rows] = await pool.query(query, params);
        res.json({ success: true, matches: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Get single match
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM matches WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Match not found.' });
        res.json({ success: true, match: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Get match participants
router.get('/:id/participants', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT mp.*, u.username, u.first_name, u.last_name 
             FROM joinners mp 
             JOIN users u ON mp.user_id = u.id 
             WHERE mp.match_id = ? 
             ORDER BY mp.slot_no ASC`,
            [req.params.id]
        );
        res.json({ success: true, participants: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Join match
router.post('/:id/join', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please login to join.' });
    }

    const matchId = req.params.id;
    const userId = req.session.user.id;
    const { ff_uid, ff_name } = req.body;

    try {
        const [matchRows] = await pool.query('SELECT * FROM matches WHERE id = ?', [matchId]);
        if (matchRows.length === 0) return res.status(404).json({ success: false, message: 'Match not found.' });

        const match = matchRows[0];
        if (match.status !== 'upcoming') return res.status(400).json({ success: false, message: 'Match is no longer open for registration.' });
        if (match.filled_slots >= match.slots) return res.status(400).json({ success: false, message: 'Match is full.' });

        const [userRows] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);
        const user = userRows[0];

        if (parseFloat(user.balance) < parseFloat(match.entry_fee)) {
            return res.status(400).json({ success: false, message: 'Insufficient balance.' });
        }

        const [existingRows] = await pool.query('SELECT id FROM joinners WHERE match_id = ? AND user_id = ?', [matchId, userId]);
        if (existingRows.length > 0) return res.status(409).json({ success: false, message: 'Already joined this match.' });

        // Deduct entry fee and add participant
        await pool.query('UPDATE users SET balance = balance - ? WHERE id = ?', [match.entry_fee, userId]);
        await pool.query('UPDATE matches SET filled_slots = filled_slots + 1 WHERE id = ?', [matchId]);
        
        const slotNo = match.filled_slots + 1;
        await pool.query(
            'INSERT INTO joinners (match_id, user_id, ff_uid, ff_name, slot_no) VALUES (?, ?, ?, ?, ?)',
            [matchId, userId, ff_uid || null, ff_name || null, slotNo]
        );

        if (parseFloat(match.entry_fee) > 0) {
            await pool.query(
                'INSERT INTO transactions (user_id, type, amount, status, reference, note) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, 'entry_fee', match.entry_fee, 'completed', `MATCH-${matchId}`, `Entry fee for ${match.title}`]
            );
        }

        // Update session balance
        req.session.user.balance = parseFloat(user.balance) - parseFloat(match.entry_fee);

        res.json({ success: true, message: 'Successfully joined the match!', slot: slotNo });
    } catch (err) {
        console.error('Join match error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Stats
router.get('/stats/overview', async (req, res) => {
    try {
        const [[{ total_players }]] = await pool.query('SELECT COUNT(*) as total_players FROM users');
        const [[{ total_matches }]] = await pool.query('SELECT COUNT(*) as total_matches FROM matches WHERE status = "completed"');
        res.json({ success: true, stats: { total_players: total_players + 15000, total_matches: total_matches + 1800 } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
