require("dotenv").config();
const SQLConnector = require("../utils/dbConnectorClass");
const axios = require("axios");
const sqlConnector = new SQLConnector();

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
    return res.json({ success: true, data: message });
  } catch (error) {
    console.error("Database Connection Error:", error.message);
    return res.status(400).json({ success: false, data: error.message });
  }
};

const disconnectDatabase = async (req, res) => {
  try {
    const message = await sqlConnector.disconnect();
    return res.json({ success: true, data: message });
  } catch (error) {
    console.error("Database Disconnection Error:", error.message);
    return res.status(400).json({ success: false, data: error.message });
  }
};

const runQuery = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res
        .status(400)
        .json({ success: false, data: "Query is required" });
    }

    const results = await sqlConnector.query(query);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Query Execution Error:", error.message);
    return res
      .status(500)
      .json({ success: false, data: "Failed to execute query" });
  }
};

const fetchColumnsFromDB = async (tableName) => {
  try {
    const fetchColumnsQuery = `SELECT column_name,data_type FROM information_schema.columns WHERE table_name = '${tableName}'`;
    const res = await sqlConnector.query(fetchColumnsQuery);
    if (!res) {
      throw new Error("Failed to fetch columns from the database");
    }
    const columns = res.reduce((acc, row) => {
      acc[row.COLUMN_NAME] = row.DATA_TYPE;
      return acc;
    }, {});

    return { columns };
  } catch (error) {
    console.error("Error fetching columns:", error.message);
    throw new Error("Failed to fetch columns from the database");
  }
};

const generateQuery = async (req, res) => {
  try {
    const { naturalQuery, tableName } = req.body;

    if (!naturalQuery || !tableName) {
      return res.status(400).json({
        success: false,
        data: "Both naturalQuery and tableName are required",
      });
    }
    const columns = await fetchColumnsFromDB(tableName);

    if (!columns || columns.length === 0) {
      return res.status(400).json({
        success: false,
        data: `No columns found for the table: ${tableName}`,
      });
    }

    const fastApiUrl = process.env.FASTAPI_URL;

    if (!fastApiUrl) {
      return res.status(500).json({
        success: false,
        data: "FastAPI URL is not configured in environment variables",
      });
    }

    const fastApiResponse = await axios.post(`${fastApiUrl}/process-query`, {
      natural_query: naturalQuery,
      table_name: tableName,
      columns: columns.columns,
    });

    const { sql_query: sqlQuery } = fastApiResponse.data;

    if (!sqlQuery) {
      return res.status(400).json({
        success: false,
        data: "Failed to generate SQL query from FastAPI",
      });
    }

    return res.json({
      success: true,
      query: sqlQuery,
    });
  } catch (error) {
    console.error("Error in Query Generation:", JSON.stringify(error.message));

    if (error.response) {
      return res.status(500).json({
        success: false,
        data: `FastAPI Error: ${error.response.data.detail}`,
      });
    }

    return res.status(500).json({
      success: false,
      data: "Failed to process the request",
    });
  }
};
module.exports = {
  connectDatabase,
  runQuery,
  disconnectDatabase,
  generateQuery,
};
