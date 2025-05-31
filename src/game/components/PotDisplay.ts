import Phaser from 'phaser';

export class PotDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private potAmount: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.createBackground();
  }

  // 创建背景
  private createBackground(): void {
    // 底池背景
    const potBg = this.scene.add.graphics();
    potBg.fillStyle(0x000000, 0.7);
    potBg.fillRoundedRect(-80, -25, 160, 50, 25);
    this.container.add(potBg);

    // 底池图标
    const potIcon = this.scene.add.circle(-50, 0, 15, 0xffcc00);
    this.container.add(potIcon);

    // 底池金额
    const potText = this.scene.add.text(0, 0, `底池: ${this.formatChips(this.potAmount)}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    potText.setOrigin(0.5);
    this.container.add(potText);
  }

  // 更新底池金额
  public updatePot(amount: number): void {
    this.potAmount = amount;
    this.updateDisplay();
  }

  // 更新显示
  private updateDisplay(): void {
    this.container.removeAll(true);
    this.createBackground();
  }

  // 格式化筹码数量
  private formatChips(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
  }

  // 获取容器
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  // 获取底池金额
  public getPotAmount(): number {
    return this.potAmount;
  }
}