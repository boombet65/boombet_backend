const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const BookingCode = sequelize.define('BookingCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  selections: {
    type: DataTypes.JSON,
    allowNull: false, // Array ya: [{ match_id, market_key, outcome_key, odds }]
  },
  total_odds: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  }
}, {
  tableName: 'booking_codes',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['code'] },
    { fields: ['creator_id'] },
    { fields: ['is_active'] },
    { fields: ['expires_at'] }
  ]
});

module.exports = BookingCode;