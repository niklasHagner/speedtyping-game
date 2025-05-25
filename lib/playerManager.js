let players = [];

const avatars = [
  { emoji: "🐕", occupied: false },
  { emoji: "🐖", occupied: false },
  { emoji: "🐫", occupied: false },
  { emoji: "🦏", occupied: false },
  { emoji: "🦇", occupied: false },
  { emoji: "🐴", occupied: false },
  { emoji: "🐰", occupied: false },
  { emoji: "🐿️", occupied: false },
  { emoji: "🦌", occupied: false },
  { emoji: "🦕", occupied: false },
  { emoji: "🐠", occupied: false },
  { emoji: "🐅", occupied: false },
  { emoji: "🐤", occupied: false },
  { emoji: "🦖", occupied: false },
  { emoji: "🐋", occupied: false },
  { emoji: "🦑", occupied: false },
  { emoji: "🐔", occupied: false },
  { emoji: "🦩", occupied: false },
  { emoji: "🦃", occupied: false },
  { emoji: "🦘", occupied: false },
  { emoji: "🐇", occupied: false },
  { emoji: "🦆", occupied: false },
];

function getAvatar() {
  const availableAvatars = avatars.filter(x => !x.occupied);
  if (availableAvatars.length === 0) { //reset availability
    avatars.forEach(x => x.occupied = false);
  }
  const ix = Math.floor(Math.random() * availableAvatars.length);
  avatars[ix].occupied = true;
  return avatars[ix].emoji;
}

function setUpNewPlayer(socket) {
  const player = {
    username: socket.username,
    socketId: socket.id,
    avatar: getAvatar(),
    score: 0,
    percentageOfString_int: 0,
    charsSoFar: 0,
    seconds: 0,
    wordsSoFar: 0,
    wordsPerMinute: 0,
  };
  console.log("New player", player);
  players.push(player);
  return player;
}

const resetPlayers = function () {
  players.forEach(x => {
    x.score = 0;
    x.percentageOfString_int = 0;
    x.charsSoFar = 0;
    x.wordsSoFar = 0;
    x.seconds = 0;
    x.wordsPerMinute = 0;
    x.percentageOfWords_int = 0;
    x.charsPerMinute = 0;
  });
}

const getPlayerByName = function (username) {
  return players.find(x => x.username === username);
}

const getPlayerIndexByUserName = function (username) {
  return players.indexOf(getPlayerByName(username));
}

const playerLeavesGame = function (username) {
  return players.splice(getPlayerIndexByUserName(username), 1);
}

const updateScore = function (username, score) {
  const ix = getPlayerIndexByUserName(username);
  players[ix].score += score;
  return players[ix];
}

const getPlayers = function () {
  return players;
}

const setPlayers = function (x) {
  players = x;
  return players;
}

const getAllPlayersSortedByScore = function () {
  return players.sort((a, b) => a.score - b.score).reverse();
}

module.exports = {
  setUpNewPlayer,
  resetPlayers,
  getPlayerByName,
  getPlayerIndexByUserName,
  playerLeavesGame,
  updateScore,
  getPlayers,
  setPlayers,
  getAllPlayersSortedByScore,
};