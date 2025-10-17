const express = require("express");
const app = express();
const http = require("http").Server(app);
var path = require("path");
var game = require("./lib/game.js");
var playerManager = require("./lib/playerManager.js");
const socketio = require("socket.io");

app.use(function (req, res, next) {
    // console.log("req.url:", req.url);
    // console.info("HEADERS:");
    // console.info(JSON.stringify(req.headers));
    next();
});
app.use(express.static("public"));
app.use(express.json());

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + "/public/speedtyping/index.html"));
});

app.get("/test", function(req, res) {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.send("fullUrl:" + fullUrl);
});

const io = socketio.listen(http);

io.sockets.on("connection", socketConnectHandler);

let startButtonSentToPlayerSocketId;

function socketConnectHandler(socket) {
    socket.on("new_player_with_username_joined", function(username) {
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

    socket.on("disconnect", function() {
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

    socket.on("player_move", function(message) {
        var username = socket.username;
        game.movePlayer(io, username, message, socket.id);
    });

    socket.on("initial_client_site_load", function(message) {
        io.to(socket.id).emit("show_players", { players: playerManager.getPlayers() })
    });

    socket.on("start_new_game", function(message) {
        game.considerStartingGame(io, message, socket);
    });

}

const port = (process && process.env && process.env.PORT) ? Number(process.env.PORT) : 9001;

http.listen(port, function() {
    console.log("listening on ", port);
});