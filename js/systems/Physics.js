/**
 * Physics - 物理引擎與碰撞檢測系統
 * 負責上下邊界碰撞反彈、球拍反射計算與出界判定
 */
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BALL_SIZE,
  BALL_HIT_SPEED_CAP,
  BONUS_BALL_LIFETIME
} from '../config.js';

export class Physics {
  /**
   * 處理球體與上下邊界的碰撞反彈
   * @param {Ball} ball
   * @param {ParticleSystem} particleSystem
   * @param {AudioSystem} audioSystem
   */
  static resolveWallBounce(ball, particleSystem, audioSystem) {
    const half = (ball.size || BALL_SIZE) / 2;

    if (ball.y - half <= 0) {
      ball.y = half;
      ball.vy *= -1;
      particleSystem.triggerWallFlash(ball.x, true);
      audioSystem.playWallHitSound();
    } else if (ball.y + half >= CANVAS_HEIGHT) {
      ball.y = CANVAS_HEIGHT - half;
      ball.vy *= -1;
      particleSystem.triggerWallFlash(ball.x, false);
      audioSystem.playWallHitSound();
    }
  }

  /**
   * 處理球體與球拍（含技能放大/飛行/旋轉外框）的碰撞與動量角反射
   * @param {Ball} ball
   * @param {Object} rect - { x, y, w, h }
   */
  static resolvePaddleHit(ball, rect) {
    const half = (ball.size || BALL_SIZE) / 2;
    const ballLeft = ball.x - half;
    const ballRight = ball.x + half;
    const ballTop = ball.y - half;
    const ballBottom = ball.y + half;

    // AABB 初篩
    if (ballRight < rect.x || ballLeft > rect.x + rect.w) return false;
    if (ballBottom < rect.y || ballTop > rect.y + rect.h) return false;

    const rectCenterX = rect.x + rect.w / 2;
    const approachFromLeft = ball.x < rectCenterX && ball.vx > 0;
    const approachFromRight = ball.x >= rectCenterX && ball.vx < 0;

    if (!approachFromLeft && !approachFromRight) return false;

    // 依擊中球拍之相對高度計算反彈仰角與速度微幅增益
    const hitPos = (ball.y - (rect.y + rect.h / 2)) / (rect.h / 2); // -1 ~ 1
    const speed = Math.min(BALL_HIT_SPEED_CAP, Math.hypot(ball.vx, ball.vy) * 1.06);
    const angle = Math.max(-0.85, Math.min(0.85, hitPos * 0.7));

    if (approachFromLeft) {
      ball.x = rect.x - half;
      ball.vx = -Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
    } else {
      ball.x = rect.x + rect.w + half;
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
    }

    return true;
  }

  /**
   * 檢測球體是否出界或砲彈存活逾時
   * @param {Ball} ball
   * @param {number} now
   * @returns {'left' | 'right' | 'expired' | 'inBounds'}
   */
  static checkBallStatus(ball, now = performance.now()) {
    const half = (ball.size || BALL_SIZE) / 2;

    if (ball.type === 'bonus' && (now - ball.spawnTime > BONUS_BALL_LIFETIME)) {
      return 'expired';
    }

    if (ball.x < -half) {
      return 'left';
    }

    if (ball.x > CANVAS_WIDTH + half) {
      return 'right';
    }

    return 'inBounds';
  }

  /**
   * 平滑插值推進領地邊界
   * @param {number} currentBoundaryX
   * @param {number} targetBoundaryX
   * @param {number} dtFactor
   * @returns {number}
   */
  static updateBoundary(currentBoundaryX, targetBoundaryX, dtFactor = 1) {
    const factor = 1 - Math.pow(1 - 0.08, dtFactor);
    return currentBoundaryX + (targetBoundaryX - currentBoundaryX) * factor;
  }
}
