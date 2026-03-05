/**
 * poker-engine.js
 * Texas Hold'em Equity Calculator Web Worker
 */

const SUITS = ['s', 'h', 'd', 'c'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

// 初始化 52 張牌
function createDeck() {
  const deck = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push(r + s);
    }
  }
  return deck;
}

// 評估 5 張牌的絕對牌力 (分數越高牌型越大)
function evaluate5Cards(cards) {
  const ranks = cards.map(c => RANK_VALUES[c[0]]).sort((a, b) => b - a);
  const suits = cards.map(c => c[1]);

  const isFlush = suits.every(s => s === suits[0]);
  
  // 順子檢查 (包含 A-2-3-4-5 特例)
  let isStraight = false;
  let straightHigh = 0;
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
    straightHigh = ranks[0];
  } else if (ranks.join(',') === '14,5,4,3,2') {
    isStraight = true;
    straightHigh = 5;
    ranks[0] = 1;
    ranks.sort((a, b) => b - a);
  }

  // 計算 Rank 頻率
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const freq = Object.entries(counts).map(([r, c]) => ({ rank: parseInt(r), count: c }));
  freq.sort((a, b) => b.count - a.count || b.rank - a.rank);

  // 牌型權重 (Category Score)
  let category = 0;
  if (isStraight && isFlush) category = 8;
  else if (freq[0].count === 4) category = 7;
  else if (freq[0].count === 3 && freq[1].count === 2) category = 6;
  else if (isFlush) category = 5;
  else if (isStraight) category = 4;
  else if (freq[0].count === 3) category = 3;
  else if (freq[0].count === 2 && freq[1].count === 2) category = 2;
  else if (freq[0].count === 2) category = 1;
  else category = 0;

  // 透過位元運算將牌型與 Kickers 編碼為 16 進位整數，便於直接比較大小
  let score = category << 20;
  if (isStraight) {
    score |= straightHigh << 16;
  } else {
    for (let i = 0; i < freq.length; i++) {
      score |= (freq[i].rank << (16 - i * 4));
    }
  }
  return score;
}

// 尋找 7 張牌中的最佳 5 張組合 (C(7,5) 窮舉)
function getBestHandScore(sevenCards) {
  let maxScore = -1;
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 7; j++) {
      const fiveCards = sevenCards.filter((_, idx) => idx !== i && idx !== j);
      const score = evaluate5Cards(fiveCards);
      if (score > maxScore) maxScore = score;
    }
  }
  return maxScore;
}

// Fisher-Yates Shuffle
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// 核心勝率計算
function calculateEquity(playersHoles, board) {
  const fullDeck = createDeck();
  const knownCards = new Set([...playersHoles.flat(), ...board]);
  const remainingDeck = fullDeck.filter(c => !knownCards.has(c));
  
  const cardsNeeded = 5 - board.length;
  let wins = new Array(playersHoles.length).fill(0);
  let ties = new Array(playersHoles.length).fill(0);
  let iterations = 0;

  // 效能優化：發 3 張以上採蒙地卡羅，其餘採完全窮舉
  const useMonteCarlo = cardsNeeded >= 3; 
  const SIMULATION_COUNT = 15000;

  if (useMonteCarlo) {
    for (let i = 0; i < SIMULATION_COUNT; i++) {
      shuffle(remainingDeck);
      const runout = remainingDeck.slice(0, cardsNeeded);
      const currentBoard = [...board, ...runout];
      evaluateIteration(playersHoles, currentBoard, wins, ties);
      iterations++;
    }
  } else {
    function enumerate(deckObj, currentBoard, needed) {
      if (needed === 0) {
        evaluateIteration(playersHoles, currentBoard, wins, ties);
        iterations++;
        return;
      }
      for (let i = 0; i < deckObj.length; i++) {
        const nextBoard = [...currentBoard, deckObj[i]];
        const nextDeck = deckObj.slice(i + 1);
        enumerate(nextDeck, nextBoard, needed - 1);
      }
    }
    enumerate(remainingDeck, board, cardsNeeded);
  }

  return playersHoles.map((_, idx) => ({
    win: (wins[idx] / iterations) * 100,
    tie: (ties[idx] / iterations) * 100,
    equity: ((wins[idx] + ties[idx] / 2) / iterations) * 100
  }));
}

// 單局結果判定
function evaluateIteration(playersHoles, board, wins, ties) {
  const scores = playersHoles.map(hole => getBestHandScore([...hole, ...board]));
  const maxScore = Math.max(...scores);
  
  const winners = [];
  scores.forEach((s, idx) => {
    if (s === maxScore) winners.push(idx);
  });

  if (winners.length === 1) {
    wins[winners[0]]++;
  } else {
    winners.forEach(w => ties[w]++);
  }
}

// Worker 通訊介面
self.addEventListener('message', function(e) {
  const { id, players, board } = e.data;
  
  try {
    const results = calculateEquity(players, board || []);
    self.postMessage({ id, status: 'success', results });
  } catch (err) {
    self.postMessage({ id, status: 'error', error: err.message });
  }
});
