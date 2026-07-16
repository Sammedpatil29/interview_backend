const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const { hashPassword } = require('../utils/bcrypt');

const Interviewer = sequelize.define('Interviewer', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'interviewer',
  },
  experience: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  transactions: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  skills: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  withDrawRequests: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  wallet: {
    type: DataTypes.JSONB,
    defaultValue: { balance: 0, pending: 0, withdrawn: 0 },
  },
  profileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  upi: {
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

Interviewer.beforeCreate(async (interviewer) => {
  if (interviewer.password) {
    interviewer.password = await hashPassword(interviewer.password);
  }
});

Interviewer.beforeUpdate(async (interviewer) => {
  if (interviewer.changed('password')) {
    interviewer.password = await hashPassword(interviewer.password);
  }
});

module.exports = Interviewer;