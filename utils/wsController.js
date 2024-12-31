const WebSocket = require("ws");

const connections = new Map();
let isDatabaseConnected = false;
let lastCheckTime = null;

const broadcastStatus = (status) => {
  const timestamp = new Date().toISOString();
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          status,
          timestamp,
          lastChecked: timestamp,
        })
      );
    }
  });
};

const initializeWebSocket = (wss) => {
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
};

module.exports = {
  connections,
  broadcastStatus,
  initializeWebSocket,
  isDatabaseConnected,
  lastCheckTime,
};
