/**
 * HUD - 遊戲介面系統，負責 HTML DOM 狀態同步、Canvas 遊戲內血條與全螢幕覆蓋面板繪製
 */
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BASE_HP,
  TERRITORY_HP_MAX,
  DIFFICULTY_LABELS
} from '../config.js';

export class HUD {
  constructor() {
    this.scoreLeftEl = document.getElementById('scoreLeft');
    this.scoreRightEl = document.getElementById('scoreRight');
    this.highScoreEl = document.getElementById('highScore');
  }

  /**
   * 更新頂部 HTML HUD 資訊
   * @param {number} blueHp
   * @param {number} redHp
   * @param {number} unitCount
   */
  updateDOM(blueHp, redHp, unitCount) {
    if (this.scoreLeftEl) {
      this.scoreLeftEl.textContent = `藍方主堡: ${Math.max(0, Math.round(blueHp))}/${BASE_HP}`;
    }
    if (this.scoreRightEl) {
      this.scoreRightEl.textContent = `紅方主堡: ${Math.max(0, Math.round(redHp))}/${BASE_HP}`;
    }
    if (this.highScoreEl) {
      this.highScoreEl.textContent = `場上單位: ${unitCount}`;
    }
  }

  /**
   * 繪製領地邊界兩側的領地抵抗血條
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} boundaryX
   * @param {number} blueTerritoryHp
   * @param {number} redTerritoryHp
   */
  renderTerritoryHealthBars(ctx, boundaryX, blueTerritoryHp, redTerritoryHp) {
    const barW = 70;
    const barH = 6;
    const y = 42;
    const blueRatio = Math.max(0, blueTerritoryHp / TERRITORY_HP_MAX);
    const redRatio = Math.max(0, redTerritoryHp / TERRITORY_HP_MAX);

    // 藍方領地血量（畫在邊界左側）
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(boundaryX - barW - 6, y, barW, barH);
    ctx.fillStyle = '#4db8ff';
    ctx.fillRect(boundaryX - barW - 6, y, barW * blueRatio, barH);

    // 紅方領地血量（畫在邊界右側）
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(boundaryX + 6, y, barW, barH);
    ctx.fillStyle = '#ff5b5b';
    ctx.fillRect(boundaryX + 6, y, barW * redRatio, barH);
  }

  /**
   * 繪製 Canvas 頂部狀態文字（技能冷卻、球速倍率、電腦難度）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} info
   */
  renderInGameHUD(ctx, { blueSkillText, redSkillText, speedFactor, mode, difficulty }) {
    ctx.font = '13px "Courier New", monospace';

    // 藍方技能
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4db8ff';
    ctx.fillText(`E 技能: ${blueSkillText}`, 10, 20);

    // 紅方技能
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff5b5b';
    ctx.fillText(`L 技能: ${redSkillText}`, CANVAS_WIDTH - 10, 20);

    // 球速倍率
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`球速 x${speedFactor.toFixed(2)}`, CANVAS_WIDTH / 2, 20);

    // 單人模式難度顯示
    if (mode === '1P') {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(`電腦難度: ${DIFFICULTY_LABELS[difficulty]}`, CANVAS_WIDTH - 10, 38);
    }

    ctx.textAlign = 'left';
  }

  /**
   * 繪製半透明全螢幕文字覆蓋層（開始畫面、結算畫面）
   * @param {CanvasRenderingContext2D} ctx
   * @param {string[]} lines
   */
  renderOverlay(ctx, lines) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#0f0';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#0f0';
    ctx.shadowBlur = 6;

    const startY = CANVAS_HEIGHT / 2 - (lines.length * 28) / 2;
    lines.forEach((line, i) => {
      if (i === 0) {
        ctx.font = 'bold 42px "Courier New", monospace';
      } else {
        ctx.font = '18px "Courier New", monospace';
      }
      ctx.fillText(line, CANVAS_WIDTH / 2, startY + i * 32);
    });

    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }
}
