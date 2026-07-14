const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const { hashPassword } = require('../utils/bcrypt');

const Candidate = sequelize.define('Candidate', {

    name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    role: {
        type: DataTypes.STRING,
        defaultValue: 'candidate'
    },

    email: {
        type: DataTypes.STRING,
        unique: false
    },

    contact: DataTypes.STRING,

    password: DataTypes.STRING,

    skills: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },

    resume: DataTypes.STRING,

    amountSpent: {
        type: DataTypes.DECIMAL,
        defaultValue: 0
    },

    type: {
        type: DataTypes.ENUM(
            'fresher',
            'intermediate',
            'expert'
        ),
        defaultValue: 'fresher'
    },

    yearsOfExperience: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },

    profileUrl: DataTypes.STRING

    // passwordResetToken: DataTypes.STRING,
    // passwordResetExpires: DataTypes.DATE

});

Candidate.beforeCreate(async (candidate) => {
  if (candidate.password) {
    candidate.password = await hashPassword(candidate.password);
  }
});

Candidate.beforeUpdate(async (candidate) => {
  if (candidate.changed('password')) {
    candidate.password = await hashPassword(candidate.password);
  }
});


module.exports = Candidate;