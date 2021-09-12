
const prodMode = false;
const url = window.location.href;
var socket = io.connect(url);
var chatForm = document.getElementById("chat-form");
var chatFormInput = document.getElementById("chat-input");
var messageContainer = document.getElementById("messages");
var targetSentenceContainer = document.getElementById("word-matching-area");
var sentenceInProgressEl = document.getElementById("sentence-in-progress");
var sentenceRemainingEl = document.getElementById("sentence-remaining");
var racingTableEl = document.getElementById("racing-table");


const GAME = {
    totalTargetText: "",
    nextWordTarget: "",
    remainingTargetText: "",
    remainingTargetTextSplit: [],
    incorrectInput: "",
    correctInCurrentWord: "",
    correctOldWords: ""
}

chatFormInput.addEventListener('input', () => {
    var input = chatFormInput.value;

    if (GAME.nextWordTarget.indexOf(input) === 0) {
        GAME.correctInCurrentWord = input;
        GAME.totalCorrect = GAME.correctOldWords + GAME.correctInCurrentWord;
        sentenceInProgressEl.innerText = GAME.totalCorrect;
        console.log("correct so far:", GAME.correctInCurrentWord, "remaining:", GAME.remainingTargetText, GAME.remainingTargetTextSplit);
        GAME.remainingTargetText = GAME.totalTargetText.substr(GAME.totalCorrect.length, GAME.totalTargetText.length)
        sentenceRemainingEl.innerText = GAME.remainingTargetText;
    }

    if (GAME.nextWordTarget === input) {
        socket.emit("player_move", input);
        chatFormInput.value = "";
        GAME.incorrectInput = "";
        GAME.correctOldWords += GAME.totalTargetTextSplit[0];
        GAME.totalTargetTextSplit.shift();
        GAME.nextWordTarget = GAME.totalTargetTextSplit[0];
        console.log("2 correct so far:", GAME.correctInCurrentWord, "remaining:", GAME.remainingTargetText, GAME.remainingTargetTextSplit);

        // GAME.remainingTargetText = GAME.totalTargetText.substr(GAME.totalCorrect.length, GAME.totalTargetText.length)
        // sentenceRemainingEl.innerText = GAME.remainingTargetText;
    } else {
        GAME.incorrectInput = input;
    }

    if (GAME.incorrectInput.length > 0) {
        chatFormInput.classList.add("error");
    } else {
        chatFormInput.classList.remove("error");
    }

    if (GAME.totalTargetText === GAME.totalCorrect) {
        socket.emit("chat_message", GAME.totalCorrect);
    }

});

// socket.on("chat_message", function (msg) {
//     addMessage(msg);
// });

// socket.on("is_online", function (msg) {
//     addMessage(msg);
// });

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
        <h1>Keyboard Warrior</h1>
        <h2>Enter your name</h2>
        <form id="username-form">
            <input type="text" minlength="1" maxlength="8" tabindex="-1">
            <button type="submit">Submit</button>
        </form>
        <p class="hidden">Names have to be 1 to 8 chars</p>
    `;

    document.body.append(usernameModal);
    var usernameForm = document.querySelector("#username-form");
    var usernameInput = usernameForm.querySelector("input");
    window.setTimeout(function () {
        document.querySelector("#username-form").focus();
    }, 1);

    //test
    usernameInput.value = "hagge";
    

    usernameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        var username = usernameInput.value;
        if (username && username.length > 0 && username.length < 7) {
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
    GAME.incorrectInput = ""
    GAME.correctInCurrentWord = ""
    GAME.correctOldWords = ""
    GAME.totalTargetText = msg;
    GAME.remainingTargetText = GAME.totalTargetText;
    const split = GAME.remainingTargetText.split(" ");
    let i = split.length -1;
    do {
        split.splice(i, 0, " ");
    } while (i-- && i > 0)

    GAME.totalTargetTextSplit = split;
    GAME.nextWordTarget = split[0];

    sentenceRemainingEl.innerText = msg;
    sentenceInProgressEl.innerText = "";
});

socket.on("avatar_move", function (data) {
    const playersHtml = data.players.map(x => `
        <div class="player-row">
            <span>${x.username}:</span>
            <span class="score">${x.wordsPerMinute} wpm</span>
            <div class="avatar-row">
                <icon style="left: ${x.percentageOfString_int}%">${x.avatar}</icon>
            </div>
        </div>
    `)
    racingTableEl.innerHTML = playersHtml.join("");
});

//---go---
askUserName();

