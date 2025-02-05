const http = require("http");
const app = require("./app");
const WebSocket = require("ws");
const { initializeWebSocket } = require("./utils/wsController");

const HTTP_PORT = process.env.HTTPS_PORT || 80;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

initializeWebSocket(wss);

server.listen(HTTP_PORT, () => {
  console.log(`HTTP Server running on port ${HTTP_PORT}`);
});

module.exports = { server, wss };