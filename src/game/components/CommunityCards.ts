import Phaser from 'phaser';
import { Card, CardSuit } from '../../types';

export class CommunityCards {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private cards: Card[] = [];
  private x: number;
  private y: number;
  private cardSprites: Phaser.GameObjects.Sprite[] = [];
  private cardSpacing: number = 70;
  private currentCards: Card[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.container = scene.add.container(x, y);
    this.createBackground();
  }

  // 创建背景
  private createBackground(): void {
    // 公共牌背景
    const bgGraphics = this.scene.add.graphics();
    bgGraphics.fillStyle(0x000000, 0.3);
    bgGraphics.fillRoundedRect(-200, -50, 400, 100, 10);
    this.container.add(bgGraphics);

    // 添加5个牌位占位符
    for (let i = 0; i < 5; i++) {
      const cardPlaceholder = this.scene.add.rectangle(
        -160 + i * 80,
        0,
        70,
        90,
        0x666666,
        0.3
      );
      cardPlaceholder.setStrokeStyle(2, 0x999999);
      this.container.add(cardPlaceholder);
    }
  }

  // 更新公共牌
  public updateCards(cards: Card[]): void {
    this.currentCards = cards;
    this.cards = cards;
    this.showCards();
  }

  // 显示公共牌
  private showCards(): void {
    // 清除旧的公共牌
    this.container.getAll().forEach(obj => {
      if (obj.getData('type') === 'card') {
        obj.destroy();
      }
    });

    // 清除现有卡牌精灵
    this.cardSprites.forEach(sprite => sprite.destroy());
    this.cardSprites = [];

    if (this.cards.length === 0) {
      console.log('没有公共牌需要显示');
      return;
    }

    // 计算卡牌起始位置，使其在容器内居中显示
    const startX = -((this.cards.length - 1) * this.cardSpacing) / 2;

    // 显示新的公共牌
    this.cards.forEach((card, index) => {
      const cardX = startX + index * this.cardSpacing;
      const cardSprite = this.createCardSprite(card, cardX, 0); // 在容器内的相对位置
      this.cardSprites.push(cardSprite);
    });

    console.log(`显示了 ${this.cards.length} 张公共牌`);
  }

  /**
   * 创建卡牌精灵
   */
  private createCardSprite(card: Card, x: number, y: number): Phaser.GameObjects.Sprite {
    console.log(`创建卡牌: id=${card.id}, 值=${card.value}, 花色=${card.suit}`);

    // 创建卡牌背景
    const cardBg = this.scene.add.rectangle(x, y, 70, 90, 0xffffff);
    cardBg.setStrokeStyle(2, 0x000000);
    cardBg.setData('type', 'card');
    this.container.add(cardBg);

    // 显示卡牌花色和点数
    const suitColors: Record<string, string> = {
      h: '#ff0000', // 红桃
      d: '#ff0000', // 方块  
      c: '#000000', // 梅花
      s: '#000000'  // 黑桃
    };

    const suitSymbols: Record<string, string> = {
      h: '♥', // 红桃
      d: '♦', // 方块
      c: '♣', // 梅花
      s: '♠'  // 黑桃
    };

    // 添加点数
    const rankValue = card.value || '';
    const rankText = this.scene.add.text(x, y - 20, rankValue, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: suitColors[card.suit] || '#000000',
      fontStyle: 'bold'
    });
    rankText.setOrigin(0.5);
    rankText.setData('type', 'card');
    this.container.add(rankText);

    // 添加花色
    const suitText = this.scene.add.text(x, y + 10, suitSymbols[card.suit] || card.suit, {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: suitColors[card.suit] || '#000000'
    });
    suitText.setOrigin(0.5);
    suitText.setData('type', 'card');
    this.container.add(suitText);

    // 创建一个虚拟精灵对象用于返回
    const sprite = this.scene.add.sprite(x, y, '');
    sprite.setVisible(false); // 隐藏，因为我们使用文本显示
    return sprite;
  }

  /**
   * 翻转指定位置的牌
   * @param index 要翻转的牌的索引
   */
  public flipCard(index: number): void {
    if (index < 0 || index >= this.currentCards.length) return;

    const card = this.currentCards[index];
    console.log(`翻转卡牌: index=${index}, id=${card.id}, 值=${card.value}, 花色=${card.suit}`);

    // 由于我们使用文本显示，翻牌就是立即显示卡牌内容
    // 这里可以添加一些动画效果
    console.log(`卡牌 ${card.value}${card.suit} 已翻开`);
  }

  // 获取容器
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  // 获取卡牌
  public getCards(): Card[] {
    return this.cards;
  }
}