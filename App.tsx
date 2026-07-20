import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

type GameMode = 'classic' | 'double' | 'time' | 'random';
type Difficulty = 'easy' | 'normal' | 'hard' | 'custom';
type RestPreset = 'off' | 'short' | 'normal' | 'long' | 'custom';
type MatchGames = 1 | 3 | 5;
type RandomRepPreset = 'easy' | 'normal' | 'hard' | 'custom';
type PenaltySource = 'standard' | 'custom' | 'both';
type SetupStep = 'players' | 'mode' | 'games' | 'rest' | 'penalties' | 'exercises' | 'review';
type PlayStyle = 'party' | 'solo';

type Player = {
  id: string;
  name: string;
};

type Exercise = {
  id: string;
  name: string;
  selected: boolean;
  description: string;
  tip: string;
  level: Difficulty;
};

type RoundResult = {
  exerciseName: string;
  winnerName: string;
  loserName: string;
  topRep: number;
  penalty: string;
};

type PlayerStats = {
  name: string;
  totalReps: number;
  bestRep: number;
  completedTurns: number;
};

type GameState = {
  exerciseIndex: number;
  turnIndex: number;
  repCount: number;
  activePlayerIds: string[];
  results: RoundResult[];
  lastCompletedRep: number;
  mode: GameMode;
  difficulty: Difficulty;
  exerciseOrder: Exercise[];
    randomExercise: Exercise | null;
  randomMaxReps: number;
  gameWins: Record<string, number>;
  currentGameExerciseWins: Record<string, number>;
stats: Record<string, PlayerStats>;
  turnSecondsLeft: number | null;
  restSeconds: number;
  matchGames: MatchGames;
  playStyle: PlayStyle;
};

const playStyleOptions: Array<{ id: PlayStyle; name: string; description: string }> = [
  { id: 'party', name: 'Party', description: '2+ spelers tegen elkaar' },
  { id: 'solo', name: 'Solo', description: 'Test je eigen record' }
];
const gameModes: Array<{ id: GameMode; name: string; description: string }> = [
  { id: 'classic', name: 'Classic', description: 'Elke beurt komt er 1 herhaling bij.' },
  { id: 'double', name: 'Double Up', description: 'Elke beurt komen er 2 herhalingen bij.' },
  { id: 'time', name: 'Time Attack', description: 'Voltooi je beurt voor de timer op 0 staat.' },
  { id: 'random', name: 'Random', description: 'Elke beurt een random oefening en random aantal reps.' }
];

const matchGameOptions: Array<{ value: MatchGames; name: string; description: string }> = [
  { value: 1, name: '1 game', description: 'Snelle ronde' },
  { value: 3, name: 'Best of 3 games', description: 'Eerste met 2 wins wint' },
  { value: 5, name: 'Best of 5 games', description: 'Eerste met 3 wins wint' }
];

const difficultyOptions: Array<{ id: Difficulty; name: string; timeLimit: number | null }> = [
  { id: 'easy', name: 'Easy', timeLimit: 30 },
  { id: 'normal', name: 'Normal', timeLimit: 20 },
  { id: 'hard', name: 'Savage', timeLimit: 12 },
  { id: 'custom', name: 'Custom', timeLimit: null }
];

const randomRepOptions: Array<{ id: RandomRepPreset; name: string; maxReps: number | null }> = [
  { id: 'easy', name: 'Easy', maxReps: 10 },
  { id: 'normal', name: 'Normal', maxReps: 20 },
  { id: 'hard', name: 'Savage', maxReps: 30 },
  { id: 'custom', name: 'Custom', maxReps: null }
];

const restOptions: Array<{ id: RestPreset; name: string; seconds: number | null }> = [
  { id: 'off', name: 'Geen', seconds: 0 },
  { id: 'short', name: 'Kort', seconds: 5 },
  { id: 'normal', name: 'Normaal', seconds: 15 },
  { id: 'long', name: 'Lang', seconds: 30 },
  { id: 'custom', name: 'Custom', seconds: null }
];

const defaultPenalties = [
  'Doe 10 jumping jacks.',
  'Doe 20 seconden wall sit.',
  'Doe 5 extra push-ups.',
  'Doe 15 squats.',
  'Doe 30 seconden plank.'
];

const penaltySourceOptions: Array<{ id: PenaltySource; name: string; description: string }> = [
  { id: 'standard', name: 'Standaard', description: 'Alleen standaard strafopdrachten' },
  { id: 'custom', name: 'Custom', description: 'Alleen custom strafopdrachten' },
  { id: 'both', name: 'Beide', description: 'Standaard + custom strafopdrachten' }
];

const setupSteps: Array<{ id: SetupStep; title: string; description: string }> = [
  { id: 'players', title: 'Spelers', description: 'Wie doet er mee?' },
  { id: 'mode', title: 'Spelmodus', description: 'Kies een spelmodus' },
  { id: 'games', title: 'Aantal games', description: 'Speel 1 game of best of meerdere games.' },
  { id: 'rest', title: 'Rustpauze', description: 'Bepaal rustpauzes tussen beurten' },
  { id: 'penalties', title: 'Straffen', description: 'Bepaal of de verliezer een strafopdracht krijgt.' },
  { id: 'exercises', title: 'Oefeningen', description: 'Selecteer oefeningen voor de game.' },
  { id: 'review', title: 'Overzicht', description: 'Check je keuzes en start.' }
];

const starterExercises: Exercise[] = [
  {
    id: 'push-ups',
    name: 'Push-ups',
    selected: true,
    description: 'Borst naar beneden, lichaam recht, volledig uitstrekken bovenaan.',
    tip: 'Maak ze op je knieen als normale push-ups te zwaar worden.',
    level: 'normal'
  },
  {
    id: 'sit-ups',
    name: 'Sit-ups',
    selected: false,
    description: 'Kom gecontroleerd omhoog en laat je rug rustig terugzakken.',
    tip: 'Spreek vooraf af of handen achter het hoofd of gekruist op de borst tellen.',
    level: 'easy'
  },
  {
    id: 'squats',
    name: 'Squats',
    selected: false,
    description: 'Zak door je knieen, heupen naar achter, borst omhoog.',
    tip: 'Een rep telt als je duidelijk weer rechtop staat.',
    level: 'easy'
  },
  {
    id: 'burpees',
    name: 'Burpees',
    selected: false,
    description: 'Zak naar de grond, spring terug naar plank, spring omhoog.',
    tip: 'Deze wordt snel pittig; perfect voor korte rondes.',
    level: 'hard'
  },
  {
    id: 'lunges',
    name: 'Lunges',
    selected: false,
    description: 'Stap uit, knie richting grond, duw jezelf terug omhoog.',
    tip: 'Tel links en rechts als losse herhalingen voor eerlijk tempo.',
    level: 'normal'
  },
  {
    id: 'plank-taps',
    name: 'Plank taps',
    selected: false,
    description: 'Blijf in plank en tik om en om je schouders aan.',
    tip: 'Heupen zo stil mogelijk houden.',
    level: 'normal'
  }
];

const starterPlayers: Player[] = [];


const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const shuffle = <T,>(items: T[]) =>
  [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((first, second) => first.sort - second.sort)
    .map(({ item }) => item);

const getModeIncrement = (mode: GameMode) => {
  if (mode === 'double') return 2;
  return 1;
};

const getRandomChallengeRep = (maxReps: number) => Math.floor(Math.random() * maxReps) + 1;

const getStartingRep = (mode: GameMode, randomMaxReps = 20) => (mode === 'random' ? getRandomChallengeRep(randomMaxReps) : 1);

const getDifficultyConfig = (difficulty: Difficulty) =>
  difficultyOptions.find((option) => option.id === difficulty) ?? difficultyOptions[1];

const getRequiredWins = (games: MatchGames) => Math.floor(games / 2) + 1;

const clampRandomMaxReps = (value: string) => {
  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) return 20;
  return Math.max(1, Math.min(100, parsedValue));
};

const clampTimerSeconds = (value: string) => {
  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) return 20;
  return Math.max(5, Math.min(300, parsedValue));
};

const clampRestSeconds = (value: string) => {
  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) return 0;
  return Math.max(0, Math.min(120, parsedValue));
};

export default function App() {
  const [players, setPlayers] = useState<Player[]>(starterPlayers);
  const [playerName, setPlayerName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>(starterExercises);
  const [exerciseName, setExerciseName] = useState('');
  const [playStyle, setPlayStyle] = useState<PlayStyle>('party');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [setupStep, setSetupStep] = useState<SetupStep>('players');
  const [setupError, setSetupError] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [customTimerSeconds, setCustomTimerSeconds] = useState('10');
  const [selectedRandomRepPreset, setSelectedRandomRepPreset] = useState<RandomRepPreset>('normal');
  const [customRandomMaxReps, setCustomRandomMaxReps] = useState('40');
  const [selectedMatchGames, setSelectedMatchGames] = useState<MatchGames>(1);
  const [selectedRestPreset, setSelectedRestPreset] = useState<RestPreset>('normal');
  const [customRestSeconds, setCustomRestSeconds] = useState('60');
  const [penaltiesEnabled, setPenaltiesEnabled] = useState(true);
  const [penaltySource, setPenaltySource] = useState<PenaltySource>('standard');
  const [selectedDefaultPenalties, setSelectedDefaultPenalties] = useState<string[]>(defaultPenalties);
  const [customPenalties, setCustomPenalties] = useState<string[]>([]);
  const [penaltyText, setPenaltyText] = useState('');
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [game, setGame] = useState<GameState | null>(null);

  const orderedPlayers = players;
  const playersForGame = playStyle === 'solo' ? orderedPlayers.slice(0, 1) : orderedPlayers;
  const selectedExercises = useMemo(() => exercises.filter((exercise) => exercise.selected), [exercises]);
  const difficultyConfig = getDifficultyConfig(game?.difficulty ?? selectedDifficulty);
  const selectedTimerSeconds = selectedDifficulty === 'custom'
    ? clampTimerSeconds(customTimerSeconds)
    : difficultyConfig.timeLimit ?? 20;
  const selectedRandomMaxReps = selectedRandomRepPreset === 'custom'
    ? clampRandomMaxReps(customRandomMaxReps)
    : randomRepOptions.find((option) => option.id === selectedRandomRepPreset)?.maxReps ?? 20;
  const selectedRestSeconds = selectedRestPreset === 'custom'
    ? clampRestSeconds(customRestSeconds)
    : restOptions.find((option) => option.id === selectedRestPreset)?.seconds ?? 0;
  const standardPenaltyPool = penaltySource === 'standard' || penaltySource === 'both' ? selectedDefaultPenalties : [];
  const customPenaltyPool = penaltySource === 'custom' || penaltySource === 'both' ? customPenalties : [];
  const availablePenalties = [...standardPenaltyPool, ...customPenaltyPool];

  const currentGameNumber = game ? Math.floor(game.exerciseIndex / game.exerciseOrder.length) + 1 : 1;
  const currentExerciseNumber = game ? (game.exerciseIndex % game.exerciseOrder.length) + 1 : 1;
  const totalExerciseRounds = game ? game.exerciseOrder.length * game.matchGames : selectedExercises.length * selectedMatchGames;
  const currentExercise = game
    ? game.mode === 'random'
      ? game.randomExercise ?? game.exerciseOrder[game.exerciseIndex % game.exerciseOrder.length]
      : game.exerciseOrder[game.exerciseIndex % game.exerciseOrder.length]
    : null;
  const activePlayers = game
    ? game.activePlayerIds
        .map((id) => orderedPlayers.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player))
    : [];
  const currentPlayer = game ? activePlayers[game.turnIndex] : null;
  const requiredWins = game ? getRequiredWins(game.matchGames) : getRequiredWins(playStyle === 'solo' ? 1 : selectedMatchGames);
  const leadingWins = game ? Math.max(0, ...Object.values(game.gameWins)) : 0;
  const isFinished = Boolean(game && (game.exerciseIndex >= totalExerciseRounds || leadingWins >= requiredWins));
  const isResting = restSecondsLeft > 0;
  const modeLabel = gameModes.find((mode) => mode.id === (game?.mode ?? selectedMode))?.name ?? 'Classic';

  const totalWins = game?.gameWins ?? {};
  const isSoloGame = game?.playStyle === 'solo';

  const leaderboard = useMemo(() => {
    if (!game) return [];

    return Object.entries(game.stats)
      .map(([playerId, stats]) => ({
        playerId,
        wins: totalWins?.[stats.name] ?? 0,
        ...stats
      }))
      .sort((first, second) => {
        if (second.wins !== first.wins) return second.wins - first.wins;
        if (second.bestRep !== first.bestRep) return second.bestRep - first.bestRep;
        return second.totalReps - first.totalReps;
      });
  }, [game, totalWins]);
  const matchWinner = leaderboard[0];
  const runnerUp = leaderboard[1];
  const matchLoserPenalty = runnerUp && penaltiesEnabled
    ? game?.results.find((result) => result.loserName === runnerUp.name)?.penalty
    : null;

  useEffect(() => {
    if (restSecondsLeft <= 0) return;

    const timeout = setTimeout(() => {
      setRestSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [restSecondsLeft]);

  useEffect(() => {
    if (!game || game.mode !== 'time' || game.turnSecondsLeft === null || restSecondsLeft > 0 || isFinished) {
      return;
    }

    if (game.turnSecondsLeft <= 0) {
      if (game.playStyle === 'solo') {
        finishSoloAttempt();
      } else {
        eliminatePlayer();
      }
      return;
    }

    const timeout = setTimeout(() => {
      setGame((currentGame) => {
        if (!currentGame || currentGame.mode !== 'time' || currentGame.turnSecondsLeft === null) return currentGame;
        return { ...currentGame, turnSecondsLeft: Math.max(0, currentGame.turnSecondsLeft - 1) };
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [game, restSecondsLeft, isFinished]);

  const addPlayer = () => {
    const trimmedName = playerName.trim();
    if (!trimmedName) return;

    if (playStyle === 'solo' && players.length >= 1) {
      setSetupError('Solo gebruikt maximaal 1 speler. Verwijder de huidige speler of kies Party.');
      return;
    }

    setSetupError('');
    setPlayers((currentPlayers) => [...currentPlayers, { id: createId('player'), name: trimmedName }]);
    setPlayerName('');
  };

  const removePlayer = (playerId: string) => {
    setSetupError('');
    setPlayers((currentPlayers) => currentPlayers.filter((player) => player.id !== playerId));
  };

  const movePlayer = (playerId: string, direction: -1 | 1) => {
    setPlayers((currentPlayers) => {
      const currentIndex = currentPlayers.findIndex((player) => player.id === playerId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentPlayers.length) {
        return currentPlayers;
      }

      const nextPlayers = [...currentPlayers];
      const [movedPlayer] = nextPlayers.splice(currentIndex, 1);
      nextPlayers.splice(nextIndex, 0, movedPlayer);
      return nextPlayers;
    });
  };

  const addExercise = () => {
    const trimmedName = exerciseName.trim();
    if (!trimmedName) return;

    setExercises((currentExercises) => [
      ...currentExercises,
      {
        id: createId('exercise'),
        name: trimmedName,
        selected: true,
        description: 'Custom oefening. Spreek voor de start af wanneer een herhaling telt.',
        tip: 'Houd de uitvoering simpel en eerlijk.',
        level: selectedDifficulty === 'custom' ? 'normal' : selectedDifficulty
      }
    ]);
    setExerciseName('');
  };

  const toggleExercise = (exerciseId: string) => {
    setExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, selected: !exercise.selected } : exercise
      )
    );
  };

  const addPenalty = () => {
    const trimmedPenalty = penaltyText.trim();
    if (!trimmedPenalty) return;

    setCustomPenalties((currentPenalties) => [...currentPenalties, trimmedPenalty]);
    setPenaltyText('');
  };

  const removePenalty = (penalty: string) => {
    setCustomPenalties((currentPenalties) => currentPenalties.filter((currentPenalty) => currentPenalty !== penalty));
  };

  const toggleDefaultPenalty = (penalty: string) => {
    setSelectedDefaultPenalties((currentPenalties) =>
      currentPenalties.includes(penalty)
        ? currentPenalties.filter((currentPenalty) => currentPenalty !== penalty)
        : [...currentPenalties, penalty]
    );
  };

  const startGame = () => {
    const selectedPlayers = playStyle === 'solo' ? orderedPlayers.slice(0, 1) : orderedPlayers;

    if (selectedPlayers.length < (playStyle === 'solo' ? 1 : 2)) {
      Alert.alert(playStyle === 'solo' ? 'Een speler nodig' : 'Minimaal twee spelers', playStyle === 'solo' ? 'Voeg minimaal een speler toe om solo te starten.' : 'Voeg minimaal twee spelers toe om te starten.');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Kies een oefening', 'Selecteer minimaal een oefening voor deze game.');
      return;
    }

    const exerciseOrder = selectedMode === 'random' ? shuffle(selectedExercises) : selectedExercises;
    const randomExercise = selectedMode === 'random'
      ? exerciseOrder[Math.floor(Math.random() * exerciseOrder.length)]
      : null;
    const gameWins = selectedPlayers.reduce<Record<string, number>>((nextWins, player) => {
      nextWins[player.name] = 0;
      return nextWins;
    }, {});
    const stats = selectedPlayers.reduce<Record<string, PlayerStats>>((nextStats, player) => {
      nextStats[player.id] = {
        name: player.name,
        totalReps: 0,
        bestRep: 0,
        completedTurns: 0
      };
      return nextStats;
    }, {});

    setRestSecondsLeft(0);
    setGame({
      exerciseIndex: 0,
      turnIndex: 0,
      repCount: getStartingRep(selectedMode, selectedRandomMaxReps),
      activePlayerIds: selectedPlayers.map((player) => player.id),
      results: [],
      lastCompletedRep: 0,
      mode: selectedMode,
      difficulty: selectedDifficulty,
      exerciseOrder,
      randomExercise,
      randomMaxReps: selectedRandomMaxReps,
      gameWins,
      currentGameExerciseWins: {},
      stats,
      turnSecondsLeft: selectedMode === 'time' ? selectedTimerSeconds : null,
      restSeconds: playStyle === 'solo' ? 0 : selectedRestSeconds,
      matchGames: playStyle === 'solo' ? 1 : selectedMatchGames,
      playStyle
    });
  };

  const completeTurn = () => {
    if (!game || !currentPlayer || activePlayers.length === 0 || isResting) return;

    const increment = getModeIncrement(game.mode);
    const nextTurnIndex = (game.turnIndex + 1) % activePlayers.length;
    const nextRepCount = game.mode === 'random' ? getRandomChallengeRep(game.randomMaxReps) : game.repCount + increment;
    const nextRandomExercise = game.mode === 'random'
      ? game.exerciseOrder[Math.floor(Math.random() * game.exerciseOrder.length)]
      : game.randomExercise;
    const nextStats = {
      ...game.stats,
      [currentPlayer.id]: {
        name: currentPlayer.name,
        totalReps: (game.stats[currentPlayer.id]?.totalReps ?? 0) + game.repCount,
        bestRep: Math.max(game.stats[currentPlayer.id]?.bestRep ?? 0, game.repCount),
        completedTurns: (game.stats[currentPlayer.id]?.completedTurns ?? 0) + 1
      }
    };

    setGame({
      ...game,
      turnIndex: nextTurnIndex,
      repCount: nextRepCount,
      lastCompletedRep: game.repCount,
      stats: nextStats,
      randomExercise: nextRandomExercise,
      turnSecondsLeft: game.mode === 'time' ? selectedTimerSeconds : null,
      restSeconds: game.restSeconds,
      matchGames: game.matchGames
    });

    if (game.playStyle !== 'solo' && game.restSeconds > 0) {
      setRestSecondsLeft(game.restSeconds);
    }
  };

  const finishSoloAttempt = () => {
    if (!game || !currentPlayer || !currentExercise) return;

    const stats = game.stats[currentPlayer.id];
    const topRep = Math.max(stats?.bestRep ?? 0, game.lastCompletedRep);
    const nextResults = [
      ...game.results,
      {
        gameNumber: currentGameNumber,
        exerciseName: currentExercise.name,
        winnerName: currentPlayer.name,
        loserName: '',
        topRep,
        penalty: 'Geen strafopdracht'
      }
    ];

    setRestSecondsLeft(0);
    setGame({
      ...game,
      results: nextResults,
      exerciseIndex: totalExerciseRounds,
      activePlayerIds: [],
      turnIndex: 0,
      gameWins: {
        ...game.gameWins,
        [currentPlayer.name]: 1
      },
      currentGameExerciseWins: {}
    });
  };
  const finishExercise = (winner: Player, loser: Player, topRep: number) => {
    if (!game || !currentExercise) return;

    const nextExerciseIndex = game.exerciseIndex + 1;

    const penalty = penaltiesEnabled && availablePenalties.length > 0
      ? availablePenalties[Math.floor(Math.random() * availablePenalties.length)]
      : 'Geen strafopdracht';
    const nextResults = [
      ...game.results,
      {
        gameNumber: currentGameNumber,
        exerciseName: currentExercise.name,
        winnerName: winner.name,
        loserName: loser.name,
        topRep,
        penalty
      }
    ];
    const nextCurrentGameExerciseWins = {
      ...game.currentGameExerciseWins,
      [winner.name]: (game.currentGameExerciseWins[winner.name] ?? 0) + 1
    };
    const completedFullGame = nextExerciseIndex % game.exerciseOrder.length === 0;
    let nextGameWins = game.gameWins;
    let nextGameExerciseWins = nextCurrentGameExerciseWins;

    setRestSecondsLeft(0);

    if (completedFullGame) {
      const gameWinnerName = Object.entries(nextCurrentGameExerciseWins).sort((first, second) => {
        if (second[1] !== first[1]) return second[1] - first[1];
        return first[0] === winner.name ? -1 : 1;
      })[0]?.[0] ?? winner.name;

      nextGameWins = {
        ...game.gameWins,
        [gameWinnerName]: (game.gameWins[gameWinnerName] ?? 0) + 1
      };
      nextGameExerciseWins = {};

      if (nextExerciseIndex >= totalExerciseRounds || (nextGameWins[gameWinnerName] ?? 0) >= getRequiredWins(game.matchGames)) {
        setGame({
          ...game,
          results: nextResults,
          exerciseIndex: totalExerciseRounds,
          activePlayerIds: [],
          turnIndex: 0,
          gameWins: nextGameWins,
          currentGameExerciseWins: nextGameExerciseWins
        });
        return;
      }
    }

    setGame({
      ...game,
      exerciseIndex: nextExerciseIndex,
      turnIndex: 0,
      repCount: getStartingRep(game.mode, game.randomMaxReps),
      activePlayerIds: playersForGame.map((player) => player.id),
      results: nextResults,
      lastCompletedRep: 0,
      randomExercise: game.mode === 'random' ? game.exerciseOrder[Math.floor(Math.random() * game.exerciseOrder.length)] : game.randomExercise,
      randomMaxReps: game.randomMaxReps,
      turnSecondsLeft: game.mode === 'time' ? selectedTimerSeconds : null,
      restSeconds: game.restSeconds,
      matchGames: game.matchGames,
      gameWins: nextGameWins,
      currentGameExerciseWins: nextGameExerciseWins
    });
  };

  const eliminatePlayer = () => {
    if (!game || !currentPlayer || activePlayers.length === 0 || isResting) return;

    if (activePlayers.length === 2) {
      const winner = activePlayers.find((player) => player.id !== currentPlayer.id);
      if (winner) finishExercise(winner, currentPlayer, game.lastCompletedRep);
      return;
    }

    const nextActiveIds = activePlayers.filter((player) => player.id !== currentPlayer.id).map((player) => player.id);
    const nextTurnIndex = game.turnIndex >= nextActiveIds.length ? 0 : game.turnIndex;

    setRestSecondsLeft(0);
    setGame({
      ...game,
      activePlayerIds: nextActiveIds,
      turnIndex: nextTurnIndex,
      turnSecondsLeft: game.mode === 'time' ? selectedTimerSeconds : null,
      restSeconds: game.restSeconds,
      matchGames: game.matchGames
    });
  };

  const skipRest = () => setRestSecondsLeft(0);

  const resetGame = () => {
    setRestSecondsLeft(0);
    setGame(null);
  };

  const visibleSetupSteps = setupSteps.filter((step) => playStyle === 'party' || (step.id !== 'games' && step.id !== 'penalties'));
  const setupStepIndex = visibleSetupSteps.findIndex((step) => step.id === setupStep);
  const safeSetupStepIndex = setupStepIndex < 0 ? 0 : setupStepIndex;
  const currentSetupStep = visibleSetupSteps[safeSetupStepIndex] ?? visibleSetupSteps[0];
  const isFirstSetupStep = safeSetupStepIndex <= 0;
  const isLastSetupStep = safeSetupStepIndex === visibleSetupSteps.length - 1;
  const selectedModeLabel = gameModes.find((mode) => mode.id === selectedMode)?.name ?? 'Classic';
  const selectedMatchLabel = matchGameOptions.find((option) => option.value === selectedMatchGames)?.name ?? '1 game';
  const penaltySourceLabel = penaltySourceOptions.find((option) => option.id === penaltySource)?.name ?? 'Standaard';
  const soloPlayerLimitReached = playStyle === 'solo' && orderedPlayers.length >= 1;
  const setupBlockingMessage = setupStep === 'players' && playersForGame.length < (playStyle === 'solo' ? 1 : 2)
    ? playStyle === 'solo'
      ? 'Voeg minimaal 1 speler toe om solo verder te gaan.'
      : 'Kies Solo of voeg minimaal 2 spelers toe voor Party.'
    : setupStep === 'exercises' && selectedExercises.length === 0
      ? 'Selecteer minimaal 1 oefening om verder te gaan.'
      : '';

  const goToNextSetupStep = () => {
    if (setupStep === 'players' && playersForGame.length < (playStyle === 'solo' ? 1 : 2)) {
      const message = playStyle === 'solo' ? 'Voeg minimaal 1 speler toe om solo verder te gaan.' : 'Kies Solo of voeg minimaal 2 spelers toe voor Party.';
      setSetupError(message);
      if (Platform.OS !== 'web') Alert.alert(playStyle === 'solo' ? 'Een speler nodig' : 'Minimaal twee spelers', message);
      return;
    }

    if (setupStep === 'exercises' && selectedExercises.length === 0) {
      const message = 'Selecteer minimaal 1 oefening om verder te gaan.';
      setSetupError(message);
      if (Platform.OS !== 'web') Alert.alert('Kies een oefening', message);
      return;
    }

    setSetupError('');

    if (isLastSetupStep) {
      startGame();
      return;
    }

    setSetupStep(visibleSetupSteps[safeSetupStepIndex + 1].id);
  };

  const goToPreviousSetupStep = () => {
    if (isFirstSetupStep) return;
    setSetupStep(visibleSetupSteps[safeSetupStepIndex - 1].id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Image source={require('./assets/icon.png')} style={styles.appLogo} />
              <View style={styles.brandTextBlock}>
                <Text style={styles.kicker}>Party fitness</Text>
                <Text style={styles.title}>1 More Game</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Speel fitness-challenges met vrienden of push jezelf verder.
            </Text>
          </View>

          {!game && (
            <View style={[styles.section, styles.setupSection]}>
              <View style={styles.setupHeader}>
                <View style={styles.setupTitleBlock}>
                  <Text style={styles.kicker}>Stap {safeSetupStepIndex + 1} van {visibleSetupSteps.length}</Text>
                  <Text style={styles.sectionTitle}>{currentSetupStep.title}</Text>
                  <Text style={styles.subtitleSmall}>{currentSetupStep.description}</Text>
                </View>
                <Pressable style={styles.quickStartButton} onPress={startGame}>
                  <Text style={styles.quickStartText}>Snelle start</Text>
                </Pressable>
              </View>

              <View style={styles.progressTrack}>
                {visibleSetupSteps.map((step, index) => (
                  <Pressable
                    key={step.id}
                    onPress={() => setSetupStep(step.id)}
                    style={[
                      styles.progressDot,
                      index <= safeSetupStepIndex && styles.progressDotActive
                    ]}
                    accessibilityLabel={`Ga naar ${step.title}`}
                  />
                ))}
              </View>

              {setupStep === 'players' && (
                <>
                  <View style={styles.segmentRow}>
                    {playStyleOptions.map((option) => (
                      <Pressable
                        key={option.id}
                        onPress={() => {
                          setSetupError('');
                          setPlayStyle(option.id);
                          if (option.id === 'solo') setPlayers((currentPlayers) => currentPlayers.slice(0, 1));
                        }}
                        style={[
                          styles.segmentButton,
                          playStyle === option.id && styles.segmentButtonSelected
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            playStyle === option.id && styles.segmentButtonTextSelected
                          ]}
                        >
                          {option.name}
                        </Text>
                        <Text
                          style={[
                            styles.segmentButtonMeta,
                            playStyle === option.id && styles.segmentButtonMetaSelected
                          ]}
                        >
                          {option.description}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.inputRow}>
                    <TextInput
                      value={playerName}
                      onChangeText={setPlayerName}
                      onSubmitEditing={addPlayer}
                      placeholder={soloPlayerLimitReached ? 'Solo heeft al 1 speler' : 'Naam speler'}
                      editable={!soloPlayerLimitReached}
                      placeholderTextColor="#8a8a8a"
                      returnKeyType="done"
                      style={styles.input}
                    />
                    <Pressable
                      disabled={soloPlayerLimitReached}
                      style={[styles.smallButton, soloPlayerLimitReached && styles.disabledButton]}
                      onPress={addPlayer}
                    >
                      <Text style={styles.smallButtonText}>+</Text>
                    </Pressable>
                  </View>

                  <View style={styles.list}>
                    {orderedPlayers.map((player, index) => (
                      <View key={player.id} style={styles.listItem}>
                        <View style={styles.itemTextBlock}>
                          <Text style={styles.itemLabel}>{player.name}</Text>
                          <Text style={styles.itemMeta}>#{index + 1}</Text>
                        </View>
                        <View style={styles.playerActions}>
                          <Pressable
                            disabled={index === 0}
                            onPress={() => movePlayer(player.id, -1)}
                            style={[styles.orderButton, index === 0 && styles.orderButtonDisabled]}
                          >
                            <Text style={[styles.orderButtonText, index === 0 && styles.disabledButtonText]}>Omhoog</Text>
                          </Pressable>
                          <Pressable
                            disabled={index === orderedPlayers.length - 1}
                            onPress={() => movePlayer(player.id, 1)}
                            style={[styles.orderButton, index === orderedPlayers.length - 1 && styles.orderButtonDisabled]}
                          >
                            <Text style={[styles.orderButtonText, index === orderedPlayers.length - 1 && styles.disabledButtonText]}>Omlaag</Text>
                          </Pressable>
                          <Pressable
                            accessibilityLabel={`${player.name} verwijderen`}
                            hitSlop={10}
                            onPress={() => removePlayer(player.id)}
                          >
                            <Text style={styles.removeText}>Verwijder</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {setupStep === 'mode' && (
                <>
                  <View style={styles.optionGrid}>
                    {gameModes.map((mode) => (
                      <Pressable
                        key={mode.id}
                        onPress={() => setSelectedMode(mode.id)}
                        style={[styles.optionCard, selectedMode === mode.id && styles.optionCardSelected]}
                      >
                        <Text style={[styles.optionTitle, selectedMode === mode.id && styles.optionTitleSelected]}>
                          {mode.name}
                        </Text>
                        <Text style={[styles.optionDescription, selectedMode === mode.id && styles.optionDescriptionSelected]}>
                          {mode.description}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {selectedMode === 'random' && (
                    <>
                      <Text style={styles.sectionTitle}>Random reps</Text>
                      <View style={styles.segmentRow}>
                        {randomRepOptions.map((repOption) => (
                          <Pressable
                            key={repOption.id}
                            onPress={() => setSelectedRandomRepPreset(repOption.id)}
                            style={[
                              styles.segmentButton,
                              selectedRandomRepPreset === repOption.id && styles.segmentButtonSelected
                            ]}
                          >
                            <Text
                              style={[
                                styles.segmentButtonText,
                                selectedRandomRepPreset === repOption.id && styles.segmentButtonTextSelected
                              ]}
                            >
                              {repOption.name}
                            </Text>
                            <Text
                              style={[
                                styles.segmentButtonMeta,
                                selectedRandomRepPreset === repOption.id && styles.segmentButtonMetaSelected
                              ]}
                            >
                              1-{repOption.maxReps === null ? selectedRandomMaxReps : repOption.maxReps}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {selectedRandomRepPreset === 'custom' && (
                        <View style={styles.inputRow}>
                          <TextInput
                            value={customRandomMaxReps}
                            onChangeText={(value) => setCustomRandomMaxReps(value.replace(/[^0-9]/g, ''))}
                            placeholder="40 reps"
                            placeholderTextColor="#8a8a8a"
                            keyboardType="number-pad"
                            style={styles.input}
                          />
                        </View>
                      )}
                    </>
                  )}

                  {selectedMode === 'time' && (
                    <>
                      <Text style={styles.sectionTitle}>Time Attack timer</Text>
                      <View style={styles.segmentRow}>
                        {difficultyOptions.map((difficulty) => (
                          <Pressable
                            key={difficulty.id}
                            onPress={() => setSelectedDifficulty(difficulty.id)}
                            style={[
                              styles.segmentButton,
                              selectedDifficulty === difficulty.id && styles.segmentButtonSelected
                            ]}
                          >
                            <Text
                              style={[
                                styles.segmentButtonText,
                                selectedDifficulty === difficulty.id && styles.segmentButtonTextSelected
                              ]}
                            >
                              {difficulty.name}
                            </Text>
                            <Text
                              style={[
                                styles.segmentButtonMeta,
                                selectedDifficulty === difficulty.id && styles.segmentButtonMetaSelected
                              ]}
                            >
                              {difficulty.timeLimit === null ? `${selectedTimerSeconds}s` : `${difficulty.timeLimit}s`}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {selectedDifficulty === 'custom' && (
                        <View style={styles.inputRow}>
                          <TextInput
                            value={customTimerSeconds}
                            onChangeText={(value) => setCustomTimerSeconds(value.replace(/[^0-9]/g, ''))}
                            placeholder="10 seconden"
                            placeholderTextColor="#8a8a8a"
                            keyboardType="number-pad"
                            style={styles.input}
                          />
                        </View>
                      )}
                    </>
                  )}
                </>
              )}

              {setupStep === 'games' && (
                <View style={styles.segmentRow}>
                  {matchGameOptions.map((roundOption) => (
                    <Pressable
                      key={roundOption.value}
                      onPress={() => setSelectedMatchGames(roundOption.value)}
                      style={[
                        styles.segmentButton,
                        selectedMatchGames === roundOption.value && styles.segmentButtonSelected
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          selectedMatchGames === roundOption.value && styles.segmentButtonTextSelected
                        ]}
                      >
                        {roundOption.name}
                      </Text>
                      <Text
                        style={[
                          styles.segmentButtonMeta,
                          selectedMatchGames === roundOption.value && styles.segmentButtonMetaSelected
                        ]}
                      >
                        {roundOption.description}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {setupStep === 'rest' && (
                <>
                  <View style={styles.restGrid}>
                    {restOptions.map((restOption) => (
                      <Pressable
                        key={restOption.id}
                        onPress={() => setSelectedRestPreset(restOption.id)}
                        style={[
                          styles.restButton,
                          selectedRestPreset === restOption.id && styles.restButtonSelected
                        ]}
                      >
                        <Text
                          style={[
                            styles.restButtonText,
                            selectedRestPreset === restOption.id && styles.restButtonTextSelected
                          ]}
                        >
                          {restOption.name}
                        </Text>
                        <Text
                          style={[
                            styles.restButtonMeta,
                            selectedRestPreset === restOption.id && styles.restButtonMetaSelected
                          ]}
                        >
                          {restOption.seconds === null ? `${selectedRestSeconds}s` : `${restOption.seconds}s`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {selectedRestPreset === 'custom' && (
                    <View style={styles.inputRow}>
                      <TextInput
                        value={customRestSeconds}
                        onChangeText={(value) => setCustomRestSeconds(value.replace(/[^0-9]/g, ''))}
                        placeholder="60 seconden"
                        placeholderTextColor="#8a8a8a"
                        keyboardType="number-pad"
                        style={styles.input}
                      />
                    </View>
                  )}
                  <Text style={styles.itemMeta}>
                    Huidige rust: {selectedRestSeconds === 0 ? 'geen pauze' : `${selectedRestSeconds} seconden na elke beurt`}.
                  </Text>
                </>
              )}

              {setupStep === 'penalties' && (
                <>
                  <Pressable
                    onPress={() => setPenaltiesEnabled((enabled) => !enabled)}
                    style={[styles.toggleRow, penaltiesEnabled && styles.toggleRowEnabled]}
                  >
                    <View>
                      <Text style={styles.itemLabel}>Strafopdracht verliezer</Text>
                      <Text style={styles.itemMeta}>
                        {penaltiesEnabled ? `Aan: ${availablePenalties.length} actieve strafopdrachten.` : 'Uit'}
                      </Text>
                    </View>
                    <Text style={styles.toggleText}>{penaltiesEnabled ? 'Aan' : 'Uit'}</Text>
                  </Pressable>

                  {penaltiesEnabled && (
                    <View style={styles.penaltyEditor}>
                      <View style={styles.segmentRow}>
                        {penaltySourceOptions.map((option) => (
                          <Pressable
                            key={option.id}
                            onPress={() => setPenaltySource(option.id)}
                            style={[
                              styles.segmentButton,
                              penaltySource === option.id && styles.segmentButtonSelected
                            ]}
                          >
                            <Text
                              style={[
                                styles.segmentButtonText,
                                penaltySource === option.id && styles.segmentButtonTextSelected
                              ]}
                            >
                              {option.name}
                            </Text>
                            <Text
                              style={[
                                styles.segmentButtonMeta,
                                penaltySource === option.id && styles.segmentButtonMetaSelected
                              ]}
                            >
                              {option.description}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {penaltySource !== 'custom' && (
                        <View style={styles.defaultPenaltyList}>
                          {defaultPenalties.map((penalty) => {
                            const isSelected = selectedDefaultPenalties.includes(penalty);
                            return (
                              <Pressable
                                key={penalty}
                                onPress={() => toggleDefaultPenalty(penalty)}
                                style={[styles.defaultPenaltyItem, isSelected && styles.defaultPenaltyItemSelected]}
                              >
                                <Text
                                  style={[
                                    styles.defaultPenaltyText,
                                    isSelected && styles.defaultPenaltyTextSelected
                                  ]}
                                >
                                  {penalty}
                                </Text>
                                <Text
                                  style={[
                                    styles.defaultPenaltyState,
                                    isSelected && styles.defaultPenaltyStateSelected
                                  ]}
                                >
                                  {isSelected ? 'Aan' : 'Uit'}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      {penaltySource !== 'standard' && (
                        <>
                          <View style={styles.inputRow}>
                            <TextInput
                              value={penaltyText}
                              onChangeText={setPenaltyText}
                              onSubmitEditing={addPenalty}
                              placeholder="Custom straf toevoegen"
                              placeholderTextColor="#8a8a8a"
                              returnKeyType="done"
                              style={styles.input}
                            />
                            <Pressable style={styles.smallButton} onPress={addPenalty}>
                              <Text style={styles.smallButtonText}>+</Text>
                            </Pressable>
                          </View>
                          {customPenalties.length === 0 && penaltySource === 'custom' && (
                            <Text style={styles.helperText}>Voeg minimaal 1 custom strafopdracht toe of kies Standaard.</Text>
                          )}
                          {customPenalties.length > 0 && (
                            <View style={styles.customPenaltyList}>
                              {customPenalties.map((penalty) => (
                                <View key={penalty} style={styles.customPenaltyItem}>
                                  <Text style={styles.customPenaltyText}>{penalty}</Text>
                                  <Pressable onPress={() => removePenalty(penalty)} hitSlop={10}>
                                    <Text style={styles.removeText}>Verwijder</Text>
                                  </Pressable>
                                </View>
                              ))}
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </>
              )}

              {setupStep === 'exercises' && (
                <>
                  <View style={styles.exerciseGrid}>
                    {exercises.map((exercise) => (
                      <Pressable
                        key={exercise.id}
                        onPress={() => toggleExercise(exercise.id)}
                        style={[styles.exerciseCard, exercise.selected && styles.exerciseCardSelected]}
                      >
                        <View style={styles.exerciseCardHeader}>
                          <Text style={[styles.exerciseTitle, exercise.selected && styles.exerciseTitleSelected]}>
                            {exercise.name}
                          </Text>
                          <Text style={[styles.levelBadge, exercise.selected && styles.levelBadgeSelected]}>
                            {exercise.level}
                          </Text>
                        </View>
                        <Text style={[styles.exerciseDescription, exercise.selected && styles.exerciseDescriptionSelected]}>
                          {exercise.description}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.inputRow}>
                    <TextInput
                      value={exerciseName}
                      onChangeText={setExerciseName}
                      onSubmitEditing={addExercise}
                      placeholder="Custom oefening"
                      placeholderTextColor="#8a8a8a"
                      returnKeyType="done"
                      style={styles.input}
                    />
                    <Pressable style={styles.smallButton} onPress={addExercise}>
                      <Text style={styles.smallButtonText}>+</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {setupStep === 'review' && (
                <>
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.kicker}>Spelers</Text>
                      <Text style={styles.itemLabel}>{orderedPlayers.map((player) => player.name).join(', ')}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.kicker}>Modus</Text>
                      <Text style={styles.itemLabel}>{selectedModeLabel}</Text>
                      {selectedMode === 'random' && <Text style={styles.itemMeta}>Random reps: 1-{selectedRandomMaxReps}</Text>}
                      {selectedMode === 'time' && <Text style={styles.itemMeta}>Timer: {selectedTimerSeconds}s</Text>}
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.kicker}>Games</Text>
                      <Text style={styles.itemLabel}>{playStyle === 'solo' ? 'Solo record' : selectedMatchLabel}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.kicker}>Rust</Text>
                      <Text style={styles.itemLabel}>{selectedRestSeconds === 0 ? 'Geen pauze' : `${selectedRestSeconds}s`}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.kicker}>Straffen</Text>
                      <Text style={styles.itemLabel}>{penaltiesEnabled ? `${penaltySourceLabel} - ${availablePenalties.length} actief` : 'Uit'}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.kicker}>Oefeningen</Text>
                      <Text style={styles.itemLabel}>{selectedExercises.map((exercise) => exercise.name).join(', ')}</Text>
                    </View>
                  </View>

                  <View style={styles.proPreview}>
                    <Text style={styles.kicker}>Later Pro</Text>
                    <Text style={styles.proText}>
                      Onbeperkte spelers, custom oefeningen, alle modi, statistieken en tv-modus passen straks goed in een
                      eenmalige upgrade.
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.setupNavigation}>
                <Pressable
                  disabled={isFirstSetupStep}
                  onPress={goToPreviousSetupStep}
                  style={[styles.backButton, isFirstSetupStep && styles.disabledButton]}
                >
                  <Text style={[styles.backButtonText, isFirstSetupStep && styles.disabledButtonText]}>Terug</Text>
                </Pressable>
                <Pressable
                  disabled={Boolean(setupBlockingMessage)}
                  style={[styles.primaryButtonCompact, setupBlockingMessage && styles.disabledButton]}
                  onPress={goToNextSetupStep}
                >
                  <Text style={styles.primaryButtonText}>{isLastSetupStep ? 'Start game' : 'Verder'}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {game && !isFinished && currentExercise && currentPlayer && (
            <View style={styles.gamePanel}>
              <View style={styles.roundHeader}>
                <Text style={styles.kicker}>
                  {isSoloGame ? 'Solo record' : modeLabel + ' - game ' + currentGameNumber + ' van ' + game.matchGames} - oefening {currentExerciseNumber} van {game.exerciseOrder.length}
                </Text>
                <Text style={styles.sectionTitle}>{currentExercise.name}</Text>
                <Text style={styles.subtitleSmall}>{currentExercise.tip}</Text>
              </View>

              <View style={[styles.counterPanel, isResting && styles.counterPanelRest]}>
                {isResting ? (
                  <>
                    <Text style={styles.turnLabel}>Rust</Text>
                    <Text style={styles.repCount}>{restSecondsLeft}</Text>
                    <Text style={styles.repLabel}>seconden tot {currentPlayer.name}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.turnLabel}>{currentPlayer.name}</Text>
                    <Text style={styles.repCount}>{game.repCount}</Text>
                    <Text style={styles.repLabel}>{currentExercise.name}</Text>
                    <Text style={styles.calloutText}>
                      "{currentPlayer.name}, {game.repCount} {currentExercise.name}"
                    </Text>
                    {game.mode === 'time' && (
                      <Text style={styles.timerText}>Nog {game.turnSecondsLeft ?? 0}s - te laat is af</Text>
                    )}
                  </>
                )}
              </View>

              <View style={styles.activeStrip}>
                {activePlayers.map((player, index) => (
                  <View
                    key={player.id}
                    style={[styles.activePill, player.id === currentPlayer.id && styles.activePillCurrent]}
                  >
                    <Text
                      style={[
                        styles.activePillText,
                        player.id === currentPlayer.id && styles.activePillTextCurrent
                      ]}
                    >
                      {index + 1}. {player.name}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.liveScorePanel}>
                <Text style={styles.panelTitle}>Live score</Text>
                {leaderboard.slice(0, 4).map((entry, index) => (
                  <View key={entry.playerId} style={styles.scoreRow}>
                    <Text style={styles.scoreText}>{index + 1}. {entry.name}</Text>
                    <Text style={styles.scoreMeta}>{isSoloGame ? 'record ' + entry.bestRep : entry.wins + ' winst - best ' + entry.bestRep}</Text>
                  </View>
                ))}
              </View>

              {isResting ? (
                <Pressable style={styles.primaryButton} onPress={skipRest}>
                  <Text style={styles.primaryButtonText}>Rust overslaan</Text>
                </Pressable>
              ) : (
                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} onPress={isSoloGame ? finishSoloAttempt : eliminatePlayer}>
                    <Text style={styles.secondaryButtonText}>{isSoloGame ? 'Stop record' : 'Opgegeven'}</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButtonCompact} onPress={completeTurn}>
                    <Text style={styles.primaryButtonText}>{isSoloGame ? 'Gehaald' : 'Voltooid'}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {game && isFinished && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{isSoloGame ? 'Solo record' : 'Eindscore games'}</Text>
              {matchWinner && (
                <View style={styles.championCard}>
                  <Text style={styles.championKicker}>{isSoloGame ? 'Record' : 'Winnaar'}</Text>
                  <Text style={styles.championName}>{matchWinner.name}</Text>
                  <Text style={styles.championScore}>
                    {isSoloGame ? matchWinner.bestRep + ' reps' : matchWinner.wins + '-' + (runnerUp?.wins ?? 0) + ' gewonnen'}
                  </Text>
                  <Text style={styles.championMeta}>
                    {isSoloGame ? matchWinner.name + ' haalde een record van ' + matchWinner.bestRep + ' reps.' : matchWinner.name + ' won ' + matchWinner.wins + ' van de ' + game.results.length + ' gespeelde games.'}
                  </Text>
                  {runnerUp && matchLoserPenalty && (
                    <View style={styles.finalPenaltyBox}>
                      <Text style={styles.finalPenaltyLabel}>Straf voor {runnerUp.name}</Text>
                      <Text style={styles.finalPenaltyText}>{matchLoserPenalty}</Text>
                    </View>
                  )}
                </View>
              )}
              <View style={styles.list}>
                {game.results.map((result, index) => (
                  <View key={`${result.exerciseName}-${index}`} style={styles.resultItem}>
                    <View style={styles.itemTextBlock}>
                      <Text style={styles.itemLabel}>{result.exerciseName}</Text>
                      <Text style={styles.itemMeta}>Winnaar: {result.winnerName}</Text>
                      {result.loserName ? <Text style={styles.itemMeta}>Verliezer: {result.loserName}</Text> : null}
                      <Text style={styles.itemMeta}>Laatste gehaalde beurt: {result.topRep}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.scorePanel}>
                {leaderboard.map((entry, index) => (
                  <View key={entry.playerId} style={styles.scoreRow}>
                    <View>
                      <Text style={styles.itemLabel}>{index + 1}. {entry.name}</Text>
                      <Text style={styles.itemMeta}>{entry.completedTurns} beurten voltooid</Text>
                    </View>
                    <Text style={styles.winnerText}>{isSoloGame ? 'record ' + entry.bestRep + ' - ' + entry.totalReps + ' reps totaal' : entry.wins + ' winst - ' + entry.totalReps + ' reps'}</Text>
                  </View>
                ))}
              </View>

              <Pressable style={styles.sharePreviewButton}>
                <Text style={styles.sharePreviewText}>
                  Deelbare uitslag komt later: deze score is alvast klaar als samenvatting.
                </Text>
              </Pressable>

              <Pressable style={styles.primaryButton} onPress={resetGame}>
                <Text style={styles.primaryButtonText}>Nieuwe game</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212'
  },
  keyboardArea: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 28,
    gap: 20
  },
  header: {
    gap: 12,
    paddingTop: 16
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  appLogo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#0b1520'
  },
  brandTextBlock: {
    flex: 1,
    minWidth: 0
  },
  kicker: {
    color: '#8fd7c7',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  title: {
    color: '#f7f1e8',
    fontSize: 42,
    fontWeight: '900'
  },
  subtitle: {
    color: '#c8c1b8',
    fontSize: 16,
    lineHeight: 23
  },
  subtitleSmall: {
    color: '#c8c1b8',
    fontSize: 14,
    lineHeight: 20
  },
  section: {
    gap: 16
  },
  setupSection: {
    flexGrow: 1,
    minHeight: 0
  },
  sectionTitle: {
    color: '#f7f1e8',
    fontSize: 24,
    fontWeight: '800'
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14
  },
  setupTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4
  },
  quickStartButton: {
    minHeight: 42,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b281d',
    borderWidth: 1,
    borderColor: '#f2c86b'
  },
  quickStartText: {
    color: '#f2c86b',
    fontSize: 13,
    fontWeight: '900'
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 7
  },
  progressDot: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#303030'
  },
  progressDotActive: {
    backgroundColor: '#8fd7c7'
  },
  setupNavigation: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 20
  },
  backButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#363636'
  },
  backButtonText: {
    color: '#f7f1e8',
    fontSize: 17,
    fontWeight: '900'
  },
  disabledButton: {
    opacity: 0.45
  },
  disabledButtonText: {
    color: '#8a8a8a'
  },
  summaryGrid: {
    gap: 10
  },
  summaryItem: {
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#303030',
    gap: 4
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10
  },
  input: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#363636',
    borderRadius: 8,
    color: '#f7f1e8',
    backgroundColor: '#1d1d1d',
    paddingHorizontal: 14,
    fontSize: 16
  },
  smallButton: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8fd7c7'
  },
  smallButtonText: {
    color: '#121212',
    fontSize: 28,
    fontWeight: '800'
  },
  list: {
    gap: 10
  },
  listItem: {
    minHeight: 64,
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#303030',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  itemTextBlock: {
    flex: 1,
    gap: 3
  },
  itemLabel: {
    color: '#f7f1e8',
    fontSize: 17,
    fontWeight: '700'
  },
  itemMeta: {
    color: '#a7a09a',
    fontSize: 13,
    marginTop: 3
  },
  helperText: {
    color: '#c8c1b8',
    fontSize: 13,
    lineHeight: 18
  },
  removeText: {
    color: '#f58a76',
    fontSize: 13,
    fontWeight: '700'
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  orderButton: {
    minHeight: 34,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#3a3a3a'
  },
  orderButtonDisabled: {
    opacity: 0.45
  },
  orderButtonText: {
    color: '#d8d2c9',
    fontSize: 12,
    fontWeight: '900'
  },
  optionGrid: {
    gap: 10
  },
  optionCard: {
    minHeight: 74,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#1d1d1d',
    padding: 14,
    gap: 4
  },
  optionCardSelected: {
    borderColor: '#f2c86b',
    backgroundColor: '#2b281d'
  },
  optionTitle: {
    color: '#f7f1e8',
    fontSize: 16,
    fontWeight: '900'
  },
  optionTitleSelected: {
    color: '#f2c86b'
  },
  optionDescription: {
    color: '#a7a09a',
    fontSize: 13,
    lineHeight: 18
  },
  optionDescriptionSelected: {
    color: '#f0dfb1'
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#303030'
  },
  segmentButtonSelected: {
    backgroundColor: '#8fd7c7',
    borderColor: '#8fd7c7'
  },
  segmentButtonText: {
    color: '#d8d2c9',
    fontWeight: '900'
  },
  segmentButtonTextSelected: {
    color: '#121212'
  },
  segmentButtonMeta: {
    color: '#8a8a8a',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center'
  },
  segmentButtonMetaSelected: {
    color: '#23443d'
  },
  restGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  restButton: {
    minWidth: 104,
    minHeight: 56,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#303030'
  },
  restButtonSelected: {
    backgroundColor: '#8fd7c7',
    borderColor: '#8fd7c7'
  },
  restButtonText: {
    color: '#d8d2c9',
    fontSize: 14,
    fontWeight: '900'
  },
  restButtonTextSelected: {
    color: '#121212'
  },
  restButtonMeta: {
    color: '#8a8a8a',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2
  },
  restButtonMetaSelected: {
    color: '#23443d'
  },
  toggleRow: {
    minHeight: 70,
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#303030',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  toggleRowEnabled: {
    borderColor: '#8fd7c7'
  },
  toggleText: {
    color: '#8fd7c7',
    fontSize: 15,
    fontWeight: '900'
  },
  penaltyEditor: {
    gap: 10
  },
  defaultPenaltyList: {
    gap: 8
  },
  defaultPenaltyItem: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#303030',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  defaultPenaltyItemSelected: {
    borderColor: '#8fd7c7'
  },
  defaultPenaltyText: {
    flex: 1,
    color: '#8a8a8a',
    fontSize: 14,
    fontWeight: '800'
  },
  defaultPenaltyTextSelected: {
    color: '#f7f1e8'
  },
  defaultPenaltyState: {
    color: '#f58a76',
    fontSize: 13,
    fontWeight: '900'
  },
  defaultPenaltyStateSelected: {
    color: '#8fd7c7'
  },
  customPenaltyList: {
    gap: 8
  },
  customPenaltyItem: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#303030',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  customPenaltyText: {
    flex: 1,
    color: '#f7f1e8',
    fontSize: 14,
    fontWeight: '800'
  },
  exerciseGrid: {
    gap: 10
  },
  exerciseCard: {
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#303030',
    gap: 8
  },
  exerciseCardSelected: {
    backgroundColor: '#f7f1e8',
    borderColor: '#f7f1e8'
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  exerciseTitle: {
    flex: 1,
    color: '#f7f1e8',
    fontSize: 17,
    fontWeight: '900'
  },
  exerciseTitleSelected: {
    color: '#121212'
  },
  levelBadge: {
    color: '#8fd7c7',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  levelBadgeSelected: {
    color: '#83610e'
  },
  exerciseDescription: {
    color: '#a7a09a',
    fontSize: 13,
    lineHeight: 18
  },
  exerciseDescriptionSelected: {
    color: '#34302d'
  },
  proPreview: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    backgroundColor: '#171717',
    padding: 14,
    gap: 6
  },
  proText: {
    color: '#c8c1b8',
    fontSize: 14,
    lineHeight: 20
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8fd7c7',
    marginTop: 8,
    paddingHorizontal: 14
  },
  primaryButtonCompact: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8fd7c7',
    paddingHorizontal: 12
  },
  primaryButtonText: {
    color: '#111',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center'
  },
  gamePanel: {
    gap: 18
  },
  roundHeader: {
    gap: 6
  },
  counterPanel: {
    minHeight: 300,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f1e8',
    gap: 4,
    padding: 20
  },
  counterPanelRest: {
    backgroundColor: '#f2c86b'
  },
  turnLabel: {
    color: '#121212',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center'
  },
  repCount: {
    color: '#121212',
    fontSize: 104,
    fontWeight: '900'
  },
  repLabel: {
    color: '#34302d',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center'
  },
  calloutText: {
    color: '#675d50',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10
  },
  timerText: {
    color: '#b64535',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8
  },
  activeStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  activePill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#242424'
  },
  activePillCurrent: {
    backgroundColor: '#f2c86b'
  },
  activePillText: {
    color: '#d8d2c9',
    fontWeight: '800'
  },
  activePillTextCurrent: {
    color: '#121212'
  },
  liveScorePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#1d1d1d',
    padding: 12,
    gap: 6
  },
  panelTitle: {
    color: '#f7f1e8',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2
  },
  scoreText: {
    color: '#f7f1e8',
    fontSize: 15,
    fontWeight: '800'
  },
  scoreMeta: {
    color: '#8fd7c7',
    fontSize: 13,
    fontWeight: '800'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10
  },
  secondaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b2422',
    borderWidth: 1,
    borderColor: '#684038',
    paddingHorizontal: 12
  },
  secondaryButtonText: {
    color: '#f58a76',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center'
  },
  championCard: {
    borderRadius: 8,
    padding: 18,
    backgroundColor: '#f2c86b',
    borderWidth: 1,
    borderColor: '#f6d986',
    gap: 4
  },
  championKicker: {
    color: '#4b3710',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  championName: {
    color: '#121212',
    fontSize: 32,
    fontWeight: '900'
  },
  championScore: {
    color: '#121212',
    fontSize: 20,
    fontWeight: '900'
  },
  championMeta: {
    color: '#4b3710',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4
  },
  finalPenaltyBox: {
    borderRadius: 8,
    backgroundColor: '#121212',
    padding: 12,
    marginTop: 12,
    gap: 3
  },
  finalPenaltyLabel: {
    color: '#f58a76',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  finalPenaltyText: {
    color: '#f7f1e8',
    fontSize: 16,
    fontWeight: '900'
  },
  resultItem: {
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#303030'
  },
  penaltyText: {
    color: '#f2c86b',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5
  },
  winnerText: {
    color: '#8fd7c7',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right'
  },
  scorePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#1d1d1d'
  },
  scoreRow: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#303030'
  },
  sharePreviewButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    backgroundColor: '#171717',
    padding: 14
  },
  sharePreviewText: {
    color: '#c8c1b8',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center'
  }
});








































