const WebSocket = require("ws");
require("dotenv").config();
const SQLConnector = require("../utils/dbConnectorClass");
const axios = require("axios");

// Initialize core components
const sqlConnector = new SQLConnector();
let isDatabaseConnected = true;
const connections = new Map(); // Map to track WebSocket connections by userId
const PORT = 80;
const wss = new WebSocket.Server({ port: PORT })

// Database connection handler
const connectDatabase = async (req, res) => {
  const { dbType, host, port, user, password, database } = req.body;

  try {
    const message = await sqlConnector.connect({
      dbType,
      host,
      port,
      user,
      password,
      database,
    });
    isDatabaseConnected = true;
    broadcastStatus(isDatabaseConnected ? "connected" : "disconnected");
    return res.json({ success: true, data: message });
  } catch (error) {
    console.error("Database Connection Error:", error.message);
    isDatabaseConnected = false;
    broadcastStatus("disconnected");
    return res.status(400).json({ success: false, data: error.message });
  }
};

// Database disconnection handler
const disconnectDatabase = async (req, res) => {
  try {
    const message = await sqlConnector.disconnect();
    isDatabaseConnected = false;
    broadcastStatus("disconnected");
    return res.json({ success: true, data: message });
  } catch (error) {
    console.error("Database Disconnection Error:", error.message);
    return res.status(400).json({ success: false, data: error.message });
  }
};

// Query execution handler
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
      ? {
          status: 503,
          data: "Database connection not established. Please try again later.",
        }
      : {
          status: 500,
          data: "Failed to execute query.",
        };

    return res
      .status(response.status)
      .json({ success: false, data: response.data });
  }
};

// Fetch database columns
const fetchColumnsFromDB = async (tableName) => {
  try {
    const fetchColumnsQuery = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}'`;
    const res = await sqlConnector.query(fetchColumnsQuery);

    if (!res || res.length === 0) {
      throw new Error(`No columns found for table: ${tableName}`);
    }

    return res.reduce((acc, row) => {
      acc[row.column_name] = row.data_type;
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching columns:", error.message);
    throw new Error("Failed to fetch columns from the database.");
  }
};

// Natural language to SQL query generator
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
      columns,
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

// Enhanced status broadcast function
const broadcastStatus = (status) => {
  const timestamp = new Date().toISOString();
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        status,
        timestamp,
        lastChecked: timestamp
      }));
    }
  });
};

// Connection monitoring variables and functions
let lastCheckTime = null;

const checkDatabaseConnection = async () => {
  try {
    const currentStatus = await sqlConnector.isConnected();
    lastCheckTime = new Date().toISOString();
    
    // Always broadcast the current status
    broadcastStatus(currentStatus ? "connected" : "disconnected");
    
    // Update the stored status
    isDatabaseConnected = currentStatus;
    
    console.log(`Database status check at ${lastCheckTime}: ${currentStatus ? "Connected" : "Disconnected"}`);
  } catch (error) {
    console.error("Database Status Check Error:", error.message);
    isDatabaseConnected = false;
    broadcastStatus("disconnected");
  }
};

// WebSocket connection handler
wss.on("connection", (ws, request) => {
  const params = new URLSearchParams(request.url.split("?")[1]);
  const userId = params.get("userId");

  if (!userId) {
    ws.close(1008, "User ID is required");
    return;
  }

  console.log(`WebSocket connection established for User ID: ${userId}`);
  
  // Store the connection
  connections.set(userId, ws);
  
  // Send initial status to the new connection
  ws.send(JSON.stringify({
    status: isDatabaseConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    lastChecked: lastCheckTime
  }));

  ws.on("message", (message) => {
    console.log(`Message from User ${userId}:`, message);
  });

  ws.on("close", () => {
    console.log(`WebSocket connection closed for User ID: ${userId}`);
    connections.delete(userId);
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error for User ${userId}:`, error);
    connections.delete(userId);
  });
});

// Connection status endpoint
const getConnectionStatus = async (req, res) => {
  try {
    const currentStatus = await sqlConnector.isConnected();
    res.json({
      success: true,
      status: currentStatus ? "connected" : "disconnected",
      lastChecked: lastCheckTime,
      storedStatus: isDatabaseConnected,
      activeConnections: connections.size
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      lastChecked: lastCheckTime,
      activeConnections: connections.size
    });
  }
};

// Initialize immediate connection check
checkDatabaseConnection();

// Set up regular interval checking
setInterval(checkDatabaseConnection, 5000);

// Export all handlers
module.exports = {
  connectDatabase,
  runQuery,
  disconnectDatabase,
  generateQuery,
  getConnectionStatus
};