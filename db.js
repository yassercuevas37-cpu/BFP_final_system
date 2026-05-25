require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
    dialectOptions: process.env.DB_DIALECT === 'mysql' && process.env.DB_SSL === 'true' ? {
      ssl: {
        rejectUnauthorized: false
      }
    } : {},
    storage: process.env.DB_DIALECT === 'sqlite' 
      ? path.join(__dirname, process.env.DB_NAME || 'database.sqlite') 
      : null
  }
);

module.exports = sequelize;
