import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { UserService } from '../services/UserService';
import { Player, GameState, GameStage, RoomType, PlayerStatus, PlayerAction, RoomStatus, Card, HandRank } from '../types';
import { PlayerSeat } from '../game/components/PlayerSeat';
import { CommunityCards } from '../game/components/CommunityCards';
import { PotDisplay } from '../game/components/PotDisplay';
import { ActionButtons } from '../game/components/ActionButtons';
import { GameManager } from '../game/managers/GameManager';
import { HandEvaluator } from '../game/utils/HandEvaluator';

export class GameScene extends Phaser.Scene {
  private userService: UserService;
  private gameManager!: GameManager;
  private seatPositions: { x: number; y: number }[] = [];
  private playerSeats: PlayerSeat[] = [];
  private communityCards!: CommunityCards;
  private potDisplay!: PotDisplay;
  private actionButtons!: ActionButtons;
  // 用于存储座位高亮图形的映射
  private seatHighlights: Map<number, Phaser.GameObjects.Graphics> = new Map();

  constructor() {
    super({ key: GameConfig.SCENES.GAME });
    this.userService = UserService.getInstance();
  }

  init(data: { roomType: RoomType; quickStart?: boolean }): void {
    // 初始化游戏管理器
    this.gameManager = new GameManager(data.roomType, this.onGameStateChange.bind(this));

    // 添加当前玩家
    this.addCurrentPlayer();
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
    this.communityCards = new CommunityCards(this, width / 2, height / 2 - 50);

    // 创建底池显示
    this.potDisplay = new PotDisplay(this, width / 2, height / 2 + 80);

    // 创建操作按钮
    this.actionButtons = new ActionButtons(
      this,
      width / 2,
      height - 150,
      this.handlePlayerAction.bind(this)
    );

    // 模拟加入一些玩家
    this.addMockPlayers();
  }

  // 添加当前玩家
  private addCurrentPlayer(): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      this.scene.start(GameConfig.SCENES.LOGIN);
      return;
    }

    // 创建当前玩家
    const currentPlayer: Player = {
      id: currentUser.id,
      userInfo: currentUser,
      seatIndex: 0, // 坐在底部中间位置
      chips: Math.min(currentUser.chips, GameConfig.GAME_RULES.MAX_BUY_IN),
      status: PlayerStatus.WAITING,
      cards: [],
      currentBet: 0,
      totalBet: 0,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      timeBank: GameConfig.GAME_RULES.EXTRA_TIME_BANK,
    };

    // 添加到游戏管理器
    this.gameManager.addPlayer(currentPlayer);
  }

  // 计算座位位置
  private calculateSeatPositions(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = 450; // 增大水平半径以适应更大的座位
    const radiusY = 300; // 增大垂直半径以适应200高度的座位

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

  // 创建游戏界面元素
  private createGameUI(): void {
    const { width } = this.cameras.main;
    const gameState = this.gameManager.getGameState();

    // 顶部信息栏
    const topBar = this.add.container(0, 0);

    // 顶部背景
    const topBg = this.add.rectangle(0, 0, width, 80, 0x000000, 0.7);
    topBg.setOrigin(0, 0);
    topBar.add(topBg);

    // 房间信息
    const roomInfo = this.add.text(20, 20, `房间: ${gameState.roomInfo.name}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    topBar.add(roomInfo);

    const blindInfo = this.add.text(20, 45, `盲注: ${gameState.roomInfo.smallBlind}/${gameState.roomInfo.bigBlind}`, {
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

  // 创建玩家座位
  private createPlayerSeats(): void {
    this.playerSeats = [];

    this.seatPositions.forEach((pos, index) => {
      const seat = new PlayerSeat(this, pos.x, pos.y, index);
      this.playerSeats.push(seat);
    });
  }

  // 添加模拟玩家
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

        this.gameManager.addPlayer(player);
      }
    });

    // 检查是否达到4名玩家，如果是则自动开始游戏
    const gameState = this.gameManager.getGameState();
    if (gameState.players.length >= 4) {
      this.time.delayedCall(1000, () => {
        this.startGame();
      });
    }
  }

  // 开始游戏
  private startGame(): void {
    if (this.gameManager.startGame()) {
      this.showMessage('游戏开始！');
      // 确保在游戏状态初始化并且 onGameStateChange 可能已经调用后，
      // 显式激活第一个玩家。增加少量延迟以确保UI更新完成。
      this.time.delayedCall(500, () => {
        this.activateCurrentPlayer();
      });
    }
  }

  // 处理玩家动作
  private handlePlayerAction(action: PlayerAction, betAmount: number = 0): void {
    const gameState = this.gameManager.getGameState();
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // 如果当前没有活跃玩家，直接返回
    if (!currentPlayer) {
      console.error("没有当前活跃玩家");
      return;
    }

    // 隐藏操作按钮
    this.actionButtons.hide();

    // 更新玩家动作
    currentPlayer.lastAction = action;

    // 记录之前的状态以便动画显示
    const oldChips = currentPlayer.chips;

    // 检查是否满足最低下注规则
    const minRequiredBet = gameState.currentBet;

    // 根据不同动作处理
    switch (action) {
      case PlayerAction.FOLD:
        console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择弃牌`);
        currentPlayer.status = PlayerStatus.FOLDED;
        this.updatePlayerSeat(currentPlayer.seatIndex, currentPlayer);
        this.showActionText(currentPlayer.seatIndex, "弃牌", 0xcccccc);
        break;

      case PlayerAction.CHECK:
        // 检查规则：只有当前玩家已经跟上最高下注时才能看牌
        if (currentPlayer.currentBet < gameState.currentBet) {
          console.error(`玩家 ${currentPlayer.userInfo.nickname} 无法看牌，当前下注 ${currentPlayer.currentBet} 低于最高下注 ${gameState.currentBet}`);
          // 如果无法看牌，则默认为跟注或弃牌
          if (currentPlayer.chips >= (gameState.currentBet - currentPlayer.currentBet)) {
            this.handlePlayerAction(PlayerAction.CALL);
          } else {
            this.handlePlayerAction(PlayerAction.FOLD);
          }
          return;
        }

        console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择看牌`);
        this.showActionText(currentPlayer.seatIndex, "看牌", 0x00ff00);
        break;

      case PlayerAction.CALL:
        // 计算需要跟注的金额
        const callAmount = gameState.currentBet - currentPlayer.currentBet;

        // 检查玩家筹码是否足够跟注
        if (callAmount > currentPlayer.chips) {
          console.log(`玩家 ${currentPlayer.userInfo.nickname} 筹码不足以跟注，自动全下`);
          this.handlePlayerAction(PlayerAction.ALL_IN);
          return;
        }

        console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择跟注 ${gameState.currentBet}`);
        currentPlayer.chips -= callAmount;
        currentPlayer.currentBet = gameState.currentBet;
        currentPlayer.totalBet += callAmount;
        // 增加底池
        gameState.pot += callAmount;
        this.showActionText(currentPlayer.seatIndex, "跟注", 0x00ffff);
        break;

      case PlayerAction.RAISE:
        // 确保加注金额至少是当前最高下注加上最小加注
        const minRaise = gameState.currentBet + gameState.minBet;

        // 如果提供的加注金额小于最小加注，自动调整
        if (betAmount < minRaise) {
          console.log(`加注金额 ${betAmount} 小于最小加注 ${minRaise}，自动调整`);
          betAmount = minRaise;
        }

        // 检查玩家筹码是否足够加注
        const raiseNeeded = betAmount - currentPlayer.currentBet;
        if (raiseNeeded > currentPlayer.chips) {
          console.log(`玩家 ${currentPlayer.userInfo.nickname} 筹码不足以加注到 ${betAmount}，自动全下`);
          this.handlePlayerAction(PlayerAction.ALL_IN);
          return;
        }

        console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择加注到 ${betAmount}`);

        // 更新玩家筹码和下注
        currentPlayer.chips -= raiseNeeded;
        currentPlayer.currentBet = betAmount;
        currentPlayer.totalBet += raiseNeeded;

        // 更新当前最高下注
        gameState.currentBet = betAmount;

        // 增加底池
        gameState.pot += raiseNeeded;
        this.showActionText(currentPlayer.seatIndex, `加注${betAmount}`, 0xff9900);
        break;

      case PlayerAction.ALL_IN:
        console.log(`玩家 ${currentPlayer.userInfo.nickname} 选择全下 ${currentPlayer.chips}`);
        // 计算全下金额
        const allInAmount = currentPlayer.chips + currentPlayer.currentBet;

        // 如果全下金额大于当前最高下注，更新最高下注
        if (allInAmount > gameState.currentBet) {
          gameState.currentBet = allInAmount;
        }

        // 增加底池
        gameState.pot += currentPlayer.chips;
        currentPlayer.totalBet += currentPlayer.chips;
        currentPlayer.currentBet = allInAmount;
        currentPlayer.chips = 0;
        currentPlayer.status = PlayerStatus.ALL_IN;
        this.showActionText(currentPlayer.seatIndex, "全下", 0xff0000);
        break;
    }

    // 更新界面显示
    this.updatePlayerSeat(currentPlayer.seatIndex, currentPlayer);
    this.updatePotText();

    // 检查回合是否结束
    if (this.checkRoundComplete()) {
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

  private onGameStateChange(gameState: GameState): void {
    // 检查组件是否已初始化
    if (!this.communityCards || !this.potDisplay || !this.actionButtons || this.playerSeats.length === 0) {
      console.log('组件尚未初始化，跳过状态更新');
      return;
    }

    console.log(`游戏状态更新: 阶段=${gameState.stage}, 当前玩家索引=${gameState.currentPlayerIndex}`);

    // 更新玩家座位
    gameState.players.forEach(player => {
      const seat = this.playerSeats[player.seatIndex];
      if (seat) {
        seat.updatePlayer(player, player.seatIndex === gameState.currentPlayerIndex);
      }
    });

    // 更新公共牌
    this.communityCards.updateCards(gameState.communityCards);

    // 更新底池
    this.potDisplay.updatePot(gameState.pot);

    // 更新操作按钮
    if (gameState.currentPlayerIndex !== -1) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      console.log(`当前玩家: ${currentPlayer.userInfo.nickname}, 座位=${currentPlayer.seatIndex}, 状态=${currentPlayer.status}`);

      // 如果是当前玩家（座位0）的回合，显示操作按钮
      if (currentPlayer && currentPlayer.seatIndex === 0 &&
        currentPlayer.status !== PlayerStatus.FOLDED &&
        currentPlayer.status !== PlayerStatus.ALL_IN) {
        const canCheck = gameState.currentBet <= currentPlayer.currentBet;
        const callAmount = gameState.currentBet - currentPlayer.currentBet;

        console.log(`显示操作按钮: canCheck=${canCheck}, callAmount=${callAmount}, chips=${currentPlayer.chips}, minBet=${gameState.minBet}`);
        this.actionButtons.show(canCheck, callAmount, currentPlayer.chips, gameState.minBet);
      } else {
        console.log(`隐藏操作按钮: 不是当前玩家的回合或玩家已弃牌/全下`);
        this.actionButtons.hide();
      }
    } else {
      console.log(`隐藏操作按钮: 没有当前玩家`);
      this.actionButtons.hide();
    }

    // 如果游戏阶段变化，显示相应消息
    const stageNames: Record<GameStage, string> = {
      [GameStage.WAITING]: '等待中',
      [GameStage.PRE_FLOP]: '翻牌前',
      [GameStage.FLOP]: '翻牌',
      [GameStage.TURN]: '转牌',
      [GameStage.RIVER]: '河牌',
      [GameStage.SHOWDOWN]: '摊牌'
    };
    this.showMessage(stageNames[gameState.stage]);
  }

  // 显示消息
  private showMessage(message: string): void {
    // 如果场景未初始化，则跳过
    if (!this.scene.isActive()) {
      console.log('场景未激活，跳过显示消息:', message);
      return;
    }

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

  // 分配位置（庄家、小盲和大盲）
  private assignPositions(): void {
    const gameState = this.gameManager.getGameState();
    const playerCount = gameState.players.length;

    // 随机选择庄家位置
    gameState.dealerIndex = Math.floor(Math.random() * playerCount);

    // 小盲位是庄家之后的玩家
    gameState.smallBlindIndex = (gameState.dealerIndex + 1) % playerCount;

    // 大盲位是小盲之后的玩家
    gameState.bigBlindIndex = (gameState.smallBlindIndex + 1) % playerCount;

    // 设置玩家位置标识
    gameState.players.forEach((player, index) => {
      player.isDealer = index === gameState.dealerIndex;
      player.isSmallBlind = index === gameState.smallBlindIndex;
      player.isBigBlind = index === gameState.bigBlindIndex;
      player.status = PlayerStatus.PLAYING; // 确保所有玩家状态设置为PLAYING
    });

    // 当前行动玩家是大盲位之后的玩家
    gameState.currentPlayerIndex = (gameState.bigBlindIndex + 1) % playerCount;
  }

  // 激活当前玩家
  private activateCurrentPlayer(): void {
    const currentPlayer = this.gameManager.getGameState().players[this.gameManager.getGameState().currentPlayerIndex];

    if (!currentPlayer) {
      console.error('当前玩家不存在!');
      return;
    }

    console.log(`当前轮到玩家: ${currentPlayer.userInfo.nickname} 行动`);

    // 确保之前的所有高亮都被清除
    this.removeAllHighlights();

    // 高亮显示当前玩家
    this.highlightCurrentPlayer(true);

    // 如果是玩家弃牌或已经全下，自动跳过
    if (currentPlayer.status === PlayerStatus.FOLDED ||
      currentPlayer.status === PlayerStatus.ALL_IN) {
      console.log(`玩家 ${currentPlayer.userInfo.nickname} 已弃牌或全下，自动跳过`);
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

  // 处理AI玩家行动
  private handleAIAction(player: Player): void {
    // 简单AI逻辑
    const randomIndex = Math.floor(Math.random() * 100);

    let action: PlayerAction;

    // 跟注/看牌
    const canCheck = this.gameManager.getGameState().currentBet <= player.currentBet;
    const callAmount = this.gameManager.getGameState().currentBet - player.currentBet;

    // 简单AI决策逻辑：70%概率跟注/看牌，20%概率加注，10%概率弃牌
    if (randomIndex < 10) {
      action = PlayerAction.FOLD;
    } else if (randomIndex < 30) {
      action = PlayerAction.RAISE;
    } else {
      action = canCheck ? PlayerAction.CHECK : PlayerAction.CALL;
    }

    // 如果筹码不足以跟注，只能弃牌或全下
    if (action === PlayerAction.CALL && player.chips < callAmount) {
      action = Math.random() < 0.5 ? PlayerAction.FOLD : PlayerAction.ALL_IN;
    }

    // 如果筹码不足以加注，改为跟注或全下
    if (action === PlayerAction.RAISE && player.chips < this.gameManager.getGameState().minBet * 2) {
      action = Math.random() < 0.7 ? PlayerAction.CALL : PlayerAction.ALL_IN;
    }

    console.log(`AI玩家 ${player.userInfo.nickname} 选择: ${action}`);

    // 执行AI行动
    let betAmount = 0;
    if (action === PlayerAction.RAISE) {
      // 设置AI玩家的加注金额
      betAmount = Math.min(
        this.gameManager.getGameState().currentBet + this.gameManager.getGameState().minBet,
        player.currentBet + player.chips
      );
    }
    this.handlePlayerAction(action, betAmount);
  }

  // 高亮当前玩家
  private highlightCurrentPlayer(enable: boolean): void {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return;

    const seatContainer = this.playerSeats[currentPlayer.seatIndex];
    if (!seatContainer) return;

    // 使用 Map 来存储和检索高亮图形，而不是依赖 getByName
    let highlightGraphics = this.seatHighlights.get(currentPlayer.seatIndex);

    // 如果没有高亮图形且需要显示，创建一个
    if (!highlightGraphics && enable) {
      highlightGraphics = this.add.graphics();
      highlightGraphics.lineStyle(3, 0xffff00, 1);

      // 由于 PlayerSeat 没有 width 和 height 属性，我们使用固定大小
      // 或者基于座位位置计算
      const seatPos = this.seatPositions[currentPlayer.seatIndex];
      if (seatPos) {
        highlightGraphics.strokeRoundedRect(
          seatPos.x - 110, // 适应新宽度220
          seatPos.y - 100, // 适应新高度200
          220,
          200,
          10
        );
      }

      // 保存到高亮图形映射中
      this.seatHighlights.set(currentPlayer.seatIndex, highlightGraphics);
    }

    // 设置可见性
    if (highlightGraphics) {
      highlightGraphics.setVisible(enable);

      // 如果关闭高亮，可以选择移除图形对象
      if (!enable) {
        highlightGraphics.destroy();
        this.seatHighlights.delete(currentPlayer.seatIndex);
      }
    }
  }

  // 高亮特定座位的玩家（根据座位索引）
  private highlightPlayerBySeatIndex(seatIndex: number, enable: boolean): void {
    if (seatIndex < 0 || seatIndex >= this.playerSeats.length) return;

    const seatContainer = this.playerSeats[seatIndex];
    if (!seatContainer) return;

    // 使用 Map 来存储和检索高亮图形
    let highlightGraphics = this.seatHighlights.get(seatIndex);

    // 如果没有高亮图形且需要显示，创建一个
    if (!highlightGraphics && enable) {
      highlightGraphics = this.add.graphics();
      highlightGraphics.lineStyle(3, 0xffff00, 1);

      const seatPos = this.seatPositions[seatIndex];
      if (seatPos) {
        highlightGraphics.strokeRoundedRect(
          seatPos.x - 110, // 适应新宽度220
          seatPos.y - 100, // 适应新高度200
          220,
          200,
          10
        );
      }

      // 保存到高亮图形映射中
      this.seatHighlights.set(seatIndex, highlightGraphics);
    }

    // 设置可见性
    if (highlightGraphics) {
      highlightGraphics.setVisible(enable);

      // 如果关闭高亮，可以选择移除图形对象
      if (!enable) {
        highlightGraphics.destroy();
        this.seatHighlights.delete(seatIndex);
      }
    }
  }

  // 移除所有高亮
  private removeAllHighlights(): void {
    this.seatHighlights.forEach((graphics, index) => {
      graphics.destroy();
      this.seatHighlights.delete(index);
    });
  }

  // 获取当前玩家
  private getCurrentPlayer(): Player | null {
    if (this.gameManager.getGameState().currentPlayerIndex < 0 ||
      this.gameManager.getGameState().currentPlayerIndex >= this.gameManager.getGameState().players.length) {
      return null;
    }
    return this.gameManager.getGameState().players[this.gameManager.getGameState().currentPlayerIndex];
  }

  // 切换到下一个玩家
  private nextPlayer(): void {
    // 保存当前玩家索引，用于取消高亮
    const currentPlayerIndex = this.gameManager.getGameState().currentPlayerIndex;

    // 取消当前玩家高亮
    if (currentPlayerIndex >= 0 && currentPlayerIndex < this.playerSeats.length) {
      this.highlightPlayerBySeatIndex(currentPlayerIndex, false);
    }

    // 获取玩家数量
    const playerCount = this.gameManager.getGameState().players.length;
    if (playerCount === 0) return;

    // 计算下一个玩家索引
    let nextIndex = (currentPlayerIndex + 1) % playerCount;
    const startIndex = nextIndex;

    // 寻找下一个未弃牌且未全下的玩家
    while (
      (this.gameManager.getGameState().players[nextIndex].status === PlayerStatus.FOLDED ||
        this.gameManager.getGameState().players[nextIndex].status === PlayerStatus.ALL_IN) &&
      nextIndex !== startIndex
    ) {
      nextIndex = (nextIndex + 1) % playerCount;
      // Break if we've looped back to the start and the start player is also folded/all-in
      if (nextIndex === startIndex &&
        (this.gameManager.getGameState().players[nextIndex].status === PlayerStatus.FOLDED ||
          this.gameManager.getGameState().players[nextIndex].status === PlayerStatus.ALL_IN)) {
        break;
      }
    }

    // 如果已经循环了一圈还没找到合适的玩家，则回合结束
    if (nextIndex === startIndex &&
      (this.gameManager.getGameState().players[nextIndex].status === PlayerStatus.FOLDED ||
        this.gameManager.getGameState().players[nextIndex].status === PlayerStatus.ALL_IN)) {
      // 结束当前回合
      this.nextRound();
      return;
    }

    // 更新当前玩家索引
    this.gameManager.getGameState().currentPlayerIndex = nextIndex;

    // 激活下一个玩家
    this.activateCurrentPlayer();
  }

  // 更新玩家座位
  private updatePlayerSeat(seatIndex: number, player: Player): void {
    const seat = this.playerSeats[seatIndex];
    if (seat) {
      seat.updatePlayer(player, this.gameManager.getGameState().currentPlayerIndex === seatIndex);
    }
  }

  // 显示玩家行动文本
  private showActionText(seatIndex: number, text: string, color: number): void {
    const seat = this.playerSeats[seatIndex];
    if (!seat) return;

    const pos = this.seatPositions[seatIndex];
    if (!pos) return;

    // 创建行动文本
    const actionText = this.add.text(pos.x, pos.y - 50, text, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 3
    });
    actionText.setOrigin(0.5);

    // 添加动画效果
    this.tweens.add({
      targets: actionText,
      y: pos.y - 80,
      alpha: 0,
      duration: 1500,
      onComplete: () => {
        actionText.destroy();
      }
    });
  }

  // 更新底池显示
  private updatePotText(): void {
    if (this.potDisplay) {
      this.potDisplay.updatePot(this.gameManager.getGameState().pot);
    }
  }

  // 检查当前回合是否结束
  private checkRoundComplete(): boolean {
    const gameState = this.gameManager.getGameState();
    const activePlayers = gameState.players.filter(
      p => p.status !== PlayerStatus.FOLDED && p.status !== PlayerStatus.ALL_IN
    );

    // 如果没有活跃玩家或只有一个活跃玩家，回合结束
    if (activePlayers.length <= 1) {
      return true;
    }

    // 检查所有活跃玩家是否下注相同
    const firstBet = activePlayers[0].currentBet;
    const allSameBet = activePlayers.every(p => p.currentBet === firstBet);

    // 如果所有玩家都已行动且下注相同，回合结束
    // 注意：这里假设有 lastAction 属性表示玩家已行动
    const allPlayed = activePlayers.every(p => p.lastAction !== undefined);

    return allSameBet && allPlayed;
  }

  // 进入下一回合
  private nextRound(): void {
    console.log('进入下一回合');
    const gameState = this.gameManager.getGameState();

    // 根据当前阶段确定下一阶段
    switch (gameState.stage) {
      case GameStage.PRE_FLOP:
        gameState.stage = GameStage.FLOP;
        // 发放翻牌
        this.dealCommunityCards(3);
        break;

      case GameStage.FLOP:
        gameState.stage = GameStage.TURN;
        // 发放转牌
        this.dealCommunityCards(1);
        break;

      case GameStage.TURN:
        gameState.stage = GameStage.RIVER;
        // 发放河牌
        this.dealCommunityCards(1);
        break;

      case GameStage.RIVER:
        gameState.stage = GameStage.SHOWDOWN;
        // 结算牌局
        this.showMessage('摊牌阶段');
        this.time.delayedCall(1000, () => {
          this.showdown();
        });
        return;

      case GameStage.SHOWDOWN:
        // 开始新的牌局
        this.time.delayedCall(3000, () => {
          this.startNewHand();
        });
        return;
    }

    // 播放发牌音效
    this.sound.play(GameConfig.AUDIO.CARD_DEAL);

    // 显示阶段信息
    const stageNames: Record<GameStage, string> = {
      [GameStage.WAITING]: '等待中',
      [GameStage.PRE_FLOP]: '翻牌前',
      [GameStage.FLOP]: '翻牌',
      [GameStage.TURN]: '转牌',
      [GameStage.RIVER]: '河牌',
      [GameStage.SHOWDOWN]: '摊牌'
    };
    this.showMessage(stageNames[gameState.stage]);

    // 重置新回合的下注
    this.resetBetsForNewRound();

    // 重新激活第一个玩家
    this.time.delayedCall(1500, () => {
      this.activateCurrentPlayer();
    });
  }

  // 发放公共牌
  private dealCommunityCards(count: number): void {
    console.log(`发放${count}张公共牌`);

    const gameState = this.gameManager.getGameState();
    const deckIndex = gameState.communityCards.length;

    // 根据需要从牌堆中抽取指定数量的牌
    const newCards: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (gameState.deck.length > 0) {
        const card = gameState.deck.pop()!;
        gameState.communityCards.push(card);
        newCards.push(card);
      }
    }

    // 更新公共牌显示
    this.communityCards.updateCards(gameState.communityCards);

    // 添加发牌动画
    this.animateDealingCommunityCards(newCards, deckIndex);
  }

  // 公共牌发牌动画
  private animateDealingCommunityCards(cards: Card[], startIndex: number): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2 - 50; // 公共牌区域Y位置

    // 每张牌的位置
    const cardSpacing = 70;
    const startX = centerX - ((cards.length - 1) * cardSpacing) / 2;

    // 创建临时牌背图像
    cards.forEach((card, index) => {
      const cardBack = this.add.image(width / 2, height, 'card_back');
      cardBack.setScale(0.7);

      // 计算目标位置
      const targetX = startX + (startIndex + index) * cardSpacing;

      // 添加动画
      this.tweens.add({
        targets: cardBack,
        x: targetX,
        y: centerY,
        duration: 500,
        ease: 'Power2',
        delay: index * 200,
        onComplete: () => {
          // 动画结束后删除牌背，显示实际的牌
          cardBack.destroy();
          this.communityCards.flipCard(startIndex + index);

          // 播放翻牌音效
          this.sound.play(GameConfig.AUDIO.CARD_FLIP);
        }
      });
    });
  }

  // 结算牌局
  private showdown(): void {
    console.log('牌局结算');
    const gameState = this.gameManager.getGameState();

    // 1. 显示所有玩家的牌
    this.revealAllPlayerCards();

    // 等待一段时间让玩家看清所有人的牌
    this.time.delayedCall(2000, () => {
      // 2. 计算每个玩家的最佳牌型
      const playerResults = this.evaluateAllPlayerHands();

      // 3. 确定赢家并分配筹码
      const winners = this.determineWinners(playerResults);

      // 4. 显示赢家和他们的牌型
      this.showWinners(winners);

      // 5. 分配底池
      this.distributePot(winners);

      // 6. 延迟后进入下一个阶段
      this.time.delayedCall(5000, () => {
        gameState.stage = GameStage.SHOWDOWN;
        this.nextRound();
      });
    });
  }

  // 显示所有玩家的牌
  private revealAllPlayerCards(): void {
    const gameState = this.gameManager.getGameState();

    gameState.players.forEach(player => {
      // 显示所有玩家的牌（包括弃牌的玩家）
      if (player.cards && player.cards.length > 0) {
        // 使用showPlayerCards方法显示牌面，第二个参数true表示显示正面
        this.playerSeats[player.seatIndex].showPlayerCards(player.cards, true);

        // 显示翻牌动画效果
        const seatPos = this.seatPositions[player.seatIndex];
        if (seatPos) {
          // 创建翻牌动画
          player.cards.forEach((card, index) => {
            // 延迟播放翻牌音效
            this.time.delayedCall(300 * (player.seatIndex * 2 + index), () => {
              this.sound.play(GameConfig.AUDIO.CARD_FLIP);
            });
          });

          // 如果是弃牌玩家，添加半透明遮罩表示已弃牌
          if (player.status === PlayerStatus.FOLDED) {
            this.time.delayedCall(500, () => {
              // 在PlayerSeat上添加弃牌遮罩，但仍然可以看到牌
              const seat = this.playerSeats[player.seatIndex];
              const container = seat.getContainer();

              const foldedOverlay = this.add.rectangle(0, 50, 220, 140, 0x000000, 0.5);
              foldedOverlay.setData('type', 'showdown-fold');
              container.add(foldedOverlay);

              const foldedText = this.add.text(0, 50, '已弃牌', {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#ff6666',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
              });
              foldedText.setOrigin(0.5);
              foldedText.setData('type', 'showdown-fold');
              container.add(foldedText);
            });
          }
        }
      }
    });

    // 显示提示信息
    this.showMessage('摊牌 - 显示所有玩家手牌');
  }

  // 评估所有玩家的牌型
  private evaluateAllPlayerHands(): { player: Player, handRank: HandRank, bestHand: Card[], description: string }[] {
    const gameState = this.gameManager.getGameState();
    const results: { player: Player, handRank: HandRank, bestHand: Card[], description: string }[] = [];

    const evaluator = new HandEvaluator();

    gameState.players.forEach(player => {
      if (player.status !== PlayerStatus.FOLDED) {
        // 合并玩家手牌和公共牌
        const allCards = [...player.cards, ...gameState.communityCards];

        // 评估最佳牌型
        const evaluation = evaluator.evaluate(allCards);

        results.push({
          player,
          handRank: evaluation.rank,
          bestHand: evaluation.bestHand,
          description: evaluation.description
        });

        console.log(`玩家 ${player.userInfo.nickname} 的牌型: ${evaluation.description}`);
      }
    });

    return results;
  }

  // 确定赢家
  private determineWinners(playerResults: { player: Player, handRank: HandRank, bestHand: Card[], description: string }[]): { player: Player, handRank: HandRank, bestHand: Card[], description: string }[] {
    console.log('开始确定赢家：');
    playerResults.forEach((result, index) => {
      console.log(`玩家${index + 1} ${result.player.userInfo.nickname}: ${result.description}`);
      console.log('最佳手牌:', result.bestHand.map(card => `${card.value}${card.suit}`).join(', '));
    });

    // 按牌型从高到低排序
    playerResults.sort((a, b) => {
      // HandRank是从高到低排序的枚举，数值越小牌型越好
      if (a.handRank !== b.handRank) {
        console.log(`比较牌型: ${a.player.userInfo.nickname}(${a.handRank}) vs ${b.player.userInfo.nickname}(${b.handRank})`);
        return a.handRank - b.handRank;
      }

      // 如果牌型相同，需要比较同牌型内的大小
      const evaluator = new HandEvaluator();
      const comparison = evaluator.compareEqualRank(a.bestHand, b.bestHand, a.handRank);
      console.log(`比较相同牌型: ${a.player.userInfo.nickname} vs ${b.player.userInfo.nickname}, 结果: ${comparison}`);
      // 注意：这里需要反向，因为compareEqualRank返回正数表示第一手牌更大，
      // 但sort期望负数表示第一个元素应该排在前面（即更好的牌）
      return -comparison;
    });

    // 获取最高牌型
    const bestRank = playerResults[0].handRank;
    console.log(`最高牌型: ${bestRank}`);

    // 找出所有拥有最高牌型的玩家（可能有平局）
    const winners = playerResults.filter(result => result.handRank === bestRank);

    console.log('赢家们:');
    winners.forEach(winner => {
      console.log(`- ${winner.player.userInfo.nickname}: ${winner.description}`);
    });

    return winners;
  }

  // 显示赢家
  private showWinners(winners: { player: Player, handRank: HandRank, bestHand: Card[], description: string }[]): void {
    const { width, height } = this.cameras.main;

    // 创建赢家显示容器
    const winnerContainer = this.add.container(width / 2, height / 2);

    // 背景
    const bg = this.add.rectangle(0, 0, 500, 120, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0xffff00);
    winnerContainer.add(bg);

    // 标题
    const titleText = winners.length > 1 ? "平局！" : "赢家！";
    const title = this.add.text(0, -40, titleText, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    title.setOrigin(0.5);
    winnerContainer.add(title);

    // 显示赢家信息
    winners.forEach((winner, index) => {
      const offsetY = index * 30;

      const winnerText = this.add.text(0, -10 + offsetY,
        `${winner.player.userInfo.nickname}: ${winner.description}`, {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffff00'
      });
      winnerText.setOrigin(0.5);
      winnerContainer.add(winnerText);
    });

    // 播放胜利音效
    this.sound.play(GameConfig.AUDIO.WIN);

    // 添加动画效果
    winnerContainer.setAlpha(0);
    this.tweens.add({
      targets: winnerContainer,
      alpha: 1,
      y: height / 2 - 50,
      duration: 500,
      ease: 'Bounce',
      onComplete: () => {
        // 5秒后移除
        this.time.delayedCall(5000, () => {
          this.tweens.add({
            targets: winnerContainer,
            alpha: 0,
            duration: 500,
            onComplete: () => {
              winnerContainer.destroy();
            }
          });
        });
      }
    });

    // 高亮显示赢家座位
    winners.forEach(winner => {
      const seat = this.playerSeats[winner.player.seatIndex];

      // 创建一个闪烁效果
      const seatPos = this.seatPositions[winner.player.seatIndex];
      if (seatPos) {
        const highlight = this.add.graphics();
        highlight.lineStyle(5, 0xffff00, 1);
        highlight.strokeCircle(seatPos.x, seatPos.y, 90);

        // 闪烁动画
        this.tweens.add({
          targets: highlight,
          alpha: { from: 1, to: 0 },
          duration: 500,
          repeat: 10,
          yoyo: true,
          onComplete: () => {
            highlight.destroy();
          }
        });
      }
    });
  }

  // 分配底池
  private distributePot(winners: { player: Player, handRank: HandRank, bestHand: Card[], description: string }[]): void {
    const gameState = this.gameManager.getGameState();

    if (winners.length === 0) return;

    // 计算每个赢家应得的筹码
    const winAmount = Math.floor(gameState.pot / winners.length);

    // 分配筹码
    winners.forEach(winner => {
      winner.player.chips += winAmount;

      // 更新座位显示
      this.updatePlayerSeat(winner.player.seatIndex, winner.player);

      // 显示筹码增加动画
      this.animateChipsToPlayer(winner.player.seatIndex, winAmount);
    });

    // 如果有余数，分给第一个赢家
    const remainder = gameState.pot % winners.length;
    if (remainder > 0) {
      winners[0].player.chips += remainder;
      this.updatePlayerSeat(winners[0].player.seatIndex, winners[0].player);
    }

    // 清空底池
    gameState.pot = 0;
    this.updatePotText();
  }

  // 筹码移动动画
  private animateChipsToPlayer(seatIndex: number, amount: number): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2 + 80; // 底池位置

    const targetPos = this.seatPositions[seatIndex];
    if (!targetPos) return;

    // 创建筹码图像
    const chipCount = Math.min(10, Math.max(3, Math.floor(amount / 100))); // 最少3个，最多10个筹码图像

    for (let i = 0; i < chipCount; i++) {
      const chip = this.add.image(
        centerX + Phaser.Math.Between(-20, 20),
        centerY + Phaser.Math.Between(-10, 10),
        'chip'
      );
      chip.setScale(0.5);

      // 随机延迟
      const delay = Phaser.Math.Between(0, 500);

      // 添加移动动画
      this.tweens.add({
        targets: chip,
        x: targetPos.x + Phaser.Math.Between(-30, 30),
        y: targetPos.y + Phaser.Math.Between(-20, 20),
        scale: 0.4,
        duration: 800,
        delay: delay,
        ease: 'Cubic.out',
        onComplete: () => {
          // 完成后添加一个淡出效果
          this.tweens.add({
            targets: chip,
            alpha: 0,
            scale: 0.3,
            duration: 300,
            delay: 200,
            onComplete: () => {
              chip.destroy();
            }
          });
        }
      });

      // 播放移动音效
      this.time.delayedCall(delay, () => {
        this.sound.play(GameConfig.AUDIO.CHIP);
      });
    }

    // 显示赢得的金额
    const amountText = this.add.text(targetPos.x, targetPos.y - 70, `+${amount}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4
    });
    amountText.setOrigin(0.5);

    // 添加文本动画
    this.tweens.add({
      targets: amountText,
      y: targetPos.y - 100,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      onComplete: () => {
        amountText.destroy();
      }
    });
  }

  // 开始新的牌局
  private startNewHand(): void {
    console.log('开始新的牌局');

    const gameState = this.gameManager.getGameState();

    // 清除摊牌时的临时效果
    this.playerSeats.forEach(seat => {
      seat.clearShowdownEffects();
    });

    // 检查玩家是否还有足够的筹码继续游戏
    gameState.players.forEach(player => {
      if (player.chips <= 0) {
        player.status = PlayerStatus.WAITING;
        this.showMessage(`玩家 ${player.userInfo.nickname} 筹码用尽，退出游戏`);
      } else {
        player.status = PlayerStatus.PLAYING;
      }

      // 清空玩家手牌
      player.cards = [];
      player.currentBet = 0;
      player.totalBet = 0;
      player.lastAction = undefined;

      // 更新座位显示
      this.updatePlayerSeat(player.seatIndex, player);
    });

    // 清空公共牌
    gameState.communityCards = [];
    this.communityCards.updateCards([]);

    // 重置游戏阶段
    gameState.stage = GameStage.PRE_FLOP;
    gameState.pot = 0;
    gameState.currentBet = 0;

    // 更新底池显示
    this.updatePotText();

    // 重新洗牌
    this.initializeDeck(gameState);

    // 重新分配位置（庄家、小盲和大盲）
    this.rotatePositions();

    // 发放手牌
    this.dealPlayerCards();

    // 收取盲注
    this.collectBlinds();

    // 延迟后激活第一个玩家
    this.time.delayedCall(2000, () => {
      this.activateCurrentPlayer();
    });
  }

  // 初始化牌堆
  private initializeDeck(gameState: GameState): void {
    // 创建一副新牌
    gameState.deck = [];

    const suits: Array<'h' | 'd' | 'c' | 's'> = ['h', 'd', 'c', 's']; // 红桃、方块、梅花、黑桃
    const values: Array<'2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'> =
      ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    suits.forEach(suit => {
      values.forEach(value => {
        gameState.deck.push({
          suit,
          value,
          id: `${value}${suit}`
        });
      });
    });

    // 洗牌
    this.shuffleDeck(gameState.deck);
  }

  // 洗牌算法
  private shuffleDeck(deck: Card[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  // 轮换位置（庄家、小盲和大盲）
  private rotatePositions(): void {
    const gameState = this.gameManager.getGameState();
    const playerCount = gameState.players.filter(p => p.status !== PlayerStatus.WAITING).length;

    if (playerCount < 2) {
      console.error('玩家数量不足，无法开始游戏');
      return;
    }

    // 将庄家位置向前移动一位
    gameState.dealerIndex = (gameState.dealerIndex + 1) % gameState.players.length;

    // 确保庄家是一个活跃玩家
    while (gameState.players[gameState.dealerIndex].status === PlayerStatus.WAITING) {
      gameState.dealerIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    }

    // 小盲位是庄家之后的第一个活跃玩家
    gameState.smallBlindIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    while (gameState.players[gameState.smallBlindIndex].status === PlayerStatus.WAITING) {
      gameState.smallBlindIndex = (gameState.smallBlindIndex + 1) % gameState.players.length;
    }

    // 大盲位是小盲之后的第一个活跃玩家
    gameState.bigBlindIndex = (gameState.smallBlindIndex + 1) % gameState.players.length;
    while (gameState.players[gameState.bigBlindIndex].status === PlayerStatus.WAITING) {
      gameState.bigBlindIndex = (gameState.bigBlindIndex + 1) % gameState.players.length;
    }

    // 设置玩家位置标识
    gameState.players.forEach((player, index) => {
      player.isDealer = index === gameState.dealerIndex;
      player.isSmallBlind = index === gameState.smallBlindIndex;
      player.isBigBlind = index === gameState.bigBlindIndex;
    });

    // 当前行动玩家是大盲位之后的第一个活跃玩家
    gameState.currentPlayerIndex = (gameState.bigBlindIndex + 1) % gameState.players.length;
    while (gameState.players[gameState.currentPlayerIndex].status === PlayerStatus.WAITING) {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    }
  }

  // 发放手牌
  private dealPlayerCards(): void {
    const gameState = this.gameManager.getGameState();

    // 清空所有玩家的手牌
    gameState.players.forEach(player => {
      player.cards = [];
    });

    // 为每个活跃玩家发两张牌
    for (let i = 0; i < 2; i++) {
      gameState.players.forEach(player => {
        if (player.status === PlayerStatus.PLAYING) {
          if (gameState.deck.length > 0) {
            const card = gameState.deck.pop()!;
            player.cards.push(card);

            // 更新玩家座位显示
            // 只对当前玩家显示牌面，其他玩家显示牌背
            if (player.seatIndex === 0) {
              this.playerSeats[player.seatIndex].showCards(player.cards);
            } else {
              this.playerSeats[player.seatIndex].showCardBacks(player.cards.length);
            }

            // 添加发牌动画
            this.animateDealingPlayerCard(player.seatIndex, i);
          }
        }
      });
    }
  }

  // 玩家发牌动画
  private animateDealingPlayerCard(seatIndex: number, cardIndex: number): void {
    const { width, height } = this.cameras.main;
    const targetPos = this.seatPositions[seatIndex];

    if (!targetPos) return;

    // 创建临时牌背图像
    const cardBack = this.add.image(width / 2, height / 2 - 200, 'card_back');
    cardBack.setScale(0.5);

    // 计算目标位置偏移
    const offsetX = cardIndex * 30 - 15; // 两张牌之间有30像素间隔

    // 添加动画
    this.tweens.add({
      targets: cardBack,
      x: targetPos.x + offsetX,
      y: targetPos.y - 30,
      scale: 0.4,
      duration: 300,
      delay: seatIndex * 100 + cardIndex * 50,
      onComplete: () => {
        // 播放发牌音效
        this.sound.play(GameConfig.AUDIO.CARD_DEAL);

        // 动画结束后删除临时图像
        cardBack.destroy();
      }
    });
  }

  // 收取盲注
  private collectBlinds(): void {
    const gameState = this.gameManager.getGameState();

    // 小盲注
    const smallBlindPlayer = gameState.players[gameState.smallBlindIndex];
    const smallBlindAmount = Math.min(smallBlindPlayer.chips, gameState.roomInfo.smallBlind);
    smallBlindPlayer.chips -= smallBlindAmount;
    smallBlindPlayer.currentBet = smallBlindAmount;
    smallBlindPlayer.totalBet += smallBlindAmount;
    gameState.pot += smallBlindAmount;

    // 显示下注动画
    this.showActionText(smallBlindPlayer.seatIndex, `小盲 ${smallBlindAmount}`, 0xff9900);

    // 大盲注
    const bigBlindPlayer = gameState.players[gameState.bigBlindIndex];
    const bigBlindAmount = Math.min(bigBlindPlayer.chips, gameState.roomInfo.bigBlind);
    bigBlindPlayer.chips -= bigBlindAmount;
    bigBlindPlayer.currentBet = bigBlindAmount;
    bigBlindPlayer.totalBet += bigBlindAmount;
    gameState.pot += bigBlindAmount;

    // 设置当前最高下注为大盲注金额
    gameState.currentBet = bigBlindAmount;
    gameState.minBet = bigBlindAmount;

    // 显示下注动画
    this.showActionText(bigBlindPlayer.seatIndex, `大盲 ${bigBlindAmount}`, 0xff9900);

    // 更新座位显示
    this.updatePlayerSeat(smallBlindPlayer.seatIndex, smallBlindPlayer);
    this.updatePlayerSeat(bigBlindPlayer.seatIndex, bigBlindPlayer);

    // 更新底池显示
    this.updatePotText();
  }

  // 重置新回合的下注
  private resetBetsForNewRound(): void {
    const gameState = this.gameManager.getGameState();

    // 重置当前最高下注
    gameState.currentBet = 0;

    // 重置所有玩家的当前下注（但保留总下注）
    gameState.players.forEach(player => {
      if (player.status === PlayerStatus.PLAYING) {
        player.currentBet = 0;
        // 清除上一轮行动
        player.lastAction = undefined;
      }
    });

    // 将当前玩家索引重置为庄家之后的第一个未弃牌玩家
    let nextIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    const startIndex = nextIndex;

    while (
      (gameState.players[nextIndex].status === PlayerStatus.FOLDED ||
        gameState.players[nextIndex].status === PlayerStatus.ALL_IN) &&
      nextIndex !== startIndex
    ) {
      nextIndex = (nextIndex + 1) % gameState.players.length;
    }

    gameState.currentPlayerIndex = nextIndex;
  }

  // 显示玩家操作按钮
  private showPlayerActions(player: Player): void {
    const gameState = this.gameManager.getGameState();

    if (player.status !== PlayerStatus.FOLDED && player.status !== PlayerStatus.ALL_IN) {
      // 检查玩家是否可以看牌（当前下注等于最高下注）
      const canCheck = gameState.currentBet <= player.currentBet;

      // 计算跟注所需金额
      const callAmount = gameState.currentBet - player.currentBet;

      // 计算最小加注金额
      const minRaiseAmount = gameState.currentBet + gameState.minBet;

      // 检查玩家是否有足够筹码跟注
      const canCall = callAmount > 0 && player.chips >= callAmount;

      // 检查玩家是否有足够筹码加注
      const canRaise = player.chips >= (minRaiseAmount - player.currentBet);

      // 检查玩家是否可以全下
      const canAllIn = player.chips > 0;

      console.log(`显示操作按钮: canCheck=${canCheck}, canCall=${canCall}, canRaise=${canRaise}, canAllIn=${canAllIn}, callAmount=${callAmount}, chips=${player.chips}, minBet=${gameState.minBet}`);

      // 根据当前状态显示按钮
      this.actionButtons.show(canCheck, callAmount, player.chips, gameState.minBet);
    } else {
      console.log(`玩家状态为 ${player.status}，不显示操作按钮`);
      this.actionButtons.hide();
    }
  }
}

// 补充缺失的方法实现（存根）

// @ts-ignore TODO: Implement this method properly
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function updatePlayerSeat(seatIndex: number, player: Player): void {
  // TODO: 这个方法应该在GameScene类中实现
  // 示例: this.playerSeats[seatIndex]?.updatePlayer(player, this.gameManager.getGameState().currentPlayerIndex === seatIndex);
  console.log(`TODO: updatePlayerSeat for seat ${seatIndex}`, player);
}

// @ts-ignore TODO: Implement this method properly
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function showActionText(seatIndex: number, text: string, color: number): void {
  // TODO: 这个方法应该在GameScene类中实现
  // 示例: 创建一个 Phaser.Text 对象并显示在座位旁边，然后定时移除
  console.log(`TODO: showActionText for seat ${seatIndex}: ${text} with color ${color}`);
}

// @ts-ignore TODO: Implement this method properly
function updatePotText(): void {
  // TODO: 这个方法应该在GameScene类中实现
  // 示例: this.potDisplay.updatePot(this.gameManager.getGameState().pot);
  console.log('TODO: updatePotText');
}

// @ts-ignore TODO: Implement this method properly
function checkRoundComplete(): boolean {
  // TODO: 这个方法应该在GameScene类中实现
  // 真实逻辑会检查所有活跃玩家是否已行动且下注一致
  console.log('TODO: checkRoundComplete, returning false for now');
  return false;
}

// @ts-ignore TODO: Implement this method properly
function nextRound(): void {
  // TODO: 这个方法应该在GameScene类中实现
  // 推进游戏到下一阶段 (Flop, Turn, River, Showdown) 或结束牌局
  console.log('TODO: nextRound');
}

// @ts-ignore TODO: Implement this method properly
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function showPlayerActions(player: Player): void {
  // TODO: 这个方法应该在GameScene类中实现
  // 示例:
  // const gameState = this.gameManager.getGameState();
  // if (player.seatIndex === 0 && player.status !== PlayerStatus.FOLDED && player.status !== PlayerStatus.ALL_IN) {
  //   const canCheck = gameState.currentBet <= player.currentBet;
  //   const callAmount = gameState.currentBet - player.currentBet;
  //   this.actionButtons.show(canCheck, callAmount, player.chips, gameState.minBet);
  // } else {
  //   this.actionButtons.hide();
  // }
  console.log('TODO: showPlayerActions for player', player);
}