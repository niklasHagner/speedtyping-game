const express = require("express");
const app = express();
const http = require("http").Server(app);
var path = require("path");
var game = require("./game.js");
var playerManager = require("./playerManager.js");
const socketio = require("socket.io");
app.use(express.static("public"));

//var port = (process && process.env && process.env.PORT) ? Number(process.env.PORT) : 9001;
//"http://localhost:" + port

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname + "/public/index.html"));
});

app.get("/test", function(req, res) {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.send("fullUrl:" + fullUrl);
});

const io = socketio.listen(http);

io.sockets.on("connection", socketConnectHandler);


function socketConnectHandler(socket) {

    game.initialPrompt(io);
    
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
        var username = socket.username;
        if (!username) {
            
        }
        const player = playerManager.getPlayerByName(username);
        console.log(player, message);

        const messageHtml = `<icon>${player.avatar}</icon> <span class='username'>${player.username}:</span> ${message}`;
        io.emit(
            "chat_message",
            messageHtml
        );
        game.updateSentences(io, message, socket);
    });

    socket.on("start_game", function(message) {
        io.emit(
            "chat_message",
            `<div class="game-message"><icon>📜</icon> Starting game in 3 seconds</div>`
        );
        setTimeout(() => { game.startWordGame(io, message, socket);}, 3000);
    });
}

const port = (process && process.env && process.env.PORT) ? Number(process.env.PORT) : 9001;
const server = http.listen(port, function() {
    console.log("listening on ", port);
});