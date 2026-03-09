const config = require('../config');

/**
 * Validates the API key in headers to prevent unauthorized uploads.
 */
function protect(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'A valid API key is required to perform this action.',
    });
  }

  next();
}

/**
 * Basic rate limiting to prevent abuse.
 * In a real production environment, use a library like rate-limiter-flexible with Redis.
 */
const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 uploads
  duration: 60, // per 60 seconds
});

async function rateLimitMiddleware(req, res, next) {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({ error: 'Too Many Requests', message: 'Rate limit exceeded. Try again later.' });
  }
}

module.exports = {
  protect,
  rateLimitMiddleware,
};
