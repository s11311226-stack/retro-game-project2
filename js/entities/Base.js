/**
 * Base - 雙方陣營主堡實體，具有 1500 HP 與血條顯示
 */
import { Entity } from './Entity.js';
import { BASE_HP, BASE_SIZE } from '../config.js';

export class Base extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} side - 'blue' | 'red'
   */
  constructor(x, y, side) {
    super(x, y, BASE_SIZE, BASE_SIZE);
    this.side = side;
    this.hp = BASE_HP;
    this.maxHp = BASE_HP;
  }

  reset() {
    this.hp = BASE_HP;
    this.alive = true;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  /**
   * 繪製主堡幾何本體與上方血條
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const color = this.side === 'blue' ? '#4db8ff' : '#ff5b5b';
    const hpRatio = Math.max(0, this.hp / this.maxHp);

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillRect(this.x - BASE_SIZE / 2, this.y - BASE_SIZE / 2, BASE_SIZE, BASE_SIZE);
    ctx.shadowBlur = 0;

    const barW = BASE_SIZE + 14;
    const barX = this.x - barW / 2;
    const barY = this.y - BASE_SIZE / 2 - 14;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barW * hpRatio, 5);
  }
}
