const sentenceGenerator = require("txtgen");
var playerManager = require("./playerManager.js");

module.exports = {
    initialPrompt,
    startNewMatch,
    movePlayer
};

const GAME = {
    sentenceCounter: 0,
    currentSentence: "",
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

function startNewMatch(io) {
    randomizeWord(io);
}

function randomizeWord(io) {
    const sentence = sentenceGenerator.sentence();
    GAME.currentSentence= sentence;
    io.emit(
        "target_sentence",
        `${sentence}`
    );
    GAME.newSentenceCreatedTime = new Date();
}

function movePlayer(io, username, word) {
    const wordLength = word.length;
    const player = playerManager.getPlayerByName(username);
    if (!player) {
        console.log("player missing for", username);
        return;
    }


    player.wordsSoFar++;
     player.charsSoFar += wordLength;
    
    const progressPercentageInt = player.charsSoFar / GAME.currentSentence.length;
    player.percentageOfString_int = (progressPercentageInt) * 100;
    
    const targetWordCount = GAME.currentSentence.split(" ").length;
    player.percentageOfWords_int = (player.wordsSoFar / targetWordCount) * 100;

    const seconds = Math.round((new Date().getTime() - GAME.newSentenceCreatedTime.getTime()) / 1000);
    player.wordsPerMinute = Math.floor((player.wordsSoFar / seconds) * 60);
    player.charsPerMinute = Math.floor((player.charsSoFar / seconds) * 60);

    const logWord = word === " " ? "SPACE" : word;
    if (logWord !== "SPACE") {
        console.log("\nseconds:", seconds, "word:", logWord);
        console.log("player:", player);
    }
    
    let players = playerManager.getPlayers();
    io.emit(
        "show_players",
        {
            players: players
        }
    )
}