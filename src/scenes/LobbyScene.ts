import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { UserService } from '../services/UserService';
import { RoomType, UserInfo } from '../types';

export class LobbyScene extends Phaser.Scene {
  private userService: UserService;
  private userInfo!: UserInfo;
  private headerContainer!: Phaser.GameObjects.Container;
  private mainContainer!: Phaser.GameObjects.Container;
  private navContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: GameConfig.SCENES.LOBBY });
    this.userService = UserService.getInstance();
  }

  create(): void {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      this.scene.start(GameConfig.SCENES.LOGIN);
      return;
    }
    this.userInfo = currentUser;

    // 添加背景
    const { width, height } = this.cameras.main;
    const bg = this.add.image(0, 0, 'game_bg');
    bg.setOrigin(0, 0);
    bg.setDisplaySize(width, height);

    // 创建头部信息栏
    this.createHeader();

    // 创建主要内容区域
    this.createMainContent();

    // 创建底部导航栏
    this.createNavBar();
  }

  private createHeader(): void {
    const { width } = this.cameras.main;
    this.headerContainer = this.add.container(0, 0);

    // 头部背景
    const headerBg = this.add.rectangle(0, 0, width, 100, 0x000000, 0.8);
    headerBg.setOrigin(0, 0);
    this.headerContainer.add(headerBg);

    // 用户头像背景
    const avatarBg = this.add.circle(80, 50, 35, 0x333333);
    this.headerContainer.add(avatarBg);

    // 用户头像（临时用文字代替）
    const avatarText = this.add.text(80, 50, this.userInfo.nickname[0], {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    avatarText.setOrigin(0.5);
    this.headerContainer.add(avatarText);

    // 用户昵称
    const nickname = this.add.text(140, 30, this.userInfo.nickname, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    this.headerContainer.add(nickname);

    // 用户等级
    const level = this.add.text(140, 55, `Lv.${this.userInfo.level}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffcc00',
    });
    this.headerContainer.add(level);

    // 筹码显示
    const chipIcon = this.add.circle(width - 300, 50, 20, 0xffcc00);
    this.headerContainer.add(chipIcon);

    const chips = this.add.text(width - 270, 50, this.formatNumber(this.userInfo.chips), {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    chips.setOrigin(0, 0.5);
    this.headerContainer.add(chips);

    // 钻石显示
    const diamondIcon = this.add.graphics();
    diamondIcon.fillStyle(0x00ccff);
    diamondIcon.fillPoints([
      { x: width - 150, y: 35 },
      { x: width - 140, y: 50 },
      { x: width - 150, y: 65 },
      { x: width - 160, y: 50 },
    ]);
    this.headerContainer.add(diamondIcon);

    const diamonds = this.add.text(width - 120, 50, this.formatNumber(this.userInfo.diamonds), {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    diamonds.setOrigin(0, 0.5);
    this.headerContainer.add(diamonds);

    // 设置按钮
    const settingsButton = this.add.circle(width - 40, 50, 25, 0x666666);
    settingsButton.setInteractive({ useHandCursor: true });
    this.headerContainer.add(settingsButton);

    const settingsIcon = this.add.text(width - 40, 50, '⚙', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    settingsIcon.setOrigin(0.5);
    this.headerContainer.add(settingsIcon);
  }

  private createMainContent(): void {
    const { width } = this.cameras.main;
    this.mainContainer = this.add.container(0, 120);

    // 轮播图区域（暂时用矩形代替）
    const banner = this.add.rectangle(width / 2, 80, width - 40, 150, 0x4CAF50);
    banner.setStrokeStyle(2, 0xffffff);
    this.mainContainer.add(banner);

    const bannerText = this.add.text(width / 2, 80, '新手福利 - 注册送10000筹码', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    bannerText.setOrigin(0.5);
    this.mainContainer.add(bannerText);

    // 游戏模式选择
    const modeY = 280;
    const modeSpacing = 200;

    // 常规局
    const normalMode = this.createGameMode(
      width / 2 - modeSpacing * 1.5,
      modeY,
      '常规局',
      '经典德州扑克',
      0x2196F3,
      RoomType.NORMAL
    );
    this.mainContainer.add(normalMode);

    // 快速局
    const fastMode = this.createGameMode(
      width / 2 - modeSpacing * 0.5,
      modeY,
      '快速局',
      '节奏更快',
      0xFF9800,
      RoomType.FAST
    );
    this.mainContainer.add(fastMode);

    // 锦标赛
    const tournamentMode = this.createGameMode(
      width / 2 + modeSpacing * 0.5,
      modeY,
      '锦标赛',
      '赢取大奖',
      0x9C27B0,
      RoomType.TOURNAMENT
    );
    this.mainContainer.add(tournamentMode);

    // 私人房
    const privateMode = this.createGameMode(
      width / 2 + modeSpacing * 1.5,
      modeY,
      '私人房',
      '与好友对战',
      0x4CAF50,
      RoomType.PRIVATE
    );
    this.mainContainer.add(privateMode);

    // 快速开始按钮
    const quickStartButton = this.add.container(width / 2, modeY + 150);
    const quickStartBg = this.add.rectangle(0, 0, 300, 80, 0xFF5722);
    quickStartBg.setInteractive({ useHandCursor: true });
    quickStartButton.add(quickStartBg);

    const quickStartText = this.add.text(0, 0, '快速开始', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    quickStartText.setOrigin(0.5);
    quickStartButton.add(quickStartText);

    quickStartBg.on('pointerdown', () => {
      this.sound.play(GameConfig.AUDIO.CLICK);
      this.quickStart();
    });

    quickStartBg.on('pointerover', () => quickStartBg.setScale(1.05));
    quickStartBg.on('pointerout', () => quickStartBg.setScale(1));

    this.mainContainer.add(quickStartButton);
  }

  private createGameMode(
    x: number,
    y: number,
    title: string,
    subtitle: string,
    color: number,
    type: RoomType
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 模式背景
    const bg = this.add.rectangle(0, 0, 180, 200, color, 0.9);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // 图标（临时用形状代替）
    const icon = this.add.circle(0, -40, 40, 0xffffff, 0.3);
    container.add(icon);

    // 标题
    const titleText = this.add.text(0, 20, title, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    titleText.setOrigin(0.5);
    container.add(titleText);

    // 副标题
    const subtitleText = this.add.text(0, 50, subtitle, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#e0e0e0',
    });
    subtitleText.setOrigin(0.5);
    container.add(subtitleText);

    // 点击事件
    bg.on('pointerdown', () => {
      this.sound.play(GameConfig.AUDIO.CLICK);
      this.enterGameMode(type);
    });

    // 悬停效果
    bg.on('pointerover', () => {
      bg.setScale(1.05);
      bg.setAlpha(1);
    });
    bg.on('pointerout', () => {
      bg.setScale(1);
      bg.setAlpha(0.9);
    });

    return container;
  }

  private createNavBar(): void {
    const { width, height } = this.cameras.main;
    const navHeight = 100;
    this.navContainer = this.add.container(0, height - navHeight);

    // 导航栏背景
    const navBg = this.add.rectangle(0, 0, width, navHeight, 0x1a1a1a);
    navBg.setOrigin(0, 0);
    this.navContainer.add(navBg);

    // 导航项
    const navItems = [
      { text: '大厅', icon: '🏠', active: true },
      { text: '赛事', icon: '🏆', active: false },
      { text: '俱乐部', icon: '👥', active: false },
      { text: '商城', icon: '🛍️', active: false },
      { text: '我的', icon: '👤', active: false },
    ];

    const itemWidth = width / navItems.length;

    navItems.forEach((item, index) => {
      const itemContainer = this.add.container(itemWidth * index + itemWidth / 2, navHeight / 2);

      // 图标
      const icon = this.add.text(0, -15, item.icon, {
        fontSize: '28px',
        fontFamily: 'Arial',
      });
      icon.setOrigin(0.5);
      itemContainer.add(icon);

      // 文字
      const text = this.add.text(0, 20, item.text, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: item.active ? '#4CAF50' : '#999999',
      });
      text.setOrigin(0.5);
      itemContainer.add(text);

      // 点击区域
      const hitArea = this.add.rectangle(0, 0, itemWidth, navHeight, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      itemContainer.add(hitArea);

      hitArea.on('pointerdown', () => {
        this.sound.play(GameConfig.AUDIO.CLICK);
        this.handleNavClick(item.text);
      });

      this.navContainer.add(itemContainer);
    });
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  private enterGameMode(type: RoomType): void {
    // TODO: 根据游戏模式进入不同的房间选择界面
    console.log('Entering game mode:', type);
    // 暂时直接进入游戏场景
    this.scene.start(GameConfig.SCENES.GAME, { roomType: type });
  }

  private quickStart(): void {
    // 快速开始，自动匹配合适的房间
    this.scene.start(GameConfig.SCENES.GAME, { roomType: RoomType.NORMAL, quickStart: true });
  }

  private handleNavClick(item: string): void {
    switch (item) {
      case '大厅':
        // 已经在大厅
        break;
      case '赛事':
        console.log('赛事功能开发中');
        break;
      case '俱乐部':
        console.log('俱乐部功能开发中');
        break;
      case '商城':
        console.log('商城功能开发中');
        break;
      case '我的':
        console.log('个人中心功能开发中');
        break;
    }
  }
} 