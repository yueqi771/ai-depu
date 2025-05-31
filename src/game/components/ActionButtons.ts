import Phaser from 'phaser';
import { PlayerAction } from '../../types';

export class ActionButtons {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private onActionCallback: (action: PlayerAction, betAmount?: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, callback: (action: PlayerAction, betAmount?: number) => void) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.onActionCallback = callback;
    this.createButtons();
    this.container.setVisible(false); // 初始隐藏
  }

  // 创建按钮
  private createButtons(): void {
    const buttonWidth = 120;
    const buttonSpacing = 20;

    // 弃牌按钮
    const foldButton = this.createActionButton(
      -(buttonWidth + buttonSpacing) * 1.5,
      0,
      '弃牌',
      0xff4444,
      () => this.onActionCallback(PlayerAction.FOLD)
    );
    this.container.add(foldButton);

    // 跟注按钮
    const callButton = this.createActionButton(
      -(buttonWidth + buttonSpacing) * 0.5,
      0,
      '跟注',
      0x4444ff,
      () => this.onActionCallback(PlayerAction.CALL)
    );
    this.container.add(callButton);

    // 加注按钮
    const raiseButton = this.createActionButton(
      (buttonWidth + buttonSpacing) * 0.5,
      0,
      '加注',
      0xff8800,
      () => this.onActionCallback(PlayerAction.RAISE)
    );
    this.container.add(raiseButton);

    // 全下按钮
    const allInButton = this.createActionButton(
      (buttonWidth + buttonSpacing) * 1.5,
      0,
      '全下',
      0xff0088,
      () => this.onActionCallback(PlayerAction.ALL_IN)
    );
    this.container.add(allInButton);
  }

  // 创建单个按钮
  private createActionButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, 120, 50, color);
    bg.setInteractive({ useHandCursor: true });
    button.add(bg);

    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5);
    button.add(buttonText);

    bg.on('pointerdown', () => {
      // 播放点击音效
      if (this.scene.sound.get('click')) {
        this.scene.sound.play('click');
      }
      callback();
    });

    bg.on('pointerover', () => bg.setScale(1.05));
    bg.on('pointerout', () => bg.setScale(1));

    return button;
  }

  // 显示操作按钮
  public show(canCheck: boolean, callAmount: number, playerChips: number, minBet: number): void {
    console.log(`ActionButtons.show: canCheck=${canCheck}, callAmount=${callAmount}, playerChips=${playerChips}, minBet=${minBet}`);
    this.container.setVisible(true);
    this.updateButtonStates(canCheck, callAmount, playerChips, minBet);
  }

  // 隐藏操作按钮
  public hide(): void {
    console.log('ActionButtons.hide');
    this.container.setVisible(false);
  }

  // 更新按钮状态
  private updateButtonStates(canCheck: boolean, callAmount: number, playerChips: number, minBet: number): void {
    const buttons = this.container.getAll();

    // 跟注/看牌按钮
    const callButton = buttons[1] as Phaser.GameObjects.Container;
    const callText = callButton.getAt(1) as Phaser.GameObjects.Text;

    if (canCheck) {
      callText.setText('看牌');
    } else {
      callText.setText(`跟注 ${callAmount}`);
    }

    // 如果玩家筹码不足以跟注，禁用跟注按钮
    if (playerChips < callAmount) {
      callButton.setAlpha(0.5);
      (callButton.getAt(0) as Phaser.GameObjects.Rectangle).disableInteractive();
    } else {
      callButton.setAlpha(1);
      (callButton.getAt(0) as Phaser.GameObjects.Rectangle).setInteractive({ useHandCursor: true });
    }

    // 加注按钮
    const raiseButton = buttons[2] as Phaser.GameObjects.Container;

    // 如果玩家筹码不足以加注，禁用加注按钮
    if (playerChips <= callAmount || playerChips <= minBet) {
      raiseButton.setAlpha(0.5);
      (raiseButton.getAt(0) as Phaser.GameObjects.Rectangle).disableInteractive();
    } else {
      raiseButton.setAlpha(1);
      (raiseButton.getAt(0) as Phaser.GameObjects.Rectangle).setInteractive({ useHandCursor: true });
    }

    // 全下按钮
    const allInButton = buttons[3] as Phaser.GameObjects.Container;

    // 如果玩家筹码为0，禁用全下按钮
    if (playerChips === 0) {
      allInButton.setAlpha(0.5);
      (allInButton.getAt(0) as Phaser.GameObjects.Rectangle).disableInteractive();
    } else {
      allInButton.setAlpha(1);
      (allInButton.getAt(0) as Phaser.GameObjects.Rectangle).setInteractive({ useHandCursor: true });
    }

    console.log('按钮状态已更新');
  }

  // 获取容器
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}