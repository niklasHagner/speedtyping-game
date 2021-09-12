
const prodMode = false;
const url = window.location.href;
var socket = io.connect(url);
var chatForm = document.getElementById("chat-form");
var chatFormInput = document.getElementById("chat-input");
var messageContainer = document.getElementById("messages");
var targetSentenceContainer = document.getElementById("word-matching-area");
var sentenceInProgressEl = document.getElementById("sentence-in-progress");
var sentenceRemainingEl = document.getElementById("sentence-remaining");

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

socket.on("chat_message", function (msg) {
    addMessage(msg);
});

socket.on("is_online", function (msg) {
    addMessage(msg);
});


socket.on("highscore", function (msg) {
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
        <h1>Chat</h1>
        <h2>Enter your name</h2>
        <form id="username-form">
            <input type="text" minlength="1" maxlength="10" tabindex="-1">
            <button type="submit">Submit</button>
        </form>
        <p class="hidden">Names have to be 1 to 10 chars</p>
    `;

    document.body.append(usernameModal);
    var usernameForm = document.querySelector("#username-form");
    var usernameInput = usernameForm.querySelector("input");
    window.setTimeout(function () {
        document.querySelector("#username-form").focus();
    }, 1);


    usernameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        var username = usernameInput.value;
        if (username && username.length > 0 && username.length < 10) {
            acceptUserNameAndStart(username);
        } else {
            usernameModal.querySelector("p").classList.remove("hidden");
        }
    });

    function acceptUserNameAndStart(username) {
        socket.emit("username", username);
        usernameModal.classList.add("hidden");
        window.setTimeout(function () {
            usernameInput.removeAttribute("autofocus");
            document.querySelector("#username-form").blur();
            chatForm.focus();
            chatForm.setAttribute("autofocus", "true");
        }, 1);

        socket.emit("start_game", null);
    }
}

socket.on("target_sentence", function (msg) {
    sentenceRemainingEl.innerText = msg;
    sentenceInProgressEl.innerText = "";
});

//---go---
askUserName();

