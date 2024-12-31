const https = require("https");
const fs = require("fs");
const app = require("./app");
const WebSocket = require("ws");

const HTTPS_PORT = process.env.HTTPS_PORT || 443;

const options = {
  key: fs.readFileSync("private.key"),
  cert: fs.readFileSync("certificate.crt"),
  ca: fs.readFileSync("ca_bundle.crt"),
};

const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, request) => {
  const params = new URLSearchParams(request.url.split("?")[1]);
  const userId = params.get("userId");

  if (!userId) {
    ws.close(1008, "User ID is required");
    return;
  }

  console.log(`WebSocket connection established for User ID: ${userId}`);

  connections.set(userId, ws);
  ws.send(
    JSON.stringify({
      status: isDatabaseConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
      lastChecked: lastCheckTime,
    })
  );

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

if (!wss) {
  console.error("WebSocket server is not initialized.");
} else {
  console.log("WebSocket server initialized.");
}

module.exports = { server, wss };

server.listen(HTTPS_PORT, () => {
  console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
});
