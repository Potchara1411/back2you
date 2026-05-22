function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'This function is only for the admin user.' });
  }
  next();
}

module.exports = adminMiddleware;
