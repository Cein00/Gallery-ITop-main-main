require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workRoutes = require('./routes/works');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('MONGO_URI =', process.env.MONGO_URI);
console.log('JWT_SECRET =', process.env.JWT_SECRET);

connectDB();

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use(morgan('dev'));

// раздаём статические файлы из корня проекта
app.use('/img', express.static(path.join(__dirname, '..', 'img')));
app.use('/style1', express.static(path.join(__dirname, '..', 'style1')));
app.use('/settings', express.static(path.join(__dirname, '..', 'settings')));
app.use('/search', express.static(path.join(__dirname, '..', 'search')));
app.use('/profile', express.static(path.join(__dirname, '..', 'profile')));
app.use('/registration', express.static(path.join(__dirname, '..', 'registration')));
app.use('/upload', express.static(path.join(__dirname, '..', 'upload')));
app.use('/top', express.static(path.join(__dirname, '..', 'top')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// файлы из корня
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Gallery API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/works', workRoutes);

// главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});