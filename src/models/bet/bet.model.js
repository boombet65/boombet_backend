// models/bet/bet.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Bet = sequelize.define('Bet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  ticket_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  stake: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 1.00
    }
  },
  total_odds: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  possible_win: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  tax: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  payout: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'SETTLED'), // <-- Simplified to just PENDING or SETTLED
    allowNull: false,
    defaultValue: 'PENDING',
  },
  result: {
    type: DataTypes.ENUM('OPEN', 'WON', 'LOST', 'CANCELLED'), // <-- New field for actual result
    allowNull: false,
    defaultValue: 'OPEN',
  },
  placed_via: {
    type: DataTypes.ENUM('DIRECT', 'BOOKING_CODE'),
    allowNull: false,
    defaultValue: 'DIRECT',
  },
  booking_code_used: {
    type: DataTypes.STRING(10),
    allowNull: true,
  }
}, {
  tableName: 'bets',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['ticket_code'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['result'] } // <-- Add index for result field
  ]
});

module.exports = Bet;