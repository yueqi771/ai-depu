import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { UserService } from '../services/UserService';
import { LoginType } from '../types';

export class LoginScene extends Phaser.Scene {
  private userService: UserService;
  private loginContainer!: Phaser.GameObjects.Container;
  private loadingContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: GameConfig.SCENES.LOGIN });
    this.userService = UserService.getInstance();
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 检查是否已登录
    if (this.userService.isLoggedIn()) {
      this.scene.start(GameConfig.SCENES.LOBBY);
      return;
    }

    // 添加背景
    const bg = this.add.image(0, 0, 'game_bg');
    bg.setOrigin(0, 0);
    bg.setDisplaySize(width, height);

    // 创建半透明遮罩
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6);
    overlay.setOrigin(0, 0);

    // 创建登录容器
    this.createLoginContainer();

    // 创建加载容器（初始隐藏）
    this.createLoadingContainer();
  }

  private createLoginContainer(): void {
    const { width, height } = this.cameras.main;
    this.loginContainer = this.add.container(width / 2, height / 2);

    // Logo
    const logo = this.add.image(0, -200, 'splash');
    logo.setScale(0.6);
    this.loginContainer.add(logo);

    // 标题
    const title = this.add.text(0, -80, '欢迎来到AI德州扑克', {
      fontSize: '42px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    this.loginContainer.add(title);

    // 副标题
    const subtitle = this.add.text(0, -30, '智能竞技，社交乐趣', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#cccccc',
    });
    subtitle.setOrigin(0.5);
    this.loginContainer.add(subtitle);

    // 游客登录按钮
    const guestButton = this.createButton(0, 50, '游客登录111', 0x4CAF50);
    const guestBg = guestButton.getData('bg') as Phaser.GameObjects.Rectangle;
    guestBg.on('pointerdown', () => this.handleGuestLogin());
    this.loginContainer.add(guestButton);

    // 手机号登录按钮
    const phoneButton = this.createButton(0, 130, '手机号登录', 0x2196F3);
    const phoneBg = phoneButton.getData('bg') as Phaser.GameObjects.Rectangle;
    phoneBg.on('pointerdown', () => this.handlePhoneLogin());
    this.loginContainer.add(phoneButton);

    // 第三方登录区域
    const thirdPartyText = this.add.text(0, 210, '其他登录方式', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#999999',
    });
    thirdPartyText.setOrigin(0.5);
    this.loginContainer.add(thirdPartyText);

    // 第三方登录图标
    const iconSpacing = 80;
    const iconY = 270;

    // 微信登录
    const wechatIcon = this.createThirdPartyIcon(-iconSpacing * 1.5, iconY, '微信', 0x07C160);
    const wechatBg = wechatIcon.getData('bg') as Phaser.GameObjects.Arc;
    wechatBg.on('pointerdown', () => this.handleThirdPartyLogin(LoginType.WECHAT));
    this.loginContainer.add(wechatIcon);

    // QQ登录
    const qqIcon = this.createThirdPartyIcon(-iconSpacing * 0.5, iconY, 'QQ', 0x12B7F5);
    const qqBg = qqIcon.getData('bg') as Phaser.GameObjects.Arc;
    qqBg.on('pointerdown', () => this.handleThirdPartyLogin(LoginType.QQ));
    this.loginContainer.add(qqIcon);

    // Apple登录
    const appleIcon = this.createThirdPartyIcon(iconSpacing * 0.5, iconY, 'Apple', 0x000000);
    const appleBg = appleIcon.getData('bg') as Phaser.GameObjects.Arc;
    appleBg.on('pointerdown', () => this.handleThirdPartyLogin(LoginType.APPLE));
    this.loginContainer.add(appleIcon);

    // 更多登录
    const moreIcon = this.createThirdPartyIcon(iconSpacing * 1.5, iconY, '更多', 0x666666);
    this.loginContainer.add(moreIcon);

    // 用户协议
    const agreementText = this.add.text(0, 350, '登录即表示同意《用户协议》和《隐私政策》', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#666666',
    });
    agreementText.setOrigin(0.5);
    this.loginContainer.add(agreementText);
  }

  private createButton(x: number, y: number, text: string, color: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    // 按钮背景
    const bg = this.add.rectangle(0, 0, 300, 60, color);
    bg.setInteractive({ useHandCursor: true });
    button.add(bg);

    // 按钮文字
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    buttonText.setOrigin(0.5);
    button.add(buttonText);

    // 悬停效果
    bg.on('pointerover', () => {
      bg.setAlpha(0.8);
    });
    bg.on('pointerout', () => {
      bg.setAlpha(1);
    });

    // 存储bg引用以便外部访问
    button.setData('bg', bg);

    return button;
  }

  private createThirdPartyIcon(x: number, y: number, text: string, color: number): Phaser.GameObjects.Container {
    const icon = this.add.container(x, y);

    // 图标背景
    const bg = this.add.circle(0, 0, 30, color);
    bg.setInteractive({ useHandCursor: true });
    icon.add(bg);

    // 图标文字（临时用文字代替图标）
    const iconText = this.add.text(0, 0, text[0], {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    iconText.setOrigin(0.5);
    icon.add(iconText);

    // 悬停效果
    bg.on('pointerover', () => {
      bg.setScale(1.1);
    });
    bg.on('pointerout', () => {
      bg.setScale(1);
    });

    // 存储bg引用以便外部访问
    icon.setData('bg', bg);

    return icon;
  }

  private createLoadingContainer(): void {
    const { width, height } = this.cameras.main;
    this.loadingContainer = this.add.container(width / 2, height / 2);
    this.loadingContainer.setVisible(false);

    // 加载背景
    const loadingBg = this.add.rectangle(0, 0, 400, 200, 0x000000, 0.8);
    this.loadingContainer.add(loadingBg);

    // 加载文字
    const loadingText = this.add.text(0, -20, '正在登录...', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5);
    this.loadingContainer.add(loadingText);

    // 加载动画（简单的旋转圆圈）
    const loadingCircle = this.add.graphics();
    loadingCircle.lineStyle(3, 0xffffff);
    loadingCircle.arc(0, 30, 20, 0, Math.PI * 1.8);
    this.loadingContainer.add(loadingCircle);

    // 旋转动画
    this.tweens.add({
      targets: loadingCircle,
      rotation: Math.PI * 2,
      duration: 1000,
      repeat: -1,
      ease: 'Linear',
    });
  }

  private showLoading(): void {
    this.loginContainer.setVisible(false);
    this.loadingContainer.setVisible(true);
  }

  private hideLoading(): void {
    this.loginContainer.setVisible(true);
    this.loadingContainer.setVisible(false);
  }

  private async handleGuestLogin(): Promise<void> {
    debugger
    this.showLoading();
    const response = await this.userService.loginAsGuest();

    if (response.code === 200) {
      this.time.delayedCall(500, () => {
        this.scene.start(GameConfig.SCENES.LOBBY);
      });
    } else {
      this.hideLoading();
      this.showError(response.message);
    }
  }

  private handlePhoneLogin(): void {
    this.sound.play(GameConfig.AUDIO.CLICK);
    this.showError('手机号登录功能开发中');
  }

  private handleThirdPartyLogin(type: LoginType): void {
    this.sound.play(GameConfig.AUDIO.CLICK);
    this.showError(`${type}登录功能开发中`);
  }

  private showError(message: string): void {
    const { width, height } = this.cameras.main;

    // 错误提示容器
    const errorContainer = this.add.container(width / 2, height / 2 - 200);

    // 背景
    const bg = this.add.rectangle(0, 0, 400, 60, 0xff0000, 0.9);
    errorContainer.add(bg);

    // 文字
    const text = this.add.text(0, 0, message, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    text.setOrigin(0.5);
    errorContainer.add(text);

    // 淡入淡出动画
    errorContainer.setAlpha(0);
    this.tweens.add({
      targets: errorContainer,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 2000,
      onComplete: () => {
        errorContainer.destroy();
      },
    });
  }
} 