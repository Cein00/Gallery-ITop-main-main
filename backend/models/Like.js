const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  work: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'superLike'], default: 'like' }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

likeSchema.index({ work: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
