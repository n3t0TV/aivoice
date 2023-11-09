const config = require('./config.js');

const Mysql = require('mysql');

const currentDir = process.cwd();

const connection = {};

if (currentDir.includes('/mnt/c') || currentDir.includes('C:'))//Running localhost use dev host
{
  config.database.host = config.database.hostdev;
}

//add ssl configuration
config.database.ssl = true;
// {
//   ca: fs.readFileSync('/path/to/ca.pem'), // Path to your CA certificate file
//   cert: fs.readFileSync('/path/to/client-cert.pem'), // Path to your client certificate file
//   key: fs.readFileSync('/path/to/client-key.pem'), // Path to your client private key file
// };

function connect() {
  console.log('Connectig MYSQL');
  const con = Mysql.createConnection(config.database);
  const del = con._protocol._delegateError;
  con._protocol._delegateError = function (err, sequence) {
    if (err.fatal) {
      connection.end(() => {
        connection.con.destroy();
        connect();
      });

      return del.call(this, err, sequence);
      ;
    }
    return del.call(this, err, sequence);
  };
  con.call = function (SP, ...params) {
    const promise = new Promise((resolve, reject) => {
      let query = `CALL ${SP}(`;
      for (let p = 0; p < params.length; p++) {
        query += `'${params[p]}'`;
        if (p < params.length - 1) {
          query += ',';
        }
      }
      query += ');';
      con.query(query, params, (err, response) => {
        if (err) {
          return reject(err);
        }
        resolve(response[0]);
      });
    });
    promise.catch(console.error);
    return promise;
  }

  con.asyncQuery = function (query, params) {
    return new Promise((resolve, reject) => {
      con.query(query, params, (err, response) => {
        if (err) {
          return reject(err);
        }
        resolve(response);
      });
    });
  }

  connection.con = con;
  connection.call = con.call.bind(con);
  connection.query = con.query.bind(con);
  connection.asyncQuery = con.asyncQuery.bind(con);
  connection.end = con.end.bind(con);
}


connect();

module.exports = connection;