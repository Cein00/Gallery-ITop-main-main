const mongoose = require('mongoose');

const contactsSchema = new mongoose.Schema({
  github: { type: String, default: null },
  email: { type: String, default: null },
  tg: { type: String, default: null },
  phone: { type: String, default: null }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['Программист', 'Дизайнер', 'Преподаватель'],
    default: 'Программист'
  },
  avatar: { type: String, default: null },
  contacts: { type: contactsSchema, default: {} }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

module.exports = mongoose.model('User', userSchema);
