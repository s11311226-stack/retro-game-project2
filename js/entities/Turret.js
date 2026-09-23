/**
 * Turret - 陣營砲台實體，維護存活狀態、領地淹沒檢測與爆炸光圈特效
 */
import { Entity } from './Entity.js';
import { TURRET_SIZE } from '../config.js';

export class Turret extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} side - 'blue' | 'red'
   */
  constructor(x, y, side) {
    super(x, y, TURRET_SIZE, TURRET_SIZE);
    this.side = side;
    this.alive = true;
    this.destroyedAt = null;
  }

  /**
   * 檢查是否被敵方推進的領地邊界淹沒
   * @param {number} boundaryX
   * @param {number} now
   */
  checkSubmerged(boundaryX, now = performance.now()) {
    if (!this.alive) return;

    if (this.side === 'blue' && boundaryX < this.x) {
      this.alive = false;
      this.destroyedAt = now;
    } else if (this.side === 'red' && boundaryX > this.x) {
      this.alive = false;
      this.destroyedAt = now;
    }
  }

  /**
   * 繪製砲台與自毀動畫
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} now
   */
  render(ctx, now = performance.now()) {
    if (this.alive) {
      const color = this.side === 'blue' ? '#4db8ff' : '#ff5b5b';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - TURRET_SIZE / 2);
      ctx.lineTo(this.x + TURRET_SIZE / 2, this.y + TURRET_SIZE / 2);
      ctx.lineTo(this.x - TURRET_SIZE / 2, this.y + TURRET_SIZE / 2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.destroyedAt !== null && now - this.destroyedAt < 400) {
      const p = (now - this.destroyedAt) / 400;
      ctx.strokeStyle = `rgba(255,190,60,${(1 - p).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, TURRET_SIZE / 2 + p * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
}
