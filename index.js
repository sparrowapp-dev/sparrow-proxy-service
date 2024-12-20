const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Configure CORS middleware with strict settings
const corsOptions = {
  origin: 'https://google.com', // Replace with allowed origin
  methods: ['GET'], // Only allow GET requests
  credentials: false, // Don't allow credentials
};
app.use(cors(corsOptions));

app.get('/', (req,res)=>{
    res.status(200).send("hi")
})

// Express API endpoints here

wss.on('listening', () => {
  console.log(
    `WebSocket Server is now listening on PORT: ${wss.address().port}`
  );
});

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log('Received message:', message.toString());
    ws.emit("respose", message)
    // Handle incoming messages
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});