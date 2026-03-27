const express = require('express');
const Work = require('../models/Work');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

const router = express.Router();

function mapWork(work, likesCount = 0, commentsCount = 0, likedByMe = false, likeType = null) {
  const plain = work.toObject ? work.toObject() : work;
  return {
    ...plain,
    likesCount,
    commentsCount,
    likedByMe,
    likeType
  };
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { mine, userId } = req.query;
    const filter = {};

    if (mine === '1') {
      if (!req.user) return res.json([]);
      filter.user = req.user.id;
    }

    if (userId) filter.user = userId;

    const works = await Work.find(filter)
      .populate('user', 'username role avatar')
      .sort({ createdAt: -1 });

    const result = await Promise.all(works.map(async (work) => {
      const [likesCount, commentsCount, likedDoc] = await Promise.all([
        Like.countDocuments({ work: work._id }),
        Comment.countDocuments({ work: work._id }),
        req.user ? Like.findOne({ work: work._id, user: req.user.id }) : null
      ]);

      return mapWork(work, likesCount, commentsCount, !!likedDoc, likedDoc?.type || null);
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки работ', error: error.message });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const work = await Work.findById(req.params.id).populate('user', 'username role avatar');
    if (!work) return res.status(404).json({ message: 'Работа не найдена' });

    const [comments, likesCount, likedDoc] = await Promise.all([
      Comment.find({ work: work._id })
        .populate('user', 'username avatar role')
        .sort({ createdAt: 1 }),
      Like.countDocuments({ work: work._id }),
      req.user ? Like.findOne({ work: work._id, user: req.user.id }) : null
    ]);

    res.json({
      work: mapWork(work, likesCount, comments.length, !!likedDoc, likedDoc?.type || null),
      comments
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения работы', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, link, images } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'Нужно загрузить хотя бы одно изображение' });
    }

    const work = await Work.create({
      user: req.user.id,
      title: title || null,
      description: description || null,
      link: link || null,
      images
    });

    const populated = await work.populate('user', 'username role avatar');
    res.status(201).json(mapWork(populated));
  } catch (error) {
    res.status(500).json({ message: 'Ошибка создания работы', error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ message: 'Работа не найдена' });

    if (String(work.user) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Можно редактировать только свою работу' });
    }

    const { title, description, link, images } = req.body;

    if (title !== undefined) work.title = title;
    if (description !== undefined) work.description = description;
    if (link !== undefined) work.link = link;
    if (Array.isArray(images) && images.length > 0) work.images = images;

    await work.save();

    const populated = await Work.findById(work._id).populate('user', 'username role avatar');
    res.json(mapWork(populated));
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обновления работы', error: error.message });
  }
});

router.get('/top/authors', async (req, res) => {
  try {
    const topAuthors = await Work.aggregate([
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'work',
          as: 'likes'
        }
      },
      {
        $group: {
          _id: '$user',
          totalLikes: { $sum: { $size: '$likes' } },
          worksCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalLikes: -1, worksCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          username: '$user.username',
          role: '$user.role',
          avatar: '$user.avatar',
          totalLikes: 1,
          worksCount: 1
        }
      }
    ]);

    res.json(topAuthors);
  } catch (error) {
    console.error('TOP AUTHORS ERROR:', error);
    res.status(500).json({
      message: 'Ошибка загрузки топа авторов',
      error: error.message
    });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return res.status(404).json({ message: 'Работа не найдена' });

    if (String(work.user) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Можно удалять только свою работу' });
    }

    await Comment.deleteMany({ work: work._id });
    await Like.deleteMany({ work: work._id });
    await work.deleteOne();

    res.json({ message: 'Работа удалена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления работы', error: error.message });
  }
});

router.post('/:id/like', auth, async (req, res) => {
  try {
    const workId = req.params.id;
    const type = req.body.type === 'superLike' ? 'superLike' : 'like';

    const existing = await Like.findOne({ work: workId, user: req.user.id });

    if (existing) {
      if (existing.type === type) {
        await existing.deleteOne();
      } else {
        existing.type = type;
        await existing.save();
      }
    } else {
      await Like.create({ work: workId, user: req.user.id, type });
    }

    const likesCount = await Like.countDocuments({ work: workId });
    const likedDoc = await Like.findOne({ work: workId, user: req.user.id });

    res.json({
      ok: true,
      likesCount,
      likedByMe: !!likedDoc,
      likeType: likedDoc?.type || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка лайка', error: error.message });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ work: req.params.id })
      .populate('user', 'username avatar role')
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки комментариев', error: error.message });
  }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Комментарий не может быть пустым' });
    }

    const comment = await Comment.create({
      work: req.params.id,
      user: req.user.id,
      text: text.trim()
    });

    const populated = await comment.populate('user', 'username avatar role');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка отправки комментария', error: error.message });
  }
});

module.exports = router;
