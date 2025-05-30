import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { UserService } from '../services/UserService';
import { Player, GameState, GameStage, RoomType, PlayerStatus, Card, CardSuit, CardRank, RoomStatus, PlayerAction } from '../types';

export class GameScene extends Phaser.Scene {
  private userService: UserService;
  private gameState!: GameState;
  private seatPositions: { x: number; y: number }[] = [];
  private communityCardsContainer!: Phaser.GameObjects.Container;
  private potContainer!: Phaser.GameObjects.Container;
  private playerContainers: Map<number, Phaser.GameObjects.Container> = new Map();
  private actionButtonsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: GameConfig.SCENES.GAME });
    this.userService = UserService.getInstance();
  }

  init(data: { roomType: RoomType; quickStart?: boolean }): void {
    // 初始化游戏状态
    this.initGameState(data.roomType);
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 添加游戏背景
    const bg = this.add.image(0, 0, 'game_bg_6p');
    bg.setOrigin(0, 0);
    bg.setDisplaySize(width, height);

    // 计算座位位置（6人桌）
    this.calculateSeatPositions();

    // 创建游戏界面元素
    this.createGameUI();

    // 创建玩家座位
    this.createPlayerSeats();

    // 创建公共牌区域
    this.createCommunityCardsArea();

    // 创建底池显示
    this.createPotDisplay();

    // 创建操作按钮
    this.createActionButtons();

    // 模拟加入一些玩家
    this.addMockPlayers();
  }

  private initGameState(roomType: RoomType): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      this.scene.start(GameConfig.SCENES.LOGIN);
      return;
    }

    this.gameState = {
      roomInfo: {
        id: `room_${Date.now()}`,
        name: '新手房间',
        type: roomType,
        smallBlind: GameConfig.GAME_RULES.SMALL_BLIND,
        bigBlind: GameConfig.GAME_RULES.BIG_BLIND,
        minBuyIn: GameConfig.GAME_RULES.MIN_BUY_IN,
        maxBuyIn: GameConfig.GAME_RULES.MAX_BUY_IN,
        maxPlayers: GameConfig.GAME_RULES.MAX_PLAYERS,
        currentPlayers: 1,
        status: RoomStatus.WAITING,
      },
      stage: GameStage.WAITING,
      players: [],
      currentPlayerIndex: -1,
      dealerIndex: 0,
      smallBlindIndex: 1,
      bigBlindIndex: 2,
      communityCards: [],
      pot: 0,
      sidePots: [],
      minBet: GameConfig.GAME_RULES.BIG_BLIND,
      currentBet: 0,
      roundStartTime: Date.now(),
    };

    // 添加当前玩家
    const currentPlayer: Player = {
      id: currentUser.id,
      userInfo: currentUser,
      seatIndex: 0, // 坐在底部中间位置
      chips: Math.min(currentUser.chips, this.gameState.roomInfo.maxBuyIn),
      status: PlayerStatus.WAITING,
      cards: [],
      currentBet: 0,
      totalBet: 0,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      timeBank: GameConfig.GAME_RULES.EXTRA_TIME_BANK,
    };

    this.gameState.players.push(currentPlayer);
  }

  private calculateSeatPositions(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = 380;
    const radiusY = 240;

    // 6个座位的位置（椭圆形分布）
    this.seatPositions = [
      { x: centerX, y: centerY + radiusY }, // 底部（当前玩家）
      { x: centerX - radiusX * 0.8, y: centerY + radiusY * 0.5 }, // 左下
      { x: centerX - radiusX * 0.8, y: centerY - radiusY * 0.5 }, // 左上
      { x: centerX, y: centerY - radiusY }, // 顶部
      { x: centerX + radiusX * 0.8, y: centerY - radiusY * 0.5 }, // 右上
      { x: centerX + radiusX * 0.8, y: centerY + radiusY * 0.5 }, // 右下
    ];
  }

  private createGameUI(): void {
    const { width } = this.cameras.main;

    // 顶部信息栏
    const topBar = this.add.container(0, 0);

    // 顶部背景
    const topBg = this.add.rectangle(0, 0, width, 80, 0x000000, 0.7);
    topBg.setOrigin(0, 0);
    topBar.add(topBg);

    // 房间信息
    const roomInfo = this.add.text(20, 20, `房间: ${this.gameState.roomInfo.name}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    topBar.add(roomInfo);

    const blindInfo = this.add.text(20, 45, `盲注: ${this.gameState.roomInfo.smallBlind}/${this.gameState.roomInfo.bigBlind}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#cccccc',
    });
    topBar.add(blindInfo);

    // 开始游戏按钮
    const startButton = this.add.container(width - 200, 40);
    const startBg = this.add.rectangle(0, 0, 100, 40, 0x4CAF50);
    startBg.setInteractive({ useHandCursor: true });
    startButton.add(startBg);

    const startText = this.add.text(0, 0, '开始游戏', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    startText.setOrigin(0.5);
    startButton.add(startText);

    startBg.on('pointerdown', () => {
      this.sound.play(GameConfig.AUDIO.CLICK);
      this.startGame();
    });

    topBar.add(startButton);

    // 返回按钮
    const backButton = this.add.container(width - 80, 40);
    const backBg = this.add.rectangle(0, 0, 80, 40, 0x666666);
    backBg.setInteractive({ useHandCursor: true });
    backButton.add(backBg);

    const backText = this.add.text(0, 0, '返回', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    backText.setOrigin(0.5);
    backButton.add(backText);

    backBg.on('pointerdown', () => {
      this.sound.play(GameConfig.AUDIO.CLICK);
      this.scene.start(GameConfig.SCENES.LOBBY);
    });

    topBar.add(backButton);
  }

  private createPlayerSeats(): void {
    this.seatPositions.forEach((pos, index) => {
      const seatContainer = this.add.container(pos.x, pos.y);

      // 座位背景
      const seatBg = this.add.graphics();
      seatBg.fillStyle(0x333333, 0.8);
      seatBg.fillRoundedRect(-80, -60, 160, 120, 10);
      seatContainer.add(seatBg);

      // 空座位提示
      const emptySeatText = this.add.text(0, 0, '空座位', {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#999999',
      });
      emptySeatText.setOrigin(0.5);
      seatContainer.add(emptySeatText);

      // 点击加入按钮（除了已占用的座位）
      if (index !== 0) {
        const joinButton = this.add.text(0, 30, '点击加入', {
          fontSize: '16px',
          fontFamily: 'Arial',
          color: '#4CAF50',
        });
        joinButton.setOrigin(0.5);
        joinButton.setInteractive({ useHandCursor: true });
        seatContainer.add(joinButton);

        joinButton.on('pointerdown', () => {
          this.sound.play(GameConfig.AUDIO.CLICK);
          console.log(`点击加入座位 ${index}`);
        });
      }

      this.playerContainers.set(index, seatContainer);
    });

    // 更新当前玩家的座位显示
    this.updatePlayerSeat(0, this.gameState.players[0]);
  }

  private updatePlayerSeat(seatIndex: number, player: Player): void {
    const container = this.playerContainers.get(seatIndex);
    if (!container) return;

    // 清除原有内容
    container.removeAll(true);

    // 座位背景
    const seatBg = this.add.graphics();
    seatBg.fillStyle(0x222222, 0.9);
    seatBg.fillRoundedRect(-80, -60, 160, 120, 10);
    container.add(seatBg);

    // 头像背景
    const avatarBg = this.add.circle(0, -20, 30, 0x444444);
    container.add(avatarBg);

    // 头像文字（临时）
    const avatarText = this.add.text(0, -20, player.userInfo.nickname[0], {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    avatarText.setOrigin(0.5);
    container.add(avatarText);

    // 玩家昵称
    const nickname = this.add.text(0, 20, player.userInfo.nickname, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    nickname.setOrigin(0.5);
    container.add(nickname);

    // 筹码显示
    const chips = this.add.text(0, 40, `${this.formatChips(player.chips)}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold',
    });
    chips.setOrigin(0.5);
    container.add(chips);

    // 庄家标识
    if (player.isDealer) {
      const dealerButton = this.add.circle(-60, -40, 15, 0xffffff);
      container.add(dealerButton);
      const dealerText = this.add.text(-60, -40, 'D', {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#000000',
        fontStyle: 'bold',
      });
      dealerText.setOrigin(0.5);
      container.add(dealerText);
    }

    // 小盲标识
    if (player.isSmallBlind) {
      const sbButton = this.add.circle(-60, 40, 15, 0x33ccff);
      container.add(sbButton);
      const sbText = this.add.text(-60, 40, 'SB', {
        fontSize: '10px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      sbText.setOrigin(0.5);
      container.add(sbText);
    }

    // 大盲标识
    if (player.isBigBlind) {
      const bbButton = this.add.circle(60, 40, 15, 0xff9900);
      container.add(bbButton);
      const bbText = this.add.text(60, 40, 'BB', {
        fontSize: '10px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      bbText.setOrigin(0.5);
      container.add(bbText);
    }

    // 玩家动作显示 - 增强版
    if (player.lastAction) {
      const actionY = -45;

      // 动作颜色和标签
      const actionConfig = {
        [PlayerAction.CHECK]: { color: 0x00cc00, text: '看牌', icon: '👁️' },
        [PlayerAction.CALL]: { color: 0x0099ff, text: '跟注', icon: '✓' },
        [PlayerAction.RAISE]: { color: 0xff9900, text: '加注', icon: '⬆️' },
        [PlayerAction.FOLD]: { color: 0xff0000, text: '弃牌', icon: '✖' },
        [PlayerAction.ALL_IN]: { color: 0xff00ff, text: '全下', icon: '💰' }
      };

      const action = player.lastAction;
      const config = actionConfig[action] || { color: 0x999999, text: '等待', icon: '⏳' };

      // 创建动作背景
      const actionBg = this.add.graphics();
      actionBg.fillStyle(config.color, 0.9);
      actionBg.fillRoundedRect(-70, actionY - 15, 140, 30, 15);
      actionBg.setData('type', 'action');
      container.add(actionBg);

      // 创建动作文本
      const actionText = this.add.text(0, actionY, `${config.icon} ${config.text}`, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center'
      });
      actionText.setOrigin(0.5);
      actionText.setData('type', 'action');
      container.add(actionText);

      // 玩家状态高亮效果
      if (player.status === PlayerStatus.FOLDED) {
        // 弃牌状态显示灰色遮罩
        const foldedOverlay = this.add.rectangle(0, 0, 160, 120, 0x000000, 0.7);
        foldedOverlay.setData('type', 'status');
        container.add(foldedOverlay);

        const foldedText = this.add.text(0, 0, '已弃牌', {
          fontSize: '20px',
          fontFamily: 'Arial',
          color: '#ff0000',
          fontStyle: 'bold'
        });
        foldedText.setOrigin(0.5);
        foldedText.setData('type', 'status');
        container.add(foldedText);
      } else if (player.status === PlayerStatus.ALL_IN) {
        // 全下状态显示边框
        const allinBorder = this.add.graphics();
        allinBorder.lineStyle(4, 0xff00ff, 1);
        allinBorder.strokeRoundedRect(-82, -62, 164, 124, 12);
        allinBorder.setData('type', 'status');
        container.add(allinBorder);

        // 添加闪烁效果
        this.tweens.add({
          targets: allinBorder,
          alpha: { from: 0.3, to: 1 },
          duration: 800,
          yoyo: true,
          repeat: -1
        });
      }
    }

    // 如果玩家有卡牌，显示卡牌
    if (player.cards && player.cards.length > 0) {
      this.showPlayerCards(player);
    }

    // 如果玩家有下注，显示下注
    if (player.currentBet > 0) {
      this.updatePlayerBet(player);
    }

    // 显示当前玩家标识
    if (player.seatIndex === this.gameState.currentPlayerIndex &&
      this.gameState.stage !== GameStage.WAITING) {
      const activeIndicator = this.add.graphics();
      activeIndicator.lineStyle(3, 0xffff00);
      activeIndicator.strokeRoundedRect(-83, -63, 166, 126, 12);
      container.add(activeIndicator);

      // 添加动画效果
      this.tweens.add({
        targets: activeIndicator,
        alpha: { from: 0.5, to: 1 },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    }
  }

  private createCommunityCardsArea(): void {
    const { width, height } = this.cameras.main;
    this.communityCardsContainer = this.add.container(width / 2, height / 2 - 50);

    // 公共牌背景
    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x000000, 0.3);
    bgGraphics.fillRoundedRect(-200, -50, 400, 100, 10);
    this.communityCardsContainer.add(bgGraphics);

    // 添加5个牌位占位符
    for (let i = 0; i < 5; i++) {
      const cardPlaceholder = this.add.rectangle(
        -160 + i * 80,
        0,
        70,
        90,
        0x666666,
        0.3
      );
      cardPlaceholder.setStrokeStyle(2, 0x999999);
      this.communityCardsContainer.add(cardPlaceholder);
    }
  }

  private createPotDisplay(): void {
    const { width, height } = this.cameras.main;
    this.potContainer = this.add.container(width / 2, height / 2 + 80);

    // 底池背景
    const potBg = this.add.graphics();
    potBg.fillStyle(0x000000, 0.7);
    potBg.fillRoundedRect(-80, -25, 160, 50, 25);
    this.potContainer.add(potBg);

    // 底池图标
    const potIcon = this.add.circle(-50, 0, 15, 0xffcc00);
    this.potContainer.add(potIcon);

    // 底池金额
    const potText = this.add.text(0, 0, `底池: ${this.formatChips(this.gameState.pot)}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    potText.setOrigin(0.5);
    this.potContainer.add(potText);
  }

  private createActionButtons(): void {
    const { width, height } = this.cameras.main;
    this.actionButtonsContainer = this.add.container(width / 2, height - 150);
    this.actionButtonsContainer.setVisible(false); // 初始隐藏

    const buttonWidth = 120;
    const buttonSpacing = 20;

    // 弃牌按钮
    const foldButton = this.createActionButton(
      -(buttonWidth + buttonSpacing) * 1.5,
      0,
      '弃牌',
      0xff4444,
      () => this.handlePlayerAction(PlayerAction.FOLD)
    );
    this.actionButtonsContainer.add(foldButton);

    // 跟注按钮
    const callButton = this.createActionButton(
      -(buttonWidth + buttonSpacing) * 0.5,
      0,
      '跟注',
      0x4444ff,
      () => this.handlePlayerAction(PlayerAction.CALL)
    );
    this.actionButtonsContainer.add(callButton);

    // 加注按钮
    const raiseButton = this.createActionButton(
      (buttonWidth + buttonSpacing) * 0.5,
      0,
      '加注',
      0xff8800,
      () => this.handlePlayerAction(PlayerAction.RAISE)
    );
    this.actionButtonsContainer.add(raiseButton);

    // 全下按钮
    const allInButton = this.createActionButton(
      (buttonWidth + buttonSpacing) * 1.5,
      0,
      '全下',
      0xff0088,
      () => this.handlePlayerAction(PlayerAction.ALL_IN)
    );
    this.actionButtonsContainer.add(allInButton);
  }

  private createActionButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 120, 50, color);
    bg.setInteractive({ useHandCursor: true });
    button.add(bg);

    const buttonText = this.add.text(0, 0, text, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);
    button.add(buttonText);

    bg.on('pointerdown', () => {
      this.sound.play(GameConfig.AUDIO.CLICK);
      callback();
    });

    bg.on('pointerover', () => bg.setScale(1.05));
    bg.on('pointerout', () => bg.setScale(1));

    return button;
  }

  private addMockPlayers(): void {
    // 模拟添加其他玩家（为了测试）
    const mockPlayers = [
      { nickname: '小明', chips: 3600, avatar: '' },
      { nickname: '大华', chips: 3600, avatar: '' },
      { nickname: '阿强', chips: 3800, avatar: '' },
      { nickname: '游客3702', chips: 10000, avatar: '' },
    ];

    mockPlayers.forEach((mock, idx) => {
      const seatIndex = idx + 1; // 从1号位开始（0号位是当前玩家）
      if (seatIndex < this.seatPositions.length) {
        const player: Player = {
          id: `mock_${seatIndex}`,
          userInfo: {
            id: `mock_${seatIndex}`,
            nickname: mock.nickname,
            chips: mock.chips,
            avatar: mock.avatar,
            level: 1,
            experience: 0,
            diamonds: 0,
            vipLevel: 0,
            createTime: Date.now(),
            lastLoginTime: Date.now()
          },
          seatIndex,
          chips: mock.chips,
          status: PlayerStatus.WAITING,
          cards: [],
          currentBet: 0,
          totalBet: 0,
          isDealer: false,
          isSmallBlind: false,
          isBigBlind: false,
          timeBank: GameConfig.GAME_RULES.EXTRA_TIME_BANK,
        };

        this.gameState.players.push(player);
        this.updatePlayerSeat(seatIndex, player);
      }
    });

    // 更新房间玩家数量
    this.gameState.roomInfo.currentPlayers = this.gameState.players.length;

    // 检查是否达到4名玩家，如果是则自动开始游戏
    if (this.gameState.players.length >= 4) {
      this.time.delayedCall(1000, () => {
        this.startGame();
      });
    }
  }

  // 开始游戏
  private startGame(): void {
    // 如果游戏已经开始，则不做任何事
    if (this.gameState.stage !== GameStage.WAITING) {
      return;
    }

    // 如果玩家数量不足2人，则无法开始
    if (this.gameState.players.length < 2) {
      this.showMessage('至少需要2名玩家才能开始游戏');
      return;
    }

    // 更改游戏状态为开始
    this.gameState.stage = GameStage.PRE_FLOP;
    this.gameState.roomInfo.status = RoomStatus.PLAYING;

    // 分配位置（庄家、小盲和大盲）
    this.assignPositions();

    // 发牌
    this.dealCards();

    // 收取盲注
    this.collectBlinds();

    // 更新UI
    this.updateGameUI();

    // 显示游戏开始消息
    this.showMessage('游戏开始！');

    // 激活当前玩家
    this.time.delayedCall(1000, () => {
      this.activateCurrentPlayer();
    });
  }

  // 分配位置（庄家、小盲和大盲）
  private assignPositions(): void {
    const playerCount = this.gameState.players.length;

    // 随机选择庄家位置
    this.gameState.dealerIndex = Math.floor(Math.random() * playerCount);

    // 小盲位是庄家之后的玩家
    this.gameState.smallBlindIndex = (this.gameState.dealerIndex + 1) % playerCount;

    // 大盲位是小盲之后的玩家
    this.gameState.bigBlindIndex = (this.gameState.smallBlindIndex + 1) % playerCount;

    // 设置玩家位置标识
    this.gameState.players.forEach((player, index) => {
      player.isDealer = index === this.gameState.dealerIndex;
      player.isSmallBlind = index === this.gameState.smallBlindIndex;
      player.isBigBlind = index === this.gameState.bigBlindIndex;
      player.status = PlayerStatus.WAITING;
    });

    // 当前行动玩家是大盲位之后的玩家
    this.gameState.currentPlayerIndex = (this.gameState.bigBlindIndex + 1) % playerCount;
  }

  // 激活当前玩家
  private activateCurrentPlayer(): void {
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];

    if (!currentPlayer) {
      console.error('当前玩家不存在!');
      return;
    }

    console.log(`当前轮到玩家: ${currentPlayer.userInfo.nickname} 行动`);

    // 高亮显示当前玩家
    this.updatePlayerSeat(currentPlayer.seatIndex, currentPlayer);

    // 如果是玩家弃牌或已经全下，自动跳过
    if (currentPlayer.status === PlayerStatus.FOLDED ||
      currentPlayer.status === PlayerStatus.ALL_IN) {
      console.log(`玩家 ${currentPlayer.userInfo.nickname} 已弃牌或全下，自动跳过`);
      // 确保隐藏操作按钮
      this.actionButtonsContainer.setVisible(false);
      this.time.delayedCall(1000, () => {
        this.nextPlayer();
      });
      return;
    }

    // 如果是当前玩家（座位0），显示操作按钮
    if (currentPlayer.seatIndex === 0) {
      this.showPlayerActions(currentPlayer);
    } else {
      // AI玩家自动行动
      this.time.delayedCall(2000, () => {
        this.handleAIAction(currentPlayer);
      });
    }
  }

  // 显示玩家操作按钮
  private showPlayerActions(player: Player): void {
    // 显示操作按钮容器
    this.actionButtonsContainer.setVisible(true);

    // 根据游戏状态和玩家情况，决定可用的按钮
    const canCheck = this.gameState.currentBet <= player.currentBet;
    const callAmount = this.gameState.currentBet - player.currentBet;

    // 获取按钮
    const buttons = this.actionButtonsContainer.getAll();

    // 弃牌按钮始终可用

    // 跟注/看牌按钮
    const callButton = buttons[1] as Phaser.GameObjects.Container;
    const callText = callButton.getAt(1) as Phaser.GameObjects.Text;

    if (canCheck) {
      callText.setText('看牌');
    } else {
      callText.setText(`跟注 ${callAmount}`);
    }

    // 如果玩家筹码不足以跟注，禁用跟注按钮
    if (player.chips < callAmount) {
      callButton.setAlpha(0.5);
      callButton.removeInteractive();
    } else {
      callButton.setAlpha(1);
      (callButton.getAt(0) as Phaser.GameObjects.Rectangle).setInteractive({ useHandCursor: true });
    }

    // 加注按钮
    const raiseButton = buttons[2] as Phaser.GameObjects.Container;

    // 如果玩家筹码不足以加注，禁用加注按钮
    if (player.chips <= callAmount || player.chips <= this.gameState.minBet) {
      raiseButton.setAlpha(0.5);
      raiseButton.removeInteractive();
    } else {
      raiseButton.setAlpha(1);
      (raiseButton.getAt(0) as Phaser.GameObjects.Rectangle).setInteractive({ useHandCursor: true });
    }

    // 全下按钮
    const allInButton = buttons[3] as Phaser.GameObjects.Container;

    // 如果玩家筹码为0，禁用全下按钮
    if (player.chips === 0) {
      allInButton.setAlpha(0.5);
      allInButton.removeInteractive();
    } else {
      allInButton.setAlpha(1);
      (allInButton.getAt(0) as Phaser.GameObjects.Rectangle).setInteractive({ useHandCursor: true });
    }
  }

  // 处理AI玩家行动
  private handleAIAction(player: Player): void {
    // 简单AI逻辑
    const randomIndex = Math.floor(Math.random() * 100);

    let action: PlayerAction;

    // 跟注/看牌
    const canCheck = this.gameState.currentBet <= player.currentBet;
    const callAmount = this.gameState.currentBet - player.currentBet;
    // 如果筹码不足以跟注，只能弃牌或全下
    if (player.chips < callAmount) {
      action = Math.random() < 0.5 ? PlayerAction.FOLD : PlayerAction.ALL_IN;
    }
    // 简单AI决策逻辑：70%概率跟注/看牌，20%概率加注，10%概率弃牌
    else if (randomIndex < 10) {
      action = PlayerAction.FOLD;
    } else if (randomIndex < 30) {
      action = PlayerAction.RAISE;
    } else {
      action = canCheck ? PlayerAction.CHECK : PlayerAction.CALL;
    }

    // 如果筹码不足以加注，改为跟注或全下
    if (action === PlayerAction.RAISE && player.chips < this.gameState.minBet * 2) {
      action = Math.random() < 0.7 ? PlayerAction.CALL : PlayerAction.ALL_IN;
    }

    console.log(`AI玩家 ${player.userInfo.nickname} 选择: ${action}`);

    // 执行AI行动
    if (action === PlayerAction.RAISE) {
      // 计算加注金额，确保不小于当前最高下注
      const minRaise = this.gameState.currentBet + this.gameState.minBet;
      const maxRaise = player.currentBet + player.chips;
      const raiseAmount = Math.min(
        maxRaise,
        Math.max(minRaise, Math.floor(Math.random() * (maxRaise - minRaise + 1)) + minRaise)
      );
      this.handlePlayerAction(action, raiseAmount);
    } else {
      this.handlePlayerAction(action);
    }
  }

  // 处理玩家动作
  private handlePlayerAction(action: PlayerAction, betAmount: number = 0): void {
    const currentPlayer = this.getCurrentPlayer();

    // 如果当前没有活跃玩家，直接返回
    if (!currentPlayer) {
      console.error("没有当前活跃玩家");
      return;
    }

    // 更新玩家动作
    currentPlayer.lastAction = action;

    // 记录之前的状态以便动画显示
    const oldChips = currentPlayer.chips;

    // 根据不同动作处理
    switch (action) {
      case PlayerAction.FOLD:
        console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择弃牌`);
        currentPlayer.status = PlayerStatus.FOLDED;
        this.updatePlayerDisplay(currentPlayer);
        this.showPlayerAction(currentPlayer, "弃牌", 0xcccccc);
        break;

      case PlayerAction.CHECK:
        console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择看牌`);
        this.showPlayerAction(currentPlayer, "看牌", 0x00ff00);
        break;

      case PlayerAction.CALL:
        console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择跟注 ${this.gameState.currentBet}`);
        // 计算需要跟注的金额
        const callAmount = this.gameState.currentBet - currentPlayer.currentBet;

        // 如果玩家筹码不足以跟注，则全下
        if (currentPlayer.chips <= callAmount) {
          // 全下
          this.gameState.pot += currentPlayer.chips;
          currentPlayer.currentBet += currentPlayer.chips;
          currentPlayer.chips = 0;
          currentPlayer.status = PlayerStatus.ALL_IN;
          this.showPlayerAction(currentPlayer, "全下", 0xff0000);
          // 如果是当前玩家全下，隐藏操作按钮
          if (currentPlayer.seatIndex === 0) {
            this.actionButtonsContainer.setVisible(false);
          }
        } else {
          // 正常跟注
          currentPlayer.chips -= callAmount;
          currentPlayer.currentBet = this.gameState.currentBet;
          // 增加底池
          this.gameState.pot += callAmount;
          this.showPlayerAction(currentPlayer, "跟注", 0x00ffff);
        }
        break;

      case PlayerAction.RAISE:
        // 确保加注金额不小于当前最高下注加最小加注额
        const minRaiseAmount = this.gameState.currentBet + this.gameState.minBet;

        // 如果没有指定加注金额，使用最小加注额
        if (betAmount <= 0) {
          betAmount = minRaiseAmount;
        }

        // 确保加注金额不小于最小加注额
        betAmount = Math.max(betAmount, minRaiseAmount);

        // 如果加注金额超过玩家筹码，则全下
        if (betAmount >= currentPlayer.currentBet + currentPlayer.chips) {
          // 全下
          this.gameState.pot += currentPlayer.chips;
          const totalBet = currentPlayer.currentBet + currentPlayer.chips;
          // 如果全下金额大于当前最高下注，更新最高下注
          if (totalBet > this.gameState.currentBet) {
            this.gameState.currentBet = totalBet;
          }
          currentPlayer.currentBet = totalBet;
          currentPlayer.chips = 0;
          currentPlayer.status = PlayerStatus.ALL_IN;
          this.showPlayerAction(currentPlayer, "全下", 0xff0000);
          // 如果是当前玩家全下，隐藏操作按钮
          if (currentPlayer.seatIndex === 0) {
            this.actionButtonsContainer.setVisible(false);
          }
        } else {
          console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择加注到 ${betAmount}`);
          // 计算加注的总金额
          const raiseDiff = betAmount - currentPlayer.currentBet;

          currentPlayer.chips -= raiseDiff;
          currentPlayer.currentBet = betAmount;
          // 更新当前最高下注
          this.gameState.currentBet = betAmount;
          // 增加底池
          this.gameState.pot += raiseDiff;
          this.showPlayerAction(currentPlayer, "加注", 0xff9900);
        }
        break;

      case PlayerAction.ALL_IN:
        console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择全下 ${currentPlayer.chips}`);
        // 计算全下金额
        const allInAmount = currentPlayer.chips + currentPlayer.currentBet;
        // 如果全下金额大于当前最高下注，更新最高下注
        if (allInAmount > this.gameState.currentBet) {
          this.gameState.currentBet = allInAmount;
        }
        // 增加底池
        this.gameState.pot += currentPlayer.chips;
        currentPlayer.currentBet = allInAmount;
        currentPlayer.chips = 0;
        currentPlayer.status = PlayerStatus.ALL_IN;
        this.showPlayerAction(currentPlayer, "全下", 0xff0000);
        // 如果是当前玩家全下，隐藏操作按钮
        if (currentPlayer.seatIndex === 0) {
          this.actionButtonsContainer.setVisible(false);
        }
        break;
    }

    // 更新界面显示
    this.updatePlayerDisplay(currentPlayer);
    this.updatePotDisplay();

    // 动画显示筹码变化
    this.animateChipsChange(currentPlayer, oldChips);

    // 检查回合是否结束
    if (this.isRoundComplete()) {
      // 如果回合结束，进入下一回合
      this.time.delayedCall(1500, () => {
        this.nextRound();
      });
    } else {
      // 切换到下一个玩家
      this.time.delayedCall(1000, () => {
        this.nextPlayer();
      });
    }
  }

  // 切换到下一个玩家
  private nextPlayer(): void {
    // 获取当前玩家
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) {
      console.error("没有当前活跃玩家");
      return;
    }

    // 取消当前玩家的高亮
    this.highlightCurrentPlayer(false);

    // 找下一个未弃牌的玩家
    let nextIndex = this.gameState.currentPlayerIndex;
    let loopCount = 0;
    const playerCount = this.gameState.players.length;

    do {
      nextIndex = (nextIndex + 1) % playerCount;
      loopCount++;

      // 防止无限循环
      if (loopCount > playerCount) {
        console.error("没有找到下一个活跃玩家");
        this.nextRound();
        return;
      }
    } while (
      this.gameState.players[nextIndex].status === PlayerStatus.FOLDED ||
      this.gameState.players[nextIndex].status === PlayerStatus.ALL_IN
    );

    // 更新当前玩家索引
    this.gameState.currentPlayerIndex = nextIndex;

    // 激活新的当前玩家
    this.activateCurrentPlayer();
  }

  // 获取当前玩家
  private getCurrentPlayer(): Player | null {
    if (this.gameState.currentPlayerIndex === -1) {
      return null;
    }
    return this.gameState.players[this.gameState.currentPlayerIndex] || null;
  }

  // 更新玩家显示
  private updatePlayerDisplay(player: Player): void {
      this.updatePlayerSeat(player.seatIndex, player);
  }

  // 高亮当前玩家
  private highlightCurrentPlayer(highlight: boolean): void {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return;

    const container = this.playerContainers.get(currentPlayer.seatIndex);
    if (!container) return;

    // 移除现有的高亮
    container.getAll().forEach(obj => {
      if (obj.getData('type') === 'highlight') {
        obj.destroy();
      }
    });

    if (highlight) {
      // 添加高亮边框
      const highlightBorder = this.add.graphics();
      highlightBorder.lineStyle(4, 0xffff00, 1);
      highlightBorder.strokeRoundedRect(-84, -64, 168, 128, 12);
      highlightBorder.setData('type', 'highlight');
      container.add(highlightBorder);

      // 添加闪烁动画
      this.tweens.add({
        targets: highlightBorder,
        alpha: { from: 0.5, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1
      });
    }
  }

  // 动画显示筹码变化
  private animateChipsChange(player: Player, oldChips: number): void {
    const container = this.playerContainers.get(player.seatIndex);
    if (!container) return;

    // 如果筹码有变化，显示变化动画
    const chipsDiff = oldChips - player.chips;
    if (chipsDiff > 0) {
      const pos = this.seatPositions[player.seatIndex];

      // 创建筹码变化文本
      const changeText = this.add.text(pos.x, pos.y - 50, `-${this.formatChips(chipsDiff)}`, {
        fontSize: '20px',
      fontFamily: 'Arial',
        color: '#ff6666',
        fontStyle: 'bold'
    });
      changeText.setOrigin(0.5);

      // 动画效果
      this.tweens.add({
        targets: changeText,
        y: pos.y - 100,
        alpha: { from: 1, to: 0 },
        duration: 1500,
        onComplete: () => {
          changeText.destroy();
  }
      });
}
  }

  // 显示玩家动作动画
  private showPlayerAction(player: Player, action: string, color: number): void {
    const container = this.playerContainers.get(player.seatIndex);
    if (!container) return;

    const playerPosition = this.seatPositions[player.seatIndex];

    // 创建动作文本
    const actionText = this.add.text(playerPosition.x, playerPosition.y - 100, action, {
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
    this.tweens.add({
      targets: actionText,
      y: playerPosition.y - 150,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.5 },
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        actionText.destroy();
      }
    });

    // 播放相应的音效
    this.sound.play(GameConfig.AUDIO.CLICK); // 使用点击音效代替
  }

  // 检查当前回合是否结束
  private isRoundComplete(): boolean {
    const players = this.gameState.players;
    const currentBet = this.gameState.currentBet;

    // 统计活跃玩家和已全下玩家数量
    let activePlayers = 0;
    let allInPlayers = 0;
    let actedPlayers = 0;

    // 检查所有未弃牌的玩家是否都已行动且下注相等或全下
    for (const player of players) {
      // 跳过已弃牌的玩家
      if (player.status === PlayerStatus.FOLDED) {
        continue;
      }

      // 统计活跃玩家
      if (player.status !== PlayerStatus.ALL_IN) {
        activePlayers++;
      } else {
        allInPlayers++;
      }

      // 已经行动的玩家
      if (player.lastAction || player.status === PlayerStatus.ALL_IN) {
        actedPlayers++;
      }

      // 如果玩家尚未行动或下注不等于当前最高下注且未全下，则回合未结束
      if (!player.lastAction && player.status !== PlayerStatus.ALL_IN) {
        return false;
      }

      if (player.currentBet < currentBet && player.status !== PlayerStatus.ALL_IN) {
        return false;
      }
    }

    // 如果只有一个活跃玩家和至少一个全下玩家，回合结束
    if (activePlayers <= 1 && allInPlayers > 0) {
      console.log("回合结束：只有一个活跃玩家和全下玩家");
      return true;
    }

    // 如果所有未弃牌玩家都已行动，回合结束
    const totalNonFoldedPlayers = activePlayers + allInPlayers;
    const isComplete = actedPlayers === totalNonFoldedPlayers;

    if (isComplete) {
      console.log("回合结束：所有玩家都已行动");
    }

    return isComplete;
  }

  // 进入下一回合
  private nextRound(): void {
    console.log("进入下一回合");

    // 活跃玩家数量（未弃牌且未全下）
    const activePlayers = this.getActivePlayersCount(true);
    // 参与玩家数量（未弃牌）
    const participatingPlayers = this.getActivePlayersCount(false);

    // 检查是否只有一个活跃玩家
    if (activePlayers <= 1 && participatingPlayers > 1) {
      // 如果只有一个活跃玩家但有多个参与玩家（即其他人都全下了）
      // 直接发完所有公共牌，然后进入摊牌阶段
      console.log("只有一个活跃玩家和全下玩家，直接发完所有公共牌");

      // 根据当前阶段决定要发多少张牌
      switch (this.gameState.stage) {
        case GameStage.PRE_FLOP:
          // 发翻牌、转牌、河牌
          this.gameState.stage = GameStage.FLOP;
          this.dealFlop();

          this.time.delayedCall(1000, () => {
            this.gameState.stage = GameStage.TURN;
            this.dealTurn();

            this.time.delayedCall(1000, () => {
              this.gameState.stage = GameStage.RIVER;
              this.dealRiver();

              this.time.delayedCall(1000, () => {
                this.gameState.stage = GameStage.SHOWDOWN;
                this.showdown();
              });
            });
          });
          return;

        case GameStage.FLOP:
          // 发转牌、河牌
          this.gameState.stage = GameStage.TURN;
          this.dealTurn();

          this.time.delayedCall(1000, () => {
            this.gameState.stage = GameStage.RIVER;
            this.dealRiver();

            this.time.delayedCall(1000, () => {
              this.gameState.stage = GameStage.SHOWDOWN;
              this.showdown();
            });
          });
          return;

        case GameStage.TURN:
          // 发河牌
          this.gameState.stage = GameStage.RIVER;
          this.dealRiver();

          this.time.delayedCall(1000, () => {
            this.gameState.stage = GameStage.SHOWDOWN;
            this.showdown();
          });
          return;

        case GameStage.RIVER:
          // 直接进入摊牌
          this.gameState.stage = GameStage.SHOWDOWN;
          this.showdown();
          return;
      }
    }

    // 重置玩家下注状态
    this.gameState.players.forEach(player => {
      if (player.status !== PlayerStatus.FOLDED) {
        player.currentBet = 0;
        player.lastAction = undefined;
      }
    });

    // 重置当前下注
    this.gameState.currentBet = 0;

    // 根据当前阶段进入下一阶段
    switch (this.gameState.stage) {
      case GameStage.PRE_FLOP:
        this.gameState.stage = GameStage.FLOP;
        this.dealFlop();
        break;

      case GameStage.FLOP:
        this.gameState.stage = GameStage.TURN;
        this.dealTurn();
        break;

      case GameStage.TURN:
        this.gameState.stage = GameStage.RIVER;
        this.dealRiver();
        break;

      case GameStage.RIVER:
        this.gameState.stage = GameStage.SHOWDOWN;
        this.showdown();
        break;

      default:
        console.error(`未知游戏阶段: ${this.gameState.stage}`);
        return;
    }

    // 将当前玩家设置为庄家之后的第一个有效玩家
    this.gameState.currentPlayerIndex = this.findNextActivePlayerAfter(this.gameState.dealerIndex);

    // 如果只有一个活跃玩家，直接进入摊牌
    if (this.getActivePlayersCount(false) <= 1) {
      this.showdown();
      return;
    }

    // 激活当前玩家
    this.activateCurrentPlayer();
  }

  // 获取活跃玩家数量
  private getActivePlayersCount(excludeAllIn: boolean = false): number {
    if (excludeAllIn) {
      // 返回未弃牌且未全下的玩家数量
      return this.gameState.players.filter(
        p => p.status !== PlayerStatus.FOLDED && p.status !== PlayerStatus.ALL_IN
      ).length;
    } else {
      // 返回未弃牌的玩家数量
      return this.gameState.players.filter(p => p.status !== PlayerStatus.FOLDED).length;
    }
  }

  // 寻找指定位置之后的下一个活跃玩家
  private findNextActivePlayerAfter(index: number): number {
    const playerCount = this.gameState.players.length;
    let nextIndex = (index + 1) % playerCount;
    let loopCount = 0;

    while (loopCount < playerCount) {
      const player = this.gameState.players[nextIndex];

      if (player.status !== PlayerStatus.FOLDED) {
        return nextIndex;
      }

      nextIndex = (nextIndex + 1) % playerCount;
      loopCount++;
    }

    return index; // 如果找不到活跃玩家，返回原索引
  }

  // 发翻牌
  private dealFlop(): void {
    console.log("发翻牌");
    // 从牌堆中取出三张牌作为公共牌
    const deck = this.createDeck();
    this.shuffleDeck(deck);

    // 移除已经发给玩家的牌
    this.gameState.players.forEach(player => {
      player.cards.forEach(card => {
        const index = deck.findIndex(c => c.id === card.id);
        if (index !== -1) {
          deck.splice(index, 1);
        }
      });
    });

    // 发三张公共牌
    this.gameState.communityCards = [
      deck.pop()!,
      deck.pop()!,
      deck.pop()!
    ];

    // 显示公共牌
    this.showCommunityCards();
    this.showMessage("翻牌");
  }

  // 发转牌
  private dealTurn(): void {
    console.log("发转牌");
    // 从牌堆中取出一张牌作为第四张公共牌
    const deck = this.createDeck();
    this.shuffleDeck(deck);

    // 移除已经发给玩家的牌和已有的公共牌
    this.gameState.players.forEach(player => {
      player.cards.forEach(card => {
        const index = deck.findIndex(c => c.id === card.id);
        if (index !== -1) {
          deck.splice(index, 1);
        }
      });
    });

    this.gameState.communityCards.forEach(card => {
      const index = deck.findIndex(c => c.id === card.id);
      if (index !== -1) {
        deck.splice(index, 1);
      }
    });

    // 发第四张公共牌
    this.gameState.communityCards.push(deck.pop()!);

    // 显示公共牌
    this.showCommunityCards();
    this.showMessage("转牌");
  }

  // 发河牌
  private dealRiver(): void {
    console.log("发河牌");
    // 从牌堆中取出一张牌作为第五张公共牌
    const deck = this.createDeck();
    this.shuffleDeck(deck);

    // 移除已经发给玩家的牌和已有的公共牌
    this.gameState.players.forEach(player => {
      player.cards.forEach(card => {
        const index = deck.findIndex(c => c.id === card.id);
        if (index !== -1) {
          deck.splice(index, 1);
        }
      });
    });

    this.gameState.communityCards.forEach(card => {
      const index = deck.findIndex(c => c.id === card.id);
      if (index !== -1) {
        deck.splice(index, 1);
      }
    });

    // 发第五张公共牌
    this.gameState.communityCards.push(deck.pop()!);

    // 显示公共牌
    this.showCommunityCards();
    this.showMessage("河牌");
  }

  // 显示公共牌
  private showCommunityCards(): void {
    // 清除旧的公共牌
    this.communityCardsContainer.getAll().forEach(obj => {
      if (obj.getData('type') === 'card') {
        obj.destroy();
      }
    });

    // 显示新的公共牌
    this.gameState.communityCards.forEach((card, index) => {
      const cardX = -160 + index * 80;
      const cardY = 0;

      // 卡牌背景
      const cardBg = this.add.rectangle(cardX, cardY, 70, 90, 0xffffff);
      cardBg.setStrokeStyle(2, 0x000000);
      cardBg.setData('type', 'card');
      this.communityCardsContainer.add(cardBg);

      // 显示卡牌花色和点数
      const suitColors: Record<CardSuit, number> = {
        [CardSuit.HEARTS]: 0xff0000,
        [CardSuit.DIAMONDS]: 0xff0000,
        [CardSuit.CLUBS]: 0x000000,
        [CardSuit.SPADES]: 0x000000
      };

      const suitSymbols: Record<CardSuit, string> = {
        [CardSuit.HEARTS]: '♥',
        [CardSuit.DIAMONDS]: '♦',
        [CardSuit.CLUBS]: '♣',
        [CardSuit.SPADES]: '♠'
      };

      const rankTexts: Record<number, string> = {
        2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
        11: 'J', 12: 'Q', 13: 'K', 14: 'A'
      };

      // 添加点数
      const rankText = this.add.text(cardX, cardY - 25, rankTexts[card.rank], {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: suitColors[card.suit].toString(16),
        fontStyle: 'bold'
      });
      rankText.setOrigin(0.5);
      rankText.setData('type', 'card');
      this.communityCardsContainer.add(rankText);

      // 添加花色
      const suitText = this.add.text(cardX, cardY + 15, suitSymbols[card.suit], {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: suitColors[card.suit].toString(16)
      });
      suitText.setOrigin(0.5);
      suitText.setData('type', 'card');
      this.communityCardsContainer.add(suitText);
    });
  }

  // 摊牌阶段
  private showdown(): void {
    console.log("进入摊牌阶段");
    this.showMessage("摊牌");

    // 显示所有玩家的牌
    this.gameState.players.forEach(player => {
      if (player.status !== PlayerStatus.FOLDED) {
        // 强制显示所有玩家的牌面
        const container = this.playerContainers.get(player.seatIndex);
        if (container) {
          // 显示玩家的牌面
          this.showPlayerCards(player);

          // 找到玩家的牌背，替换为牌面
          container.getAll().forEach(obj => {
            if (obj.getData('type') === 'card' && obj.type === 'Rectangle') {
              obj.destroy();
            }
          });
        }
      }
    });

    // 确定赢家并分配底池（简单版本，不考虑牌型比较）
    const activePlayers = this.gameState.players.filter(p => p.status !== PlayerStatus.FOLDED);

    // 临时：随机选择一名获胜者
    const winnerIndex = Math.floor(Math.random() * activePlayers.length);
    const winner = activePlayers[winnerIndex];

    if (winner) {
      // 将底池分配给赢家
      winner.chips += this.gameState.pot;

      // 显示获胜消息
      this.showMessage(`${winner.userInfo.nickname} 赢得了 ${this.formatChips(this.gameState.pot)} 筹码!`);

      // 延迟后开始新一轮游戏
      this.time.delayedCall(5000, () => {
        this.resetGame();
      });
    } else {
      console.error("没有活跃玩家，无法确定赢家");
      this.resetGame();
    }
  }

  // 重置游戏状态，准备下一轮
  private resetGame(): void {
    console.log("重置游戏");

    // 重置游戏状态
    this.gameState.stage = GameStage.WAITING;
    this.gameState.pot = 0;
    this.gameState.communityCards = [];
    this.gameState.currentBet = 0;

    // 重置玩家状态
    this.gameState.players.forEach(player => {
      player.cards = [];
      player.currentBet = 0;
      player.totalBet = 0;
      player.status = PlayerStatus.WAITING;
      player.lastAction = undefined;
    });

    // 清除公共牌显示
    this.communityCardsContainer.getAll().forEach(obj => {
      if (obj.getData('type') === 'card') {
        obj.destroy();
      }
    });

    // 更新UI
    this.updateGameUI();

    // 隐藏操作按钮
    this.actionButtonsContainer.setVisible(false);

    // 自动开始新的一轮游戏
    this.time.delayedCall(2000, () => {
      this.startGame();
    });
  }

  private formatChips(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
  }

  // 显示玩家手牌
  private showPlayerCards(player: Player, forceShowFront: boolean = false): void {
    const container = this.playerContainers.get(player.seatIndex);
    if (!container) return;

    // 移除可能存在的旧卡牌
    container.getAll().forEach(obj => {
      if (obj.getData('type') === 'card') {
        obj.destroy();
      }
    });

    // 是否显示卡牌正面 (显示当前玩家的牌面或强制显示)
    const showFront = player.seatIndex === 0 || forceShowFront;

    // 添加两张卡牌
    for (let i = 0; i < player.cards.length; i++) {
      const card = player.cards[i];
      const cardX = -25 + i * 50; // 卡牌位置，左右间隔50像素
      const cardY = -20; // 与头像同高

      // 创建卡牌背景
      const cardBg = this.add.rectangle(cardX, cardY, 40, 60, 0xffffff);
      cardBg.setStrokeStyle(2, 0x000000);
      cardBg.setData('type', 'card');
      container.add(cardBg);

      if (showFront) {
        // 显示卡牌花色和点数
        const suitColors: Record<CardSuit, number> = {
          [CardSuit.HEARTS]: 0xff0000,
          [CardSuit.DIAMONDS]: 0xff0000,
          [CardSuit.CLUBS]: 0x000000,
          [CardSuit.SPADES]: 0x000000
        };

        const suitSymbols: Record<CardSuit, string> = {
          [CardSuit.HEARTS]: '♥',
          [CardSuit.DIAMONDS]: '♦',
          [CardSuit.CLUBS]: '♣',
          [CardSuit.SPADES]: '♠'
        };

        const rankTexts: Record<number, string> = {
          2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
          11: 'J', 12: 'Q', 13: 'K', 14: 'A'
        };

        // 添加点数
        const rankText = this.add.text(cardX, cardY - 15, rankTexts[card.rank], {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: suitColors[card.suit].toString(16),
          fontStyle: 'bold'
        });
        rankText.setOrigin(0.5);
        rankText.setData('type', 'card');
        container.add(rankText);

        // 添加花色
        const suitText = this.add.text(cardX, cardY + 10, suitSymbols[card.suit], {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: suitColors[card.suit].toString(16)
        });
        suitText.setOrigin(0.5);
        suitText.setData('type', 'card');
        container.add(suitText);
      } else {
        // 显示卡牌背面
        const cardBack = this.add.rectangle(cardX, cardY, 36, 56, 0x0000cc);
        cardBack.setData('type', 'card');
        container.add(cardBack);

        // 卡牌背面花纹
        const pattern = this.add.grid(cardX, cardY, 30, 50, 10, 10, 0, 0, 0x0000ff, 0.5);
        pattern.setData('type', 'card');
        container.add(pattern);
      }
    }
  }

  // 显示消息
  private showMessage(message: string): void {
    const { width, height } = this.cameras.main;

    // 消息容器
    const messageContainer = this.add.container(width / 2, height / 2 - 100);

    // 背景
    const bg = this.add.rectangle(0, 0, 400, 60, 0x000000, 0.8);
    messageContainer.add(bg);

    // 文字
    const text = this.add.text(0, 0, message, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    text.setOrigin(0.5);
    messageContainer.add(text);

    // 淡入淡出动画
    messageContainer.setAlpha(0);
    this.tweens.add({
      targets: messageContainer,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 2000,
      onComplete: () => {
        messageContainer.destroy();
      },
    });
  }

  // 玩家下注
  private placeBet(player: Player, amount: number): void {
    const actualAmount = Math.min(player.chips, amount);

    console.log(`玩家 ${player.userInfo.nickname} 下注 ${actualAmount}, 当前筹码 ${player.chips} -> ${player.chips - actualAmount}`);

    // 更新玩家筹码和下注额
    player.chips -= actualAmount;
    player.currentBet += actualAmount;
    player.totalBet += actualAmount;

    // 更新底池
    this.gameState.pot += actualAmount;

    // 设置玩家动作
    if (actualAmount === player.chips) {
      player.status = PlayerStatus.ALL_IN;
      player.lastAction = PlayerAction.ALL_IN;
    } else if (player.isSmallBlind) {
      player.lastAction = PlayerAction.CALL; // 小盲相当于跟注
    } else if (player.isBigBlind) {
      player.lastAction = PlayerAction.CALL; // 大盲相当于跟注
    }

    // 更新玩家UI
    this.updatePlayerSeat(player.seatIndex, player);

    // 更新底池显示
    this.updatePotDisplay();
  }

  // 发牌
  private dealCards(): void {
    // 创建一副牌
    const deck = this.createDeck();

    // 洗牌
    this.shuffleDeck(deck);

    // 给每个玩家发两张牌
    this.gameState.players.forEach(player => {
      player.cards = [deck.pop()!, deck.pop()!];
      player.status = PlayerStatus.PLAYING;

      // 更新玩家座位上的卡牌显示
      this.showPlayerCards(player);
    });

    console.log("发牌完成:", this.gameState.players.map(p =>
      `${p.userInfo.nickname}: ${p.cards.map(c => `${c.suit}_${c.rank}`).join(', ')}`
    ));
  }

  // 创建一副牌
  private createDeck(): Card[] {
    const deck: Card[] = [];

    // 定义所有牌的花色
    const suits = [CardSuit.HEARTS, CardSuit.DIAMONDS, CardSuit.CLUBS, CardSuit.SPADES];

    // 定义所有牌的点数（从2到A）
    const ranks = [
      CardRank.TWO, CardRank.THREE, CardRank.FOUR, CardRank.FIVE,
      CardRank.SIX, CardRank.SEVEN, CardRank.EIGHT, CardRank.NINE,
      CardRank.TEN, CardRank.JACK, CardRank.QUEEN, CardRank.KING,
      CardRank.ACE
    ];

    // 生成52张牌
    for (const suit of suits) {
      for (const rank of ranks) {
        const id = `${suit}_${rank}`;
        deck.push({ suit, rank, id });
      }
    }

    console.log(`创建了 ${deck.length} 张牌`);
    return deck;
  }

  // 洗牌
  private shuffleDeck(deck: Card[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  // 收取盲注
  private collectBlinds(): void {
    console.log("开始收取盲注");

    // 收取小盲注
    const smallBlindPlayer = this.gameState.players[this.gameState.smallBlindIndex];
    const smallBlindAmount = this.gameState.roomInfo.smallBlind;
    console.log(`向玩家 ${smallBlindPlayer.userInfo.nickname} 收取小盲注: ${smallBlindAmount}`);
    this.placeBet(smallBlindPlayer, smallBlindAmount);

    // 收取大盲注
    const bigBlindPlayer = this.gameState.players[this.gameState.bigBlindIndex];
    const bigBlindAmount = this.gameState.roomInfo.bigBlind;
    console.log(`向玩家 ${bigBlindPlayer.userInfo.nickname} 收取大盲注: ${bigBlindAmount}`);
    this.placeBet(bigBlindPlayer, bigBlindAmount);

    // 设置当前最小下注额
    this.gameState.minBet = bigBlindAmount;
    this.gameState.currentBet = bigBlindAmount;

    console.log(`盲注收取完成，当前底池: ${this.gameState.pot}`);

    // 更新所有玩家的UI，显示下注额
    this.updateAllPlayersBets();
  }

  // 更新所有玩家的下注显示
  private updateAllPlayersBets(): void {
    this.gameState.players.forEach(player => {
      this.updatePlayerBet(player);
    });
  }

  // 更新玩家下注显示
  private updatePlayerBet(player: Player): void {
    if (player.currentBet <= 0) return;

    const container = this.playerContainers.get(player.seatIndex);
    if (!container) return;

    // 移除旧的下注显示
    container.getAll().forEach(obj => {
      if (obj.getData('type') === 'bet') {
        obj.destroy();
      }
    });

    // 创建新的下注显示
    const betY = 80; // 在玩家座位下方显示

    // 下注背景
    const betBg = this.add.circle(0, betY, 25, 0x000000, 0.7);
    betBg.setData('type', 'bet');
    container.add(betBg);

    // 下注金额
    const betText = this.add.text(0, betY, this.formatChips(player.currentBet), {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffcc00',
      fontStyle: 'bold'
    });
    betText.setOrigin(0.5);
    betText.setData('type', 'bet');
    container.add(betText);
  }

  // 更新游戏UI
  private updateGameUI(): void {
    // 更新玩家信息显示
    this.gameState.players.forEach(player => {
      this.updatePlayerSeat(player.seatIndex, player);
    });

    // 更新底池显示
    this.updatePotDisplay();
  }

  // 更新底池显示
  private updatePotDisplay(): void {
    if (!this.potContainer) return;

    this.potContainer.removeAll(true);

    const potText = this.add.text(0, 0, `底池: ${this.formatChips(this.gameState.pot)}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    potText.setOrigin(0.5);

    this.potContainer.add(potText);
  }
}