import { WebSocketServer, WebSocket } from "ws";

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  role?: string;
}

let wss: WebSocketServer;

export const setWssInstance = (server: WebSocketServer) => {
  wss = server;
};

// ✅ 1. 推播給所有 staff/admin（通常是顧客操作後的情境）
export const broadcastToAllStaff = (payload: any) => {
  if (!wss) return;

  wss.clients.forEach((client) => {
    const ws = client as ExtendedWebSocket;
    if (ws.readyState === WebSocket.OPEN && (ws.role === "staff" || ws.role === "admin")) {
      ws.send(JSON.stringify(payload));
    }
  });
};

// ✅ 2. 推播給除了建立者以外的 staff/admin（通常是 staff/admin 操作時的情境）
export const broadcastExceptSender = (senderId: string, payload: any) => {
  if (!wss) return;

  console.log("🚀 執行 broadcastExceptSender", { senderId, payload });

  wss.clients.forEach((client) => {
    const ws = client as ExtendedWebSocket;
    if (ws.readyState === WebSocket.OPEN && (ws.role === "staff" || ws.role === "admin") && ws.userId !== senderId) {
      ws.send(JSON.stringify(payload));
    }
  });
};
