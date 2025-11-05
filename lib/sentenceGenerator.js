const sleepyHollow = require("./sentences/sleepyHollow");
const crimeAndPunishment = require("./sentences/crimeAndPunishment");

const books = [
  sleepyHollow,
  crimeAndPunishment
]

module.exports = {
  generate: () => {
    const randomBook = books[Math.floor(Math.random() * books.length)];
    const randomSentence = randomBook[Math.floor(Math.random() * randomBook.length)];
    return randomSentence;
  },
}

