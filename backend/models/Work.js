const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: null, trim: true },
  description: { type: String, default: null },
  link: { type: String, default: null },
  images: { type: [String], default: [] }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

module.exports = mongoose.model('Work', workSchema);
