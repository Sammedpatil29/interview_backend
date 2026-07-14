const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // Import the shared Sequelize instance

const Interview = sequelize.define('Interview', {
  candidateName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  candidateEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  experienceLevel: {
    type: DataTypes.ENUM('fresher', 'intermediate', 'expert'),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // e.g., 'front', 'back', 'fullstack'
    allowNull: false,
  },
  skills: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  resume: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
  slots: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  schedule: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  hr: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  interviewer: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  payment: {
    type: DataTypes.ENUM('paid', 'pending', 'failed'),
    defaultValue: 'pending',
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  interviewerShare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  timeline: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  meetingUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
  candidateId: {
    type: DataTypes.INTEGER,
    allowNull: false, // Can be set to false if every interview MUST have a candidate
    references: {
      model: 'Candidates', // This is the table name Sequelize creates for the Candidate model
      key: 'id',
    },
  },
});

module.exports = Interview;