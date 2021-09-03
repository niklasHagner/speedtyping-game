const sentenceGenerator = require("txtgen");
var stringSimilarity = require('string-similarity');
var playerManager = require("./playerManager.js");

module.exports = {
    initialPrompt,
    startWordGame,
    stop,
    updateSentences,
    movePlayer
};

let intervalObj;

const GAME = {
    intervalMs: 20000,
    sentenceCounter: 0,
    currentSentences: [],
    newSentenceCreatedTime: 0
}

function initialPrompt(io, socketId) {
    console.log("start game");

     
    const dataToEmit = { target: socketId };
    
    io.emit(
        "chat_message",
        `<div class="game-message"><icon>📜</icon>${socketId} Start game with the command <span class="target-sentence">/start</span></div>` 
        );
}

function startWordGame(io) {
    randomizeWord(io);
}

function updateSentences(io, inputSentence, socket) {
    const matchingIndex = GAME.currentSentences.indexOf(inputSentence);

    const similarityFactors = [];
    GAME.currentSentences.forEach((existingSentence) => {
        const obj = { sentence: existingSentence, similarityFactor: stringSimilarity.compareTwoStrings(existingSentence, inputSentence) };
        similarityFactors.push(obj); 
    });
    similarityFactors.sort((a,b) => a.similarityFactor - b.similarityFactor).reverse()[0]
    const mostSimilarObj = similarityFactors[0];

    const similarityPercentage = Math.round(mostSimilarObj.similarityFactor * 100);
    console.log("mostSimilarObj:", similarityPercentage, "%", "input:", inputSentence);
    if (mostSimilarObj.similarityFactor < 0.5) {
        return;
    }

    let seconds = 0;
    if (GAME.newSentenceCreatedTime) {
        const now = new Date();
        seconds = Math.round((now.getTime() - GAME.newSentenceCreatedTime.getTime()) / 1000);
    }
    const scoreDeduction = seconds * 2.5;
    let score = Math.max(similarityPercentage - scoreDeduction, 1);
    score = Math.floor(score);
    console.log(similarityPercentage, scoreDeduction, score);

    console.log("matching text:", inputSentence, "score:", score);
    const player = playerManager.updateScore(socket.username, score);

    const wordPerMinute = (inputSentence.split(" ").length / seconds) * 60;

    let message = `<icon>⭐</icon> <strong class='game-info'>Good, ${socket.username}, Words per minute:${wordPerMinute}, ${similarityPercentage}% correct in ${seconds}s!</strong> <span style="color: orange"></span>` //${mostSimilarObj.sentence};
    message += `for ${score} points `;
    if (player.score > score) {
        message += `(total:${player.score})`
    }

    io.emit(
        "chat_message",
        message
    );
    
    const topPlayers = playerManager.getAllPlayersSortedByScore().slice(0,5);
    const highScoreStr = topPlayers.map(x => `<icon>${x.avatar}</icon><span>${x.username}:</span> <span class="score">${x.score} pts</span>`).join("  ");
    io.emit(
        "highscore",
        highScoreStr
    )

    GAME.currentSentences.splice(matchingIndex, 1);
    GAME.newSentenceCreatedTime = new Date();
    randomizeWord(io);
}


function gameLoop(io) {
    // intervalObj = setInterval(()=> { randomizeWord(io) }, GAME.intervalMs);
    // const timeoutObj = setTimeout(() => {
    //     console.log('starting gameLoop');
    // }, 1500);
    // clearTimeout(timeoutObj);
}

function randomizeWord(io) {
    const sentence = sentenceGenerator.sentence();
    console.log("sentence" + GAME.sentenceCounter + ": ", sentence);
    GAME.sentenceCounter++;
    GAME.currentSentences.push(sentence);
    io.emit(
        "chat_message",
        `<div class="game-message game-message--target"><icon>📜</icon> <strong>Type this text:</strong> <span class="target-sentence">${sentence}</span></div>`
    );
    io.emit(
        "target_sentence",
        `${sentence}`
    );
    GAME.newSentenceCreatedTime = new Date();
}

function stop() {
    clearInterval(intervalObj);
}

function movePlayer(io, username, wordLength) {
    const player = playerManager.getPlayerByName(username);
    if (!player) {
        console.log("player missing for", username);
        return;
    }
    console.log(player, "moving");

    const distance = wordLength / GAME.currentSentences[0].length;

    let players = playerManager.getPlayers();
    players = players.map(x => { x.distance = distance; return x});
    playerManager.setPlayers(players);
    io.emit(
        "avatar_move",
        {
            players: players
        }
    )

    io.emit(
        "avatar_move",
        distance
    );
}