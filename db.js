const { Sequelize } = require('sequelize');
require('dotenv').config();

const options = {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT || 'postgres',
  port: process.env.DB_PORT || 5432,
  logging: false,
  dialectOptions: {},
};

if (process.env.DB_SSL === 'true') {
  options.dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false,
  };
}

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, options);

module.exports = sequelize;