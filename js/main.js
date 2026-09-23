/**
 * main.js - 應用程式進入點
 * 負責初始化核心組件、輸入監聽與啟動遊戲主迴圈
 */
import { InputHandler } from './core/InputHandler.js';
import { Game } from './core/Game.js';
import { GameLoop } from './core/GameLoop.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  if (!canvas) {
    console.error('無法找到 id 為 game 的 canvas 元素！');
    return;
  }

  // 實例化輸入控制器與遊戲主控制器
  const inputHandler = new InputHandler(canvas);
  const game = new Game(canvas, inputHandler);

  // 實例化遊戲主迴圈
  const gameLoop = new GameLoop(
    (dtFactor, dt, timestamp) => {
      game.update(dtFactor);
    },
    (timestamp) => {
      game.render();
    }
  );

  // 初始繪製並啟動迴圈
  game.render();
  gameLoop.start();
});
