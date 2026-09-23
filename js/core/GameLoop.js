/**
 * GameLoop - 封裝 requestAnimationFrame，提供精確 Delta Time 計算與生命週期管理
 */
export class GameLoop {
  /**
   * @param {Function} updateFn - 每幀更新函式 update(dtFactor, dt, timestamp)
   * @param {Function} renderFn - 每幀繪製函式 render(timestamp)
   */
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.lastTime = 0;
    this.isRunning = false;
    this.rafId = null;

    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // 防止分頁失焦或卡頓導致 dt 過大造成物理穿牆（上限限制為 100ms）
    const clampedDt = Math.min(dt, 100);
    // 以 60 FPS (16.667ms) 為基準計算正規化步進倍率
    const dtFactor = clampedDt / (1000 / 60);

    if (this.updateFn) {
      this.updateFn(dtFactor, clampedDt, timestamp);
    }

    if (this.renderFn) {
      this.renderFn(timestamp);
    }

    this.rafId = requestAnimationFrame(this.loop);
  }
}
