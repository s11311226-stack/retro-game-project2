/**
 * InputHandler - 集中監聽鍵盤與滑鼠事件，提供狀態查詢與事件回呼機制
 */
import { CANVAS_HEIGHT } from '../config.js';

export class InputHandler {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouseActive = false;
    this.mouseY = CANVAS_HEIGHT / 2;

    // 回呼字典
    this.actionListeners = new Map();

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);

    this.init();
  }

  init() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
  }

  /**
   * 註冊按鍵單次觸發監聽
   * @param {string|string[]} keys - 欲監聽的按鍵鍵名（如 ' ', 'e', ['1', '2']）
   * @param {Function} callback - 觸發時執行的回呼
   */
  onAction(keys, callback) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      if (!this.actionListeners.has(k)) {
        this.actionListeners.set(k, []);
      }
      this.actionListeners.get(k).push(callback);
    }
  }

  onKeyDown(e) {
    this.keys[e.key] = true;

    if (e.key === ' ') {
      e.preventDefault();
    }

    if (this.actionListeners.has(e.key)) {
      for (const cb of this.actionListeners.get(e.key)) {
        cb(e);
      }
    }
  }

  onKeyUp(e) {
    this.keys[e.key] = false;
  }

  onMouseMove(e) {
    this.mouseActive = true;
    const rect = this.canvas.getBoundingClientRect();
    const scaleY = CANVAS_HEIGHT / rect.height;
    this.mouseY = (e.clientY - rect.top) * scaleY;
  }

  onMouseLeave() {
    this.mouseActive = false;
  }

  isKeyDown(key) {
    return !!this.keys[key];
  }

  isMouseActive() {
    return this.mouseActive;
  }

  getMouseY() {
    return this.mouseY;
  }
}
