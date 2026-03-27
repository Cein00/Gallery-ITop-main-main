const jwt = require('jsonwebtoken');

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return req.headers['x-auth-token'] || null;
}

module.exports = function auth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: 'Нет токена' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Токен недействителен' });
  }
};
