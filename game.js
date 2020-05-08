// const request = require("request");
const wordBank = require("./wordBank.js");
var stringSimilarity = require('string-similarity');

module.exports = {
    start,
    stop,
    updateSentences
};

let intervalObj;
const words = wordBank.getWords();

const gameConfig = {
    intervalMs: 20000,
    sentenceCounter: 0,
    currentSentences: []
}

function start(io) {
    console.log("start game");
    randomizeWord(io);
    //gameLoop(io);
}

function updateSentences(io, inputSentence) {
    const matchingIndex = gameConfig.currentSentences.indexOf(inputSentence);

    const similarityFactors = [];
    gameConfig.currentSentences.forEach((existingSentence) => {
        const obj = { sentence: existingSentence, similarityFactor: stringSimilarity.compareTwoStrings(existingSentence, inputSentence) };
        similarityFactors.push(obj); 
    });
    const highestSimilary = similarityFactors.sort((a,b) => a.similarityFactor - b.similarityFactor).reverse()[0];
    console.log("highestSimilary:", highestSimilary, "input:", inputSentence);
    if (highestSimilary.similarityFactor < 0.5) {
        return;
    }

    const score = Math.round(highestSimilary.similarityFactor * 100);
    console.log("matching word!", inputSentence);
    io.emit(
        "chat_message",
        `<strong class='game-info'>Guessed word with ${score}% match.</strong> <span style="color: orange">${highestSimilary.sentence}</span>`
    );

    gameConfig.currentSentences.splice(matchingIndex, 1);
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
    let wordArray = [];
    for(let i =0; i<3; i++) {
        wordArray.push(words[Math.floor(Math.random() * words.length)]);
    }
    const sentence = wordArray.join(" ");
    console.log("sentence" + gameConfig.sentenceCounter + ": ", sentence);
    gameConfig.sentenceCounter++;
    gameConfig.currentSentences.push(sentence);
    io.emit(
        "chat_message",
        `<strong class='game-info'>Type this word:</strong> ${sentence}`
    );
}

function stop() {
    clearInterval(intervalObj);
}