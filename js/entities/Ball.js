/**
 * Ball - 球體實體，支援一般球、分身球、砲彈與特殊召喚球（紫球/黃金球）
 */
import { Entity } from './Entity.js';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BALL_SIZE,
  BALL_BASE_SPEED,
  GOLDEN_BALL_COLOR
} from '../config.js';

export class Ball extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} vx
   * @param {number} vy
   * @param {Object} options
   */
  constructor(x, y, vx, vy, options = {}) {
    const size = options.size || BALL_SIZE;
    super(x, y, size, size);

    this.vx = vx;
    this.vy = vy;
    this.type = options.type || 'main'; // 'main' | 'bonus' | 'purple' | 'golden'
    this.color = options.color || '#fff';
    this.size = size;
    this.isClone = !!options.isClone;
    this.spawnTime = options.spawnTime || performance.now();
  }

  /**
   * 工廠方法：隨機角度發射一般球
   * @param {number} direction - 1 (向右) 或 -1 (向左)
   * @param {number} [x]
   * @param {number} [y]
   * @param {Object} [options]
   */
  static create(direction, x = CANVAS_WIDTH / 2, y = CANVAS_HEIGHT / 2, options = {}) {
    const angle = Math.random() * 0.6 - 0.3; // -0.3 ~ 0.3 弧度
    const speed = options.speed || BALL_BASE_SPEED;
    const vx = Math.cos(angle) * speed * direction;
    const vy = Math.sin(angle) * speed;

    return new Ball(x, y, vx, vy, options);
  }

  /**
   * 移動與特殊球特效更新
   * @param {number} speedFactor
   * @param {number} dtFactor
   * @param {ParticleSystem} [particleSystem]
   */
  update(speedFactor = 1, dtFactor = 1, particleSystem = null) {
    this.x += this.vx * speedFactor * dtFactor;
    this.y += this.vy * speedFactor * dtFactor;

    // 黃金球：每幀在移動軌跡產生閃爍金光微粒
    if (this.type === 'golden' && particleSystem) {
      particleSystem.spawnGoldenTrail(this.x, this.y);
    }
  }

  /**
   * 繪製球體
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const size = this.size;
    const c = this.color;

    ctx.fillStyle = c;
    ctx.shadowColor = c;
    ctx.shadowBlur = this.type === 'golden' ? 16 : 8;
    ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
    ctx.shadowBlur = 0;
  }
}
