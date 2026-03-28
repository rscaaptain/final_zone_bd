require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, pool } = require('./db/database');

const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const resultRoutes = require('./routes/results');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'finalzonebd_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/results', resultRoutes);

app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT setting_name, setting_value FROM settings');
        if (rows.length > 0) {
            let settings = {};
            rows.forEach(r => { settings[r.setting_name] = r.setting_value });
            res.json({ success: true, settings });
        } else {
            res.json({ success: true, settings: { site_name: '', site_logo: '/uploads/settings/logo.png', fav_icon: '/uploads/settings/favicon.ico' } });
        }
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/sliders', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sliders WHERE is_active = 1 ORDER BY id DESC');
        res.json({ success: true, sliders: rows });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY id ASC');
        res.json({ success: true, categories: rows });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/notices', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM notices WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
        res.json({ success: true, notice: rows.length > 0 ? rows[0] : null });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});


async function serveHtml(res, filename) {
    try {
        const [rows] = await pool.query('SELECT setting_name, setting_value FROM settings');
        let s = { site_name: '', site_logo: '/uploads/settings/logo.png', fav_icon: '/uploads/settings/favicon.ico' };
        if (rows.length > 0) rows.forEach(r => { s[r.setting_name] = r.setting_value; });
        let html = fs.readFileSync(path.join(__dirname, 'public', filename), 'utf8');
        html = html
            .replace(/%%SITE_NAME%%/g, s.site_name)
            .replace(/%%SITE_LOGO%%/g, s.site_logo)
            .replace(/%%FAV_ICON%%/g, s.fav_icon);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        res.sendFile(path.join(__dirname, 'public', filename));
    }
}

app.get('/home', (req, res) => serveHtml(res, 'home.html'));
app.get('/results', (req, res) => serveHtml(res, 'results.html'));
app.get('/login', (req, res) => serveHtml(res, 'login.html'));
app.get('/register', (req, res) => serveHtml(res, 'register.html'));
app.get('/profile', (req, res) => serveHtml(res, 'profile.html'));
app.get('/', (req, res) => serveHtml(res, 'index.html'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initializeDatabase().then(async () => {
    let siteName = '';
    try {
        const [rows] = await pool.query("SELECT setting_value FROM settings WHERE setting_name = 'site_name' LIMIT 1");
        if (rows.length > 0) siteName = rows[0].setting_value;
    } catch (e) {}
    app.listen(PORT, () => {
        console.log(`🎮 ${siteName} running on http://localhost:${PORT}`);
    });
});
