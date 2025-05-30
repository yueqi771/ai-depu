import { Card, CardSuit, CardRank } from '../types';
import { GameConfig } from '../config/GameConfig';

export interface HandRank {
  rank: number;
  name: string;
  cards: Card[];
  kickers: Card[];
}

export class PokerLogic {
  /**
   * 创建一副标准扑克牌（52张）
   */
  static createDeck(): Card[] {
    const deck: Card[] = [];
    const suits = [CardSuit.SPADES, CardSuit.HEARTS, CardSuit.DIAMONDS, CardSuit.CLUBS];

    for (const suit of suits) {
      for (let rank = 2; rank <= 14; rank++) {
        deck.push({
          suit,
          rank: rank as CardRank,
          id: `${suit}_${rank}`,
        });
      }
    }

    return deck;
  }

  /**
   * 洗牌
   */
  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * 计算最佳的5张牌组合（从7张牌中选择）
   */
  static getBestHand(cards: Card[]): HandRank {
    if (cards.length < 5) {
      throw new Error('需要至少5张牌来计算牌型');
    }

    let bestHand: HandRank | null = null;

    // 生成所有可能的5张牌组合
    const combinations = this.getCombinations(cards, 5);

    for (const combo of combinations) {
      const hand = this.evaluateHand(combo);

      if (!bestHand || this.compareHands(hand, bestHand) > 0) {
        bestHand = hand;
      }
    }

    return bestHand!;
  }

  /**
   * 评估5张牌的牌型
   */
  static evaluateHand(cards: Card[]): HandRank {
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);

    // 检查同花顺和皇家同花顺
    const flush = this.isFlush(sorted);
    const straight = this.isStraight(sorted);

    if (flush && straight) {
      if (sorted[0].rank === CardRank.ACE && sorted[1].rank === CardRank.KING) {
        return {
          rank: GameConfig.HAND_RANKS.ROYAL_FLUSH,
          name: '皇家同花顺',
          cards: sorted,
          kickers: [],
        };
      }
      return {
        rank: GameConfig.HAND_RANKS.STRAIGHT_FLUSH,
        name: '同花顺',
        cards: sorted,
        kickers: [],
      };
    }

    // 检查四条
    const fourOfAKind = this.getFourOfAKind(sorted);
    if (fourOfAKind) {
      return {
        rank: GameConfig.HAND_RANKS.FOUR_OF_A_KIND,
        name: '四条',
        cards: fourOfAKind.cards,
        kickers: fourOfAKind.kickers,
      };
    }

    // 检查葫芦
    const fullHouse = this.getFullHouse(sorted);
    if (fullHouse) {
      return {
        rank: GameConfig.HAND_RANKS.FULL_HOUSE,
        name: '葫芦',
        cards: fullHouse.cards,
        kickers: [],
      };
    }

    // 检查同花
    if (flush) {
      return {
        rank: GameConfig.HAND_RANKS.FLUSH,
        name: '同花',
        cards: sorted,
        kickers: [],
      };
    }

    // 检查顺子
    if (straight) {
      return {
        rank: GameConfig.HAND_RANKS.STRAIGHT,
        name: '顺子',
        cards: sorted,
        kickers: [],
      };
    }

    // 检查三条
    const threeOfAKind = this.getThreeOfAKind(sorted);
    if (threeOfAKind) {
      return {
        rank: GameConfig.HAND_RANKS.THREE_OF_A_KIND,
        name: '三条',
        cards: threeOfAKind.cards,
        kickers: threeOfAKind.kickers,
      };
    }

    // 检查两对
    const twoPair = this.getTwoPair(sorted);
    if (twoPair) {
      return {
        rank: GameConfig.HAND_RANKS.TWO_PAIR,
        name: '两对',
        cards: twoPair.cards,
        kickers: twoPair.kickers,
      };
    }

    // 检查一对
    const onePair = this.getOnePair(sorted);
    if (onePair) {
      return {
        rank: GameConfig.HAND_RANKS.ONE_PAIR,
        name: '一对',
        cards: onePair.cards,
        kickers: onePair.kickers,
      };
    }

    // 高牌
    return {
      rank: GameConfig.HAND_RANKS.HIGH_CARD,
      name: '高牌',
      cards: [sorted[0]],
      kickers: sorted.slice(1),
    };
  }

  /**
   * 比较两手牌的大小
   * 返回值：1表示hand1大，-1表示hand2大，0表示相等
   */
  static compareHands(hand1: HandRank, hand2: HandRank): number {
    // 先比较牌型等级
    if (hand1.rank > hand2.rank) return 1;
    if (hand1.rank < hand2.rank) return -1;

    // 牌型相同，比较具体牌值
    for (let i = 0; i < hand1.cards.length; i++) {
      if (hand1.cards[i].rank > hand2.cards[i].rank) return 1;
      if (hand1.cards[i].rank < hand2.cards[i].rank) return -1;
    }

    // 比较踢脚牌
    for (let i = 0; i < hand1.kickers.length; i++) {
      if (hand1.kickers[i].rank > hand2.kickers[i].rank) return 1;
      if (hand1.kickers[i].rank < hand2.kickers[i].rank) return -1;
    }

    return 0;
  }

  /**
   * 获取所有可能的组合
   */
  private static getCombinations(cards: Card[], size: number): Card[][] {
    const combinations: Card[][] = [];

    const combine = (start: number, combo: Card[]): void => {
      if (combo.length === size) {
        combinations.push([...combo]);
        return;
      }

      for (let i = start; i < cards.length; i++) {
        combo.push(cards[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    };

    combine(0, []);
    return combinations;
  }

  /**
   * 检查是否为同花
   */
  private static isFlush(cards: Card[]): boolean {
    const suit = cards[0].suit;
    return cards.every(card => card.suit === suit);
  }

  /**
   * 检查是否为顺子
   */
  private static isStraight(cards: Card[]): boolean {
    const ranks = cards.map(card => card.rank);

    // 检查常规顺子
    for (let i = 0; i < ranks.length - 1; i++) {
      if (ranks[i] - ranks[i + 1] !== 1) {
        // 检查A-2-3-4-5的特殊情况
        if (i === 0 && ranks[0] === CardRank.ACE &&
          ranks[1] === CardRank.FIVE &&
          ranks[2] === CardRank.FOUR &&
          ranks[3] === CardRank.THREE &&
          ranks[4] === CardRank.TWO) {
          return true;
        }
        return false;
      }
    }

    return true;
  }

  /**
   * 获取四条
   */
  private static getFourOfAKind(cards: Card[]): { cards: Card[]; kickers: Card[] } | null {
    const rankGroups = this.groupByRank(cards);

    for (const [rank, group] of rankGroups.entries()) {
      if (group.length === 4) {
        const kicker = cards.find(card => card.rank !== rank)!;
        return {
          cards: group,
          kickers: [kicker],
        };
      }
    }

    return null;
  }

  /**
   * 获取葫芦
   */
  private static getFullHouse(cards: Card[]): { cards: Card[] } | null {
    const rankGroups = this.groupByRank(cards);
    let threeOfAKind: Card[] | null = null;
    let pair: Card[] | null = null;

    for (const group of rankGroups.values()) {
      if (group.length === 3) {
        threeOfAKind = group;
      } else if (group.length === 2) {
        pair = group;
      }
    }

    if (threeOfAKind && pair) {
      return {
        cards: [...threeOfAKind, ...pair],
      };
    }

    return null;
  }

  /**
   * 获取三条
   */
  private static getThreeOfAKind(cards: Card[]): { cards: Card[]; kickers: Card[] } | null {
    const rankGroups = this.groupByRank(cards);

    for (const [rank, group] of rankGroups.entries()) {
      if (group.length === 3) {
        const kickers = cards.filter(card => card.rank !== rank).slice(0, 2);
        return {
          cards: group,
          kickers,
        };
      }
    }

    return null;
  }

  /**
   * 获取两对
   */
  private static getTwoPair(cards: Card[]): { cards: Card[]; kickers: Card[] } | null {
    const rankGroups = this.groupByRank(cards);
    const pairs: Card[][] = [];

    for (const group of rankGroups.values()) {
      if (group.length === 2) {
        pairs.push(group);
      }
    }

    if (pairs.length >= 2) {
      // 取最大的两对
      pairs.sort((a, b) => b[0].rank - a[0].rank);
      const twoPairCards = [...pairs[0], ...pairs[1]];
      const kicker = cards.find(card =>
        card.rank !== pairs[0][0].rank && card.rank !== pairs[1][0].rank
      )!;

      return {
        cards: twoPairCards,
        kickers: [kicker],
      };
    }

    return null;
  }

  /**
   * 获取一对
   */
  private static getOnePair(cards: Card[]): { cards: Card[]; kickers: Card[] } | null {
    const rankGroups = this.groupByRank(cards);

    for (const [rank, group] of rankGroups.entries()) {
      if (group.length === 2) {
        const kickers = cards.filter(card => card.rank !== rank).slice(0, 3);
        return {
          cards: group,
          kickers,
        };
      }
    }

    return null;
  }

  /**
   * 按点数分组
   */
  private static groupByRank(cards: Card[]): Map<CardRank, Card[]> {
    const groups = new Map<CardRank, Card[]>();

    for (const card of cards) {
      const group = groups.get(card.rank) || [];
      group.push(card);
      groups.set(card.rank, group);
    }

    return groups;
  }

  /**
   * 获取牌的显示名称
   */
  static getCardDisplayName(card: Card): string {
    const rankNames: Record<number, string> = {
      2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A',
    };

    const suitNames: Record<CardSuit, string> = {
      [CardSuit.SPADES]: '♠',
      [CardSuit.HEARTS]: '♥',
      [CardSuit.DIAMONDS]: '♦',
      [CardSuit.CLUBS]: '♣',
    };

    return `${rankNames[card.rank]}${suitNames[card.suit]}`;
  }
} 