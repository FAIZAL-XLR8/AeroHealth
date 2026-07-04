const redisClient = require('../config/redisClient');

const apiRateLimiter = (options = {}) => {
  const {
    windowSeconds = 10,
    keyPrefix = 'rateLimit',
    statusCode = 429,
    message = 'Rate limit exceeded. Try again after 10 seconds.'
  } = options;

  return async (req, res, next) => {
    const identifier = req.user ? req.user._id.toString() : req.ip;
    const redisKey = `${keyPrefix}:${identifier}:${req.originalUrl || req.path}`;

    try {
      const exists = await redisClient.exists(redisKey);

      if (exists) {
        return res.status(statusCode).json({ message });
      }

      await redisClient.set(redisKey, 'cooldown_active', {
        EX: windowSeconds,
        NX: true
      });

      next();
    } catch (err) {
      next();
    }
  };
};

module.exports = apiRateLimiter;
