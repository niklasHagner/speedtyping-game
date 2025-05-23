const playerManager = require("./playerManager.js");
const sentenceGenerator = require("./sentenceGenerator.js");

const GAME = {
  sentenceCounter: 0,
  currentSentence: "",
  newSentenceCreatedTime: 0
}

function startNewMatch(io) {
  generateNewTargetSentence(io);

  io.emit(
    "target_sentence",
    `${GAME.currentSentence}`
  );

  io.emit(
    "server_message",
    `START TYPING!`
  );
}

function generateNewTargetSentence(io) {
  const sentence = sentenceGenerator.generate();
  GAME.currentSentence = sentence;
  GAME.newSentenceCreatedTime = new Date();
}

function movePlayer(io, username, word, playerSocketId) {

  const elapsedTime = GAME?.newSentenceCreatedTime?.getTime();
  if (elapsedTime === undefined || elapsedTime === null) { // Prevent possible issues with player input before sentence has been generated
    return;
  }
  const wordLength = word.length;
  const player = playerManager.getPlayerByName(username);
  if (!player) {
    console.error("player missing for", username);
    return;
  }

  player.wordsSoFar++;
  player.charsSoFar += wordLength;

  const progressPercentageInt = player.charsSoFar / GAME.currentSentence.length;
  player.percentageOfString_int = (progressPercentageInt) * 100;

  const targetWordCount = GAME.currentSentence.split(" ").length;
  player.percentageOfWords_int = (player.wordsSoFar / targetWordCount) * 100;

  const seconds = Math.round((new Date().getTime() - GAME.newSentenceCreatedTime.getTime()) / 1000);
  player.seconds = seconds;
  player.wordsPerMinute = Math.floor((player.wordsSoFar / seconds) * 60);
  player.charsPerMinute = Math.floor((player.charsSoFar / seconds) * 60);

  const shouldLog = word != " ";
  if (shouldLog) {
    console.log("\nseconds:", seconds, "word:", word);
    console.log("socketId", playerSocketId, "player:", player);
  }

  let players = playerManager.getPlayers();
  io.emit(
    "show_players",
    {
      players: players
    }
  )

  const playerIsFinished = player.charsSoFar === GAME.currentSentence.length;
  if (playerIsFinished) {
    const data = player;
    console.log("FINISHED!", playerSocketId);
    io.to(playerSocketId).emit("player_finished", data);
  }
}

const START_GAME_INSTANTLY = true;

module.exports = {
  startNewMatch,
  movePlayer,
  considerStartingGame: function (io) {
    //const ENOUGH_PLAYERS_TO_START
    //if (playerManager.getPlayers().length >= ENOUGH_PLAYERS_TO_START) {

    playerManager.resetPlayers();
    io.emit("show_players", { players: playerManager.getPlayers() })
    io.emit("prep_new_match", {})
    console.log("reset players:", playerManager.getPlayers());

    const intervalMs = 1000;
    let intervalCounter = 0;
    const MAXCOUNT = 4;
    let remainingTimes = MAXCOUNT + 1;

    if (START_GAME_INSTANTLY) {
      io.emit("server_message", `Starting game instantly`);
      startNewMatch(io);
    } else {
      const intervalObj = setInterval(() => {
        intervalCounter++;
        remainingTimes -= 1;
        io.emit("server_message", `Starting in ${remainingTimes}`);
        console.log(`Send server-message: starting in ${remainingTimes}`);
        if (intervalCounter >= MAXCOUNT) {
          intervalCounter = 0;
          console.log("clear interval");
          clearInterval(intervalObj);
          startNewMatch(io);
        }
      }, intervalMs);
    }
  }
};