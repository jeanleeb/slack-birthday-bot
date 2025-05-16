const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

// Model for storing user birthdays
const Birthday = sequelize.define('Birthday', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  birthdate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
});

// Model for storing bot configuration (like which channel to post to)
const Config = sequelize.define('Config', {
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// Initialize the database
const initDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized');

    // Set default config if it doesn't exist
    const birthdayChannel = await Config.findByPk('birthdayChannel');
    if (!birthdayChannel) {
      await Config.create({
        key: 'birthdayChannel',
        value: 'general', // Default channel
      });
      console.log('Default birthday channel set to #general');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};

module.exports = {
  Birthday,
  Config,
  initDatabase,
};
