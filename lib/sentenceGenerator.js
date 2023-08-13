const sleepyHollow = require("./sleepyHollow");
const crimeAndPunishment = require("./crimeAndPunishment");
// const txtgen = require("txtgen");

const books = [
  sleepyHollow,
  crimeAndPunishment
]

module.exports = {
  generate: () => {
    const randomBook = books[Math.floor(Math.random() * books.length)];
    const randomSentence = randomBook.sentences[Math.floor(Math.random() * randomBook.sentences.length)];
    return randomSentence;
  },
  // sentenceGenerator: txtGen() => {
  //   return txtgen.sentence();
  // }   
}

