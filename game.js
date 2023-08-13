const sentenceGenerator = require("txtgen");
var stringSimilarity = require("./lib/stringSimilarity.js");
var playerManager = require("./playerManager.js");

module.exports = {
  initialPrompt,
  startWordGame,
  stop,
  updateSentences
};

let intervalObj;

const gameConfig = {
  intervalMs: 20000,
  sentenceCounter: 0,
  currentSentences: [],
  newSentenceCreatedTime: 0
}

function initialPrompt(io) {
  console.log("start game");

  io.emit(
    "chat_message",
    `<div class="game-message"><icon>📜</icon> Start game with the command <span class="target-sentence">/start</span></div>`
  );
}

function startWordGame(io) {
  randomizeWord(io);
}

function updateSentences(io, inputSentence, socket) {
  const matchingIndex = gameConfig.currentSentences.indexOf(inputSentence);

  const similarityFactors = [];
  gameConfig.currentSentences.forEach((existingSentence) => {
    const obj = { sentence: existingSentence, similarityFactor: stringSimilarity.compareTwoStrings(existingSentence, inputSentence) };
    similarityFactors.push(obj);
  });
  let mostSimilarObj;
  if (similarityFactors.length > 1) {
    similarityFactors.sort((a, b) => a.similarityFactor - b.similarityFactor).reverse()[0];
  } else {
    mostSimilarObj = similarityFactors[0];
  }

  const similarityPercentage = Math.round(mostSimilarObj.similarityFactor * 100);
  console.log("mostSimilarObj:", similarityPercentage, "%", "input:", inputSentence);
  if (mostSimilarObj.similarityFactor < 0.5) {
    return;
  }

  let seconds = 0;
  if (gameConfig.newSentenceCreatedTime) {
    const now = new Date();
    seconds = Math.round((now.getTime() - gameConfig.newSentenceCreatedTime.getTime()) / 1000);
  }
  const scoreDeduction = seconds * 2.5;
  const score = Math.max(similarityPercentage - scoreDeduction, 1);
  console.log(similarityPercentage, scoreDeduction, score);

  console.log("matching text:", inputSentence, "score:", score);
  const player = playerManager.updateScore(socket.username, score);

  let message = `<icon>⭐</icon> <strong class='game-info'>Good job ${socket.username}, ${similarityPercentage}% correct in ${seconds}s!</strong> <span style="color: orange"></span>` //${mostSimilarObj.sentence};
  message += `for ${score} points `;
  if (player.score > score) {
    message += `(total:${player.score})`
  }

  io.emit(
    "chat_message",
    message
  );

  const topPlayers = playerManager.getAllPlayersSortedByScore().slice(0, 3);
  const highScoreStr = topPlayers.map(x => `<icon>${x.avatar}</icon> ${x.username}: ${x.score} pts`).join("  ");
  io.emit(
    "highscore",
    highScoreStr
  )

  gameConfig.currentSentences.splice(matchingIndex, 1);
  gameConfig.newSentenceCreatedTime = new Date();
  randomizeWord(io);
}

function randomizeWord(io) {
  const sentence = sentenceGenerator.sentence();
  console.log("sentence" + gameConfig.sentenceCounter + ": ", sentence);
  gameConfig.sentenceCounter++;
  gameConfig.currentSentences.push(sentence);
  io.emit(
    "chat_message",
    `<div class="game-message game-message--target"><icon>📜</icon> <strong>Type this text:</strong> <span class="target-sentence">${sentence}</span></div>`
  );
  gameConfig.newSentenceCreatedTime = new Date();
}

function stop() {
  clearInterval(intervalObj);
}