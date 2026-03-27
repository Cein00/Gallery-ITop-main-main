const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  work: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

module.exports = mongoose.model('Comment', commentSchema);
