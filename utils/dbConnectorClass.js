const mysql = require("mysql2/promise");
const { Pool: PgPool } = require("pg");

class SQLConnector {
  constructor() {
    this.connections = new Map(); // Stores active connections
    this.mysqlPools = new Map(); // MySQL connection pools
    this.pgPools = new Map(); // PostgreSQL connection pools
  }

  async connect({ connectionId, dbType, ...dbOptions }) {
    if (!dbType || !connectionId) {
      throw new Error("Database type and connection ID are required");
    }

    if (this.connections.has(connectionId)) {
      throw new Error(`Connection with ID ${connectionId} already exists`);
    }

    let dbConnection;

    if (dbType === "mysql") {
      const pool = mysql.createPool({
        ...dbOptions,
        port: dbOptions.port || 3306,
        connectionLimit: dbOptions.connectionLimit || 10,
        multipleStatements: true,
      });

      try {
        const connection = await pool.getConnection();
        console.log(`MySQL Connected (Thread ID: ${connection.threadId})`);
        connection.release();
      } catch (err) {
        throw new Error("MySQL connection failed: " + err.message);
      }

      this.mysqlPools.set(connectionId, pool);
      dbConnection = pool;
    } else if (dbType === "postgresql") {
      const pool = new PgPool({
        ...dbOptions,
        port: dbOptions.port || 5432,
      });

      try {
        const client = await pool.connect();
        console.log("PostgreSQL Connected");
        client.release();
      } catch (err) {
        throw new Error("PostgreSQL connection failed: " + err.message);
      }

      this.pgPools.set(connectionId, pool);
      dbConnection = pool;
    } else {
      throw new Error("Unsupported database type");
    }

    this.connections.set(connectionId, dbConnection);
    return `Connection established with ${dbType} (Connection ID: ${connectionId})`;
  }

  async query(connectionId, queryString) {
    const dbConnection = this.connections.get(connectionId);
    if (!dbConnection) {
      throw new Error(`No connection found with ID ${connectionId}`);
    }

    try {
      if (this.mysqlPools.has(connectionId)) {
        const [results] = await dbConnection.query(queryString);
        return results;
      } else if (this.pgPools.has(connectionId)) {
        const result = await dbConnection.query(queryString);
        return result.rows;
      }
    } catch (err) {
      throw new Error(`Query execution failed: ${err.message}`);
    }
  }

  async disconnect(connectionId) {
    const dbConnection = this.connections.get(connectionId);
    if (!dbConnection) {
      throw new Error(`No connection found with ID ${connectionId}`);
    }

    try {
      if (this.mysqlPools.has(connectionId)) {
        await dbConnection.end();
        this.mysqlPools.delete(connectionId);
      } else if (this.pgPools.has(connectionId)) {
        await dbConnection.end();
        this.pgPools.delete(connectionId);
      }
    } finally {
      this.connections.delete(connectionId);
    }

    return `Connection ID ${connectionId} closed`;
  }
}

module.exports = SQLConnector;
