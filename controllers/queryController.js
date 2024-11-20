const SQLConnector = require("../utils/dbConnectorClass");

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
    return res.json({ success: true, message });
  } catch (error) {
    console.error("Database Connection Error:", error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const runQuery = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res
        .status(400)
        .json({ success: false, message: "Query is required" });
    }

    const results = await sqlConnector.query(query);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Query Execution Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to execute query" });
  }
};

module.exports = { connectDatabase, runQuery };
