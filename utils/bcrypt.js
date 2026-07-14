const bcrypt = require('bcrypt');

const saltRounds = 10; // The cost factor for hashing

exports.hashPassword = (password) => bcrypt.hash(password, saltRounds);

exports.comparePassword = (password, hash) => bcrypt.compare(password, hash);