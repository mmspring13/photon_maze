/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Star, Lock, Play, List, Info, ArrowLeft, Globe, Palette } from 'lucide-react';
import { LEVELS } from './levels';
import type { Level } from './levels';
import { LOCALES } from './locales';
import type { Lang } from './locales';
import GameSession from './components/GameSession';
import { SOUNDS, playSound } from './types';
import type { GameView, ThemeParams } from './types';

export default function App() {
  const [view, setView] = useState<GameView>('menu');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [bestScores, setBestScores] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('luminaBestScores');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [theme, setTheme] = useState<ThemeParams>(() => {
    try {
      const saved = localStorage.getItem('luminaTheme');
      return (saved as ThemeParams) || 'green';
    } catch {
      return 'green';
    }
  });

  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('luminaLang');
      return (saved as Lang) || 'en';
    } catch {
      return 'en';
    }
  });

  const t = LOCALES[lang];

  useEffect(() => {
    localStorage.setItem('luminaTheme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('luminaLang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('luminaBestScores', JSON.stringify(bestScores));
  }, [bestScores]);

  const bgManagerRef = useRef<{
    activeAudio: HTMLAudioElement | null;
    // @ts-expect-error NodeJS error
    interval: NodeJS.Timeout | null;
    currentType: 'menu' | 'game' | null;
  }>({
    activeAudio: null,
    interval: null,
    currentType: null
  });

  // useEffect(() => {
  //   const src = SOUNDS.bgMenu[Math.floor(Math.random() * SOUNDS.bgMenu.length)];
  //   console.log(src);
  //   playSound(src);
  // }, []);

  // Main background music logic
  useEffect(() => {
    const requiredType = (view === 'menu' || view === 'select' || view === 'about') ? 'menu' : 'game';
    const manager = bgManagerRef.current;

    const FADE_DURATION = 2000;

    const playTrack = (type: 'menu' | 'game') => {
      const srcs = type === 'menu' ? SOUNDS.bgMenu : SOUNDS.bgGame;

      let src = srcs[Math.floor(Math.random() * srcs.length)];
      // Select a different track from the current one to guarantee a fresh vibe
      if (srcs.length > 1 && manager.activeAudio && manager.activeAudio.src) {
        let attempts = 0;
        while (manager.activeAudio.src.includes(src) && attempts < 10) {
          src = srcs[Math.floor(Math.random() * srcs.length)];
          attempts++;
        }
      }

      const newAudio = new Audio(src);
      newAudio.loop = false;
      newAudio.volume = 0;
      // Automatically play next track on current track completion
      newAudio.addEventListener('ended', () => {
        if (bgManagerRef.current.currentType === type) {
          playTrack(type);
        }
      });

      const oldAudio = manager.activeAudio;
      manager.activeAudio = newAudio;
      manager.currentType = type;

      newAudio.play().catch(() => {});

      if (manager.interval) clearInterval(manager.interval);

      const steps = 20;
      const stepTime = FADE_DURATION / steps;
      let currentStep = 0;
      const startVolume = oldAudio ? oldAudio.volume : 0;

      manager.interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        newAudio.volume = Math.min(1, progress);
        if (oldAudio) {
          oldAudio.volume = Math.max(0, startVolume * (1 - progress));
        }

        if (currentStep >= steps) {
          if (manager.interval) clearInterval(manager.interval);
          if (oldAudio) {
            oldAudio.pause();
            oldAudio.src = ''; // free resources
          }
        }
      }, stepTime);
    };
    if (manager.currentType !== requiredType) {
      playTrack(requiredType);
    } else {
      playTrack('menu');
    }
  }, [view]);

  // Clean up on App unmount
  useEffect(() => {
    return () => {
      const manager = bgManagerRef.current;
      if (manager.interval) clearInterval(manager.interval);
      if (manager.activeAudio) {
        manager.activeAudio.pause();
      }
    };
  }, []);

  // Attempt to play/resume background music on any user interaction
  useEffect(() => {
    const handleInteraction = () => {
      const manager = bgManagerRef.current;
      if (manager.activeAudio && manager.activeAudio.paused) {
        manager.activeAudio.play().catch(() => {});
      }
    };

    window.addEventListener('click', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const level = LEVELS[currentLevelIdx];

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


  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 z-10 relative">
      <div className="mb-16 relative">
        <div className="absolute inset-0 bg-accent-500/20 blur-[100px] rounded-full" />
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-[0.3em] text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] relative z-10 text-center">{t.gameName}</h1>
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-accent-500 to-transparent mt-4 opacity-50 absolute left-0" />
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm relative z-10">
        {currentLevelIdx > 0 && (
          <button
            onClick={() => {
              playSound(SOUNDS.startGame);
              setView('playing');
            }}
            className="group relative overflow-hidden flex items-center justify-center gap-3 w-full py-5 px-6 bg-accent-500 text-zinc-950 font-black rounded-2xl tracking-[0.2em] transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--accent-rgb),0.5)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-500" />
            <Play className="w-6 h-6 fill-zinc-950" /> {t.continue}
          </button>
        )}

        <button
          onClick={() => { playSound(SOUNDS.menuSelect); setView('select'); }}
          className="flex items-center justify-center gap-3 w-full py-5 px-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl tracking-[0.1em] border border-zinc-800 hover:border-zinc-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <List className="w-5 h-5" /> {t.chooseLevel}
        </button>

        <button
          onClick={() => {
            playSound(SOUNDS.startGame);
            setCurrentLevelIdx(0);
            setBestScores({});
            setView('playing');
          }}
          className="flex items-center justify-center gap-3 w-full py-5 px-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl tracking-[0.1em] border border-zinc-800 hover:border-zinc-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <RotateCcw className="w-5 h-5" /> {t.newGame}
        </button>

        <button
          onClick={() => { playSound(SOUNDS.menuSelect); setView('about'); }}
          className="flex items-center justify-center gap-3 w-full py-5 px-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-2xl tracking-[0.1em] border border-zinc-800 hover:border-zinc-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Info className="w-5 h-5" /> {t.about}
        </button>

        <button
          onClick={() => {
            playSound(SOUNDS.menuSelect);
            setLang(l => l === 'en' ? 'ru' : 'en');
          }}
          className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold rounded-2xl tracking-[0.1em] border border-zinc-800 hover:border-zinc-700 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
        >
          <Globe className="w-5 h-5" /> {lang === 'en' ? "RU / EN Language" : "EN / RU Язык"}
        </button>

        <button
          onClick={() => {
            playSound(SOUNDS.menuSelect);
            const themes: ThemeParams[] = ['green', 'fuchsia', 'red', 'blue'];
            setTheme(l => themes[(themes.indexOf(l) + 1) % themes.length]);
          }}
          className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold rounded-2xl tracking-[0.1em] border border-zinc-800 hover:border-zinc-700 transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
        >
          <Palette className="w-5 h-5" /> {t.theme}: {
          theme === 'green' ? t.themeGreen :
            theme === 'fuchsia' ? t.themeFuchsia :
              theme === 'red' ? t.themeRed : t.themeBlue
        }
        </button>
      </div>
    </div>
  );

  const chunkColors = [
    { border: 'hover:border-accent-500/50', shadow: 'hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.15)]', lockText: 'text-accent-400', lockBg: 'bg-accent-500/10' },
    { border: 'hover:border-sky-500/50', shadow: 'hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]', lockText: 'text-sky-400', lockBg: 'bg-sky-500/10' },
    { border: 'hover:border-fuchsia-500/50', shadow: 'hover:shadow-[0_0_20px_rgba(217,70,239,0.15)]', lockText: 'text-fuchsia-400', lockBg: 'bg-fuchsia-500/10' },
    { border: 'hover:border-amber-500/50', shadow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]', lockText: 'text-amber-400', lockBg: 'bg-amber-500/10' },
    { border: 'hover:border-rose-500/50', shadow: 'hover:shadow-[0_0_20px_rgba(244,63,113,0.15)]', lockText: 'text-rose-400', lockBg: 'bg-rose-500/10' },
  ];

  const renderSelect = () => {
    const chunks: Level[][] = [];
    for (let i = 0; i < LEVELS.length; i += UNLOCK_CHUNK_SIZE) {
      chunks.push(LEVELS.slice(i, i + UNLOCK_CHUNK_SIZE));
    }

    return (
      <div className="flex flex-col items-center h-full p-6 w-full max-w-4xl mx-auto z-10 relative overflow-y-auto">
        <div className="w-full flex justify-between items-center mb-8 mt-4 sticky top-0 z-20">
          <button
            onClick={() => { playSound(SOUNDS.menuSelect); setView('menu'); }}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl sm:text-2xl font-black tracking-widest uppercase text-white shadow-black drop-shadow-lg">{t.selectLevel}</h2>
          <div className="w-12" />
        </div>

        <div className="flex flex-col gap-10 w-full mb-12">
          {chunks.map((chunk, chunkIdx) => {
            const firstLevelIdx = chunkIdx * UNLOCK_CHUNK_SIZE;
            const isUnlocked = isLevelUnlocked(firstLevelIdx);
            const colorTheme = chunkColors[chunkIdx % chunkColors.length];

            let unlockMessage = '';
            if (!isUnlocked && chunkIdx > 0) {
              const prevChunkStart = (chunkIdx - 1) * UNLOCK_CHUNK_SIZE;
              const prevChunkEnd = chunkIdx * UNLOCK_CHUNK_SIZE;

              let totalMinMoves = 0;
              let actualMoves = 0;
              let allPlayed = true;
              for (let i = prevChunkStart; i < prevChunkEnd; i++) {
                if (LEVELS[i]) {
                  totalMinMoves += LEVELS[i].minMoves;
                  const best = bestScores[LEVELS[i].id];
                  if (!best) allPlayed = false;
                  actualMoves += (best || 0);
                }
              }
              const maxAllowed = totalMinMoves + (prevChunkEnd - prevChunkStart) * SCORE_LEEWAY_PER_LEVEL;

              if (!allPlayed) {
                unlockMessage = `${t.completePart} ${chunkIdx}`;
              } else {
                unlockMessage = `${t.partTotal} ${chunkIdx} ${t.movesStr} ${actualMoves} / ${t.max} ${maxAllowed}`;
              }
            }

            return (
              <div key={chunkIdx} className="relative group/chunk pt-2">
                <div className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-2">{t.part} {chunkIdx + 1}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full relative z-0">
                  {chunk.map((lvl, localIdx) => {
                    const globalIdx = firstLevelIdx + localIdx;
                    const score = bestScores[lvl.id];

                    return (
                      <button
                        key={lvl.id}
                        disabled={!isUnlocked}
                        onClick={() => {
                          playSound(SOUNDS.startGame);
                          setCurrentLevelIdx(globalIdx);
                          setView('playing');
                        }}
                        className={`aspect-square relative rounded-3xl flex flex-col items-center justify-center border transition-all ${
                          isUnlocked
                            ? `border-zinc-800 bg-zinc-900 hover:bg-zinc-800 ${colorTheme.border} cursor-pointer ${colorTheme.shadow}`
                            : 'border-zinc-900 bg-zinc-900/50 opacity-50'
                        }`}
                      >
                        <div className={`text-3xl font-black font-mono mb-3 ${isUnlocked ? 'text-zinc-100' : 'text-zinc-600'}`}>{lvl.id}</div>
                        {isUnlocked && (
                          score ? (
                            <div className="flex gap-1.5">
                              {[1, 2, 3].map(i => {
                                const stars = score <= lvl.minMoves ? 3 : score <= lvl.minMoves + 2 ? 2 : 1;
                                return <Star key={i} className={`w-4 h-4 ${i <= stars ? 'fill-amber-400 text-amber-400' : 'text-zinc-800'}`} />
                              })}
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.unplayed}</div>
                          )
                        )}
                      </button>
                    );
                  })}
                </div>

                {!isUnlocked && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center top-8 pt-2">
                    <div className="absolute inset-0 backdrop-blur-[6px] bg-zinc-950/30 rounded-3xl" />
                    <div className={`relative flex flex-col items-center justify-center py-6 px-8 rounded-3xl ${colorTheme.lockBg} border border-zinc-800/80 shadow-2xl backdrop-blur-xl`}>
                      <Lock className={`w-10 h-10 mb-4 ${colorTheme.lockText}`} />
                      <div className="text-white font-bold tracking-widest uppercase text-sm md:text-base whitespace-nowrap">{unlockMessage}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAbout = () => (
    <div className="flex flex-col items-center min-h-screen p-6 w-full max-w-2xl mx-auto z-10 text-center relative justify-center">
      <div className="w-full flex justify-between items-center mb-8 mt-4">
        <button
          onClick={() => setView('menu')}
          className="p-3 bg-zinc-800 rounded-full hover:bg-zinc-700 text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-11" />
      </div>

      <h2 className="text-3xl md:text-4xl font-bold tracking-[0.2em] mb-8">{t.gameName}</h2>
      <p className="text-zinc-400 mb-6 leading-relaxed max-w-lg mx-auto">
        {t.description}
      </p>
    </div>
  );



  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-accent-500/30 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none mix-blend-overlay opacity-30" />
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-900/5 blur-[120px] pointer-events-none" />

      {view === 'menu' && renderMenu()}
      {view === 'select' && renderSelect()}
      {view === 'about' && renderAbout()}
      {view === 'playing' && level && (
        <GameSession
          key={currentLevelIdx}
          level={level}
          currentLevelIdx={currentLevelIdx}
          setCurrentLevelIdx={setCurrentLevelIdx}
          setView={setView}
          bestScores={bestScores}
          setBestScores={setBestScores}
          lang={lang}
          theme={theme}
        />
      )}
    </div>
  );
}
