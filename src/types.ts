export type GameView = 'menu' | 'playing' | 'select' | 'about';

export type ThemeParams = 'green' | 'fuchsia' | 'red' | 'blue';

export const SOUNDS = {
  bgMenu: ['/assets/sounds/background-menu-1.mp3'],
  menuSelect: '/assets/sounds/select-menu-item.mp3',
  bgGame: ['/assets/sounds/background-game-2.mp3', '/assets/sounds/background-game-3.mp3', '/assets/sounds/background-menu-1.mp3'],
  startGame: '/assets/sounds/start-game.mp3',
  movePlayer: '/assets/sounds/move-player.mp3',
  winLevel: '/assets/sounds/win-level.mp3',
  winBestScore: '/assets/sounds/win-best-score.mp3',
  restartGame: '/assets/sounds/restart-game.mp3',
  nextLevel: '/assets/sounds/next-level.mp3',
};

export const playSound = (src: string) => {
  try {
    const audio = new Audio(src);
    audio.play().catch(() => {});
  } catch (e) {}
};
