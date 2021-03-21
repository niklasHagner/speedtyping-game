
const prodMode = false;
const url = window.location.href;
var socket = io.connect(url);
var chatForm = document.getElementById("chat-form");
var chatFormInput = document.getElementById("chat-input");
var messageContainer = document.getElementById("messages");

chatForm.addEventListener("submit", e => {
    e.preventDefault();
    var msg = chatFormInput.value;
    if (msg === "/start") {
        socket.emit("start_game", msg);
    } else {
        socket.emit("chat_message", msg);
    }
    chatFormInput.value = "";
    return false;
});

socket.on("chat_message", function(msg) {
    addMessage(msg);
});

socket.on("is_online", function(msg) {
    addMessage(msg);
});

socket.on("highscore", function(msg) {
    document.querySelector("#highscore").innerHTML = msg;
});

function addMessage(text) {
    let child = document.createElement("li");
    child.innerHTML = text;
    messageContainer.prepend(child);
}

function askUserName() {
    
    var usernameModal = document.createElement("div");
    usernameModal.id = "username-modal";
    usernameModal.innerHTML = `
        <h1>Welcome to Keyboard Warrior</h1>
        <h2>Enter your name</h2>
        <form id="username-form">
            <input type="text" minlength="1" maxlength="6" tabindex="-1">
            <button type="submit">Submit</button>
        </form>
        <p class="hidden">* 1 to 6 chars</p>
    `;
    
    document.body.append(usernameModal);
    var usernameForm = document.querySelector("#username-form");
    var usernameInput = usernameForm.querySelector("input");
    window.setTimeout(function () { 
        document.querySelector("#username-form").focus();
    },1);
    usernameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        var username = usernameInput.value;
        if (username && username.length > 0 && username.length < 7) {
            socket.emit("username", username);
            usernameModal.classList.add("hidden");
            // usernameInput.removeAttribute("autofocus");
            window.setTimeout(function () { 
                document.querySelector("#username-form").blur();
                document.getElementById("chat-form").focus();
            },1);
            // chatForm.addAttribute("autofocus");
        } else {
            usernameModal.querySelector("p").classList.remove("hidden");
        }
    });    
}

askUserName();