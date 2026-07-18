import { useMemo, useState } from 'react';
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

type Player = {
  id: string;
  name: string;
};

type Exercise = {
  id: string;
  name: string;
  selected: boolean;
};

type RoundResult = {
  exerciseName: string;
  winnerName: string;
  topRep: number;
};

type GameState = {
  exerciseIndex: number;
  turnIndex: number;
  repCount: number;
  activePlayerIds: string[];
  results: RoundResult[];
  lastCompletedRep: number;
};

const starterExercises: Exercise[] = [
  { id: 'push-ups', name: 'Push-ups', selected: true },
  { id: 'sit-ups', name: 'Sit-ups', selected: true },
  { id: 'squats', name: 'Squats', selected: true },
  { id: 'burpees', name: 'Burpees', selected: false },
  { id: 'lunges', name: 'Lunges', selected: false },
  { id: 'plank-taps', name: 'Plank taps', selected: false }
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

export default function App() {
  const [players, setPlayers] = useState<Player[]>(starterPlayers);
  const [playerName, setPlayerName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>(starterExercises);
  const [exerciseName, setExerciseName] = useState('');
  const [game, setGame] = useState<GameState | null>(null);

  const orderedPlayers = useMemo(() => sortPlayers(players), [players]);
  const selectedExercises = useMemo(() => exercises.filter((exercise) => exercise.selected), [exercises]);

  const currentExercise = game ? selectedExercises[game.exerciseIndex] : null;
  const activePlayers = game
    ? game.activePlayerIds
        .map((id) => orderedPlayers.find((player) => player.id === id))
        .filter((player): player is Player => Boolean(player))
    : [];
  const currentPlayer = game ? activePlayers[game.turnIndex] : null;
  const totalWins = game?.results.reduce<Record<string, number>>((score, result) => {
    score[result.winnerName] = (score[result.winnerName] ?? 0) + 1;
    return score;
  }, {});

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
      { id: createId('exercise'), name: trimmedName, selected: true }
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
      Alert.alert('Kies een oefening', 'Selecteer minimaal één oefening voor deze game.');
      return;
    }

    setGame({
      exerciseIndex: 0,
      turnIndex: 0,
      repCount: 1,
      activePlayerIds: orderedPlayers.map((player) => player.id),
      results: [],
      lastCompletedRep: 0
    });
  };

  const completeTurn = () => {
    if (!game || activePlayers.length === 0) return;

    setGame({
      ...game,
      turnIndex: (game.turnIndex + 1) % activePlayers.length,
      repCount: game.repCount + 1,
      lastCompletedRep: game.repCount
    });
  };

  const finishExercise = (winner: Player, topRep: number) => {
    if (!game || !currentExercise) return;

    const nextResults = [
      ...game.results,
      {
        exerciseName: currentExercise.name,
        winnerName: winner.name,
        topRep
      }
    ];

    if (game.exerciseIndex + 1 >= selectedExercises.length) {
      setGame({
        ...game,
        results: nextResults,
        exerciseIndex: selectedExercises.length,
        activePlayerIds: [],
        turnIndex: 0
      });
      return;
    }

    setGame({
      exerciseIndex: game.exerciseIndex + 1,
      turnIndex: 0,
      repCount: 1,
      activePlayerIds: orderedPlayers.map((player) => player.id),
      results: nextResults,
      lastCompletedRep: 0
    });
  };

  const eliminatePlayer = () => {
    if (!game || !currentPlayer || activePlayers.length === 0) return;

    if (activePlayers.length === 2) {
      const winner = activePlayers.find((player) => player.id !== currentPlayer.id);
      if (winner) finishExercise(winner, game.lastCompletedRep);
      return;
    }

    const nextActiveIds = activePlayers.filter((player) => player.id !== currentPlayer.id).map((player) => player.id);
    const nextTurnIndex = game.turnIndex >= nextActiveIds.length ? 0 : game.turnIndex;

    setGame({
      ...game,
      activePlayerIds: nextActiveIds,
      turnIndex: nextTurnIndex
    });
  };

  const resetGame = () => setGame(null);
  const isFinished = Boolean(game && game.exerciseIndex >= selectedExercises.length);

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
            <Text style={styles.subtitle}>Doe steeds één herhaling meer. Wie als laatste overblijft wint de oefening.</Text>
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
                    <View>
                      <Text style={styles.itemLabel}>{player.name}</Text>
                      <Text style={styles.itemMeta}>Beurt {index + 1}</Text>
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

              <Text style={styles.sectionTitle}>Oefeningen</Text>
              <View style={styles.chipGrid}>
                {exercises.map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    onPress={() => toggleExercise(exercise.id)}
                    style={[styles.chip, exercise.selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, exercise.selected && styles.chipTextSelected]}>
                      {exercise.name}
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

              <Pressable style={styles.primaryButton} onPress={startGame}>
                <Text style={styles.primaryButtonText}>Start game</Text>
              </Pressable>
            </View>
          )}

          {game && !isFinished && currentExercise && currentPlayer && (
            <View style={styles.gamePanel}>
              <View style={styles.roundHeader}>
                <Text style={styles.kicker}>Oefening {game.exerciseIndex + 1} van {selectedExercises.length}</Text>
                <Text style={styles.sectionTitle}>{currentExercise.name}</Text>
              </View>

              <View style={styles.counterPanel}>
                <Text style={styles.turnLabel}>{currentPlayer.name}</Text>
                <Text style={styles.repCount}>{game.repCount}</Text>
                <Text style={styles.repLabel}>herhalingen</Text>
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

              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryButton} onPress={eliminatePlayer}>
                  <Text style={styles.secondaryButtonText}>Opgegeven</Text>
                </Pressable>
                <Pressable style={styles.primaryButtonCompact} onPress={completeTurn}>
                  <Text style={styles.primaryButtonText}>Voltooid</Text>
                </Pressable>
              </View>
            </View>
          )}

          {game && isFinished && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Eindscore</Text>
              <View style={styles.list}>
                {game.results.map((result) => (
                  <View key={result.exerciseName} style={styles.listItem}>
                    <View>
                      <Text style={styles.itemLabel}>{result.exerciseName}</Text>
                      <Text style={styles.itemMeta}>Laatste gehaalde beurt: {result.topRep}</Text>
                    </View>
                    <Text style={styles.winnerText}>{result.winnerName}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.scorePanel}>
                {Object.entries(totalWins ?? {})
                  .sort(([, firstWins], [, secondWins]) => secondWins - firstWins)
                  .map(([name, wins], index) => (
                    <View key={name} style={styles.scoreRow}>
                      <Text style={styles.itemLabel}>{index + 1}. {name}</Text>
                      <Text style={styles.winnerText}>{wins} winst</Text>
                    </View>
                  ))}
              </View>

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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  chip: {
    minHeight: 42,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    backgroundColor: '#1d1d1d'
  },
  chipSelected: {
    backgroundColor: '#f2c86b',
    borderColor: '#f2c86b'
  },
  chipText: {
    color: '#d7d1c8',
    fontSize: 15,
    fontWeight: '700'
  },
  chipTextSelected: {
    color: '#151515'
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8fd7c7',
    marginTop: 8
  },
  primaryButtonCompact: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8fd7c7'
  },
  primaryButtonText: {
    color: '#111',
    fontSize: 17,
    fontWeight: '900'
  },
  gamePanel: {
    gap: 18
  },
  roundHeader: {
    gap: 6
  },
  counterPanel: {
    minHeight: 260,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f1e8',
    gap: 4,
    padding: 20
  },
  turnLabel: {
    color: '#121212',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center'
  },
  repCount: {
    color: '#121212',
    fontSize: 108,
    fontWeight: '900'
  },
  repLabel: {
    color: '#34302d',
    fontSize: 18,
    fontWeight: '800'
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
    borderColor: '#684038'
  },
  secondaryButtonText: {
    color: '#f58a76',
    fontSize: 17,
    fontWeight: '900'
  },
  winnerText: {
    color: '#8fd7c7',
    fontSize: 15,
    fontWeight: '900'
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#303030'
  }
});
