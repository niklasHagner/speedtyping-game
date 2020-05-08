var socket = io.connect("http://localhost:9001");
var formEl = document.getElementById("chatForm");
var textInputEl = document.getElementById("txt");
var messagesEl = document.getElementById("messages");

formEl.addEventListener("submit", e => {
    e.preventDefault();
    socket.emit("chat_message", textInputEl.value);
    textInputEl.value = "";
    return false;
});

// append the chat text message
socket.on("chat_message", function(msg) {
    addMessage(msg);

});

// append text if someone is online
socket.on("is_online", function(username) {
    addMessage(username);
});

function addMessage(text) {
    let child = document.createElement("li");
    child.innerHTML = text;
    messagesEl.prepend(child);
}

// ask username
var username = prompt("Please tell me your name");
socket.emit("username", username);