const mysql = require("mysql");
const { Client } = require("pg");

class SQLConnector {
  constructor() {
    this.dbConnection = null;
  }

  async connect({ dbType, ...dbOptions }) {
    if (!dbType) {
      throw new Error("Database type is required");
    }
    try {
      if (dbType === "mysql") {
        this.dbConnection = mysql.createConnection({
          ...dbOptions,
          port: dbOptions.port || 3306,
        });

        return new Promise((resolve, reject) => {
          this.dbConnection.connect((err) => {
            if (err) {
              return reject(new Error("MySQL connection failed: " + err.message));
            }
            resolve(`MySQL DB Connected with ThreadId ${this.dbConnection?.threadId}`);
          });
        });
      } else if (dbType === "postgresql") {
        this.dbConnection = new Client({
          ...dbOptions,
          port: dbOptions.port || 5432,
        });

        await this.dbConnection.connect();
        return "PostgreSQL DB Connected";
      } else {
        throw new Error("Unsupported database type");
      }
    } catch (error) {
      throw new Error(`Database connection error: ${error.message}`);
    }
  }

  async query(queryString) {
    if (!this.dbConnection) {
      throw new Error("Not connected to a database");
    }

    if (this.dbConnection.ping) {
      try {
        await new Promise((resolve, reject) =>
          this.dbConnection.ping((err) => (err ? reject(err) : resolve()))
        );
      } catch {
        throw new Error("Lost connection to the database");
      }
    }

    return new Promise((resolve, reject) => {
      this.dbConnection.query(queryString, (err, results) => {
        if (err) {
          return reject(new Error("Query execution failed: " + err.message));
        }
        resolve(results);
      });
    });
  }

  async disconnect() {
    if (this.dbConnection) {
      try {
        if (this.dbConnection.end) {
          this.dbConnection.end();
        } else if (this.dbConnection.close) {
          await this.dbConnection.close();
        }
      } catch (err) {
        console.error("Error while disconnecting:", err.message);
      } finally {
        this.dbConnection = null;
      }
    }
  }

  async isConnected() {
    if (!this.dbConnection) {
      return false;
    }
  
    if (this.dbConnection.ping) {
      try {
        await new Promise((resolve, reject) =>
          this.dbConnection.ping((err) => (err ? reject(err) : resolve()))
        );
        return true;
      } catch {
        return false;
      }
    } else if (this.dbConnection instanceof Client) {
      try {
        await this.dbConnection.query("SELECT 1");
        return true;
      } catch {
        return false;
      }
    }
  
    return false;
  }
  
}

module.exports = SQLConnector;
