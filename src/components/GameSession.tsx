import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RefreshCw, Star, Lock, ArrowLeft } from 'lucide-react';
import { LEVELS } from '../levels';
import type { Level, Position } from '../levels';
import { getMovesInfoWord, getImproveScoresText, LOCALES } from '../locales';
import type { Lang } from '../locales';
import { SOUNDS, playSound } from '../types';
import type { ThemeParams, GameView } from '../types';

const WALL_COLOR = 'bg-zinc-800 border-zinc-700 shadow-[inset_0_-4px_0_rgba(0,0,0,0.6)]';
const PLAYER_COLOR = 'bg-accent-400 shadow-[0_0_25px_rgba(var(--accent-rgb),0.8)]';
const TARGET_COLOR = 'bg-rose-500 shadow-[0_0_25px_rgba(244,63,113,0.6)] border-rose-300';

interface GameSessionProps {
  level: Level;
  currentLevelIdx: number;
  setCurrentLevelIdx: React.Dispatch<React.SetStateAction<number>>;
  setView: (view: GameView) => void;
  bestScores: Record<number, number>;
  setBestScores: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  lang: Lang;
  theme: ThemeParams;
}

export default function GameSession({
                                      level,
                                      currentLevelIdx,
                                      setCurrentLevelIdx,
                                      setView,
                                      bestScores,
                                      setBestScores,
                                      lang,
                                    }: GameSessionProps) {
  const t = LOCALES[lang];

  const [playerPos, setPlayerPos] = useState<Position>(level.start);
  type HistoryItem = { pos: Position; passedCells: Position[] };
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [visits, setVisits] = useState<Record<string, number>>({ [`${level.start.x},${level.start.y}`]: 1 });
  const isMovingRef = useRef(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{x: number; y: number} | null>(null);

  // @ts-expect-error for nodejs support
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Level unlocking logic
  const UNLOCK_CHUNK_SIZE = 4;
  const SCORE_LEEWAY_PER_LEVEL = 10;

  const isLevelUnlocked = useCallback((idx: number) => {
    if (idx < UNLOCK_CHUNK_SIZE) return true;
    const chunkIdx = Math.floor(idx / UNLOCK_CHUNK_SIZE);
    const prevChunkStart = (chunkIdx - 1) * UNLOCK_CHUNK_SIZE;
    const prevChunkEnd = chunkIdx * UNLOCK_CHUNK_SIZE;

    let totalMinMoves = 0;
    let actualMoves = 0;
    for (let i = prevChunkStart; i < prevChunkEnd; i++) {
      if (!LEVELS[i]) continue;
      const best = bestScores[LEVELS[i].id];
      if (!best) return false;
      totalMinMoves += LEVELS[i].minMoves;
      actualMoves += best;
    }
    const maxAllowed = totalMinMoves + (prevChunkEnd - prevChunkStart) * SCORE_LEEWAY_PER_LEVEL;
    return actualMoves <= maxAllowed;
  }, [bestScores]);

  const triggerShake = () => {
    setShake(true);
    const timeout = setTimeout(() => setShake(false), 200);
    return () => clearTimeout(timeout);
  };

  // Memoize walls for O(1) checks
  const wallsSet = useMemo(() => {
    const set = new Set<string>();
    level.walls.forEach(w => set.add(`${w.x},${w.y}`));
    return set;
  }, [level.walls]);

  const isWall = useCallback((x: number, y: number) => {
    if (x < 0 || x >= level.gridSize.width || y < 0 || y >= level.gridSize.height) return true;
    return wallsSet.has(`${x},${y}`);
  }, [level.gridSize, wallsSet]);

  const move = useCallback((dx: number, dy: number) => {
    if (isMovingRef.current || levelComplete) return;

    let curX = playerPos.x;
    let curY = playerPos.y;

    let traveled = false;
    let bumped = false;
    const passedCells: Position[] = [];

    while (true) {
      const nx = curX + dx;
      const ny = curY + dy;
      if (isWall(nx, ny)) {
        bumped = true;
        break;
      }

      curX = nx;
      curY = ny;
      traveled = true;
      passedCells.push({x: curX, y: curY});
    }

    if (!traveled && bumped) {
      triggerShake();
    }

    if (traveled) {
      setHistory(prev => [...prev, {pos: playerPos, passedCells}]);
      setPlayerPos({ x: curX, y: curY });
      setVisits(prev => {
        const next = {...prev};
        passedCells.forEach(c => {
          const key = `${c.x},${c.y}`;
          next[key] = (next[key] || 0) + 1;
        });
        return next;
      });
      isMovingRef.current = true;
      setIsMoving(true);
      playSound(SOUNDS.movePlayer);

      const distance = Math.max(Math.abs(curX - playerPos.x), Math.abs(curY - playerPos.y));
      const duration = Math.min(150 + distance * 30, 400);

      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = setTimeout(() => {
        isMovingRef.current = false;
        setIsMoving(false);
        if (bumped) triggerShake();

        if (curX === level.target.x && curY === level.target.y) {
          setLevelComplete(true);
          const currentMoves = history.length + 1;
          setBestScores(prev => {
            const oldBest = prev[level.id];
            const isNewBest = !oldBest || currentMoves < oldBest;
            if (isNewBest) playSound(SOUNDS.winBestScore);
            else playSound(SOUNDS.winLevel);

            return {
              ...prev,
              [level.id]: oldBest ? Math.min(oldBest, currentMoves) : currentMoves
            };
          });
        }
      }, duration);
    }
  }, [playerPos, isWall, history.length, levelComplete, level, setBestScores]);

  const undo = () => {
    if (isMovingRef.current || levelComplete || history.length === 0) return;
    const newHistory = [...history];
    const prev = newHistory.pop()!;
    setHistory(newHistory);
    setPlayerPos(prev.pos);
    setVisits(prevVisits => {
      const next = {...prevVisits};
      prev.passedCells.forEach(c => {
        const key = `${c.x},${c.y}`;
        if (next[key]) {
          next[key]--;
        }
      });
      return next;
    });
  };

  const restart = () => {
    if (isMovingRef.current) return;
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = null;
    }
    playSound(SOUNDS.restartGame);
    setPlayerPos(level.start);
    setHistory([]);
    setVisits({ [`${level.start.x},${level.start.y}`]: 1 });
    setLevelComplete(false);
    isMovingRef.current = false;
    setIsMoving(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          move(0, -1); break;
        case 'ArrowDown':
        case 's':
        case 'S':
          move(0, 1); break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          move(-1, 0); break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          move(1, 0); break;
        case 'z':
        case 'Z':
        case 'Backspace':
          if (e.ctrlKey || e.metaKey || e.key === 'z') undo();
          break;
        case 'r':
        case 'R':
          restart(); break;
        case 'Escape':
          setView('menu'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, undo, restart, setView]);

  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    };
  }, []);

  // Touch handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) move(dx > 0 ? 1 : -1, 0);
    } else {
      if (Math.abs(dy) > 30) move(0, dy > 0 ? 1 : -1);
    }
    setTouchStart(null);
  };

  // Track window dimensions React-style with simple debounce to avoid Layout Thrashing
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 375,
    height: typeof window !== 'undefined' ? window.innerHeight : 667,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timeoutId: number;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const isMobile = windowSize.width < 768;
  const gridGap = isMobile ? 6 : 8;

  const cellSize = useMemo(() => {
    if (!level) return 40;
    const padding = isMobile ? 24 : 32;
    const availableWidth = windowSize.width - 32 - padding;
    const availableHeight = windowSize.height - (isMobile ? 380 : 300);

    return Math.min(
      60,
      Math.floor((availableWidth - gridGap * (level.gridSize.width - 1)) / level.gridSize.width),
      Math.floor((availableHeight - gridGap * (level.gridSize.height - 1)) / level.gridSize.height)
    );
  }, [level, windowSize.width, windowSize.height, isMobile, gridGap]);

  const renderStars = (moves: number, minMoves: number) => {
    const stars = moves <= minMoves ? 3 : moves <= minMoves + 2 ? 2 : 1;
    return (
      <div className="flex gap-1 justify-center mt-3">
        {[1, 2, 3].map(i => (
          <Star key={i} className={`w-6 h-6 ${i <= stars ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
        ))}
      </div>
    );
  };

  // derived state for checks
  const nextLevelIdx = currentLevelIdx + 1;
  const isNextUnlocked = isLevelUnlocked(nextLevelIdx);
  const neededChunkIdx = Math.floor(nextLevelIdx / UNLOCK_CHUNK_SIZE);
  const neededChunkStart = (neededChunkIdx - 1) * UNLOCK_CHUNK_SIZE;
  const neededChunkEnd = neededChunkIdx * UNLOCK_CHUNK_SIZE;
  const neededChunkMaxMoves = useMemo(() => {
    let total = 0;
    for (let i = neededChunkStart; i < neededChunkEnd; i++) if (LEVELS[i]) total += LEVELS[i].minMoves;
    return total + (neededChunkEnd - neededChunkStart) * SCORE_LEEWAY_PER_LEVEL;
  }, [neededChunkStart, neededChunkEnd]);

  return (
    <div
      className="w-full flex flex-col items-center justify-center flex-1 h-full relative z-10 touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-10 max-w-5xl mx-auto right-0">
        <button onClick={() => setView('menu')} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-4">
          <button
            onClick={undo}
            disabled={history.length === 0 || isMoving || levelComplete}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={restart}
            disabled={history.length === 0 && !levelComplete}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mb-4 mt-10 md:mt-12 md:mb-6 flex flex-col items-center gap-2 text-center">
        <div className="font-mono text-sm tracking-widest text-zinc-400 uppercase">
          {t.sector} <span className="text-white font-bold ml-1">{currentLevelIdx + 1}</span>
        </div>

        <div className="flex gap-6 items-center bg-zinc-950 border border-zinc-800/80 px-8 py-3 rounded-2xl shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t.movesCap}</span>
            <span className="font-mono text-2xl text-accent-400 font-black">{history.length}</span>
          </div>
          <div className="w-px h-10 bg-zinc-800" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t.targetMode}</span>
            <span className="font-mono text-2xl text-zinc-300 font-bold">{level.minMoves}</span>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <motion.div
        animate={{
          x: shake ? [-3, 3, -2, 2, 0] : 0,
          y: shake ? [-1, 1, -1, 1, 0] : 0
        }}
        transition={{ duration: 0.2 }}
        ref={containerRef}
        className={`relative bg-zinc-950 p-3 md:p-4 rounded-3xl ring-1 ring-zinc-800 touch-none select-none max-w-full overflow-hidden shadow-2xl transform-gpu transition-shadow duration-300 ${
          isMoving
            ? 'shadow-[0_20px_60px_-15px_rgba(var(--accent-rgb),0.35)]'
            : 'shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div
          className="relative grid gap-1.5 md:gap-2 transform-gpu"
          style={{
            gridTemplateColumns: `repeat(${level.gridSize.width}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${level.gridSize.height}, ${cellSize}px)`,
          }}
        >
          {Array.from({ length: level.gridSize.width * level.gridSize.height }).map((_, i) => {
            const x = i % level.gridSize.width;
            const y = Math.floor(i / level.gridSize.width);

            const isWallCell = wallsSet.has(`${x},${y}`);
            const isTarget = level.target.x === x && level.target.y === y;
            const visitCount = visits[`${x},${y}`] || 0;

            let emptyClass = 'bg-zinc-950 border-zinc-900';
            if (visitCount === 1) emptyClass = 'bg-zinc-900 border-zinc-800';
            else if (visitCount === 2) emptyClass = 'bg-accent-950/20 border-accent-900/30';
            else if (visitCount >= 3) emptyClass = 'bg-accent-900/30 border-accent-800/40';

            return (
              <div
                key={i}
                className={`flex items-center justify-center relative rounded-xl border-2 transition-colors duration-300 transform-gpu ${
                  isWallCell ? WALL_COLOR :
                    emptyClass
                }`}
              >
                {visitCount > 0 && !isWallCell && (
                  <>
                    <div className="absolute w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-accent-400 shadow-[0_0_15px_rgba(var(--accent-rgb),1)] transform-gpu" style={{ opacity: Math.min(0.2 + visitCount * 0.1, 0.7) }} />
                    <div className="absolute inset-0 bg-accent-500/10 rounded-xl transform-gpu" style={{ opacity: Math.min(0.05 + visitCount * 0.05, 0.3) }} />
                  </>
                )}
                {isTarget && (
                  <div className={`absolute inset-[30%] rounded-full border-4 ${TARGET_COLOR} animate-[spin_3s_linear_infinite] transform-gpu`} style={{ borderStyle: 'dashed' }} />
                )}
              </div>
            );
          })}

          {/* Player */}
          <motion.div
            initial={false}
            animate={{
              x: playerPos.x * (cellSize + gridGap),
              y: playerPos.y * (cellSize + gridGap),
              scale: levelComplete ? 0 : 1
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              mass: 0.8
            }}
            className="absolute top-0 left-0 z-20 flex items-center justify-center transform-gpu"
            style={{ width: cellSize, height: cellSize }}
          >
            <motion.div
              animate={{ scale: shake ? [1, 0.8, 1.1, 1] : 1 }}
              transition={{ duration: 0.2 }}
              className={`w-[65%] h-[65%] rounded-lg ${PLAYER_COLOR} rotate-45 flex items-center justify-center transform-gpu`}
            >
              <div className="w-1/2 h-1/2 rounded-full bg-white/50 blur-[2px]" />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Mobile controls */}
      <div className="mt-4 flex flex-col items-center gap-2 md:hidden">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-mono opacity-85 select-none pointer-events-none">
          {t.swipeHint}
        </span>
        <div className="grid grid-cols-3 gap-1.5 w-36 justify-center items-center select-none">
          <div></div>
          <button
            onClick={() => move(0, -1)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 active:bg-accent-500 active:text-zinc-950 active:scale-90 transition-all shadow-md cursor-pointer"
            aria-label="Move Up"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <div></div>

          <button
            onClick={() => move(-1, 0)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 active:bg-accent-500 active:text-zinc-950 active:scale-90 transition-all shadow-md cursor-pointer"
            aria-label="Move Left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-11 h-11 flex items-center justify-center text-[10px] text-zinc-600 font-black font-mono tracking-widest">
            GRID
          </div>
          <button
            onClick={() => move(1, 0)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 active:bg-accent-500 active:text-zinc-950 active:scale-90 transition-all shadow-md cursor-pointer"
            aria-label="Move Right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div></div>
          <button
            onClick={() => move(0, 1)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 active:bg-accent-500 active:text-zinc-950 active:scale-90 transition-all shadow-md cursor-pointer"
            aria-label="Move Down"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <div></div>
        </div>
      </div>

      {/* Completion Overlay */}
      <AnimatePresence>
        {levelComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl w-full max-w-sm"
            >
              <div className="w-16 h-16 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 mb-2 shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="text-center w-full">
                <h2 className="text-2xl font-black text-white tracking-widest mb-2 uppercase">{t.levelComplete}</h2>
                <p className="text-zinc-400 font-mono text-sm">
                  {t.nodesConnected} <span className="text-accent-400 font-bold">{history.length}</span> {getMovesInfoWord(history.length, lang)}
                </p>
                {renderStars(history.length, level.minMoves)}
              </div>

              <div className="w-full mt-2">
                {currentLevelIdx < LEVELS.length - 1 ? (
                  isNextUnlocked ? (
                    <button
                      onClick={() => {
                        playSound(SOUNDS.nextLevel);
                        setCurrentLevelIdx(i => i + 1);
                      }}
                      className="w-full py-4 px-6 bg-accent-500 hover:bg-accent-400 text-zinc-950 font-bold rounded-xl tracking-widest transition-transform hover:scale-105 active:scale-95"
                    >
                      {t.nextLevel}
                    </button>
                  ) : (
                    <div className="text-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <p className="text-amber-400 text-sm font-bold flex items-center justify-center gap-2 mb-2 tracking-widest">
                        <Lock className="w-4 h-4" /> {t.sectorLocked}
                      </p>
                      <p className="text-xs text-zinc-500 mb-4 px-2">
                        {getImproveScoresText(neededChunkMaxMoves, `${neededChunkStart+1}-${neededChunkEnd}`, lang)}
                      </p>
                      <button
                        onClick={() => { setLevelComplete(false); restart(); }}
                        className="w-full py-3 px-6 bg-zinc-800 text-accent-400 hover:text-white hover:bg-zinc-700 font-bold rounded-lg tracking-widest transition-colors"
                      >
                        {t.retryLevel}
                      </button>
                    </div>
                  )
                ) : (
                  <div className="py-4 px-6 bg-zinc-800 text-accent-400 font-bold rounded-xl tracking-widest border border-accent-500/30 text-center">
                    {t.allComplete}
                  </div>
                )}

                <button
                  onClick={() => setView('select')}
                  className="w-full py-3 mt-3 text-sm font-bold text-zinc-500 hover:text-white tracking-widest uppercase transition-colors"
                >
                  {t.chooseLevel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
