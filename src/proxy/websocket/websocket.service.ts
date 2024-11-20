import { Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';

@Injectable()
export class WebSocketService {
  private frontendClients: Map<string, WebSocket> = new Map();
  private realWebSocketClients: Map<string, WebSocket> = new Map();

  /**
   * Establish connection between frontend client and real WebSocket server.
   */
  async establishConnection(
    frontendClient: WebSocket,
    tabid: string,
    targetUrl: string,
    headers: any,
  ): Promise<boolean> {
    try {
      // Check if the tabid is already connected
      if (this.frontendClients.has(tabid)) {
        console.log(`TabID=${tabid} is already connected. Reconnecting...`);
        this.cleanupConnectionsByTabId(tabid);
      }

      // Store the frontend client
      this.frontendClients.set(tabid, frontendClient);

      // Connect to the real WebSocket server
      const realWebSocket = new WebSocket(targetUrl, { headers });

      return new Promise((resolve) => {
        realWebSocket.on('open', () => {
          console.log(`Connected to real WebSocket server for TabID=${tabid}`);
          this.realWebSocketClients.set(tabid, realWebSocket);

          // Forward messages from the real server to the frontend client
          realWebSocket.on('message', (data) => {
            const frontendSocket = this.frontendClients.get(tabid);
            if (frontendSocket) {
              frontendSocket.send(data); // Forward the data to the frontend client
            }
          });

          realWebSocket.on('close', () => {
            console.log(
              `Real WebSocket server disconnected for TabID=${tabid}`,
            );
            this.cleanupConnectionsByTabId(tabid);
          });

          realWebSocket.on('error', (error) => {
            console.error(
              `Error with Real WebSocket connection for TabID=${tabid}: ${error.message}`,
            );
            this.cleanupConnectionsByTabId(tabid);
          });

          // Forward messages from the frontend client to the real WebSocket server
          frontendClient.on('message', (message) => {
            if (realWebSocket.readyState === WebSocket.OPEN) {
              realWebSocket.send(message); // Forward the message
            }
          });

          frontendClient.on('close', () => {
            console.log(`Frontend client disconnected for TabID=${tabid}`);
            this.cleanupConnectionsByTabId(tabid);
          });

          resolve(true);
        });

        realWebSocket.on('error', (error) => {
          console.error(
            `Failed to connect to real WebSocket server for TabID=${tabid}: ${error.message}`,
          );
          this.cleanupConnectionsByTabId(tabid);
          resolve(true);
        });
      });
    } catch (error) {
      console.error(
        `Error establishing connection for TabID=${tabid}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Clean up connections by TabID.
   */
  cleanupConnectionsByTabId(tabid: string) {
    const frontendSocket = this.frontendClients.get(tabid);
    const realSocket = this.realWebSocketClients.get(tabid);

    if (frontendSocket) {
      frontendSocket.close();
      this.frontendClients.delete(tabid);
    }

    if (realSocket) {
      realSocket.close();
      this.realWebSocketClients.delete(tabid);
    }

    console.log(`Connections cleaned up for TabID=${tabid}`);
  }

  /**
   * Clean up connections by frontend WebSocket client.
   */
  cleanupConnectionsByClient(client: WebSocket) {
    for (const [tabid, frontendSocket] of this.frontendClients.entries()) {
      if (frontendSocket === client) {
        console.log(`Cleaning up connections for TabID=${tabid}`);
        this.cleanupConnectionsByTabId(tabid);
        break;
      }
    }
  }
}
