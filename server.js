const express = require("express");
const app = express();
const http = require("http").Server(app);
var path = require("path");
var game = require("./lib/game.js");
var playerManager = require("./lib/playerManager.js");
const socketio = require("socket.io");
app.use(express.static("public"));

//var port = (process && process.env && process.env.PORT) ? Number(process.env.PORT) : 9001;
//"http://localhost:" + port

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + "/public/speedtyping/index.html"));
});

app.get("/test", function(req, res) {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.send("fullUrl:" + fullUrl);
});

const io = socketio.listen(http);

io.sockets.on("connection", socketConnectHandler);


function socketConnectHandler(socket) {

    game.initialPrompt(io, socket.id);
    
    socket.on("username", function(username) {
        socket.username = username;
        const player = playerManager.setUpNewPlayer(username);
        io.emit(
            "is_online",
            `<div class="game-message game-message--join"><icon>${player.avatar}</icon> <span class="username">${player.username}</span> joined the chat..</div>`
        );

        //Show a nice list of avatars
        // const players = playerManager.getAllPlayersSortedByScore().slice(0,3);
        // const playerString = players.map(x => `<icon>${x.avatar}</icon><span>${x.username}</span>`).join("  ");
        // io.emit(
        //     "highscore",
        //     playerString
        // )

        //update avatar list
        io.emit(
            "show_players",
            {
                players: playerManager.getPlayers()
            }
        )
        
    });

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
        //update avatar list
        io.emit(
            "show_players",
            {
                players: playerManager.getPlayers()
            }
        )
    });

    socket.on("chat_message", function(message) {
        var username = socket.username;
        const player = playerManager.getPlayerByName(username);
        if (!player) {
            console.error("player missing for", username);
            return;
        }
        console.log(player, message);

        const messageHtml = `<icon>${player.avatar}</icon> <span class='username'>${player.username}:</span> ${message}`;
        io.emit(
            "chat_message",
            messageHtml
        );
    });

    socket.on("player_move", function(message) {
        var username = socket.username;
        game.movePlayer(io, username, message, socket.id);
    });

    socket.on("new_player_ready", function(message) {
        game.startNewMatch(io, message, socket);
    });

    socket.on("initial_client_site_load", function(message) {
        //TODO: limit this to the single client, no need to emit it globally
        io.emit(
            "show_players",
            {
                players: playerManager.getPlayers()
            }
        )
    });
}

const port = (process && process.env && process.env.PORT) ? Number(process.env.PORT) : 9001;
const server = http.listen(port, function() {
    console.log("listening on ", port);
});