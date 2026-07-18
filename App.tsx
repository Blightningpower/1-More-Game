import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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

type GameMode = 'classic' | 'double' | 'time' | 'random' | 'tournament';
type Difficulty = 'easy' | 'normal' | 'hard';

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
  stats: Record<string, PlayerStats>;
  turnSecondsLeft: number | null;
};

const gameModes: Array<{ id: GameMode; name: string; description: string }> = [
  { id: 'classic', name: 'Classic', description: 'Elke beurt komt er 1 herhaling bij.' },
  { id: 'double', name: 'Double Up', description: 'Elke beurt komen er 2 herhalingen bij.' },
  { id: 'time', name: 'Time Attack', description: 'Elke beurt heeft een korte timer.' },
  { id: 'random', name: 'Random', description: 'De app kiest wisselende sprongen.' },
  { id: 'tournament', name: 'Tournament', description: 'Meerdere oefeningen met eindklassement.' }
];

const difficultyOptions: Array<{ id: Difficulty; name: string; restSeconds: number; timeLimit: number }> = [
  { id: 'easy', name: 'Light', restSeconds: 20, timeLimit: 30 },
  { id: 'normal', name: 'Normal', restSeconds: 15, timeLimit: 20 },
  { id: 'hard', name: 'Savage', restSeconds: 8, timeLimit: 12 }
];

const penalties = [
  'Maak de winnaar een compliment.',
  'Doe 10 jumping jacks.',
  'Haal water voor de groep.',
  'Kies de volgende oefening.',
  'Doe een victory dance van 5 seconden.',
  'Start de volgende ronde als eerste.'
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
    selected: true,
    description: 'Kom gecontroleerd omhoog en laat je rug rustig terugzakken.',
    tip: 'Spreek vooraf af of handen achter het hoofd of gekruist op de borst tellen.',
    level: 'easy'
  },
  {
    id: 'squats',
    name: 'Squats',
    selected: true,
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

const starterPlayers: Player[] = [
  { id: 'player-1', name: 'Abram' },
  { id: 'player-2', name: 'Ben' }
];

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('nl-NL');

const sortPlayers = (players: Player[]) =>
  [...players].sort((first, second) =>
    normalizeName(first.name).localeCompare(normalizeName(second.name), 'nl-NL')
  );

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const shuffle = <T,>(items: T[]) =>
  [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((first, second) => first.sort - second.sort)
    .map(({ item }) => item);

const getModeIncrement = (mode: GameMode) => {
  if (mode === 'double') return 2;
  if (mode === 'random') return Math.floor(Math.random() * 3) + 1;
  return 1;
};

const getStartingRep = (mode: GameMode) => (mode === 'random' ? Math.floor(Math.random() * 5) + 1 : 1);

const getDifficultyConfig = (difficulty: Difficulty) =>
  difficultyOptions.find((option) => option.id === difficulty) ?? difficultyOptions[1];

export default function App() {
  const [players, setPlayers] = useState<Player[]>(starterPlayers);
  const [playerName, setPlayerName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>(starterExercises);
  const [exerciseName, setExerciseName] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [penaltiesEnabled, setPenaltiesEnabled] = useState(true);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [game, setGame] = useState<GameState | null>(null);

  const orderedPlayers = useMemo(() => sortPlayers(players), [players]);
  const selectedExercises = useMemo(() => exercises.filter((exercise) => exercise.selected), [exercises]);
  const difficultyConfig = getDifficultyConfig(game?.difficulty ?? selectedDifficulty);

  const currentExercise = game ? game.exerciseOrder[game.exerciseIndex] : null;
  const activePlayers = game
    ? game.activePlayerIds
        .map((id) => orderedPlayers.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player))
    : [];
  const currentPlayer = game ? activePlayers[game.turnIndex] : null;
  const isFinished = Boolean(game && game.exerciseIndex >= game.exerciseOrder.length);
  const isResting = restSecondsLeft > 0;
  const modeLabel = gameModes.find((mode) => mode.id === (game?.mode ?? selectedMode))?.name ?? 'Classic';

  const totalWins = game?.results.reduce<Record<string, number>>((score, result) => {
    score[result.winnerName] = (score[result.winnerName] ?? 0) + 1;
    return score;
  }, {});

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

    if (game.turnSecondsLeft <= 0) return;

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

    setPlayers((currentPlayers) => [...currentPlayers, { id: createId('player'), name: trimmedName }]);
    setPlayerName('');
  };

  const removePlayer = (playerId: string) => {
    setPlayers((currentPlayers) => currentPlayers.filter((player) => player.id !== playerId));
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
        description: 'Eigen oefening. Spreek voor de start af wanneer een herhaling telt.',
        tip: 'Houd de uitvoering simpel en eerlijk.',
        level: selectedDifficulty
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

  const startGame = () => {
    if (orderedPlayers.length < 2) {
      Alert.alert('Minimaal twee spelers', 'Voeg minimaal twee spelers toe om te starten.');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Kies een oefening', 'Selecteer minimaal een oefening voor deze game.');
      return;
    }

    const exerciseOrder = selectedMode === 'random' ? shuffle(selectedExercises) : selectedExercises;
    const stats = orderedPlayers.reduce<Record<string, PlayerStats>>((nextStats, player) => {
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
      repCount: getStartingRep(selectedMode),
      activePlayerIds: orderedPlayers.map((player) => player.id),
      results: [],
      lastCompletedRep: 0,
      mode: selectedMode,
      difficulty: selectedDifficulty,
      exerciseOrder,
      stats,
      turnSecondsLeft: selectedMode === 'time' ? getDifficultyConfig(selectedDifficulty).timeLimit : null
    });
  };

  const completeTurn = () => {
    if (!game || !currentPlayer || activePlayers.length === 0 || isResting) return;

    const increment = getModeIncrement(game.mode);
    const nextTurnIndex = (game.turnIndex + 1) % activePlayers.length;
    const nextRepCount = game.repCount + increment;
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
      turnSecondsLeft: game.mode === 'time' ? difficultyConfig.timeLimit : null
    });

    if (difficultyConfig.restSeconds > 0) {
      setRestSecondsLeft(difficultyConfig.restSeconds);
    }
  };

  const finishExercise = (winner: Player, loser: Player, topRep: number) => {
    if (!game || !currentExercise) return;

    const penalty = penaltiesEnabled ? penalties[Math.floor(Math.random() * penalties.length)] : 'Geen strafopdracht';
    const nextResults = [
      ...game.results,
      {
        exerciseName: currentExercise.name,
        winnerName: winner.name,
        loserName: loser.name,
        topRep,
        penalty
      }
    ];

    setRestSecondsLeft(0);

    if (game.exerciseIndex + 1 >= game.exerciseOrder.length) {
      setGame({
        ...game,
        results: nextResults,
        exerciseIndex: game.exerciseOrder.length,
        activePlayerIds: [],
        turnIndex: 0
      });
      return;
    }

    setGame({
      ...game,
      exerciseIndex: game.exerciseIndex + 1,
      turnIndex: 0,
      repCount: getStartingRep(game.mode),
      activePlayerIds: orderedPlayers.map((player) => player.id),
      results: nextResults,
      lastCompletedRep: 0,
      turnSecondsLeft: game.mode === 'time' ? difficultyConfig.timeLimit : null
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
      turnSecondsLeft: game.mode === 'time' ? difficultyConfig.timeLimit : null
    });
  };

  const skipRest = () => setRestSecondsLeft(0);

  const resetGame = () => {
    setRestSecondsLeft(0);
    setGame(null);
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
            <Text style={styles.kicker}>Party fitness</Text>
            <Text style={styles.title}>1 More Game</Text>
            <Text style={styles.subtitle}>
              Doe steeds een herhaling meer. De app regelt volgorde, rondes, rust en score.
            </Text>
          </View>

          {!game && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spelers</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={playerName}
                  onChangeText={setPlayerName}
                  onSubmitEditing={addPlayer}
                  placeholder="Naam speler"
                  placeholderTextColor="#8a8a8a"
                  returnKeyType="done"
                  style={styles.input}
                />
                <Pressable style={styles.smallButton} onPress={addPlayer}>
                  <Text style={styles.smallButtonText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.list}>
                {orderedPlayers.map((player, index) => (
                  <View key={player.id} style={styles.listItem}>
                    <View style={styles.itemTextBlock}>
                      <Text style={styles.itemLabel}>{player.name}</Text>
                      <Text style={styles.itemMeta}>Beurt {index + 1} op alfabetische volgorde</Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`${player.name} verwijderen`}
                      hitSlop={10}
                      onPress={() => removePlayer(player.id)}
                    >
                      <Text style={styles.removeText}>Verwijder</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Spelmodus</Text>
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

              <Text style={styles.sectionTitle}>Moeilijkheid</Text>
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
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => setPenaltiesEnabled((enabled) => !enabled)}
                style={[styles.toggleRow, penaltiesEnabled && styles.toggleRowEnabled]}
              >
                <View>
                  <Text style={styles.itemLabel}>Strafopdracht verliezer</Text>
                  <Text style={styles.itemMeta}>
                    {penaltiesEnabled ? 'Aan: de app kiest na elke oefening iets kleins.' : 'Uit'}
                  </Text>
                </View>
                <Text style={styles.toggleText}>{penaltiesEnabled ? 'Aan' : 'Uit'}</Text>
              </Pressable>

              <Text style={styles.sectionTitle}>Oefeningen</Text>
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
                  placeholder="Eigen oefening"
                  placeholderTextColor="#8a8a8a"
                  returnKeyType="done"
                  style={styles.input}
                />
                <Pressable style={styles.smallButton} onPress={addExercise}>
                  <Text style={styles.smallButtonText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.proPreview}>
                <Text style={styles.kicker}>Later Pro</Text>
                <Text style={styles.proText}>
                  Onbeperkte spelers, eigen oefeningen, alle modi, statistieken en tv-modus passen straks goed in een
                  eenmalige upgrade.
                </Text>
              </View>

              <Pressable style={styles.primaryButton} onPress={startGame}>
                <Text style={styles.primaryButtonText}>Start game</Text>
              </Pressable>
            </View>
          )}

          {game && !isFinished && currentExercise && currentPlayer && (
            <View style={styles.gamePanel}>
              <View style={styles.roundHeader}>
                <Text style={styles.kicker}>
                  {modeLabel} - oefening {game.exerciseIndex + 1} van {game.exerciseOrder.length}
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
                      <Text style={styles.timerText}>Nog {game.turnSecondsLeft ?? 0}s voor deze beurt</Text>
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
                    <Text style={styles.scoreMeta}>{entry.wins} winst - best {entry.bestRep}</Text>
                  </View>
                ))}
              </View>

              {isResting ? (
                <Pressable style={styles.primaryButton} onPress={skipRest}>
                  <Text style={styles.primaryButtonText}>Rust overslaan</Text>
                </Pressable>
              ) : (
                <View style={styles.actionRow}>
                  <Pressable style={styles.secondaryButton} onPress={eliminatePlayer}>
                    <Text style={styles.secondaryButtonText}>Opgegeven</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButtonCompact} onPress={completeTurn}>
                    <Text style={styles.primaryButtonText}>Voltooid</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {game && isFinished && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Eindscore</Text>
              <View style={styles.list}>
                {game.results.map((result) => (
                  <View key={result.exerciseName} style={styles.resultItem}>
                    <View style={styles.itemTextBlock}>
                      <Text style={styles.itemLabel}>{result.exerciseName}</Text>
                      <Text style={styles.itemMeta}>Winnaar: {result.winnerName}</Text>
                      <Text style={styles.itemMeta}>Verliezer: {result.loserName}</Text>
                      <Text style={styles.itemMeta}>Laatste gehaalde beurt: {result.topRep}</Text>
                      {penaltiesEnabled && <Text style={styles.penaltyText}>Straf: {result.penalty}</Text>}
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
                    <Text style={styles.winnerText}>{entry.wins} winst - {entry.totalReps} reps</Text>
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
    padding: 20,
    paddingBottom: 40,
    gap: 20
  },
  header: {
    gap: 8,
    paddingTop: 16
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
  sectionTitle: {
    color: '#f7f1e8',
    fontSize: 24,
    fontWeight: '800'
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
  removeText: {
    color: '#f58a76',
    fontSize: 13,
    fontWeight: '700'
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
