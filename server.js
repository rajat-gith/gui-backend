const https = require("https");
const fs = require("fs");
const app = require("./app");
const WebSocket = require("ws");
const { initializeWebSocket } = require("./controllers/websocketController");

const HTTPS_PORT = process.env.HTTPS_PORT || 443;

const options = {
  key: fs.readFileSync("private.key"),
  cert: fs.readFileSync("certificate.crt"),
  ca: fs.readFileSync("ca_bundle.crt"),
};

const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });

initializeWebSocket(wss);

server.listen(HTTPS_PORT, () => {
  console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
});

module.exports = { server, wss };