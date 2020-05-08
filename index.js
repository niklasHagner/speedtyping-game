const express = require("express");
const app = express();
const http = require("http").Server(app);
var path = require("path");
var game = require("./game.js");
const socketio = require("socket.io");

app.use(express.static("public"));

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + "/public/index.html"));
});

const io = socketio.listen(http);

io.sockets.on("connection", socketConnectHandler);

const avatars = ["🐸", "🐷", "🐹", "🐵", "🐱", "🐤"];

function socketConnectHandler(socket) {

    game.start(io);
    
    socket.on("username", function(username) {
        socket.username = username;
        const avatar = avatars[Math.floor(Math.random() * avatars.length)];
        io.emit(
            "is_online",
            avatar + " <i>" + socket.username + " joined the chat..</i>"
        );
    });

    socket.on("disconnect", function(username) {
        io.emit(
            "is_online",
            "🏃 <i>" + socket.username + " left the chat..</i>"
        );
    });

    socket.on("chat_message", function(message) {
        io.emit(
            "chat_message",
            "<strong class='username'>" + socket.username + "</strong>: " + message
        );
        game.updateSentences(io, message);
    });
}

const server = http.listen(9001, function() {
    console.log("listening on *:9001");
});