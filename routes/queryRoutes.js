const express = require("express");
const {
  connectDatabase,
  runQuery,
  disconnectDatabase,
} = require("../controllers/queryController");
const { validateCredentials } = require("../middlewares/validationMiddleware");

const router = express.Router();

router.post("/connect", validateCredentials, connectDatabase);
router.post("/disconnect", disconnectDatabase);
router.post("/query", runQuery);

module.exports = router;
