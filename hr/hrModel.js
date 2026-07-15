const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const { hashPassword } = require('../utils/bcrypt');

const Hr = sequelize.define('Hr', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'hr',
  },
  profileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

Hr.beforeCreate(async (hr) => {
  if (hr.password) {
    hr.password = await hashPassword(hr.password);
  }
});

Hr.beforeUpdate(async (hr) => {
  if (hr.changed('password')) {
    hr.password = await hashPassword(hr.password);
  }
});

module.exports = Hr;