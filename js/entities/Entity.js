/**
 * Entity - 遊戲中所有動態與靜態物件之基礎實體類別
 */
export class Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = width;
    this.height = height;
    this.alive = true;
  }

  /**
   * 物件邏輯更新
   * @param {number} dtFactor
   */
  update(dtFactor = 1) {
    this.x += this.vx * dtFactor;
    this.y += this.vy * dtFactor;
  }

  /**
   * 物件畫面繪製
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {}
}
