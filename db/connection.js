const Sequelize = require('sequelize');
const config = require('./config');
const mysql = require('mysql2');

var db = {};
module.exports = { db };

let { host, port, user, password, database } = config.database;

const currentDir = process.cwd();
if (currentDir.includes('/mnt/c') || currentDir.includes('C:'))//Running localhost use dev host
{
  host = config.database.hostdev;
}

var connection = config.database.connect;
try {


  const pool = mysql.createPool({ host, port, user, password });
  //cambiariamos connection si se logra hacer


  //console.log(pool);
  // if (connection) {
    pool.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

    const sequelize = new Sequelize(`mysql://${user}:${password}@${host}/${database}`, {
      dialect: "mysql",
      dialectOptions: {
        connectTimeout: 60000,
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    db.sequelize = sequelize;
    db.productRequest = require('./models/productRequest.js');
    db.store = require('./models/store');
    db.orderList = require('./models/orderList');
    sequelize.sync();
  // }


}
catch (err) {
  console.log('Unable to connect to database!');
}
