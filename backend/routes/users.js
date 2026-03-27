const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.put('/me', auth, async (req, res) => {
  try {
    const { username, role, avatar, password, passwordConfirm, contacts } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

    if (username && username !== user.username) {
      const exists = await User.findOne({ username });
      if (exists) return res.status(400).json({ message: 'Этот логин уже занят' });
      user.username = username.trim();
    }

    if (role) {
      user.role = role === 'Учитель' ? 'Преподаватель' : role;
    }

    if (avatar !== undefined) user.avatar = avatar || null;

    if (contacts && typeof contacts === 'object') {
      user.contacts = {
        github: contacts.github || null,
        email: contacts.email || null,
        tg: contacts.tg || null,
        phone: contacts.phone || null
      };
    }

    if (password || passwordConfirm) {
      if (!password || !passwordConfirm) {
        return res.status(400).json({ message: 'Пароль и подтверждение должны быть заполнены' });
      }
      if (password !== passwordConfirm) {
        return res.status(400).json({ message: 'Пароли не совпадают' });
      }
      if (String(password).length < 4) {
        return res.status(400).json({ message: 'Пароль слишком короткий' });
      }
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    const saved = await User.findById(user._id).select('-passwordHash');
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обновления профиля', error: error.message });
  }
});

module.exports = router;
