const express = require("express");
const app = express();
const http = require("http").Server(app);
var path = require("path");
var game = require("./lib/game.js");
var playerManager = require("./lib/playerManager.js");
var roomManager = require("./lib/roomManager.js");
const socketio = require("socket.io");
const config = require("exp-config");

app.use(function (req, res, next) {
  // console.log("req.url:", req.url);
  // console.info("HEADERS:");
  // console.info(JSON.stringify(req.headers));
  next();
});
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
  socket.on("new_player_with_username_joined", function (username) {
    socket.username = username;
    const player = playerManager.setUpNewPlayer(socket);
    io.emit(
      "is_online",
      `<div class="game-message game-message--join"><icon>${player.avatar}</icon> <span class="username">${player.username}</span> joined the chat..</div>`
    );

    io.emit("show_players", { players: playerManager.getPlayers() })

    giveStartButtonToSomePlayer();

    // game.considerStartingGame(io);
  });

  function giveStartButtonToSomePlayer() {
    const players = playerManager.getPlayers();
    const canStartGame = players.length >= 1; //allow solo games 
    if (!canStartGame) {
      return;
    }
    const firstPlayerSocketId = players[0].socketId;
    const messageAlreadySent = firstPlayerSocketId === startButtonSentToPlayerSocketId;
    if (messageAlreadySent) {
      return;
    }
    console.log("Giving NewGame button to", firstPlayerSocketId);
    io.to(firstPlayerSocketId).emit("allow_player_to_start_new_game", null);
    startButtonSentToPlayerSocketId = firstPlayerSocketId;
  }

  socket.on("disconnect", function () {
    const username = socket.username;
    const player = playerManager.getPlayerByName(username);
    if (!player) {
      return;
    }
    playerManager.playerLeavesGame(username);
    io.emit(
      "is_online",
      `🏃<div class="game-message game-message--join"><span class="username">${username}</span> left the chat..</i> <icon>${player.avatar}</icon></div>`
    );
    io.emit("show_players", { players: playerManager.getPlayers() })

    giveStartButtonToSomePlayer();
  });

  socket.on("player_move", function (message) {
    var username = socket.username;
    game.movePlayer(io, username, message, socket.id);
  });

  socket.on("initial_client_site_load", function (message) {
    io.to(socket.id).emit("show_players", { players: playerManager.getPlayers() })
  });

  socket.on("start_new_game", function (message) {
    game.considerStartingGame(io, message, socket);
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
  
  if (config.createRoomHehuForDebugging) {
    try {
      const existingRoom = roomManager.getRoom('hehu');
      if (!existingRoom) {
        const debugRoom = roomManager.createRoom('Debug Room', 'DebugUser', 'hehu');
        console.log("🐛 Debug room created:", {
          id: debugRoom.id,
          name: debugRoom.name,
          url: `http://localhost:${port}/room/hehu`
        });
      } else {
        console.log("🐛 Debug room 'hehu' already exists");
      }
    } catch (error) {
      console.error("Failed to create debug room:", error.message);
    }
  }
});