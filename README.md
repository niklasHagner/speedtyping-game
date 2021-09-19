# Speedtyping Multiplayer Game

Insired by TypeRacer

Uses socket.io to send client-to-server messages


## Start
1. `npm start` or `node server.js`
2. Browse to `localhost:9001/` to serve a plain HTML file with socket.io clientside script that communicates with the node-server

## Socket info
* Every socket object has an `id` and after the user joins the game we add a `username`.
* Messages from the server are passed globally with `io.emit("eventName", data)` or to a single user with: `io.to(socket.id).emit("eventName"), data)`