const mysql = require("mysql");
const { Client } = require("pg");

class SQLConnector {
  constructor() {
    this.dbConnection = null;
  }

  async connect({ dbType, host, port, user, password, database }) {
    if (!dbType || !host || !user || !password) {
      throw new Error("All fields are required");
    }

    try {
      if (dbType === "mysql") {
        this.dbConnection = mysql.createConnection({
          host,
          port: port || 3306,
          user,
          password,
        });

        return new Promise((resolve, reject) => {
          this.dbConnection.connect((err) => {
            if (err) {
              return reject(new Error("Invalid credentials"));
            }
            resolve("MySQL DB Connected");
          });
        });
      } else if (dbType === "postgresql") {
        this.dbConnection = new Client({
          host,
          port: port || 5432,
          user,
          password,
          database,
        });

        await this.dbConnection.connect();
        return "PostgreSQL DB Connected";
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async query(queryString) {
    if (!this.dbConnection) {
      throw new Error("Not connected to a database");
    }

    return new Promise((resolve, reject) => {
      this.dbConnection.query(queryString, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }

  async disconnect() {
    if (this.dbConnection) {
      if (this.dbConnection.end) {
        this.dbConnection.end();
      } else if (this.dbConnection.close) {
        await this.dbConnection.close();
      }
    }
  }
}

module.exports = SQLConnector;
