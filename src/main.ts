import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { PreloadScene } from './scenes/PreloadScene';
import { SplashScene } from './scenes/SplashScene';
import { LoginScene } from './scenes/LoginScene';
import { LobbyScene } from './scenes/LobbyScene';
import { GameScene } from './scenes/GameScene';

// 游戏配置
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-game',
  backgroundColor: '#2d2d2d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GameConfig.GAME_WIDTH,
    height: GameConfig.GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    PreloadScene,
    SplashScene,
    LoginScene,
    LobbyScene,
    GameScene,
  ],
};

// 创建游戏实例
const game = new Phaser.Game(config);

// 监听窗口大小变化
window.addEventListener('resize', () => {
  game.scale.refresh();
});

export default game; 