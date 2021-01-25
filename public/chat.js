
const prodMode = false;
const url = prodMode ? "https://hacky-chatty.herokuapp.com" : "http://localhost:9001";
//var port = (process && process.env && process.env.PORT) ? Number(process.env.PORT) : 9001;
//"http://localhost:" + port
var socket = io.connect(url);
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

function askUserName() {
    var username = prompt("Please tell me your name");

    while (username.length < 1 && username.length > 20) {
        alert("Please enter a name between 1 and 20 characters");
        username = prompt("What's your name?");
    }
    socket.emit("username", username);
}

askUserName();