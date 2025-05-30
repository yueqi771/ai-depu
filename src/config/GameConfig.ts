// 游戏配置常量
export const GameConfig = {
  // 游戏画面尺寸
  GAME_WIDTH: 1920,
  GAME_HEIGHT: 1080,

  // 场景键值
  SCENES: {
    PRELOAD: 'PreloadScene',
    SPLASH: 'SplashScene',
    LOGIN: 'LoginScene',
    LOBBY: 'LobbyScene',
    GAME: 'GameScene',
    SHOP: 'ShopScene',
    PROFILE: 'ProfileScene',
    TOURNAMENT: 'TournamentScene',
  },

  // 游戏规则配置
  GAME_RULES: {
    MAX_PLAYERS: 6,
    SMALL_BLIND: 10,
    BIG_BLIND: 20,
    MIN_BUY_IN: 1000,
    MAX_BUY_IN: 10000,
    THINKING_TIME: 30, // 思考时间（秒）
    EXTRA_TIME_BANK: 60, // 额外时间银行（秒）
  },

  // 牌型
  HAND_RANKS: {
    HIGH_CARD: 0,
    ONE_PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9,
  },

  // 动画时长配置（毫秒）
  ANIMATION: {
    CARD_DEAL: 300,
    CHIP_MOVE: 500,
    CARD_FLIP: 200,
    POT_COLLECT: 800,
  },

  // 音效键值
  AUDIO: {
    CLICK: 'audio_pokerClick',
    CARD_DEAL: 'audio_distributeCard',
    CHIP_BET: 'audio_chipsToTable',
    CHIP_POT: 'audio_chipsToPot',
    FOLD: 'audio_fold',
    CHECK: 'audio_check',
    YOUR_TURN: 'audio_yourTurn',
    TIMEOUT: 'audio_timeout',
    WIN: 'audio_normalWin',
    BIG_WIN: 'audio_allinWin',
  },

  // API接口配置
  API: {
    BASE_URL: process.env.NODE_ENV === 'production'
      ? 'https://api.aipoker.com'
      : 'http://localhost:3001',
    TIMEOUT: 10000,
  },

  // 本地存储键值
  STORAGE_KEYS: {
    USER_TOKEN: 'ai_poker_token',
    USER_INFO: 'ai_poker_user',
    SETTINGS: 'ai_poker_settings',
    SOUND_ENABLED: 'ai_poker_sound',
  },
} as const; 