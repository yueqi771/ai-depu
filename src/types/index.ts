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

// 扑克牌花色
export enum CardSuit {
  HEARTS = 'h',
  DIAMONDS = 'd',
  CLUBS = 'c',
  SPADES = 's'
}

// 扑克牌点数
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
  ACE = 14
}

// 扑克牌接口
export interface Card {
  suit: 'h' | 'd' | 'c' | 's'; // 红桃、方块、梅花、黑桃
  value: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  id: string; // 唯一标识，如 "Ah" 表示红桃A
  // 添加兼容旧代码的属性
  rank?: CardRank;
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

// 牌型等级，从高到低排序
export enum HandRank {
  ROYAL_FLUSH = 0,     // 皇家同花顺
  STRAIGHT_FLUSH = 1,  // 同花顺
  FOUR_OF_A_KIND = 2,  // 四条
  FULL_HOUSE = 3,      // 葫芦
  FLUSH = 4,           // 同花
  STRAIGHT = 5,        // 顺子
  THREE_OF_A_KIND = 6, // 三条
  TWO_PAIR = 7,        // 两对
  ONE_PAIR = 8,        // 一对
  HIGH_CARD = 9        // 高牌
}

// 游戏状态接口
export interface GameState {
  roomInfo: {
    id: string;
    name: string;
    type: RoomType;
    smallBlind: number;
    bigBlind: number;
    minBuyIn: number;
    maxBuyIn: number;
    status: RoomStatus;
  };
  players: Player[];
  stage: GameStage;
  pot: number;
  currentBet: number;
  minBet: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentPlayerIndex: number;
  communityCards: Card[];
  deck: Card[]; // 牌堆
  sidePots: { amount: number; eligiblePlayers: string[] }[]; // 边池
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