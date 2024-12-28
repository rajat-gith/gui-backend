const express = require("express");
const {
  connectDatabase,
  runQuery,
  disconnectDatabase,
  generateQuery,
  checkConnected,
} = require("../controllers/queryController");
const { validateCredentials } = require("../middlewares/validationMiddleware");

const router = express.Router();

router.post("/connect", validateCredentials, connectDatabase);
router.post("/disconnect", disconnectDatabase);
router.post("/query", runQuery);
router.post("/generate-query", generateQuery);
// router.post("/ping", checkConnected);

module.exports = router;
