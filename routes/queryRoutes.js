const express = require("express");
const { connectDatabase, runQuery } = require("../controllers/queryController");
const { validateCredentials } = require("../middlewares/validationMiddleware");

const router = express.Router();

router.post("/connect", validateCredentials, connectDatabase);
router.post("/query", runQuery);

module.exports = router;
