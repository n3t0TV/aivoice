const { Sequelize, DataTypes } = require("sequelize");
const { db } = require('../connection');
const sequelize = db.sequelize;

const orderList = sequelize.define("orderList",
  {
    customerNumber: {
      type: DataTypes.BIGINT(20),
      allowNull: false,
    },
    storeNumber: {
      type: DataTypes.BIGINT(20),
      allowNull: false,
    },
    datetime: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    storemap: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    products: {
      type: DataTypes.TEXT(),
      allowNull: true,
      get() {
        const value = this.getDataValue('products');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('products', value ? JSON.stringify(value) : null);
      },
    },
  });

module.exports = orderList;