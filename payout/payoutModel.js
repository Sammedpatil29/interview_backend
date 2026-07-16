const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Payout = sequelize.define('Payout', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  interviewerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Interviewers', // This is the table name Sequelize creates
      key: 'id',
    },
  },
  interviewerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  upiId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  utrId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
  },
});

module.exports = Payout;