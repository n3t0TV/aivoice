const { Sequelize, DataTypes } = require("sequelize");
const { db } = require('../connection');
const sequelize = db.sequelize;

const store = sequelize.define("store", 

  {
    id: {
      type: DataTypes.BIGINT(20),
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    zipcode: {
      type: DataTypes.INTEGER(),
      allowNull: false,
      unique: true
    },
  },
  {
    initialAutoIncrement: 1000,
  });

module.exports = store;