import Phaser from 'phaser';
import { Player, PlayerStatus, PlayerAction, CardSuit, CardRank, Card } from '../../types';

export class PlayerSeat {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private position: { x: number; y: number };
  private player?: Player;
  private seatIndex: number;
  private avatarCircle!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private chipsText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private dealerButton!: Phaser.GameObjects.Container;
  private cardSprites: Phaser.GameObjects.Sprite[] = [];
  public width: number = 220; // 适应新布局的宽度
  public height: number = 200; // 增大高度以容纳上下布局

  constructor(scene: Phaser.Scene, x: number, y: number, seatIndex: number) {
    this.scene = scene;
    this.position = { x, y };
    this.seatIndex = seatIndex;
    this.container = scene.add.container(x, y);

    // 创建空座位
    this.createEmptySeat();
  }

  // 创建空座位
  private createEmptySeat(): void {
    // 座位背景
    const seatBg = this.scene.add.graphics();
    seatBg.fillStyle(0x333333, 0.8);
    seatBg.fillRoundedRect(-110, -100, 220, 200, 10);
    this.container.add(seatBg);

    // 空座位提示
    const emptySeatText = this.scene.add.text(0, 0, '空座位', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#999999',
    });
    emptySeatText.setOrigin(0.5);
    this.container.add(emptySeatText);

    // 点击加入按钮（除了0号位）
    if (this.seatIndex !== 0) {
      const joinButton = this.scene.add.text(0, 30, '点击加入', {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#4CAF50',
      });
      joinButton.setOrigin(0.5);
      joinButton.setInteractive({ useHandCursor: true });
      this.container.add(joinButton);

      joinButton.on('pointerdown', () => {
        console.log(`点击加入座位 ${this.seatIndex}`);
        // 这里可以发出事件，让游戏场景处理加入座位的逻辑
      });
    }
  }

  // 更新玩家信息
  public updatePlayer(player: Player, isCurrentPlayer: boolean = false): void {
    this.player = player;

    // 清除原有内容
    this.container.removeAll(true);

    // 座位背景
    const seatBg = this.scene.add.graphics();
    seatBg.fillStyle(0x222222, 0.9);
    seatBg.fillRoundedRect(-110, -100, 220, 200, 10);
    this.container.add(seatBg);

    // ===== 上方：玩家信息区域 =====
    const playerInfoY = -50; // 上方位置

    // 头像背景
    this.avatarCircle = this.scene.add.graphics();
    this.avatarCircle.fillStyle(0xffffff);
    this.avatarCircle.fillCircle(0, playerInfoY, 30); // 增大头像
    this.container.add(this.avatarCircle);

    // 头像文字（临时）
    const avatarText = this.scene.add.text(0, playerInfoY, player.userInfo.nickname[0], {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#000000',
      fontStyle: 'bold',
    });
    avatarText.setOrigin(0.5);
    this.container.add(avatarText);

    // 玩家昵称
    this.nameText = this.scene.add.text(0, playerInfoY + 45, player.userInfo.nickname, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    this.nameText.setOrigin(0.5);
    this.container.add(this.nameText);

    // 筹码显示
    this.chipsText = this.scene.add.text(0, playerInfoY + 65, `${this.formatChips(player.chips)}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold',
    });
    this.chipsText.setOrigin(0.5);
    this.container.add(this.chipsText);

    // 位置标识区域（庄家、小盲、大盲）- 横向排列在头像上方
    let buttonOffsetX = 0;
    const buttonY = playerInfoY - 45;

    // 庄家标识
    if (player.isDealer) {
      this.dealerButton = this.scene.add.container(buttonOffsetX - 30, buttonY);
      const dealerBg = this.scene.add.circle(0, 0, 18, 0xffffff);
      const dealerText = this.scene.add.text(0, 0, 'D', {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#000000',
        fontStyle: 'bold',
      });
      dealerText.setOrigin(0.5);
      this.dealerButton.add(dealerBg);
      this.dealerButton.add(dealerText);
      this.container.add(this.dealerButton);
      buttonOffsetX += 40;
    }

    // 小盲标识
    if (player.isSmallBlind) {
      const sbButton = this.scene.add.container(buttonOffsetX - 30, buttonY);
      const sbBg = this.scene.add.circle(0, 0, 18, 0xffffff);
      const sbText = this.scene.add.text(0, 0, 'SB', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#000000',
        fontStyle: 'bold',
      });
      sbText.setOrigin(0.5);
      sbButton.add(sbBg);
      sbButton.add(sbText);
      this.container.add(sbButton);
      buttonOffsetX += 40;
    }

    // 大盲标识
    if (player.isBigBlind) {
      const bbButton = this.scene.add.container(buttonOffsetX - 30, buttonY);
      const bbBg = this.scene.add.circle(0, 0, 18, 0xffffff);
      const bbText = this.scene.add.text(0, 0, 'BB', {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#000000',
        fontStyle: 'bold',
      });
      bbText.setOrigin(0.5);
      bbButton.add(bbBg);
      bbButton.add(bbText);
      this.container.add(bbButton);
    }

    // 玩家动作显示
    if (player.lastAction) {
      this.showPlayerAction(player.lastAction);
    }

    // 玩家状态高亮效果
    this.updatePlayerStatus(player.status);

    // ===== 下方：扑克牌区域 =====
    // 如果玩家有卡牌，显示卡牌
    if (player.cards && player.cards.length > 0) {
      this.showPlayerCards(player.cards, player.seatIndex === 0);
    }

    // 如果玩家有下注，显示下注
    if (player.currentBet > 0) {
      this.updateBet(player.currentBet);
    }

    // 显示当前玩家标识
    if (isCurrentPlayer) {
      this.highlightCurrentPlayer();
    }
  }

  // 显示玩家动作
  private showPlayerAction(action: PlayerAction): void {
    const actionY = -45;

    // 动作颜色和标签
    const actionConfig = {
      [PlayerAction.CHECK]: { color: 0x00cc00, text: '看牌', icon: '👁️' },
      [PlayerAction.CALL]: { color: 0x0099ff, text: '跟注', icon: '✓' },
      [PlayerAction.RAISE]: { color: 0xff9900, text: '加注', icon: '⬆️' },
      [PlayerAction.FOLD]: { color: 0xff0000, text: '弃牌', icon: '✖' },
      [PlayerAction.ALL_IN]: { color: 0xff00ff, text: '全下', icon: '💰' }
    };

    const config = actionConfig[action] || { color: 0x999999, text: '等待', icon: '⏳' };

    // 创建动作背景
    const actionBg = this.scene.add.graphics();
    actionBg.fillStyle(config.color, 0.9);
    actionBg.fillRoundedRect(-70, actionY - 15, 140, 30, 15);
    actionBg.setData('type', 'action');
    this.container.add(actionBg);

    // 创建动作文本
    const actionText = this.scene.add.text(0, actionY, `${config.icon} ${config.text}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    });
    actionText.setOrigin(0.5);
    actionText.setData('type', 'action');
    this.container.add(actionText);
  }

  // 更新玩家状态
  private updatePlayerStatus(status: PlayerStatus): void {
    if (status === PlayerStatus.FOLDED) {
      // 弃牌状态显示灰色遮罩
      const foldedOverlay = this.scene.add.rectangle(0, 0, 160, 120, 0x000000, 0.7);
      foldedOverlay.setData('type', 'status');
      this.container.add(foldedOverlay);

      const foldedText = this.scene.add.text(0, 0, '已弃牌', {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ff0000',
        fontStyle: 'bold'
      });
      foldedText.setOrigin(0.5);
      foldedText.setData('type', 'status');
      this.container.add(foldedText);
    } else if (status === PlayerStatus.ALL_IN) {
      // 全下状态显示边框
      const allinBorder = this.scene.add.graphics();
      allinBorder.lineStyle(4, 0xff00ff, 1);
      allinBorder.strokeRoundedRect(-82, -62, 164, 124, 12);
      allinBorder.setData('type', 'status');
      this.container.add(allinBorder);

      // 添加闪烁效果
      this.scene.tweens.add({
        targets: allinBorder,
        alpha: { from: 0.3, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1
      });
    }
  }

  // 显示玩家手牌
  public showPlayerCards(cards: Array<Card>, showFront: boolean = false): void {
    // 移除可能存在的旧卡牌
    this.container.getAll().forEach(obj => {
      if (obj.getData('type') === 'card') {
        obj.destroy();
      }
    });

    // 如果是摊牌阶段显示正面，清除之前的状态显示
    if (showFront) {
      this.clearStatusEffects();
    }

    // ===== 下方：扑克牌区域 =====
    const cardsY = 50; // 下方位置
    const cardWidth = 100; // 扑克牌宽度 - 两倍大小
    const cardHeight = 140; // 扑克牌高度 - 两倍大小
    const cardSpacing = 70; // 卡牌间隔

    // 添加扑克牌
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardX = -((cards.length - 1) * cardSpacing) / 2 + i * cardSpacing;
      const cardY = cardsY; // 下方居中显示

      if (showFront) {
        // 创建卡牌背景
        const cardBg = this.scene.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0xffffff);
        cardBg.setStrokeStyle(4, 0x000000); // 增大边框
        cardBg.setData('type', 'card');
        this.container.add(cardBg);

        // 显示卡牌花色和点数
        const suitColors: Record<string, string> = {
          'h': '#ff0000', // 红桃
          'd': '#ff0000', // 方块
          'c': '#000000', // 梅花
          's': '#000000'  // 黑桃
        };

        const suitSymbols: Record<string, string> = {
          'h': '♥', // 红桃
          'd': '♦', // 方块
          'c': '♣', // 梅花
          's': '♠'  // 黑桃
        };

        const rankMap: Record<string, string> = {
          '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
          'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
        };

        // 添加中央大号点数
        const rankValue = card.value || (card.rank ? String(card.rank) : '');
        const rankText = this.scene.add.text(cardX, cardY - 30, rankMap[rankValue] || rankValue, {
          fontSize: '36px', // 增大字体 - 两倍大小
          fontFamily: 'Arial',
          color: suitColors[card.suit],
          fontStyle: 'bold'
        });
        rankText.setOrigin(0.5);
        rankText.setData('type', 'card');
        this.container.add(rankText);

        // 添加中央大号花色
        const suitText = this.scene.add.text(cardX, cardY + 20, suitSymbols[card.suit], {
          fontSize: '48px', // 增大花色符号 - 两倍大小
          fontFamily: 'Arial',
          color: suitColors[card.suit]
        });
        suitText.setOrigin(0.5);
        suitText.setData('type', 'card');
        this.container.add(suitText);

        // 添加左上角小的点数和花色
        const smallRankText = this.scene.add.text(cardX - cardWidth / 2 + 15, cardY - cardHeight / 2 + 15, rankMap[rankValue] || rankValue, {
          fontSize: '20px', // 增大小字体
          fontFamily: 'Arial',
          color: suitColors[card.suit],
          fontStyle: 'bold'
        });
        smallRankText.setOrigin(0.5);
        smallRankText.setData('type', 'card');
        this.container.add(smallRankText);

        const smallSuitText = this.scene.add.text(cardX - cardWidth / 2 + 15, cardY - cardHeight / 2 + 35, suitSymbols[card.suit], {
          fontSize: '24px', // 增大小花色符号
          fontFamily: 'Arial',
          color: suitColors[card.suit]
        });
        smallSuitText.setOrigin(0.5);
        smallSuitText.setData('type', 'card');
        this.container.add(smallSuitText);

        // 添加右下角倒置的点数和花色
        const bottomRankText = this.scene.add.text(cardX + cardWidth / 2 - 15, cardY + cardHeight / 2 - 15, rankMap[rankValue] || rankValue, {
          fontSize: '20px',
          fontFamily: 'Arial',
          color: suitColors[card.suit],
          fontStyle: 'bold'
        });
        bottomRankText.setOrigin(0.5);
        bottomRankText.setRotation(Math.PI); // 旋转180度
        bottomRankText.setData('type', 'card');
        this.container.add(bottomRankText);

        const bottomSuitText = this.scene.add.text(cardX + cardWidth / 2 - 15, cardY + cardHeight / 2 - 35, suitSymbols[card.suit], {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: suitColors[card.suit]
        });
        bottomSuitText.setOrigin(0.5);
        bottomSuitText.setRotation(Math.PI); // 旋转180度
        bottomSuitText.setData('type', 'card');
        this.container.add(bottomSuitText);

      } else {
        // 显示卡牌背面
        const cardBack = this.scene.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0x003366);
        cardBack.setStrokeStyle(4, 0x000000); // 增大边框
        cardBack.setData('type', 'card');
        this.container.add(cardBack);

        // 卡牌背面花纹
        const pattern1 = this.scene.add.rectangle(cardX, cardY, cardWidth - 15, cardHeight - 15, 0x0066cc);
        pattern1.setData('type', 'card');
        this.container.add(pattern1);

        const pattern2 = this.scene.add.grid(cardX, cardY, cardWidth - 25, cardHeight - 25, 12, 18, 0, 0, 0x0099ff, 0.3);
        pattern2.setData('type', 'card');
        this.container.add(pattern2);

        // 添加背面标记
        const backText = this.scene.add.text(cardX, cardY, '🂠', {
          fontSize: '48px', // 增大背面标记
          fontFamily: 'Arial',
          color: '#ffffff'
        });
        backText.setOrigin(0.5);
        backText.setData('type', 'card');
        this.container.add(backText);
      }
    }
  }

  // 清除状态效果（弃牌、全下等）
  private clearStatusEffects(): void {
    this.container.getAll().forEach(obj => {
      if (obj.getData('type') === 'status') {
        obj.destroy();
      }
    });
  }

  // 清除摊牌时的临时效果
  public clearShowdownEffects(): void {
    this.container.getAll().forEach(obj => {
      if (obj.getData('type') === 'showdown-fold') {
        obj.destroy();
      }
    });
  }

  // 更新下注显示
  public updateBet(amount: number): void {
    if (amount <= 0) return;

    // 移除旧的下注显示
    this.container.getAll().forEach(obj => {
      if (obj.getData('type') === 'bet') {
        obj.destroy();
      }
    });

    // 创建新的下注显示
    const betY = 130; // 在底部显示

    // 下注背景
    const betBg = this.scene.add.circle(0, betY, 35, 0x000000, 0.8); // 增大下注显示
    betBg.setStrokeStyle(3, 0xffcc00);
    betBg.setData('type', 'bet');
    this.container.add(betBg);

    // 下注金额
    const betText = this.scene.add.text(0, betY, this.formatChips(amount), {
      fontSize: '20px', // 增大字体
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold'
    });
    betText.setOrigin(0.5);
    betText.setData('type', 'bet');
    this.container.add(betText);
  }

  // 高亮当前玩家
  public highlightCurrentPlayer(): void {
    // 添加高亮边框
    const highlightBorder = this.scene.add.graphics();
    highlightBorder.lineStyle(5, 0xffff00, 1); // 增大边框宽度
    highlightBorder.strokeRoundedRect(-113, -103, 226, 206, 12); // 适应新尺寸200高度
    highlightBorder.setData('type', 'highlight');
    this.container.add(highlightBorder);

    // 添加动画效果
    this.scene.tweens.add({
      targets: highlightBorder,
      alpha: { from: 0.5, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  // 显示筹码变化动画
  public showChipsChange(oldChips: number, newChips: number): void {
    const chipsDiff = oldChips - newChips;
    if (chipsDiff > 0) {
      // 创建筹码变化文本
      const changeText = this.scene.add.text(this.position.x, this.position.y - 50, `-${this.formatChips(chipsDiff)}`, {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ff6666',
        fontStyle: 'bold'
      });
      changeText.setOrigin(0.5);

      // 动画效果
      this.scene.tweens.add({
        targets: changeText,
        y: this.position.y - 100,
        alpha: { from: 1, to: 0 },
        duration: 1500,
        onComplete: () => {
          changeText.destroy();
        }
      });
    }
  }

  // 显示动作动画
  public showActionAnimation(action: string, color: number): void {
    // 创建动作文本
    const actionText = this.scene.add.text(this.position.x, this.position.y - 100, action, {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 2,
        stroke: true,
        fill: true
      }
    });
    actionText.setOrigin(0.5);

    // 动画效果
    this.scene.tweens.add({
      targets: actionText,
      y: this.position.y - 150,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.5 },
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        actionText.destroy();
      }
    });
  }

  // 格式化筹码数量
  private formatChips(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
  }

  // 获取容器
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  // 获取玩家
  public getPlayer(): Player | undefined {
    return this.player;
  }

  /**
   * 显示玩家的手牌
   * @param cards 要显示的卡牌
   */
  public showCards(cards: Card[]): void {
    // 清除现有的牌
    this.clearCards();

    // 计算起始位置
    const startX = -30;
    const cardY = -60;
    const cardSpacing = 30;

    // 创建新的牌精灵
    cards.forEach((card, index) => {
      const cardX = startX + index * cardSpacing;
      // 使用card.id创建纹理名称
      const sprite = this.scene.add.sprite(cardX, cardY, `card_${card.id}`);
      sprite.setScale(0.4);
      this.container.add(sprite);
      this.cardSprites.push(sprite);
    });
  }

  /**
   * 显示牌背（用于其他玩家）
   * @param count 要显示的牌数量
   */
  public showCardBacks(count: number): void {
    // 清除现有的牌
    this.clearCards();

    // 计算起始位置
    const startX = -30;
    const cardY = -60;
    const cardSpacing = 30;

    // 创建新的牌背精灵
    for (let i = 0; i < count; i++) {
      const cardX = startX + i * cardSpacing;
      const sprite = this.scene.add.sprite(cardX, cardY, 'card_back');
      sprite.setScale(0.4);
      this.container.add(sprite);
      this.cardSprites.push(sprite);
    }
  }

  /**
   * 清除所有手牌
   */
  private clearCards(): void {
    this.cardSprites.forEach(sprite => sprite.destroy());
    this.cardSprites = [];
  }
}