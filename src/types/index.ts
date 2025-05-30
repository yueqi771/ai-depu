// 用户信息接口
export interface UserInfo {
  id: string;
  nickname: string;
  avatar: string;
  level: number;
  experience: number;
  chips: number;
  diamonds: number;
  vipLevel: number;
  createTime: number;
  lastLoginTime: number;
}

// 登录方式枚举
export enum LoginType {
  GUEST = 'guest',
  PHONE = 'phone',
  WECHAT = 'wechat',
  QQ = 'qq',
  APPLE = 'apple',
}

// 房间类型枚举
export enum RoomType {
  NORMAL = 'normal',
  FAST = 'fast',
  TOURNAMENT = 'tournament',
  PRIVATE = 'private',
}

// 房间信息接口
export interface RoomInfo {
  id: string;
  name: string;
  type: RoomType;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxPlayers: number;
  currentPlayers: number;
  status: RoomStatus;
}

// 房间状态枚举
export enum RoomStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

// 玩家状态枚举
export enum PlayerStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FOLDED = 'folded',
  ALL_IN = 'all_in',
  DISCONNECTED = 'disconnected',
}

// 玩家动作枚举
export enum PlayerAction {
  CHECK = 'check',
  CALL = 'call',
  RAISE = 'raise',
  FOLD = 'fold',
  ALL_IN = 'all_in',
}

// 游戏阶段枚举
export enum GameStage {
  WAITING = 'waiting',
  PRE_FLOP = 'pre_flop',
  FLOP = 'flop',
  TURN = 'turn',
  RIVER = 'river',
  SHOWDOWN = 'showdown',
}

// 扑克牌花色枚举
export enum CardSuit {
  SPADES = 'spades',    // 黑桃
  HEARTS = 'hearts',    // 红心
  DIAMONDS = 'diamonds', // 方片
  CLUBS = 'clubs',      // 梅花
}

// 扑克牌点数枚举
export enum CardRank {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14,
}

// 扑克牌接口
export interface Card {
  suit: CardSuit;
  rank: CardRank;
  id: string;
}

// 玩家信息接口
export interface Player {
  id: string;
  userInfo: UserInfo;
  seatIndex: number;
  chips: number;
  status: PlayerStatus;
  cards: Card[];
  currentBet: number;
  totalBet: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  timeBank: number;
  lastAction?: PlayerAction;
}

// 游戏状态接口
export interface GameState {
  roomInfo: RoomInfo;
  stage: GameStage;
  players: Player[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  minBet: number;
  currentBet: number;
  roundStartTime: number;
}

// 边池接口
export interface SidePot {
  amount: number;
  eligiblePlayers: string[];
}

// API响应接口
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 聊天消息接口
export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  content: string;
  type: ChatMessageType;
  timestamp: number;
}

// 聊天消息类型枚举
export enum ChatMessageType {
  TEXT = 'text',
  EMOJI = 'emoji',
  SYSTEM = 'system',
} 