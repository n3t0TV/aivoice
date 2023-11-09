const { Sequelize, DataTypes } = require("sequelize");
const { db } = require('../connection');
const sequelize = db.sequelize;

const productRequest = sequelize.define("productRequest", {
  request: {
    allowNull: false,
    type: DataTypes.TEXT('long'),
  },
  response: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  source: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    allowNull: false
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

module.exports = productRequest;