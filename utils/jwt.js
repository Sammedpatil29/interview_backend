const jwt = require('jsonwebtoken');

/**
 * Generates a JSON Web Token.
 * @param {object} payload - The payload to include in the token.
 * @returns {string} The generated JWT.
 */
exports.generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};