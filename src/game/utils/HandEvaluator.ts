import { Card, HandRank } from '../../types';

interface HandEvaluation {
  rank: HandRank;
  bestHand: Card[];
  description: string;
}

/**
 * 德州扑克牌型评估器
 * 用于评估玩家的最佳牌型并比较牌型大小
 */
export class HandEvaluator {

  /**
   * 评估最佳牌型
   * @param cards 所有可用的牌（玩家手牌+公共牌）
   * @returns 包含牌型等级、最佳牌组合和描述的评估结果
   */
  public evaluate(cards: Card[]): HandEvaluation {
    if (cards.length < 5) {
      throw new Error('评估牌型至少需要5张牌');
    }

    // 复制牌组，避免修改原始数据
    const allCards = [...cards];

    // 检查各种牌型，从高到低
    const royalFlush = this.checkRoyalFlush(allCards);
    if (royalFlush) {
      return {
        rank: HandRank.ROYAL_FLUSH,
        bestHand: royalFlush,
        description: '皇家同花顺'
      };
    }

    const straightFlush = this.checkStraightFlush(allCards);
    if (straightFlush) {
      return {
        rank: HandRank.STRAIGHT_FLUSH,
        bestHand: straightFlush,
        description: '同花顺'
      };
    }

    const fourOfAKind = this.checkFourOfAKind(allCards);
    if (fourOfAKind) {
      return {
        rank: HandRank.FOUR_OF_A_KIND,
        bestHand: fourOfAKind,
        description: '四条'
      };
    }

    const fullHouse = this.checkFullHouse(allCards);
    if (fullHouse) {
      return {
        rank: HandRank.FULL_HOUSE,
        bestHand: fullHouse,
        description: '葫芦'
      };
    }

    const flush = this.checkFlush(allCards);
    if (flush) {
      return {
        rank: HandRank.FLUSH,
        bestHand: flush,
        description: '同花'
      };
    }

    const straight = this.checkStraight(allCards);
    if (straight) {
      return {
        rank: HandRank.STRAIGHT,
        bestHand: straight,
        description: '顺子'
      };
    }

    const threeOfAKind = this.checkThreeOfAKind(allCards);
    if (threeOfAKind) {
      return {
        rank: HandRank.THREE_OF_A_KIND,
        bestHand: threeOfAKind,
        description: '三条'
      };
    }

    const twoPair = this.checkTwoPair(allCards);
    if (twoPair) {
      return {
        rank: HandRank.TWO_PAIR,
        bestHand: twoPair,
        description: '两对'
      };
    }

    const onePair = this.checkOnePair(allCards);
    if (onePair) {
      return {
        rank: HandRank.ONE_PAIR,
        bestHand: onePair,
        description: '一对'
      };
    }

    // 如果以上都不是，则为高牌
    const highCard = this.getHighCards(allCards, 5);
    return {
      rank: HandRank.HIGH_CARD,
      bestHand: highCard,
      description: '高牌'
    };
  }

  /**
   * 比较相同牌型的大小
   * @param hand1 第一手牌
   * @param hand2 第二手牌
   * @param rank 牌型等级
   * @returns 负数表示hand1小，0表示相等，正数表示hand1大
   */
  public compareEqualRank(hand1: Card[], hand2: Card[], rank: HandRank): number {
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const getValueIndex = (value: string) => values.indexOf(value);

    switch (rank) {
      case HandRank.ROYAL_FLUSH:
        // 皇家同花顺都相等
        return 0;

      case HandRank.STRAIGHT_FLUSH:
      case HandRank.STRAIGHT:
        // 同花顺和顺子比较最高牌
        const maxValue1 = Math.max(...hand1.map(card => getValueIndex(card.value)));
        const maxValue2 = Math.max(...hand2.map(card => getValueIndex(card.value)));
        return maxValue1 - maxValue2;

      case HandRank.FOUR_OF_A_KIND:
        // 四条：先比较四张相同牌的大小，再比较第五张牌
        const fourKind1 = this.getFourOfAKindValue(hand1);
        const fourKind2 = this.getFourOfAKindValue(hand2);
        if (fourKind1 !== fourKind2) {
          return getValueIndex(fourKind1) - getValueIndex(fourKind2);
        }
        // 比较剩余牌（踢牌）
        const kicker1 = hand1.find(card => card.value !== fourKind1)!;
        const kicker2 = hand2.find(card => card.value !== fourKind2)!;
        return getValueIndex(kicker1.value) - getValueIndex(kicker2.value);

      case HandRank.FULL_HOUSE:
        // 葫芦：先比较三条的大小，再比较对子
        const threeKind1 = this.getThreeOfAKindValue(hand1);
        const threeKind2 = this.getThreeOfAKindValue(hand2);
        if (threeKind1 !== threeKind2) {
          return getValueIndex(threeKind1) - getValueIndex(threeKind2);
        }
        const pairValue1 = this.getPairValue(hand1, threeKind1);
        const pairValue2 = this.getPairValue(hand2, threeKind2);
        return getValueIndex(pairValue1) - getValueIndex(pairValue2);

      case HandRank.FLUSH:
        // 同花：按牌面值从大到小比较
        return this.compareHighCards(hand1, hand2);

      case HandRank.THREE_OF_A_KIND:
        // 三条：先比较三张相同牌，再比较剩余两张牌
        const threeValue1 = this.getThreeOfAKindValue(hand1);
        const threeValue2 = this.getThreeOfAKindValue(hand2);
        if (threeValue1 !== threeValue2) {
          return getValueIndex(threeValue1) - getValueIndex(threeValue2);
        }
        // 比较剩余牌（踢牌）
        const kickers1 = hand1.filter(card => card.value !== threeValue1)
          .sort((a, b) => getValueIndex(b.value) - getValueIndex(a.value));
        const kickers2 = hand2.filter(card => card.value !== threeValue2)
          .sort((a, b) => getValueIndex(b.value) - getValueIndex(a.value));
        for (let i = 0; i < kickers1.length; i++) {
          const diff = getValueIndex(kickers1[i].value) - getValueIndex(kickers2[i].value);
          if (diff !== 0) return diff;
        }
        return 0;

      case HandRank.TWO_PAIR:
        // 两对：先比较大对子，再比较小对子，最后比较第五张牌
        const pairs1 = this.getTwoPairValues(hand1);
        const pairs2 = this.getTwoPairValues(hand2);

        // 由于getTwoPairValues已经按从大到小排序，直接按顺序比较
        // 比较第一个对子（最大的对子）
        const bigPairIndex1 = getValueIndex(pairs1[0]);
        const bigPairIndex2 = getValueIndex(pairs2[0]);
        if (bigPairIndex1 !== bigPairIndex2) {
          console.log(`比较大对子: ${pairs1[0]}(${bigPairIndex1}) vs ${pairs2[0]}(${bigPairIndex2})`);
          return bigPairIndex1 - bigPairIndex2;
        }

        // 比较第二个对子（较小的对子）
        const smallPairIndex1 = getValueIndex(pairs1[1]);
        const smallPairIndex2 = getValueIndex(pairs2[1]);
        if (smallPairIndex1 !== smallPairIndex2) {
          console.log(`比较小对子: ${pairs1[1]}(${smallPairIndex1}) vs ${pairs2[1]}(${smallPairIndex2})`);
          return smallPairIndex1 - smallPairIndex2;
        }

        // 比较第五张牌（踢牌）
        const fifthCard1 = hand1.find(card => !pairs1.includes(card.value))!;
        const fifthCard2 = hand2.find(card => !pairs2.includes(card.value))!;
        const kickerDiff = getValueIndex(fifthCard1.value) - getValueIndex(fifthCard2.value);
        console.log(`比较踢牌: ${fifthCard1.value} vs ${fifthCard2.value}, 差值: ${kickerDiff}`);
        return kickerDiff;

      case HandRank.ONE_PAIR:
        // 一对：先比较对子大小，再比较剩余三张牌
        const pairVal1 = this.getOnePairValue(hand1);
        const pairVal2 = this.getOnePairValue(hand2);
        if (pairVal1 !== pairVal2) {
          return getValueIndex(pairVal1) - getValueIndex(pairVal2);
        }
        // 比较剩余牌（踢牌）
        const remainingCards1 = hand1.filter(card => card.value !== pairVal1)
          .sort((a, b) => getValueIndex(b.value) - getValueIndex(a.value));
        const remainingCards2 = hand2.filter(card => card.value !== pairVal2)
          .sort((a, b) => getValueIndex(b.value) - getValueIndex(a.value));
        for (let i = 0; i < remainingCards1.length; i++) {
          const diff = getValueIndex(remainingCards1[i].value) - getValueIndex(remainingCards2[i].value);
          if (diff !== 0) return diff;
        }
        return 0;

      case HandRank.HIGH_CARD:
        // 高牌：按牌面值从大到小比较
        return this.compareHighCards(hand1, hand2);

      default:
        return 0;
    }
  }

  // 辅助方法：比较高牌
  private compareHighCards(hand1: Card[], hand2: Card[]): number {
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const getValueIndex = (value: string) => values.indexOf(value);

    const sorted1 = [...hand1].sort((a, b) => getValueIndex(b.value) - getValueIndex(a.value));
    const sorted2 = [...hand2].sort((a, b) => getValueIndex(b.value) - getValueIndex(a.value));

    for (let i = 0; i < Math.min(sorted1.length, sorted2.length); i++) {
      const diff = getValueIndex(sorted1[i].value) - getValueIndex(sorted2[i].value);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  // 辅助方法：获取四条的牌值
  private getFourOfAKindValue(hand: Card[]): string {
    const valueGroups = this.groupByValue(hand);
    for (const [value, group] of Object.entries(valueGroups)) {
      if (group.length >= 4) {
        return value;
      }
    }
    throw new Error('未找到四条');
  }

  // 辅助方法：获取三条的牌值
  private getThreeOfAKindValue(hand: Card[]): string {
    const valueGroups = this.groupByValue(hand);
    for (const [value, group] of Object.entries(valueGroups)) {
      if (group.length >= 3) {
        return value;
      }
    }
    throw new Error('未找到三条');
  }

  // 辅助方法：获取对子的牌值（排除指定值）
  private getPairValue(hand: Card[], excludeValue: string): string {
    const valueGroups = this.groupByValue(hand);
    for (const [value, group] of Object.entries(valueGroups)) {
      if (value !== excludeValue && group.length >= 2) {
        return value;
      }
    }
    throw new Error('未找到对子');
  }

  // 辅助方法：获取两对的牌值
  private getTwoPairValues(hand: Card[]): string[] {
    const valueGroups = this.groupByValue(hand);
    const pairs: string[] = [];

    // 按值的大小从大到小排序
    const values = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const sortedValues = Object.keys(valueGroups).sort((a, b) =>
      values.indexOf(a) - values.indexOf(b)
    );

    for (const value of sortedValues) {
      const group = valueGroups[value];
      if (group.length >= 2) {
        pairs.push(value);
      }
    }

    if (pairs.length < 2) {
      throw new Error('未找到两对');
    }

    console.log(`两对牌值: ${pairs.slice(0, 2).join(', ')} (按大到小排序)`);
    return pairs.slice(0, 2); // 返回前两个最大的对子
  }

  // 辅助方法：获取一对的牌值
  private getOnePairValue(hand: Card[]): string {
    const valueGroups = this.groupByValue(hand);
    for (const [value, group] of Object.entries(valueGroups)) {
      if (group.length >= 2) {
        return value;
      }
    }
    throw new Error('未找到一对');
  }

  // 以下是检查各种牌型的辅助方法

  private checkRoyalFlush(cards: Card[]): Card[] | null {
    // 皇家同花顺是同一花色的A, K, Q, J, 10
    const royalValues = ['A', 'K', 'Q', 'J', '10'];
    const suits = ['h', 'd', 'c', 's'];

    for (const suit of suits) {
      const suitCards = cards.filter(card => card.suit === suit);
      const hasRoyal = royalValues.every(value =>
        suitCards.some(card => card.value === value)
      );

      if (hasRoyal) {
        return suitCards.filter(card => royalValues.includes(card.value));
      }
    }

    return null;
  }

  private checkStraightFlush(cards: Card[]): Card[] | null {
    // 同花顺是同一花色的连续五张牌
    const suits = ['h', 'd', 'c', 's'];

    for (const suit of suits) {
      const suitCards = cards.filter(card => card.suit === suit);
      const straight = this.checkStraight(suitCards);
      if (straight) {
        return straight;
      }
    }

    return null;
  }

  private checkFourOfAKind(cards: Card[]): Card[] | null {
    // 四条是四张相同点数的牌加一张牌
    const valueGroups = this.groupByValue(cards);

    for (const [value, group] of Object.entries(valueGroups)) {
      if (group.length >= 4) {
        const fourCards = group.slice(0, 4);
        const remainingCards = cards.filter(card => card.value !== value);
        const kicker = this.getHighCards(remainingCards, 1);
        return [...fourCards, ...kicker];
      }
    }

    return null;
  }

  private checkFullHouse(cards: Card[]): Card[] | null {
    // 葫芦是三张相同点数的牌加一对
    const valueGroups = this.groupByValue(cards);
    let threeOfAKind: Card[] | null = null;
    let pair: Card[] | null = null;

    // 按牌面值从大到小排序
    const values = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const sortedValues = Object.keys(valueGroups).sort((a, b) =>
      values.indexOf(a) - values.indexOf(b)
    );

    for (const value of sortedValues) {
      const group = valueGroups[value];
      if (group.length >= 3 && !threeOfAKind) {
        threeOfAKind = group.slice(0, 3);
      } else if (group.length >= 2 && !pair) {
        pair = group.slice(0, 2);
      }
    }

    if (threeOfAKind && pair) {
      return [...threeOfAKind, ...pair];
    }

    return null;
  }

  private checkFlush(cards: Card[]): Card[] | null {
    // 同花是五张同一花色的牌
    const suits = ['h', 'd', 'c', 's'];

    for (const suit of suits) {
      const suitCards = cards.filter(card => card.suit === suit);
      if (suitCards.length >= 5) {
        return this.getHighCards(suitCards, 5);
      }
    }

    return null;
  }

  private checkStraight(cards: Card[]): Card[] | null {
    // 顺子是五张连续点数的牌
    const values = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'];
    const uniqueValues = [...new Set(cards.map(card => card.value))];

    // 检查是否有连续的5张牌
    for (let i = 0; i <= values.length - 5; i++) {
      const straightValues = values.slice(i, i + 5);
      const hasStraight = straightValues.every(value => uniqueValues.includes(value));

      if (hasStraight) {
        const straightCards: Card[] = [];
        for (const value of straightValues) {
          const card = cards.find(c => c.value === value);
          if (card) straightCards.push(card);
        }
        return straightCards;
      }
    }

    return null;
  }

  private checkThreeOfAKind(cards: Card[]): Card[] | null {
    // 三条是三张相同点数的牌加两张不同的牌
    const valueGroups = this.groupByValue(cards);

    const values = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const sortedValues = Object.keys(valueGroups).sort((a, b) =>
      values.indexOf(a) - values.indexOf(b)
    );

    for (const value of sortedValues) {
      const group = valueGroups[value];
      if (group.length >= 3) {
        const threeCards = group.slice(0, 3);
        const remainingCards = cards.filter(card => card.value !== value);
        const kickers = this.getHighCards(remainingCards, 2);
        return [...threeCards, ...kickers];
      }
    }

    return null;
  }

  private checkTwoPair(cards: Card[]): Card[] | null {
    // 两对是两对不同点数的牌加一张牌
    const valueGroups = this.groupByValue(cards);
    const pairs: Card[] = [];

    const values = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const sortedValues = Object.keys(valueGroups).sort((a, b) =>
      values.indexOf(a) - values.indexOf(b)
    );

    for (const value of sortedValues) {
      const group = valueGroups[value];
      if (group.length >= 2 && pairs.length < 4) {
        pairs.push(...group.slice(0, 2));
      }
    }

    if (pairs.length >= 4) {
      const usedValues = pairs.map(card => card.value);
      const remainingCards = cards.filter(card => !usedValues.includes(card.value));
      const kicker = this.getHighCards(remainingCards, 1);
      return [...pairs.slice(0, 4), ...kicker];
    }

    return null;
  }

  private checkOnePair(cards: Card[]): Card[] | null {
    // 一对是一对相同点数的牌加三张不同的牌
    const valueGroups = this.groupByValue(cards);

    const values = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const sortedValues = Object.keys(valueGroups).sort((a, b) =>
      values.indexOf(a) - values.indexOf(b)
    );

    for (const value of sortedValues) {
      const group = valueGroups[value];
      if (group.length >= 2) {
        const pairCards = group.slice(0, 2);
        const remainingCards = cards.filter(card => card.value !== value);
        const kickers = this.getHighCards(remainingCards, 3);
        console.log(`找到一对: ${value}, 对子=${pairCards.map(c => c.value + c.suit).join(',')}, kickers=${kickers.map(c => c.value + c.suit).join(',')}`);
        return [...pairCards, ...kickers];
      }
    }

    return null;
  }

  /**
   * 将牌按点数分组
   */
  private groupByValue(cards: Card[]): Record<string, Card[]> {
    const groups: Record<string, Card[]> = {};

    for (const card of cards) {
      if (!groups[card.value]) {
        groups[card.value] = [];
      }
      groups[card.value].push(card);
    }

    return groups;
  }

  private getHighCards(cards: Card[], count: number): Card[] {
    // 获取最高点数的牌
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    return [...cards]
      .sort((a, b) => values.indexOf(b.value) - values.indexOf(a.value))
      .slice(0, count);
  }
} 