const axios = require("axios");
const { sendStatusToUser } = require("../utils/wsController");
const SQLConnector = require("../utils/dbConnectorClass");
require("dotenv").config();

const sqlConnector = new SQLConnector();
let isDatabaseConnected = false;
let lastCheckTime = null;

const connectDatabase = async (req, res) => {
  const { dbType, host, port, user, password, database } = req.body;

  try {
    const message = await sqlConnector.connect({
      dbType, host, port, user, password, database
    });
    isDatabaseConnected = true;
    sendStatusToUser("connected");
    return res.json({ success: true, data: message });
  } catch (error) {
    console.error("Database Connection Error:", error.message);
    isDatabaseConnected = false;
    sendStatusToUser("disconnected");
    return res.status(400).json({ success: false, data: error.message });
  }
};

const disconnectDatabase = async (req, res) => {
  try {
    const message = await sqlConnector.disconnect();
    isDatabaseConnected = false;
    sendStatusToUser("disconnected");
    return res.json({ success: true, data: message });
  } catch (error) {
    console.error("Database Disconnection Error:", error.message);
    return res.status(400).json({ success: false, data: error.message });
  }
};

const runQuery = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ success: false, data: "Query is required" });
  }

  try {
    const results = await sqlConnector.query(query);
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error("Query Execution Error:", error.message);
    const response = error.message.includes("Not connected to a database")
      ? { status: 503, data: "Database connection not established. Please try again later." }
      : { status: 500, data: "Failed to execute query." };
    return res.status(response.status).json({ success: false, data: response.data });
  }
};

const fetchColumnsFromDB = async (tableName) => {
  try {
    const fetchColumnsQuery = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`;
    const res = await sqlConnector.query(fetchColumnsQuery);

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

const generateQuery = async (req, res) => {
  const { naturalQuery, tableName } = req.body;

  if (!naturalQuery || !tableName) {
    return res.status(400).json({
      success: false,
      data: "Both naturalQuery and tableName are required.",
    });
  }

  try {
    const columns = await fetchColumnsFromDB(tableName);
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
      ? `FastAPI Error: ${error.response.data.detail}`
      : "Failed to process the request.";
    return res.status(500).json({ success: false, data: errorMessage });
  }
};

const getConnectionStatus = async (req, res) => {
  try {
    const currentStatus = await sqlConnector.isConnected();
    res.json({
      success: true,
      status: currentStatus ? "connected" : "disconnected",
      lastChecked: lastCheckTime,
      storedStatus: isDatabaseConnected,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      lastChecked: lastCheckTime,
    });
  }
};

const checkDatabaseConnection = async () => {
  try {
    const currentStatus = await sqlConnector.isConnected();
    lastCheckTime = new Date().toISOString();
    isDatabaseConnected = currentStatus;
    sendStatusToUser(currentStatus ? "connected" : "disconnected");
  } catch (error) {
    console.error("Database Status Check Error:", error.message);
    isDatabaseConnected = false;
    sendStatusToUser("disconnected");
  }
};

checkDatabaseConnection();
setInterval(checkDatabaseConnection, 5000);

module.exports = {
  connectDatabase,
  disconnectDatabase,
  runQuery,
  generateQuery,
  getConnectionStatus,
};