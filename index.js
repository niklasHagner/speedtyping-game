const express = require("express");
const app = express();
const http = require("http").Server(app);
var path = require("path");
var game = require("./game.js");
var playerManager = require("./playerManager.js");
const socketio = require("socket.io");

app.use(express.static("public"));

app.get("/", function(req, res) {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    console.log("fullUrl", fullUrl);
    res.sendFile(path.join(__dirname + "/public/index.html"));
});

app.get("test", function(req, res) {
    res.send("testing: 1,2,3");
});

const io = socketio.listen(http);

io.sockets.on("connection", socketConnectHandler);


function socketConnectHandler(socket) {

    game.start(io);
    
    socket.on("username", function(username) {
        socket.username = username;
        const player = playerManager.setUpNewPlayer(username);
        io.emit(
            "is_online",
            `<div class="game-message game-message--join"><icon>${player.avatar}</icon> <span class="username">${player.username}</span> joined the chat..</div>`
        );
    });

    socket.on("disconnect", function(username) {
        const player = playerManager.getPlayerByName(username);
        if (!player) {
            console.error("AARGH");
            return;
        }
        playerManager.leave(username);
        io.emit(
            "is_online",
            `🏃<div class="game-message game-message--join"><span class="username">${username}</span> left the chat..</i> <icon>${player.avatar}</icon></div>`
        );
    });

    socket.on("chat_message", function(message) {
        const player = playerManager.getPlayerByName(socket.username);
        console.log(player, message);

        const messageHtml = `<icon>${player.avatar}</icon> <span class='username'>${player.username}:</span> ${message}</i>`;
        io.emit(
            "chat_message",
            messageHtml
        );
        game.updateSentences(io, message, socket);
    });
}

const port = (process && process.env && process.env.PORT) ? Number(process.env.PORT) : 9001;
const server = http.listen(port, function() {
    console.log("listening on ", port);
});