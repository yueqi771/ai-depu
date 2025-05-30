import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class SplashScene extends Phaser.Scene {
  private splashImage!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: GameConfig.SCENES.SPLASH });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 添加背景
    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);

    // 添加启动画面图片
    this.splashImage = this.add.image(width / 2, height / 2 - 100, 'splash');
    this.splashImage.setScale(0.8);
    this.splashImage.setAlpha(0);

    // 添加标题
    this.titleText = this.add.text(width / 2, height / 2 + 100, 'AI德州扑克', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0);

    // 添加版本号
    this.versionText = this.add.text(width / 2, height / 2 + 160, 'v1.0.0', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#cccccc',
    });
    this.versionText.setOrigin(0.5);
    this.versionText.setAlpha(0);

    // 添加加载提示
    this.progressText = this.add.text(width / 2, height - 100, '正在初始化游戏...', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    this.progressText.setOrigin(0.5);
    this.progressText.setAlpha(0);

    // 启动画面动画
    this.playIntroAnimation();
  }

  private playIntroAnimation(): void {
    // Logo淡入
    this.tweens.add({
      targets: this.splashImage,
      alpha: 1,
      scale: 1,
      duration: 800,
      ease: 'Power2',
    });

    // 标题淡入
    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      y: '-=20',
      duration: 600,
      ease: 'Power2',
      delay: 400,
    });

    // 版本号淡入
    this.tweens.add({
      targets: this.versionText,
      alpha: 1,
      duration: 400,
      ease: 'Power2',
      delay: 800,
    });

    // 加载提示淡入
    this.tweens.add({
      targets: this.progressText,
      alpha: 1,
      duration: 400,
      ease: 'Power2',
      delay: 1000,
    });

    // 模拟初始化过程
    this.time.delayedCall(2000, () => {
      this.progressText.setText('连接服务器...');
    });

    this.time.delayedCall(3000, () => {
      this.progressText.setText('准备就绪！');
    });

    // 3.5秒后跳转到登录场景
    this.time.delayedCall(3500, () => {
      this.fadeOutAndChangeScene();
    });
  }

  private fadeOutAndChangeScene(): void {
    this.tweens.add({
      targets: [this.splashImage, this.titleText, this.versionText, this.progressText],
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.scene.start(GameConfig.SCENES.LOGIN);
      },
    });
  }
} 