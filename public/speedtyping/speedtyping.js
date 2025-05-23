import { getRandomName } from "./firstNames.js";

// DOM elements
const chatForm = document.getElementById("chat-form");
const chatFormInput = document.getElementById("chat-input");
const messageContainer = document.getElementById("messages");
const targetSentenceContainer = document.getElementById("word-matching-area");
const sentenceInProgressEl = document.getElementById("sentence-in-progress");
const sentenceRemainingEl = document.getElementById("sentence-remaining");
const racingTableEl = document.getElementById("racing-table");
const serverMessage = document.getElementById("server-message");
const newGameButtonContainer = document.getElementById("new-game-button-container");

//---Game state---
const url = window.location.href;
const socket = io.connect(url);
const GAME = {
  totalTargetText: "",
  nextWordTarget: "",
  remainingTargetText: "",
  remainingTargetTextSplit: [],
  incorrectInput: "",
  correctInCurrentWord: "",
  correctOldWords: "",
  username: null,
  states: [
    { name: "unstarted", active: true },
    { name: "started", active: false },
    { name: "match-completed", active: false },
  ]
}

//---Socket listeners---
let lastMessageTime;
socket.on("server_message", function (msg) {
  serverMessage.innerHTML = msg;
  serverMessage.classList.remove("hidden--animated");
  lastMessageTime = new Date();
  window.setTimeout(() => {
    const nowTime = new Date().getTime();
    const diff = lastMessageTime && nowTime - lastMessageTime.getTime();
    console.log("diff", diff);
    if (diff > 1100) {
      serverMessage.classList.add("hidden--animated");
    }
  }, 1500);
});

socket.on("prep_new_match", resetStuffBeforeNewGame);
socket.on("target_sentence", newTargetSentenceAppears);
socket.on("allow_player_to_start_new_game", giveFirstPlayerStartButton);

socket.on("show_players", function (data) {
  const players = data.players;
  players.forEach(x => x.isYou = x.username === GAME.username);

  const playersHtml =
    players
      .sort((a, b) => a.username === b.username ? 0 : (a.username === GAME.username ? -1 : 1))
      .map(x => `
      <div class="player-row ${x.isYou ? 'player-row--you' : ''}">
          <div class="player-row__inner">
            <span>${x.username} ${x.isYou ? ' (you)' : ''}</span>
            <span class="score">${x.wordsPerMinute} wpm</span>
          </div>
          <div class="avatar-track">
              <icon style="left: ${x.percentageOfString_int}%">${x.avatar}</icon>
          </div>
      </div>
  `).join("");
  racingTableEl.innerHTML = playersHtml;
});

socket.on("player_finished", function (playerData) {
  setGameState("match-completed");
  document.body.classList.add("game-state--match-completed");
  chatForm.classList.add("hidden");
  let newEl = document.createElement("div");
  newEl.id = "match-completed-screen";
  newEl.innerHTML = `
      <h2>👍</h2>
      <p>Words per minute: ${playerData.wordsPerMinute}</p>
      <p>Time: ${playerData.seconds} seconds</p>
      <p>Chars per minute: ${playerData.charsPerMinute}</p>
      <button>New game</button>
  `;
  let footer = document.querySelector("footer");
  footer.parentNode.insertBefore(newEl, footer);
  document.querySelector("#match-completed-screen button").addEventListener("click", clickStartNewGame);
});

function askUserName() {
  const usernameModal = document.createElement("div");
  usernameModal.id = "username-modal";
  usernameModal.innerHTML = `
        <h2>Enter your name</h2>
        <form id="username-form">
            <input style="width: 10ch;" type="text" minlength="1" maxlength="10" tabindex="-1">
            <button type="submit">Submit</button>
        </form>
        <p class="hidden">Names have to be 1 to 10 chars</p>
    `;

  document.querySelector("main").append(usernameModal);
  const usernameForm = document.querySelector("#username-form");
  const usernameInput = usernameForm.querySelector("input");
  window.setTimeout(function () {
    usernameInput.focus();
  }, 1);

  //Speed up development with a preset username
  usernameInput.value = getRandomName();

  usernameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value;
    if (username && username.length > 0 && username.length < 10) {
      acceptUserNameAndStart(username);
    } else {
      usernameModal.querySelector("p").classList.remove("hidden");
    }
  });

  function acceptUserNameAndStart(username) {
    GAME.username = username;
    socket.emit("new_player_with_username_joined", username);
    usernameModal.classList.add("hidden");
    window.setTimeout(function () {
      chatFormInput.focus();
    }, 1);
  }
}

//--- DOM event listeners ---
chatFormInput.addEventListener('input', () => {
  const input = chatFormInput.value;

  if (GAME.nextWordTarget.indexOf(input) !== 0) {
    GAME.incorrectInput = input;
  } else {
    GAME.incorrectInput = "";
  }

  if (GAME.nextWordTarget.indexOf(input) === 0) {
    GAME.correctInCurrentWord = input;
    GAME.totalCorrect = GAME.correctOldWords + GAME.correctInCurrentWord;
    sentenceInProgressEl.innerText = GAME.totalCorrect;
    // console.log("correct so far:", GAME.correctInCurrentWord, "remaining:", GAME.remainingTargetText, GAME.remainingTargetTextSplit);
    GAME.remainingTargetText = GAME.totalTargetText.substr(GAME.totalCorrect.length, GAME.totalTargetText.length)
    sentenceRemainingEl.innerText = GAME.remainingTargetText;
  }
  if (GAME.nextWordTarget === input) {
    socket.emit("player_move", input);
    chatFormInput.value = "";
    GAME.correctOldWords += GAME.totalTargetTextSplit[0];
    GAME.totalTargetTextSplit.shift();
    GAME.nextWordTarget = GAME.totalTargetTextSplit[0];
  }

  if (GAME.incorrectInput.length > 0) {
    chatForm.classList.add("error");
    sentenceInProgressEl.classList.add("error");
  } else {
    chatForm.classList.remove("error");
    sentenceInProgressEl.classList.remove("error");
  }
});

//--- Helpers ---
function clickStartNewGame(e) {
  socket.emit("start_new_game", null);
  console.log("Emit 'start_new_game'");
  resetStuffBeforeNewGame();
  if (e.target) {
    e.target.remove();
  }
}

function resetStuffBeforeNewGame() {
  setGameState("unstarted");
  document.body.classList.remove("game-state--match-completed");
  targetSentenceContainer.classList.add("hidden");
  chatForm.classList.remove("hidden");
  const matchCompletedScreen = document.querySelector("#match-completed-screen");
  if (matchCompletedScreen) matchCompletedScreen.remove();

  const firstPlayerNewGameEl = document.querySelector("#new-game-button-container");
  if (firstPlayerNewGameEl) firstPlayerNewGameEl.remove();
}

function setGameState(stateName) {
  GAME.states.forEach(state => state.active = false);

  const found = GAME.states.find(state => state.name === stateName);
  if (found) found.active = true;
}

function newTargetSentenceAppears(msg) {
  setGameState("started");
  GAME.incorrectInput = ""
  GAME.correctInCurrentWord = ""
  GAME.correctOldWords = ""
  GAME.totalTargetText = msg;
  GAME.remainingTargetText = GAME.totalTargetText;
  const split = GAME.remainingTargetText.split(" ");
  let i = split.length - 1;
  do {
    split.splice(i, 0, " ");
  } while (i-- && i > 0)

  GAME.totalTargetTextSplit = split;
  GAME.nextWordTarget = split[0];

  sentenceRemainingEl.innerText = msg;
  sentenceInProgressEl.innerText = "";
  chatFormInput.focus();
  const matchCompletedScreen = document.querySelector("#match-completed-screen");
  if (matchCompletedScreen) matchCompletedScreen.remove();

  document.body.classList.remove("game-state--match-completed");
  targetSentenceContainer.classList.remove("hidden");
}

function giveFirstPlayerStartButton() {
  const btn = document.createElement('button')
  btn.innerText = "New game";
  btn.addEventListener("click", clickStartNewGame);
  newGameButtonContainer.appendChild(btn);
}

//Initial load
askUserName();
socket.emit("initial_client_site_load", null);

