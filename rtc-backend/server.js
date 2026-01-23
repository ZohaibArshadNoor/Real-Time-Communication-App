// server.js
// Main entry point of our backend signaling server

require("dotenv").config();

const express = require("express"); // Express for HTTP server
const http = require("http"); // Node HTTP module, required for socket.io
const { Server } = require("socket.io"); // Socket.io for real-time signaling
const cors = require("cors"); // CORS so frontend can connect

const app = express();

// Enable CORS for all origins (only for development)
// In production, replace "*" with your frontend URL
app.use(cors());

// Create HTTP server (required for Socket.io)
const server = http.createServer(app);

// Initialize Socket.io server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (Netlify frontend)
    methods: ["GET", "POST"],
  },
});

// Port for our backend server
const PORT = process.env.PORT || 5000;

// Listen to socket connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Event: user joins a room
  socket.on("join-room", (roomId) => {
    socket.join(roomId); // Join the specified room
    socket.roomId = roomId;

    console.log(`User joined room: ${socket.id} ${roomId}`);

    const clients = io.sockets.adapter.rooms.get(roomId);
    const numClients = clients ? clients.size : 0;

    // Notify existing clients that a new user joined
    if (numClients > 1) {
      socket.to(roomId).emit("user-joined", socket.id);
    }
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", socket.id);

    if (socket.roomId === roomId) {
      socket.roomId = null;
    }

    console.log("User left room:", socket.id, roomId);
  });

  // Relay WebRTC offer to other peer in room
  socket.on("webrtc-offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("webrtc-offer", offer);
  });

  // Relay WebRTC answer to other peer in room
  socket.on("webrtc-answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("webrtc-answer", answer);
  });

  // Relay ICE candidates to other peer in room
  socket.on("webrtc-ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("webrtc-ice-candidate", candidate);
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-left", socket.id);
    }
    console.log("User disconnected:", socket.id);
  });
});

// Start backend server
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
