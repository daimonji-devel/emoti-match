import { RandomArrayElementSelector } from './RandomArrayElementSelector.js';


/**
 * convenience function for falling asleep in async mode.
 * @param {number} ms: number of milli seconds to sleep.
 * @returns {Promise} which resoves after the specified time.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class EmotiMatchServer {
  #players;
  #emotis;
  #roundId = 1;
  #round;
  #scores;
  #playerInfos;
  #isFinished = false;
  #options = {
    rounds: 5,
    roundPrepareDelay: 2000,  // delay before preparation of round
    roundStartDelay: 3000,    // delay before start of round
    roundMaxTime: 10000,      // maximum waiting time after start
    penaltyTime: 2000,        // penalty time on wrong answer
    gameFinishDelay: 10000,   // delay before end of game
    cardSize: 3,
    winCardSizeAdd: 1,
    // codePointRanges: [{start: 0x30, end: 0x39}, {start: 0x41, end: 0x5a}, {start: 0x61, end: 0x7a}],
    codePointRanges: [{start: 0x1F600, end: 0x1F637}],
  };

  constructor(players, options) {
    this.#players = players;
    if (options) {
      this.#options.assign(options);
    }
    this.#emotis = this.#generateEmotis();
    this.#roundId = 1;
    this.#round = null;
    this.#scores = [];
    this.#playerInfos = [];
    for (let pid = 0; pid < players; pid++) {
      this.#scores.push(0);
      this.#playerInfos.push({
        playerId: pid,
        scores: this.#scores,
      });
    }
  }

  #generateEmotis() {
    let codePointRanges = this.#options['codePointRanges'];
    let emotiSet = new Set();
    for (let { start, end } of codePointRanges) {
      for (let codePoint = start; codePoint <= end; codePoint++) {
        emotiSet.add(String.fromCodePoint(codePoint));
      }
    }
    return [...emotiSet].sort();
  }

  async start(startedGame, preparedRound, startedRound, finishedRound, finishedGame) {
    startedGame(this.#playerInfos);
    while (this.#roundId <= this.#options['rounds']) {
      await sleep(this.#options['roundPrepareDelay']);
      preparedRound(this.#prepareRound());
      await sleep(this.#options['roundStartDelay']);
      startedRound(this.#startRound());
      await Promise.any([
        sleep(this.#options['roundMaxTime']),
        this.#round['playerFinishedPromise']
      ]);
      finishedRound(this.#finishRound());
      this.#roundId++;
    }
    await sleep(this.#options['gameFinishDelay']);
    finishedGame(this.#finishGame());
    this.#isFinished = true;
  }

  messageFromPlayer(playerId, data, callback) {
    let time = Date.now();
    if ('solution' in data) {
      if (this.#round && (this.#round['roundInfo']['status'] == 'started')) {
        if (this.#round['penaltyEnds'][playerId] > time) {
          callback({solution: 'rejected', reason: 'penalty'})
        }
        else if (data['solution'] == this.#round['solution']) {
          this.#onPlayerFoundSolution(playerId);
          callback({solution: 'correct'});
        }
        else {
          this.#round['penaltyEnds'][playerId] = time + this.#options['penaltyTime'];
          callback({solution: 'incorrect', action: 'penalty'});
        }
      }
      // ignore if solution proposal arrives outside a started round
    }
    // ignore all other messages
  }

  isFinished() {
    return this.#isFinished;
  }

  #prepareRound() {
    let roundInfo = {
      status: 'prepared',
      scores: Array(this.#players).fill(0),
      task: 'match emotis',
    }
    let [ solution, cards ] = this.#generateCards();

    this.#round = {
      roundInfo: roundInfo,
      solution: solution,
      cards: cards,
      penaltyEnds: Array(this.#players).fill(0),
    }

    for (let playerInfo of this.#playerInfos) {
      playerInfo['roundInfo'] = roundInfo;
      playerInfo['card'] = cards[playerInfo['playerId']];
    }
    return this.#playerInfos;
  }

  #generateCards() {
    let selector = new RandomArrayElementSelector(this.#emotis);
    let solution = selector.selectOne();
    let cards = [];
    for (let pid = 0; pid < this.#players; pid++) {
      let cardSize = Math.round(
        this.#options['cardSize'] + this.#scores[pid] * this.#options['winCardSizeAdd']
      );
      let card = [solution, ...selector.selectArray(cardSize - 1)];
      cards.push((new RandomArrayElementSelector(card)).selectArray(cardSize));
    }
    return [ solution, cards ];
  }

  #startRound() {
    let roundInfo = this.#round['roundInfo'];
    roundInfo['status'] = 'started';
    roundInfo['cards'] = this.#round['cards'];
    // when a player finishes the round, this.#round['playerFinished'] has to be called.
    // And by this, the promise this.#round['playerFinishedPromise'] resolves.
    this.#round['playerFinishedPromise'] = new Promise((resolve) => {
      this.#round['playerFinished'] = resolve;
    });
    return this.#playerInfos;
  }

  #onPlayerFoundSolution(playerId) {
    let roundInfo = this.#round['roundInfo'];
    roundInfo['scores'][playerId] += 1;
    roundInfo['winnerId'] = playerId;
    this.#round['playerFinished']();
  }

  #finishRound() {
    let roundInfo = this.#round['roundInfo'];
    roundInfo['status'] = 'finished';
    roundInfo['solution'] = this.#round['solution'];
    let roundScores = roundInfo['scores'];
    for (let pid = 0; pid < this.#players; pid++) {
      this.#scores[pid] += roundScores[pid];
    }
    return this.#playerInfos;
  }

  #finishGame() {
    let ranks = this.#determineRanks(this.#scores);
    for (let pid = 0; pid < this.#players; pid++) {
      let playerInfo = this.#playerInfos[pid];
      delete playerInfo['roundInfo'];
      playerInfo['ranks'] = ranks;
    }
    this.#isFinished = true;
    return this.#playerInfos;
  }

  /**
   * creates an array of ranks from an array of scores.
   * Highest score leads to rank 1 (winner). If there is more than one players with the same rank,
   * the next ranks are skipped (nextRank = rank + numberOfPlayersWithRank).
   * @param {Array<Number>} scores scores of players.
   * @returns {Array<Number>} ranks of players.
   */
  #determineRanks(scores) {
    let scoreMap = {};
    for (let pid = 0; pid < this.#players; pid++) {
      let score = scores[pid];
      if (!(score in scoreMap)) {
        scoreMap[score] = [];
      }
      scoreMap[score].push(pid);
    }
    let ranks = Array(this.#players);
    let rank = 1;
    for (let [ score, pids ] of Object.entries(scoreMap).sort(entry => -entry[0])) {
      for (let pid of pids) {
        ranks[pid] = rank;
      }
      rank += pids.length;
    }
    return ranks;
  }

}


export { EmotiMatchServer };
