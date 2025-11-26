import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { setWssInstance } from "../websocket/broadcast";

dotenv.config();

interface CustomWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  role?: string;
}

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server });
  setWssInstance(wss);

  wss.on("connection", (ws) => {
    const customWs = ws as CustomWebSocket;
    customWs.isAlive = true;
    console.log("✅ 有新的 WebSocket 連線");

    ws.on("pong", () => {
      customWs.isAlive = true;
    });

    ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());

        if (parsed.type === "auth") {
          const payload = jwt.verify(parsed.token, process.env.JWT_SECRET!);
          customWs.userId = (payload as any).userId;
          customWs.role = (payload as any).role;
          console.log("✅ WebSocket 已驗證身分", customWs.role, customWs.userId);
        }
      } catch (err) {
        console.error("❌ 身分驗證失敗", err);
        ws.close();
      }
    });

    ws.on("close", () => {
      console.log("❌ WebSocket 連線關閉");
    });
  });

  // 🔄 心跳檢查
  setInterval(() => {
    if (!wss) return;

    wss.clients.forEach((ws) => {
      const customWs = ws as CustomWebSocket;
      if (!customWs.isAlive) {
        console.log("⚡ 偵測到斷線，關閉連線");
        return customWs.terminate();
      }

      customWs.isAlive = false;
      customWs.ping();
    });
  }, 10000);

  return wss;
}

// ✅ 提供外部取得目前所有 client
export function getClients(): Set<WebSocket> {
  return wss?.clients || new Set();
}
