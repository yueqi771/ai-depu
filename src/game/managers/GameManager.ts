import { GameState, Player, GameStage, PlayerStatus, PlayerAction, RoomStatus, RoomType } from '../../types';
import { DeckManager } from './DeckManager';
import { GameConfig } from '../../config/GameConfig';

export class GameManager {
  private gameState: GameState;
  private deckManager: DeckManager;
  private onStateChangeCallback: (state: GameState) => void;

  constructor(roomType: RoomType, onStateChange: (state: GameState) => void) {
    this.onStateChangeCallback = onStateChange;
    this.deckManager = new DeckManager();
    this.gameState = this.createInitialState(roomType);
  }

  // 创建初始游戏状态
  private createInitialState(roomType: RoomType): GameState {
    return {
      roomInfo: {
        id: `room_${Date.now()}`,
        name: '新手房间',
        type: roomType,
        smallBlind: GameConfig.GAME_RULES.SMALL_BLIND,
        bigBlind: GameConfig.GAME_RULES.BIG_BLIND,
        minBuyIn: GameConfig.GAME_RULES.MIN_BUY_IN,
        maxBuyIn: GameConfig.GAME_RULES.MAX_BUY_IN,
        maxPlayers: GameConfig.GAME_RULES.MAX_PLAYERS,
        currentPlayers: 0,
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
  }

  // 添加玩家
  public addPlayer(player: Player): boolean {
    if (this.gameState.players.length >= this.gameState.roomInfo.maxPlayers) {
      console.error('房间已满');
      return false;
    }

    // 检查座位是否已被占用
    const existingPlayer = this.gameState.players.find(p => p.seatIndex === player.seatIndex);
    if (existingPlayer) {
      console.error(`座位 ${player.seatIndex} 已被占用`);
      return false;
    }

    this.gameState.players.push(player);
    this.gameState.roomInfo.currentPlayers = this.gameState.players.length;

    this.notifyStateChange();
    return true;
  }

  // 移除玩家
  public removePlayer(playerId: string): boolean {
    const index = this.gameState.players.findIndex(p => p.id === playerId);
    if (index === -1) {
      console.error(`找不到ID为 ${playerId} 的玩家`);
      return false;
    }

    this.gameState.players.splice(index, 1);
    this.gameState.roomInfo.currentPlayers = this.gameState.players.length;

    this.notifyStateChange();
    return true;
  }

  // 开始游戏
  public startGame(): boolean {
    // 如果游戏已经开始，则不做任何事
    if (this.gameState.stage !== GameStage.WAITING) {
      console.error('游戏已经开始');
      return false;
    }

    // 如果玩家数量不足2人，则无法开始
    if (this.gameState.players.length < 2) {
      console.error('至少需要2名玩家才能开始游戏');
      return false;
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

    // 通知状态变化
    this.notifyStateChange();

    return true;
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

  // 发牌
  private dealCards(): void {
    // 创建一副牌并洗牌
    this.deckManager.createDeck();
    this.deckManager.shuffleDeck();

    // 将牌堆添加到gameState
    this.gameState.deck = this.deckManager.getDeck();

    // 给每个玩家发两张牌
    this.gameState.players.forEach(player => {
      player.cards = this.deckManager.dealCards(2);
      player.status = PlayerStatus.PLAYING;
    });

    // 更新deck引用，确保它指向最新的牌堆
    this.gameState.deck = this.deckManager.getDeck();
  }

  // 收取盲注
  private collectBlinds(): void {
    // 收取小盲注
    const smallBlindPlayer = this.gameState.players[this.gameState.smallBlindIndex];
    const smallBlindAmount = this.gameState.roomInfo.smallBlind;
    this.placeBet(smallBlindPlayer, smallBlindAmount);

    // 收取大盲注
    const bigBlindPlayer = this.gameState.players[this.gameState.bigBlindIndex];
    const bigBlindAmount = this.gameState.roomInfo.bigBlind;
    this.placeBet(bigBlindPlayer, bigBlindAmount);

    // 设置当前最小下注额
    this.gameState.minBet = bigBlindAmount;
    this.gameState.currentBet = bigBlindAmount;
  }

  // 玩家下注
  private placeBet(player: Player, amount: number): void {
    const actualAmount = Math.min(player.chips, amount);

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
  }

  // 处理玩家动作
  public handlePlayerAction(playerId: string, action: PlayerAction, betAmount: number = 0): boolean {
    // 获取当前玩家
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      console.error('不是当前玩家的回合');
      return false;
    }

    console.log(`玩家 ${currentPlayer.userInfo.nickname} 执行动作: ${action}`);

    // 记录之前的状态以便动画显示
    const oldChips = currentPlayer.chips;

    // 更新玩家动作
    currentPlayer.lastAction = action;

    // 根据不同动作处理
    switch (action) {
      case PlayerAction.FOLD:
        currentPlayer.status = PlayerStatus.FOLDED;
        break;

      case PlayerAction.CHECK:
        // 看牌不需要额外操作
        break;

      case PlayerAction.CALL:
        // 计算需要跟注的金额
        const callAmount = this.gameState.currentBet - currentPlayer.currentBet;

        // 如果玩家筹码不足以跟注，则全下
        if (currentPlayer.chips <= callAmount) {
          // 全下
          this.gameState.pot += currentPlayer.chips;
          currentPlayer.currentBet += currentPlayer.chips;
          currentPlayer.chips = 0;
          currentPlayer.status = PlayerStatus.ALL_IN;
        } else {
          // 正常跟注
          currentPlayer.chips -= callAmount;
          currentPlayer.currentBet = this.gameState.currentBet;
          // 增加底池
          this.gameState.pot += callAmount;
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
        } else {
          // 计算加注的总金额
          const raiseDiff = betAmount - currentPlayer.currentBet;

          currentPlayer.chips -= raiseDiff;
          currentPlayer.currentBet = betAmount;
          // 更新当前最高下注
          this.gameState.currentBet = betAmount;
          // 增加底池
          this.gameState.pot += raiseDiff;
        }
        break;

      case PlayerAction.ALL_IN:
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
        break;
    }

    // 通知状态变化
    this.notifyStateChange();

    // 检查回合是否结束
    if (this.isRoundComplete()) {
      console.log("回合结束，进入下一轮");
      // 如果回合结束，进入下一回合
      this.nextRound();
    } else {
      console.log("回合未结束，切换到下一个玩家");
      // 切换到下一个玩家
      this.nextPlayer();
    }

    return true;
  }

  // 切换到下一个玩家
  private nextPlayer(): void {
    // 找下一个未弃牌且未全下的玩家
    let nextIndex = this.gameState.currentPlayerIndex;
    let loopCount = 0;
    const playerCount = this.gameState.players.length;

    do {
      nextIndex = (nextIndex + 1) % playerCount;
      loopCount++;

      // 防止无限循环
      if (loopCount > playerCount) {
        console.log("所有玩家都已行动或不能行动，进入下一轮");
        this.nextRound();
        return;
      }
    } while (
      this.gameState.players[nextIndex].status === PlayerStatus.FOLDED ||
      this.gameState.players[nextIndex].status === PlayerStatus.ALL_IN
    );

    // 更新当前玩家索引
    this.gameState.currentPlayerIndex = nextIndex;
    console.log(`轮到玩家 ${this.gameState.players[nextIndex].userInfo.nickname} 行动`);

    // 如果是AI玩家（非座位0的玩家），自动执行动作
    const currentPlayer = this.gameState.players[nextIndex];
    if (currentPlayer.seatIndex !== 0) {
      // 延迟一段时间后AI执行动作，模拟思考
      setTimeout(() => {
        this.executeAIAction(currentPlayer);
      }, 1500);
    }

    // 通知状态变化
    this.notifyStateChange();
  }

  // AI玩家执行动作
  private executeAIAction(player: Player): void {
    // 如果游戏已经结束或玩家不是当前玩家，则不执行动作
    if (this.gameState.stage === GameStage.SHOWDOWN ||
      this.gameState.currentPlayerIndex === -1 ||
      this.gameState.players[this.gameState.currentPlayerIndex].id !== player.id) {
      return;
    }

    // 简单AI策略：随机选择动作
    const actions = [
      PlayerAction.FOLD,
      PlayerAction.CHECK,
      PlayerAction.CALL,
      PlayerAction.RAISE,
      PlayerAction.ALL_IN
    ];

    // 根据当前游戏状态调整可用动作
    const availableActions = [];

    // 如果当前下注等于玩家已下注，可以看牌
    if (this.gameState.currentBet <= player.currentBet) {
      availableActions.push(PlayerAction.CHECK);
    }

    // 始终可以弃牌
    availableActions.push(PlayerAction.FOLD);

    // 如果有足够筹码，可以跟注
    if (player.chips > 0) {
      availableActions.push(PlayerAction.CALL);

      // 如果有足够筹码加注，可以加注
      if (player.chips >= this.gameState.minBet * 2) {
        availableActions.push(PlayerAction.RAISE);
      }

      // 始终可以全下
      availableActions.push(PlayerAction.ALL_IN);
    }

    // 随机选择一个可用动作
    const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)];

    // 如果是加注，随机决定加注金额
    let betAmount = 0;
    if (randomAction === PlayerAction.RAISE) {
      // 加注金额在最小加注和玩家筹码之间随机
      const minRaise = this.gameState.currentBet + this.gameState.minBet;
      const maxRaise = player.chips + player.currentBet;
      betAmount = Math.floor(Math.random() * (maxRaise - minRaise + 1)) + minRaise;
    }

    console.log(`AI玩家 ${player.userInfo.nickname} 选择动作: ${randomAction}${betAmount > 0 ? ', 金额: ' + betAmount : ''}`);

    // 执行选择的动作
    this.handlePlayerAction(player.id, randomAction, betAmount);
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
        console.log(`玩家 ${player.userInfo.nickname} 尚未行动，回合未结束`);
        return false;
      }

      if (player.currentBet < currentBet && player.status !== PlayerStatus.ALL_IN) {
        console.log(`玩家 ${player.userInfo.nickname} 下注不等于当前最高下注且未全下，回合未结束`);
        return false;
      }
    }

    // 如果只有一个活跃玩家和至少一个全下玩家，回合结束
    if (activePlayers <= 1 && allInPlayers > 0) {
      console.log("只有一个活跃玩家和至少一个全下玩家，回合结束");
      return true;
    }

    // 如果所有未弃牌玩家都已行动，回合结束
    const totalNonFoldedPlayers = activePlayers + allInPlayers;
    const isComplete = actedPlayers === totalNonFoldedPlayers;
    if (isComplete) {
      console.log("所有未弃牌玩家都已行动，回合结束");
    }
    return isComplete;
  }

  // 进入下一回合
  private nextRound(): void {
    // 活跃玩家数量（未弃牌且未全下）
    const activePlayers = this.getActivePlayersCount(true);
    // 参与玩家数量（未弃牌）
    const participatingPlayers = this.getActivePlayersCount(false);

    console.log(`活跃玩家: ${activePlayers}, 参与玩家: ${participatingPlayers}`);

    // 检查是否只有一个活跃玩家
    if (activePlayers <= 1 && participatingPlayers > 1) {
      console.log("只有一个活跃玩家但有多个参与玩家，直接发完所有公共牌");
      // 如果只有一个活跃玩家但有多个参与玩家（即其他人都全下了）
      // 直接发完所有公共牌，然后进入摊牌阶段
      this.dealRemainingCommunityCards();
      return;
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
        // 如果只有一名活跃玩家，直接发完所有牌并进入摊牌阶段
        if (activePlayers <= 1) {
          console.log("只有一名活跃玩家，直接发完所有牌并进入摊牌阶段");
          this.dealRemainingCommunityCards();
          return;
        }
        this.gameState.stage = GameStage.FLOP;
        this.dealFlop();
        break;

      case GameStage.FLOP:
        // 如果只有一名活跃玩家，直接发完所有牌并进入摊牌阶段
        if (activePlayers <= 1) {
          console.log("只有一名活跃玩家，直接发完所有牌并进入摊牌阶段");
          this.dealRemainingCommunityCards();
          return;
        }
        this.gameState.stage = GameStage.TURN;
        this.dealTurn();
        break;

      case GameStage.TURN:
        // 如果只有一名活跃玩家，直接发完所有牌并进入摊牌阶段
        if (activePlayers <= 1) {
          console.log("只有一名活跃玩家，直接发完所有牌并进入摊牌阶段");
          this.dealRemainingCommunityCards();
          return;
        }
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
    console.log(`新一轮开始，当前玩家: ${this.gameState.players[this.gameState.currentPlayerIndex].userInfo.nickname}`);

    // 如果只有一个活跃玩家，直接进入摊牌
    if (this.getActivePlayersCount(false) <= 1) {
      console.log("只有一个活跃玩家，直接进入摊牌");
      this.showdown();
    }

    // 通知状态变化
    this.notifyStateChange();
  }

  // 发剩余的所有公共牌
  private dealRemainingCommunityCards(): void {
    switch (this.gameState.stage) {
      case GameStage.PRE_FLOP:
        this.gameState.stage = GameStage.FLOP;
        this.dealFlop();
        this.gameState.stage = GameStage.TURN;
        this.dealTurn();
        this.gameState.stage = GameStage.RIVER;
        this.dealRiver();
        this.gameState.stage = GameStage.SHOWDOWN;
        this.showdown();
        break;

      case GameStage.FLOP:
        this.gameState.stage = GameStage.TURN;
        this.dealTurn();
        this.gameState.stage = GameStage.RIVER;
        this.dealRiver();
        this.gameState.stage = GameStage.SHOWDOWN;
        this.showdown();
        break;

      case GameStage.TURN:
        this.gameState.stage = GameStage.RIVER;
        this.dealRiver();
        this.gameState.stage = GameStage.SHOWDOWN;
        this.showdown();
        break;

      case GameStage.RIVER:
        this.gameState.stage = GameStage.SHOWDOWN;
        this.showdown();
        break;
    }
  }

  // 发翻牌
  private dealFlop(): void {
    // 移除已经发给玩家的牌
    this.gameState.players.forEach(player => {
      this.deckManager.removeCards(player.cards);
    });

    // 发三张公共牌
    this.gameState.communityCards = this.deckManager.dealCards(3);

    // 更新deck引用
    this.gameState.deck = this.deckManager.getDeck();
  }

  // 发转牌
  private dealTurn(): void {
    // 移除已有的公共牌
    this.deckManager.removeCards(this.gameState.communityCards);

    // 发第四张公共牌
    const turnCard = this.deckManager.dealCards(1);
    this.gameState.communityCards.push(...turnCard);

    // 更新deck引用
    this.gameState.deck = this.deckManager.getDeck();
  }

  // 发河牌
  private dealRiver(): void {
    // 移除已有的公共牌
    this.deckManager.removeCards(this.gameState.communityCards);

    // 发第五张公共牌
    const riverCard = this.deckManager.dealCards(1);
    this.gameState.communityCards.push(...riverCard);

    // 更新deck引用
    this.gameState.deck = this.deckManager.getDeck();
  }

  // 摊牌阶段
  private showdown(): void {
    // 确定赢家并分配底池（简单版本，不考虑牌型比较）
    const activePlayers = this.gameState.players.filter(p => p.status !== PlayerStatus.FOLDED);

    // 临时：随机选择一名获胜者
    const winnerIndex = Math.floor(Math.random() * activePlayers.length);
    const winner = activePlayers[winnerIndex];

    if (winner) {
      // 将底池分配给赢家
      winner.chips += this.gameState.pot;
    } else {
      console.error("没有活跃玩家，无法确定赢家");
    }

    // 延迟后重置游戏
    setTimeout(() => {
      this.resetGame();
    }, 5000);
  }

  // 重置游戏状态，准备下一轮
  private resetGame(): void {
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

    // 通知状态变化
    this.notifyStateChange();
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

    // 首先尝试找到未弃牌且未全下的玩家
    while (loopCount < playerCount) {
      const player = this.gameState.players[nextIndex];

      if (player.status !== PlayerStatus.FOLDED && player.status !== PlayerStatus.ALL_IN) {
        console.log(`找到下一个活跃玩家: ${player.userInfo.nickname}`);
        return nextIndex;
      }

      nextIndex = (nextIndex + 1) % playerCount;
      loopCount++;
    }

    // 如果所有玩家都已弃牌或全下，找到第一个未弃牌的玩家
    nextIndex = (index + 1) % playerCount;
    loopCount = 0;

    while (loopCount < playerCount) {
      const player = this.gameState.players[nextIndex];

      if (player.status !== PlayerStatus.FOLDED) {
        console.log(`所有玩家都已全下，找到第一个未弃牌的玩家: ${player.userInfo.nickname}`);
        return nextIndex;
      }

      nextIndex = (nextIndex + 1) % playerCount;
      loopCount++;
    }

    console.log(`没有找到活跃玩家，返回原索引: ${index}`);
    return index; // 如果找不到活跃玩家，返回原索引
  }

  // 获取当前玩家
  private getCurrentPlayer(): Player | null {
    if (this.gameState.currentPlayerIndex === -1) {
      return null;
    }
    return this.gameState.players[this.gameState.currentPlayerIndex] || null;
  }

  // 通知状态变化
  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.gameState);
    }
  }

  // 获取游戏状态
  public getGameState(): GameState {
    return this.gameState;
  }
}
