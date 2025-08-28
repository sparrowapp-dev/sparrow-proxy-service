import { Injectable } from "@nestjs/common";
import { WebSocket } from "ws";

export enum WebsocketEvent {
  disconnect = "disconnect",
  connect = "connect",
  message = "message",
}

@Injectable()
export class WebSocketService {
  /**
   * Establish connection between frontend client and real WebSocket server.
   */
  async establishConnection(
    _proxySocketIO: any,
    _targetUrl: string,
    _headers: Record<string, string> = {},
  ): Promise<WebSocket> {
    // Connect to the real WebSocket server
    const ws = new WebSocket(_targetUrl, { headers: _headers });

    // Handle connection open
    ws.on("open", () => {
      console.log("Connected to the WebSocket server");
      _proxySocketIO?.emit("sparrow_internal_connect", "io server connect");
    });

    // Handle incoming messages
    ws.on("message", (data: any) => {
      _proxySocketIO?.emit("message", JSON.stringify(data));
    });

    // Handle errors
    ws.on("error", (error) => {
      _proxySocketIO?.emit("sparrow_internal_connect_error", error.message);
      _proxySocketIO?.disconnect();
    });

    // Handle connection close
    ws.on("close", (code, reason) => {
      console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
      _proxySocketIO?.emit("sparrow_internal_disconnect", reason);
      _proxySocketIO?.disconnect();
    });
    return ws;
  }
}
