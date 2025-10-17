const express = require("express");
const app = express();
const http = require("http").Server(app);
var path = require("path");
var game = require("./lib/game.js");
var playerManager = require("./lib/playerManager.js");
var roomManager = require("./lib/roomManager.js");
const socketio = require("socket.io");
const config = require("exp-config");

// app.use(function (req, res, next) {
//   // console.log("req.url:", req.url);
//   // console.info("HEADERS:");
//   // console.info(JSON.stringify(req.headers));
//   next();
// });

app.use(express.static("public"));
app.use(express.json());

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + "/public/speedtyping/roomcreator.html"));
});

app.get("/room/:roomId", function (req, res) {
  res.sendFile(path.join(__dirname + "/public/speedtyping/gameroom.html"));
});

app.get("/test", function (req, res) {
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  res.send("fullUrl:" + fullUrl);
});

const io = socketio.listen(http);

io.sockets.on("connection", socketConnectHandler);

let startButtonSentToPlayerSocketId;

function socketConnectHandler(socket) {
  console.log("🔌 New socket connection:", socket.id);
  
  socket.on("test_connection", function (data) {
    console.log("🧪 Test connection received:", data, "from socket:", socket.id);
  });
  
  socket.on("disconnect", function (reason) {
    console.log("💔 Socket disconnected:", socket.id, "Reason:", reason);
  });
  
  socket.on("error", function (error) {
    console.log("❌ Socket error:", socket.id, "Error:", error);
  });
  
  socket.on("join_room", function (data) {
    console.log("🏠 join_room event received:", data);
    const { username, roomId } = data;
    
    if (!roomId) {
      socket.emit("room_error", "Room ID is required");
      return;
    }
    
    const room = roomManager.getRoom(roomId);
    if (!room) {
      socket.emit("room_not_found", "Room not found");
      return;
    }
    
    socket.join(roomId);
    socket.username = username;
    socket.roomId = roomId;
    
    // Create player and add to room
    const player = playerManager.setUpNewPlayer(socket);
    room.addPlayer(socket.id, player);
    
    // Notify room about new player
    io.to(roomId).emit(
      "is_online",
      `<div class="game-message game-message--join"><icon>${player.avatar}</icon> <span class="username">${player.username}</span> joined the room..</div>`
    );
    
    // Send current players to room
    io.to(roomId).emit("show_players", { players: room.getPlayers() });
    
    giveStartButtonToSomePlayer(roomId);
  });

  function giveStartButtonToSomePlayer(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    
    const players = room.getPlayers();
    const canStartGame = players.length >= 1; //allow solo games 
    if (!canStartGame) {
      return;
    }
    const firstPlayerSocketId = players[0].socketId;
    const messageAlreadySent = firstPlayerSocketId === startButtonSentToPlayerSocketId;
    if (messageAlreadySent) {
      return;
    }
    console.log("Giving NewGame button to", firstPlayerSocketId, "in room", roomId);
    io.to(firstPlayerSocketId).emit("allow_player_to_start_new_game", null);
    startButtonSentToPlayerSocketId = firstPlayerSocketId;
  }

  socket.on("disconnect", function () {
    const username = socket.username;
    const roomId = socket.roomId;
    
    if (!username || !roomId) return;
    
    const room = roomManager.getRoom(roomId);
    const player = playerManager.getPlayerByName(username);
    
    if (player && room) {
      // Remove player from room and global manager
      room.removePlayer(socket.id);
      playerManager.playerLeavesGame(username);
      
      // Notify room about player leaving
      io.to(roomId).emit(
        "is_online",
        `🏃<div class="game-message game-message--join"><span class="username">${username}</span> left the room..</i> <icon>${player.avatar}</icon></div>`
      );
      io.to(roomId).emit("show_players", { players: room.getPlayers() });
      
      giveStartButtonToSomePlayer(roomId);
    }
  });

  socket.on("player_move", function (data) {
    const { word, roomId } = data;
    const username = socket.username;
    
    if (!roomId || roomId !== socket.roomId) {
      socket.emit("room_error", "Invalid room");
      return;
    }
    
    // Create room-specific io for this room
    const roomIo = {
      emit: (event, data) => io.to(roomId).emit(event, data),
      to: (socketId) => ({
        emit: (event, data) => io.to(socketId).emit(event, data)
      })
    };
    
    game.movePlayer(roomIo, username, word, socket.id);
  });

  socket.on("initial_client_site_load", function (data) {
    const { roomId } = data || {};
    
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      if (room) {
        io.to(socket.id).emit("show_players", { players: room.getPlayers() });
      }
    }
  });

  socket.on("start_new_game", function (data) {
    const { roomId } = data || {};
    
    if (!roomId || roomId !== socket.roomId) {
      socket.emit("room_error", "Invalid room");
      return;
    }
    
    // Create room-specific io for this room
    const roomIo = {
      emit: (event, data) => io.to(roomId).emit(event, data),
      to: (socketId) => ({
        emit: (event, data) => io.to(socketId).emit(event, data)
      })
    };
    
    game.considerStartingGame(roomIo, data, socket);
  });

}

// ---Room management routes---
app.get("/api/rooms", function (req, res) {
  try {
    const rooms = roomManager.getAllRooms();
    res.json({ success: true, rooms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/rooms", function (req, res) {
  try {
    const { name, creator } = req.body;
    if (!name || !creator) {
      return res.status(400).json({
        success: false,
        error: "Room name and creator are required"
      });
    }

    const room = roomManager.createRoom(name, creator);
    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        creator: room.creator,
        createdAt: room.createdAt,
        playerCount: room.getPlayers().length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/rooms/:roomId", function (req, res) {
  try {
    const roomId = req.params.roomId;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Room not found"
      });
    }

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        creator: room.creator,
        players: room.getPlayers(),
        playerCount: room.getPlayers().length,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/rooms/:roomId", function (req, res) {
  try {
    const roomId = req.params.roomId;
    const deleted = roomManager.deleteRoom(roomId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Room not found"
      });
    }

    res.json({ success: true, message: "Room deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ---Port listener---
const port = (process && process.env && process.env.PORT) ? Number(process.env.PORT) : 9001;

http.listen(port, function () {
  console.log("listening on ", port);
  
  if (config.createDebuggyRoomOnAppStart) {
    try {
      const existingRoom = roomManager.getRoom('debuggy');
      if (!existingRoom) {
        const debugRoom = roomManager.createRoom('Debug Room', 'DebugUser', 'debuggy');
        console.log("🐛 Debug room created:", {
          id: debugRoom.id,
          name: debugRoom.name,
          url: `http://localhost:${port}/room/debuggy`
        });
      } else {
        console.log("🐛 Debug room 'debuggy' already exists");
      }
    } catch (error) {
      console.error("Failed to create debug room:", error.message);
    }
  }
});