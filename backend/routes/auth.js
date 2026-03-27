const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function normalizeRole(role) {
  if (role === 'Учитель') return 'Преподаватель';
  if (['Программист', 'Дизайнер', 'Преподаватель'].includes(role)) return role;
  return 'Программист';
}

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    role: user.role,
    avatar: user.avatar,
    contacts: user.contacts
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { username, password, role, avatar, contacts } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Нужно указать логин и пароль' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      passwordHash,
      role: normalizeRole(role),
      avatar: avatar || null,
      contacts: contacts || {}
    });

    const token = signToken(user);

    res.status(201).json({
      message: 'Регистрация успешна',
      token,
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка регистрации', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Неверный логин или пароль' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: 'Неверный логин или пароль' });
    }

    const token = signToken(user);

    res.json({
      message: 'Вход выполнен',
      token,
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка входа', error: error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения профиля', error: error.message });
  }
});

module.exports = router;
