module.exports = {
  setUpNewPlayer,
  getPlayerByName,
  leave,
  updateScore,
  getAllPlayersSortedByScore
};

const players = [];

const avatars = [
  {emoji:"🐸", occupied: false},
  {emoji:"🐷", occupied: false},
  {emoji:"🐹", occupied: false},
  {emoji:"🦊", occupied: false},
  {emoji:"🐯", occupied: false},
  {emoji:"🐴", occupied: false},
  {emoji:"🐰", occupied: false},
  {emoji:"🐿️", occupied: false},
  {emoji:"🐨", occupied: false},
  {emoji:"🐼", occupied: false},
  {emoji:"🐮", occupied: false},
  {emoji:"🐱", occupied: false},
  {emoji:"🐤", occupied: false},
  {emoji:"🦖", occupied: false},
  {emoji:"🐋", occupied: false},
  {emoji:"🦉", occupied: false},
  {emoji:"🐔", occupied: false},
  {emoji:"🐻", occupied: false},
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

function setUpNewPlayer(username) {
  const avatar = getAvatar();
  const score = 0;

  const player = { username, avatar, score };
  console.log(player);
  players.push(player);
  return player;
}

function getPlayerByName(username) {
  return players.find(x => x.username === username);
}

function getPlayerIndexByUserName(username) {
  return players.indexOf(getPlayerByName(username));
}

function leave(username) {
  return players.splice(getPlayerIndexByUserName(username), 1);
}

function updateScore(username, score) {
  const ix = getPlayerIndexByUserName(username);
  players[ix].score += score;
  return players[ix];
}

function getAllPlayersSortedByScore() {
  return players.sort((a,b) => a.score - b.score).reverse();
}