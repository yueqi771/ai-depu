import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;
  private assetText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: GameConfig.SCENES.PRELOAD });
  }

  preload(): void {
    this.createLoadingScreen();
    this.loadAssets();
  }

  private createLoadingScreen(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 进度条背景
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(width / 2 - 320, height / 2 - 30, 640, 60);

    // 进度条
    this.progressBar = this.add.graphics();

    // 加载文字
    this.loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 80,
      text: '资源加载中...',
      style: {
        font: '32px Arial',
        color: '#ffffff',
      },
    });
    this.loadingText.setOrigin(0.5, 0.5);

    // 百分比文字
    this.percentText = this.make.text({
      x: width / 2,
      y: height / 2,
      text: '0%',
      style: {
        font: '24px Arial',
        color: '#ffffff',
      },
    });
    this.percentText.setOrigin(0.5, 0.5);

    // 当前加载资源文字
    this.assetText = this.make.text({
      x: width / 2,
      y: height / 2 + 60,
      text: '',
      style: {
        font: '18px Arial',
        color: '#ffffff',
      },
    });
    this.assetText.setOrigin(0.5, 0.5);

    // 监听加载事件
    this.load.on('progress', (value: number) => {
      this.percentText.setText(Math.floor(value * 100) + '%');
      this.progressBar.clear();
      this.progressBar.fillStyle(0x00ff00, 1);
      this.progressBar.fillRect(
        this.cameras.main.width / 2 - 310,
        this.cameras.main.height / 2 - 20,
        620 * value,
        40
      );
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.assetText.setText('正在加载: ' + file.key);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
      this.percentText.destroy();
      this.assetText.destroy();
    });
  }

  private loadAssets(): void {
    // 加载启动画面
    this.load.image('splash', 'assets/splash.png');

    // 加载游戏背景
    this.load.image('game_bg', 'assets/game_desk_bg.jpg');
    this.load.image('game_bg_6p', 'assets/game_desk_bg_6p.jpg');

    // 加载游戏主界面图集（暂时只加载图片，不使用plist）
    this.load.image('game_main_texture', 'assets/GameMain_6p.png');

    // 加载扑克牌图集
    this.load.atlas(
      'game_cards',
      'assets/game_cards.png',
      'assets/game_cards.json'
    );

    // 加载音效
    this.loadAudioAssets();
  }

  private loadAudioAssets(): void {
    const audioFiles = [
      { key: GameConfig.AUDIO.CLICK, path: 'audio_pokerClick.mp3' },
      { key: GameConfig.AUDIO.CARD_DEAL, path: 'audio_distributeCard.wav' },
      { key: GameConfig.AUDIO.CHIP_BET, path: 'audio_chipsToTable.wav' },
      { key: GameConfig.AUDIO.CHIP_POT, path: 'audio_chipsToPot.wav' },
      { key: GameConfig.AUDIO.FOLD, path: 'audio_fold.wav' },
      { key: GameConfig.AUDIO.CHECK, path: 'audio_check.wav' },
      { key: GameConfig.AUDIO.CALL, path: 'audio_call.wav' },
      { key: GameConfig.AUDIO.RAISE, path: 'audio_raise.wav' },
      { key: GameConfig.AUDIO.WIN, path: 'audio_win.wav' },
      { key: GameConfig.AUDIO.BIG_WIN, path: 'audio_allinWin.wav' },
      { key: GameConfig.AUDIO.CARD_FLIP, path: 'audio_cardFlip.wav' },
      { key: GameConfig.AUDIO.CHIP, path: 'audio_chip.wav' },
    ];

    audioFiles.forEach(audio => {
      this.load.audio(audio.key, `assets/audio/${audio.path}`);
    });
  }

  create(): void {
    // 资源加载完成后，跳转到启动画面
    this.scene.start(GameConfig.SCENES.SPLASH);
  }
} 