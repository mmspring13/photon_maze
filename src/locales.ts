export const LOCALES = {
    en: {
        gameName: "PHOTON MAZE",
        selectLevel: "Select Level",
        part: "Part",
        partTotal: "PART",
        unplayed: "Unplayed",
        movesStr: "MOVES:",
        max: "MAX",
        completePart: "COMPLETE PART",
        continue: "CONTINUE",
        chooseLevel: "CHOOSE LEVEL",
        newGame: "NEW GAME",
        restart: "Restart",
        about: "ABOUT",
        back: "Back",
        description: "A minimalist logic puzzle. Slide your node through complex networks. Hit walls, find the optimal path, and connect the system.",
        nextLevel: "NEXT LEVEL",
        levelComplete: "System Restored",
        nodesConnected: "Nodes connected in",
        movesInfo: "moves.",
        sectorLocked: "SECTOR LOCKED",
        improveScores: "Improve older scores! Maximum",
        improveScoresMid: "moves allowed in levels",
        improveScoresEnd: "to unlock.",
        retryLevel: "RETRY LEVEL",
        allComplete: "ALL SECTORS COMPLETE",
        targetMode: "Target",
        sector: "Sector",
        movesCap: "Moves",
        theme: "Theme",
        themeFuchsia: "Fuchsia",
        themeGreen: "Green",
        themeRed: "Red",
        themeBlue: "Blue",
    },
    ru: {
        gameName: "ФОТОННЫЙ ЛАБИРИНТ",
        selectLevel: "Выбор Уровня",
        part: "Часть",
        partTotal: "ЧАСТЬ",
        unplayed: "Не сыгран",
        movesStr: "ХОДОВ:",
        max: "МАКС",
        completePart: "ПРОЙДИТЕ ЧАСТЬ",
        continue: "ПРОДОЛЖИТЬ",
        chooseLevel: "ВЫБРАТЬ УРОВЕНЬ",
        newGame: "НОВАЯ ИГРА",
        restart: "Заново",
        about: "ОБ ИГРЕ",
        back: "Назад",
        description: "Минималистичная логическая головоломка. Скользите через сложные лабиринтные сети. Врезайтесь в стены, находите оптимальный путь и восстанавливайте систему.",
        nextLevel: "СЛЕДУЮЩИЙ УРОВЕНЬ",
        levelComplete: "Уровень пройден",
        nodesConnected: "Узел подключен за",
        movesInfo: "ходов.",
        sectorLocked: "СЕКТОР ЗАКРЫТ",
        improveScores: "Улучшите старые рекорды! Максимум",
        improveScoresMid: "ходов доступно в уровнях",
        improveScoresEnd: "для разблокировки.",
        retryLevel: "ПЕРЕИГРАТЬ УРОВЕНЬ",
        allComplete: "ВСЕ СЕКТОРЫ ПРОЙДЕНЫ",
        targetMode: "Цель",
        sector: "Сектор",
        movesCap: "Ходов",
        theme: "Тема",
        themeFuchsia: "Фуксия",
        themeGreen: "Зеленая",
        themeRed: "Красная",
        themeBlue: "Синяя",
    }
};

export type Lang = 'en' | 'ru';

export const getMovesWord = (count: number, lang: Lang): string => {
    if (lang === 'ru') {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return 'ход';
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'хода';
        return 'ходов';
    }
    return count === 1 ? 'move' : 'moves';
};

export const getImproveScoresText = (maxMoves: number, rangeStr: string, lang: Lang) => {
    if (lang === 'ru') {
        return `Улучшите старые рекорды! Максимум ${maxMoves} ${getMovesWord(maxMoves, lang)} доступно в уровнях ${rangeStr} для разблокировки.`;
    }
    return `Improve older scores! Maximum ${maxMoves} moves allowed in levels ${rangeStr} to unlock.`;
};

export const getMovesInfoWord = (count: number, lang: Lang): string => {
    return `${getMovesWord(count, lang)}.`;
};
