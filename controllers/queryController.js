const WebSocket = require("ws");
require("dotenv").config();
const SQLConnector = require("../utils/dbConnectorClass");
const axios = require("axios");
const { sendStatusToUser, connections } = require("../utils/wsController");

const sqlConnector = new SQLConnector();
let isDatabaseConnected = false; // Default to false at the start
const WS_PORT = process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: WS_PORT });
let lastCheckTime = null;
const connectionUserMap = new Map();
const userConnectionsMap = new Map();

const connectDatabase = async (req, res) => {
  const { dbType, host, port, user, password, database, connectionId } =
    req.body;

  console.log({ dbType, host, port, user, password, database, connectionId });

  if (!dbType || !host || !user || !password || !connectionId) {
    return res
      .status(400)
      .json({ success: false, data: "Missing required parameters" });
  }

  try {
    const message = await sqlConnector.connect({
      connectionId,
      dbType,
      host,
      port,
      user,
      password,
      database,
    });

    return res.json({ success: true, data: message });
  } catch (error) {
    console.error("Database Connection Error:", error.message);
    return res.status(400).json({ success: false, data: error.message });
  }
};

// Disconnect from the database
const disconnectDatabase = async (req, res) => {
  try {
    const { id } = req.body;
    const message = await sqlConnector.disconnect(id);
    isDatabaseConnected = false;
    return res.json({ success: true, data: message });
  } catch (error) {
    console.error("Database Disconnection Error:", error.message);
    return res.status(400).json({ success: false, data: error.message });
  }
};

// Run a database query
const runQuery = async (req, res) => {
  const { query, connectionId } = req.body;
  console.log(req.body);
  if (!query) {
    return res.status(400).json({ success: false, data: "Query is required" });
  }

  try {
    const results = await sqlConnector.query(connectionId, query);
    return res.json({ success: true, data: results });
  } catch (error) {
    const response = error.message.includes("Not connected to a database")
      ? {
          status: 503,
          data: "Database connection not established. Please try again later.",
        }
      : { status: 500, data: error };

    return res
      .status(response.status)
      .json({ success: false, data: response.data });
  }
};

// Fetch columns from the specified table
const fetchColumnsFromDB = async (tableName, connId) => {
  try {
    const fetchColumnsQuery = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`;
    const res = await sqlConnector.query(connId, fetchColumnsQuery);

    if (!res || res.length === 0) {
      throw new Error(`No columns found for table: ${tableName}`);
    }
    return res.reduce((acc, row) => {
      acc[row.COLUMN_NAME] = row.DATA_TYPE;
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching columns:", error.message);
    throw new Error("Failed to fetch columns from the database.");
  }
};

// Generate a SQL query based on a natural query and table name
const generateQuery = async (req, res) => {
  const { naturalQuery, tableName, connId } = req.body;

  if (!naturalQuery || !tableName) {
    return res.status(400).json({
      success: false,
      data: "Both naturalQuery and tableName are required.",
    });
  }

  try {
    const columns = await fetchColumnsFromDB(tableName, connId);

    const fastApiUrl = process.env.FASTAPI_URL;
    if (!fastApiUrl) {
      return res.status(500).json({
        success: false,
        data: "FastAPI URL is not configured in environment variables.",
      });
    }

    const fastApiResponse = await axios.post(`${fastApiUrl}/process-query`, {
      natural_query: naturalQuery,
      table_name: tableName,
      columns: columns,
    });

    const { sql_query: sqlQuery } = fastApiResponse.data;
    if (!sqlQuery) {
      throw new Error("Failed to generate SQL query from FastAPI.");
    }

    return res.json({ success: true, query: sqlQuery });
  } catch (error) {
    console.error("Error in Query Generation:", error.message);
    const errorMessage = error.response
      ? `FastAPI Error: ${error}`
      : "Failed to process the request.";
    return res.status(500).json({ success: false, data: errorMessage });
  }
};

module.exports = {
  connectDatabase,
  runQuery,
  disconnectDatabase,
  generateQuery,
};
