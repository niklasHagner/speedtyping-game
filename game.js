const sentenceGenerator = require("txtgen");
var stringSimilarity = require('string-similarity');
var playerManager = require("./playerManager.js");

module.exports = {
    start,
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

function start(io) {
    console.log("start game");
    randomizeWord(io);
    //gameLoop(io);
}

function updateSentences(io, inputSentence, socket) {
    const matchingIndex = gameConfig.currentSentences.indexOf(inputSentence);

    const similarityFactors = [];
    gameConfig.currentSentences.forEach((existingSentence) => {
        const obj = { sentence: existingSentence, similarityFactor: stringSimilarity.compareTwoStrings(existingSentence, inputSentence) };
        similarityFactors.push(obj); 
    });
    const highestSimilary = similarityFactors.sort((a,b) => a.similarityFactor - b.similarityFactor).reverse()[0];
    console.log("highestSimilary:", Math.round(highestSimilary.similarityFactor * 100)/100, "input:", inputSentence);
    if (highestSimilary.similarityFactor < 0.5) {
        return;
    }

    let seconds = 0;
    if (gameConfig.newSentenceCreatedTime) {
        const now = new Date();
        seconds = Math.round((now.getTime() - gameConfig.newSentenceCreatedTime.getTime()) / 1000);
    }
    const similarityScore = Math.round(highestSimilary.similarityFactor * 100);
    const scoreDeduction = seconds * 2.5;
    const score = Math.max(similarityScore - scoreDeduction, 1);
    console.log(similarityScore, scoreDeduction, score);

    console.log("matching text:", inputSentence, "score:", score);
    const player = playerManager.updateScore(socket.username, score);
    

    let message = `<icon>⭐</icon> <strong class='game-info'>Good job ${socket.username}, ${similarityScore}% correct in ${seconds}s!</strong> <span style="color: orange"></span>` //${highestSimilary.sentence};
    message += `for ${score} points `;
    if (player.score > score) {
        message += `(total:${player.score})`
    }

    io.emit(
        "chat_message",
        message
    );

    gameConfig.currentSentences.splice(matchingIndex, 1);
    gameConfig.newSentenceCreatedTime = new Date();
    randomizeWord(io);
}


function gameLoop(io) {
    
    // intervalObj = setInterval(()=> { randomizeWord(io) }, gameConfig.intervalMs);

    // const timeoutObj = setTimeout(() => {
    //     console.log('starting gameLoop');
    // }, 1500);
    // clearTimeout(timeoutObj);
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