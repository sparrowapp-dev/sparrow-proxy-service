# Sparrow Proxy Service

A highly scalable proxy server built with NestJS to handle HTTP, WebSocket and Socket.IO connections. The server acts as an intermediary between frontend clients and real WebSocket/Socket.IO servers, supporting dynamic connections, event forwarding, and tab-specific session handling. It also acts a proxy for forwarding HTTP requests in order to avoid CORS issue.

## Features

- **HTTP API Support**: Handles all kinds of HTTP requests.
- **WebSocket and Socket.IO Support**: Handles both WebSocket and Socket.IO connections.
- **Dynamic Target Servers**: Connect to any real WebSocket or Socket.IO server at runtime.
- **Event Forwarding**: Forwards all events and messages between frontend clients and target servers.
- **Tab-Specific Connections**: Maintains unique connections for each `tabid` provided by the client.
- **Error Handling**: Handles manual and abrupt disconnections with proper cleanup.
- **Custom Headers**: Supports passing custom headers during connection.

## Prerequisites

- **Node.js**: >=18.x
- **npm**: >=10.x
- **yarn**: >=1.22.x
- **WebSocket Server**: A running real HTTP, WebSocket or Socket.IO server for testing.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/sparrowapp-dev/sparrow-proxy-service.git
   ```

2. Move inside the repository:

   ```bash
   cd sparrow-proxy-service
   ```

3. Install dependencies:

   ```bash
   yarn
   ```

4. Start the server:

   ```bash
   yarn start
   ```

## Starting the Proxy Server

1. The server runs on http://localhost:3000 by default.
2. It exposes the following WebSocket endpoints:

- WebSocket Proxy: ws://localhost:3000/ws
- Socket.IO Proxy: ws://localhost:3000/

## Connecting to the Proxy

### HTTP Example

Connect to the HTTP proxy using the below url:

````javascript
  const response = await axios.post("http://localhost:3000/proxy/http-request", {
      url,
      method,
      headers,
      body,
      contentType, // e.g., "application/json", "application/x-www-form-urlencoded", etc.
    });
    ```

### WebSocket Example

Connect to the proxy using a WebSocket client:

```javascript
const ws = new WebSocket(
  'ws://localhost:3000/ws?tabid=123&targetUrl=ws://real-server.com',
);

ws.onopen = () => {
  console.log('Connected to proxy WebSocket!');
};

ws.onmessage = (event) => {
  console.log('Message from proxy:', event.data);
};

ws.onclose = (event) => {
  console.error('Proxy WebSocket closed:', event.reason);
};
````

### Socket.IO Example

Connect to the proxy using a Socket.IO client:

```javascript
const socket = io('http://localhost:3000', {
  query: {
    tabid: '123',
    url: 'http://real-socketio-server.com',
    namespace: '/example-namespace',
  },
});

socket.on('connect', () => {
  console.log('Connected to proxy Socket.IO!');
});

socket.on('event-name', (data) => {
  console.log('Event from proxy:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from proxy Socket.IO!');
});
```

## API Endpoints

### WebSocket Proxy

- Path: `/ws`
- Query Parameters:
  - `tabid`: A unique identifier for the connection.
  - `targetUrl`: The real WebSocket server URL.
  - `headers`: (Optional) Custom headers for the real WebSocket server.

### Socket.IO Proxy

- Path: `/`
- Query Parameters:

  - `tabid`: A unique identifier for the connection.
  - `url`: The real WebSocket server URL.
  - `namespace`: The namespace for the real Socket.IO server.
  - `headers`: (Optional) Custom headers for the real WebSocket server.

  ## Project Structure

  ```
    sparrow-proxy-server/
        ├── src/
        │   ├── proxy/                        # Proxy Module
        │   │   ├── http/
        │   │   │   ├── http.gateway.ts       # HTTP Gateway
        │   │   │   ├── http.module.ts        # HTTP Module
        │   │   │   ├── http.service.ts       # HTTP Service
        │   │   ├── socketio/
        │   │   │   ├── socketio.gateway.ts   # Socket.IO Gateway
        │   │   │   ├── socketio.module.ts    # Socket.IO Module
        │   │   │   ├── socketio.service.ts   # Socket.IO Service
        │   │   ├── websocket/
        │   │   │   ├── websocket.gateway.ts  # WebSocket Gateway
        │   │   │   ├── websocket.module.ts   # WebSocket Module
        │   │   │   ├── websocket.service.ts  # WebSocket Service
        │   ├── app.module.ts                 # Main Module
        │   ├── main.ts                       # Entry Point
        ├── package.json
        └── README.md
  ```
