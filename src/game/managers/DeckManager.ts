import { Card, CardSuit, CardRank } from '../../types';

export class DeckManager {
  private deck: Card[] = [];

  constructor() {
    this.createDeck();
  }

  // 创建一副牌
  public createDeck(): Card[] {
    this.deck = [];

    // 定义所有牌的花色
    const suits = [CardSuit.HEARTS, CardSuit.DIAMONDS, CardSuit.CLUBS, CardSuit.SPADES];

    // 花色与value字符串的映射
    const suitToString: Record<CardSuit, 'h' | 'd' | 'c' | 's'> = {
      [CardSuit.HEARTS]: 'h',
      [CardSuit.DIAMONDS]: 'd',
      [CardSuit.CLUBS]: 'c',
      [CardSuit.SPADES]: 's'
    };

    // 定义所有牌的点数（从2到A）
    const ranks = [
      CardRank.TWO, CardRank.THREE, CardRank.FOUR, CardRank.FIVE,
      CardRank.SIX, CardRank.SEVEN, CardRank.EIGHT, CardRank.NINE,
      CardRank.TEN, CardRank.JACK, CardRank.QUEEN, CardRank.KING,
      CardRank.ACE
    ];

    // 点数与value字符串的映射
    const rankToString: Record<CardRank, '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'> = {
      [CardRank.TWO]: '2',
      [CardRank.THREE]: '3',
      [CardRank.FOUR]: '4',
      [CardRank.FIVE]: '5',
      [CardRank.SIX]: '6',
      [CardRank.SEVEN]: '7',
      [CardRank.EIGHT]: '8',
      [CardRank.NINE]: '9',
      [CardRank.TEN]: '10',
      [CardRank.JACK]: 'J',
      [CardRank.QUEEN]: 'Q',
      [CardRank.KING]: 'K',
      [CardRank.ACE]: 'A'
    };

    // 生成52张牌
    for (const suit of suits) {
      for (const rank of ranks) {
        const suitStr = suitToString[suit];
        const valueStr = rankToString[rank];
        const id = `${valueStr}${suitStr}`;
        this.deck.push({
          suit: suitStr,
          value: valueStr,
          id,
          rank // 保留原始rank用于比较
        });
      }
    }

    console.log(`创建了 ${this.deck.length} 张牌`);
    return this.deck;
  }

  // 洗牌
  public shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  // 发牌
  public dealCards(count: number): Card[] {
    if (this.deck.length < count) {
      console.error(`牌堆中只剩 ${this.deck.length} 张牌，无法发出 ${count} 张牌`);
      return [];
    }

    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.deck.pop();
      if (card) {
        cards.push(card);
      }
    }

    return cards;
  }

  // 从牌堆中移除指定的牌
  public removeCards(cards: Card[]): void {
    cards.forEach(card => {
      const index = this.deck.findIndex(c => c.id === card.id);
      if (index !== -1) {
        this.deck.splice(index, 1);
      }
    });
  }

  // 获取当前牌堆
  public getDeck(): Card[] {
    return this.deck;
  }

  // 获取牌堆剩余牌数
  public getRemainingCards(): number {
    return this.deck.length;
  }
}