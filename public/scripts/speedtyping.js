import { getRandomName } from "./firstNames.js";

// DOM elements
const chatForm = document.getElementById("chat-form");
const userInputEl = document.getElementById("user-input");
const goodInputPartEl = document.getElementById("correct-input");
const wrongInputPartEl = document.getElementById("incorrect-input");
const targetSentenceContainer = document.getElementById("sentence-area");
const sentenceInProgressEl = document.getElementById("sentence-in-progress");
const racingTableEl = document.getElementById("racing-table");
const serverMessage = document.getElementById("server-message");
const newGameButtonContainer = document.getElementById("new-game-button-container");

const socket = io.connect(window.location.origin);
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
  const roomId = getRoomIdFromUrl(); 
  if (roomId) {
    socket.emit("join_room_as_observer", { roomId });
  }
  
  socket.emit("initial_client_site_load", { roomId });
});

socket.on('disconnect', (reason) => {
  console.log('❌ Socket disconnected, reason:', reason);
});

socket.on('connect_error', (error) => {
  console.log('🔥 Connection error:', error);
});

const GAME = {
  totalTargetText: "",
  nextWordTarget: "",
  remainingTargetText: "",
  remainingTargetTextSplit: [],
  incorrectInput: "",
  correctInCurrentWord: "",
  correctOldWords: "",
  username: null,
  roomInfo: null, // Store room information from API
  mistakesOnWords: [], // Push each word where you make an error
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
    if (diff > 1100) {
      serverMessage.classList.add("hidden--animated");
    }
  }, 1500);
});

socket.on("prep_new_match", resetStuffBeforeNewGame);
socket.on("target_sentence", newTargetSentenceAppears);
socket.on("allow_player_to_start_new_game", giveFirstPlayerStartButton);

// Room-specific error handling
socket.on("room_error", function(message) {
  console.error("Socket error:", message);
  alert("Error: " + message);
});

socket.on("room_not_found", function(message) {
  console.error("Room not found:", message);
  alert("Room not found. Redirecting to lobby...");
  window.location.href = "/";
});

socket.on("show_players", function (data) {
  console.log("👥 Received show_players event with:", data.players.map(p => p.username));
  const players = data.players;
  players.forEach(x => x.isYou = x.username === GAME.username);

  // Update room info display with current player count
  if (GAME.roomInfo) {
    GAME.roomInfo.playerCount = players.length;
    GAME.roomInfo.players = players;
    updateRoomInfoDisplay(GAME.roomInfo);
  }

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
      <h2>Nice typing 👍</h2>
      <p>${playerData.seconds} seconds</p>
      <p>${playerData.wordsPerMinute} words per minute</p>
      <p>${playerData.charsPerMinute} chars per minute</p>
      <p>${GAME.mistakesOnWords.length} ${GAME.mistakesOnWords.length === 1 ? "mistake" : "mistakes"}: <span style="font-size:12px">${GAME.mistakesOnWords.join(" ")}</span></p>
      <button>Play another round</button>
  `;
  document.querySelector(".everything-above-footer").prepend(newEl);
  document.querySelector("#match-completed-screen button").addEventListener("click", clickStartNewGame);
});

function askUserName() {
  const usernameModal = document.createElement("div");
  usernameModal.id = "username-modal";
  usernameModal.innerHTML = `
        <h2>Enter your name</h2>
        <form id="username-form">
            <input id="user-name-enter-input" style="width: 10ch;" type="text" minlength="1" maxlength="10" tabindex="-1">
            <button type="submit">Submit</button>
        </form>
        <p class="hidden">Names have to be 1 to 10 chars</p>
    `;

  document.querySelector("main").prepend(usernameModal);
  const usernameForm = document.querySelector("#username-form");
  const usernameInput = usernameForm.querySelector("input");
  window.setTimeout(function () {
    usernameInput.focus();
  }, 1);

  usernameInput.value = getRandomName(); // Preset username makes it faster to get goin

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
    const roomId = getRoomIdFromUrl();
    console.log(`🔌 Socket ${socket.id} connected`);
    
    if (socket.connected) {
      socket.emit("join_room", { username, roomId });
      usernameModal.classList.add("hidden");
    } else {
      console.log("⏳ Socket not connected, waiting for reconnection...");
      socket.on('connect', () => {
        console.log("🔄 Socket reconnected, now emitting join_room");
        socket.emit("join_room", { username, roomId });
        usernameModal.classList.add("hidden");
      });
    }
    window.setTimeout(function () {
      userInputEl.focus();
    }, 1);
  }
}

function formatInputForDisplay(string) {
  if (!string || string.length === 0) {
    return "";
  }
  return string.replace(/ /g, '<span class="space">&nbsp;</span>'); // Visualise spaces
}

function updateSentenceProgress(fullSentence, input) {
  // Split the sentence into words and spaces
  const parts = fullSentence.match(/\S+|\s+/g) || [];
  let html = '';
  let progressingFound = false;
  let totalCorrectLen = GAME.totalCorrect ? GAME.totalCorrect.length : 0;
  let correctIdx = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^\s+$/.test(part)) {
      // If this space is completed, add class 'completed-part'. If it's the last completed, add 'last-completed-thing'.
      const isCompletedSpace = !progressingFound && correctIdx + part.length <= totalCorrectLen;
      // Is this the last completed thing?
      const isLastCompletedThing = isCompletedSpace && (correctIdx + part.length === totalCorrectLen);
      html += `<span class="space${isCompletedSpace ? ' completed-part' : ''}${isLastCompletedThing ? ' last-completed-thing' : ''}">${part.replace(/ /g, '&nbsp;')}</span>`;
      correctIdx += part.length;
      continue;
    }
    // Word
    if (!progressingFound && correctIdx + part.length <= totalCorrectLen) {
      // Fully completed word
      const isLastCompletedThing = (correctIdx + part.length === totalCorrectLen);
      html += `<span class="completed-word${isLastCompletedThing ? ' last-completed-thing' : ''}">${part}</span>`;
      correctIdx += part.length;
      continue;
    }
    if (!progressingFound && correctIdx < totalCorrectLen && correctIdx + part.length > totalCorrectLen) {
      // Progressing word (partially completed)
      progressingFound = true;
      const completedPart = part.slice(0, totalCorrectLen - correctIdx);
      const remainingPart = part.slice(totalCorrectLen - correctIdx);
      html += `<span class="progressing-word">`;
      if (completedPart) {
        // Add last-completed-thing if this is the last completed thing in the sentence
        const isLastCompletedThing = (correctIdx + completedPart.length === totalCorrectLen);
        html += `<span class="completed-part${isLastCompletedThing ? ' last-completed-thing' : ''}">${completedPart}</span>`;
      }
      // If user is typing, show their input for the progressing word
      const inputForWord = input.slice(0, remainingPart.length);
      let firstWrongIdx = -1;
      for (let j = 0; j < inputForWord.length; j++) {
        if (inputForWord[j] !== remainingPart[j]) {
          firstWrongIdx = j;
          break;
        }
      }
      if (firstWrongIdx === -1) firstWrongIdx = inputForWord.length;
      // Only render completed-part for the portion that exists in fullSentence
      if (firstWrongIdx > 0) html += `<span class="completed-part">${remainingPart.slice(0, firstWrongIdx)}</span>`;
      // Always render remaining-part for the rest of the word
      if (firstWrongIdx < remainingPart.length) {
        html += `<span class="remaining-part">${remainingPart.slice(firstWrongIdx)}</span>`;
      }
      html += `</span>`;
      correctIdx += part.length;
      continue;
    }
    if (!progressingFound && correctIdx >= totalCorrectLen) {
      // Not started yet
      html += `<span class="word">${part}</span>`;
      correctIdx += part.length;
      continue;
    }
    // After progressing word, just remaining
    html += `<span class="word">${part}</span>`;
    correctIdx += part.length;
  }
  // If nothing completed and no input, show cursor at start
  // if (GAME.totalCorrect.length === 0 && input.length === 0) {
  //   html = `<span class=\"blinky-cursor-in-sentence\">_</span>` + html;
  // }
  return html;
}

//--- DOM event listeners ---
userInputEl.addEventListener('input', () => {
  const input = userInputEl.value;

  let correctInputPart = "";
  let incorrectInputPart = "";
  for (let i = 0; i < input.length; i++) {
    if (input[i] === GAME.nextWordTarget[i]) {
      correctInputPart += input[i];
    } else {
      incorrectInputPart = input.slice(i);
      break;
    }
  }
  goodInputPartEl.innerHTML = formatInputForDisplay(correctInputPart);
  wrongInputPartEl.innerHTML = formatInputForDisplay(incorrectInputPart);

  if (incorrectInputPart?.length > 0) {
    wrongInputPartEl.innerHTML += `<span class="blinky-cursor">|</span>`;
  } else {
    goodInputPartEl.innerHTML += `<span class="blinky-cursor">|</span>`;
  }

  if (GAME.nextWordTarget.indexOf(input) !== 0) {
    GAME.incorrectInput = input;
  } else {
    GAME.incorrectInput = "";
  }

  if (GAME.nextWordTarget.indexOf(input) === 0) {
    GAME.correctInCurrentWord = input;
    GAME.totalCorrect = GAME.correctOldWords + GAME.correctInCurrentWord;
    GAME.remainingTargetText = GAME.totalTargetText.substr(GAME.totalCorrect.length, GAME.totalTargetText.length);
  }

  if (GAME.nextWordTarget === input) {
    const roomId = getRoomIdFromUrl();
    socket.emit("player_move", { word: input, roomId });
    userInputEl.value = "";
    GAME.correctOldWords += GAME.totalTargetTextSplit[0];
    GAME.totalTargetTextSplit.shift();
    GAME.nextWordTarget = GAME.totalTargetTextSplit[0];
  }

  if (GAME.incorrectInput.length > 0) {
    chatForm.classList.add("error");
    sentenceInProgressEl.classList.add("error");
    if (!GAME.mistakesOnWords.includes(GAME.nextWordTarget)) {
      GAME.mistakesOnWords.push(GAME.nextWordTarget);
    }
  } else {
    chatForm.classList.remove("error");
    sentenceInProgressEl.classList.remove("error");
  }

  sentenceInProgressEl.innerHTML = updateSentenceProgress(GAME.totalTargetText, input);
});

function focusChatInput() {
  inputDisplay.classList.add("focused");
  userInputEl.focus();
  if (!goodInputPartEl.querySelector(".blinky-cursor")) {
    goodInputPartEl.innerHTML += `<span class="blinky-cursor">|</span>`;
  }
}

// Act as a proxy input (cause we gotta style the correct vs wrong parts as spans)
const inputDisplay = document.getElementById('input-display');
inputDisplay.addEventListener('click', () => {
  userInputEl.focus();
});
inputDisplay.addEventListener('focus', () => focusChatInput());

//--- Helpers ---
function clickStartNewGame(e) {
  const roomId = getRoomIdFromUrl();
  socket.emit("start_new_game", { roomId });
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

  goodInputPartEl.innerHTML = "";
  wrongInputPartEl.innerHTML = "";

  sentenceInProgressEl.innerHTML = "";
  GAME.totalCorrect = "";
  GAME.remainingTargetText = "";
  GAME.correctInCurrentWord = "";
  GAME.correctOldWords = "";
  GAME.totalTargetText = "";
  GAME.incorrectInput = "";
  GAME.mistakesOnWords = [];

  focusChatInput();
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

  sentenceInProgressEl.innerHTML = updateSentenceProgress(msg, "");
  userInputEl.focus();
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

function getRoomIdFromUrl() {
  const pathSegments = window.location.pathname.split('/');
  // URL format: /room/:roomId
  if (pathSegments[1] === 'room' && pathSegments[2]) {
    return pathSegments[2];
  }
  return null;
}

async function loadRoomInfo() {
  const roomId = getRoomIdFromUrl();
  if (!roomId) {
    console.log("No room ID found in URL");
    return;
  }

  try {
    const response = await fetch(`/api/rooms/${roomId}`);
    if (response.ok) {
      const data = await response.json();
      console.log("Room loaded:", data.room);
      GAME.roomInfo = data.room;
      
      // Update UI elements with room information
      updateRoomInfoDisplay(data.room);
    } else {
      const error = await response.json();
      console.error("Failed to load room:", error.error);
      // Handle room not found - show error in room info
      updateRoomInfoDisplay(null, error.error);
    }
  } catch (error) {
    console.error("Error loading room:", error);
    updateRoomInfoDisplay(null, "Failed to connect to server");
  }
}

function updateRoomInfoDisplay(room, errorMessage = null) {
  const roomNameEl = document.getElementById("room-name");
  const roomPlayerCountEl = document.getElementById("room-player-count");
  const roomCreatorEl = document.getElementById("room-creator");

  if (errorMessage) {
    roomNameEl.textContent = "Room Error";
    roomPlayerCountEl.textContent = errorMessage;
    roomCreatorEl.textContent = "";
    return;
  }

  if (room) {
    roomNameEl.textContent = room.name;
    roomPlayerCountEl.textContent = `Players: ${room.playerCount}`;
    // roomCreatorEl.textContent = `Created by: ${room.creator}`;
  } else {
    roomNameEl.textContent = "Loading room...";
    roomPlayerCountEl.textContent = "Players: --";
    roomCreatorEl.textContent = "Created by: --";
  }
}

//---Initial load---
loadRoomInfo();
askUserName();

