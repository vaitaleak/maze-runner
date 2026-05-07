import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Dimensions, PanResponder,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');
const SIZES = [8, 12, 16, 20];

type Cell = { top: boolean; right: boolean; bottom: boolean; left: boolean; visited: boolean };

function createMaze(size: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: true, right: true, bottom: true, left: true, visited: false }))
  );

  // Recursive backtracker
  const stack: [number, number][] = [[0, 0]];
  grid[0][0].visited = true;

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const neighbors: [number, number, string][] = [];
    if (r > 0 && !grid[r-1][c].visited) neighbors.push([r-1, c, 'top']);
    if (r < size-1 && !grid[r+1][c].visited) neighbors.push([r+1, c, 'bottom']);
    if (c > 0 && !grid[r][c-1].visited) neighbors.push([r, c-1, 'left']);
    if (c < size-1 && !grid[r][c+1].visited) neighbors.push([r, c+1, 'right']);

    if (neighbors.length === 0) { stack.pop(); continue; }

    const [nr, nc, dir] = neighbors[Math.floor(Math.random() * neighbors.length)];
    // Remove walls
    if (dir === 'top') { grid[r][c].top = false; grid[nr][nc].bottom = false; }
    if (dir === 'bottom') { grid[r][c].bottom = false; grid[nr][nc].top = false; }
    if (dir === 'left') { grid[r][c].left = false; grid[nr][nc].right = false; }
    if (dir === 'right') { grid[r][c].right = false; grid[nr][nc].left = false; }
    grid[nr][nc].visited = true;
    stack.push([nr, nc]);
  }
  return grid;
}

export default function App() {
  const [sizeIdx, setSizeIdx] = useState(0);
  const size = SIZES[sizeIdx];
  const [maze, setMaze] = useState<Cell[][]>(() => createMaze(8));
  const [playerR, setPlayerR] = useState(0);
  const [playerC, setPlayerC] = useState(0);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);

  const cellSize = Math.floor((Math.min(width, height * 0.65) - 20) / size);

  useEffect(() => {
    if (!started || won) return;
    const iv = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [started, won]);

  const move = useCallback((dr: number, dc: number) => {
    if (won) return;
    if (!started) setStarted(true);
    const nr = playerR + dr, nc = playerC + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) return;

    const cell = maze[playerR][playerC];
    if (dr === -1 && cell.top) return;
    if (dr === 1 && cell.bottom) return;
    if (dc === -1 && cell.left) return;
    if (dc === 1 && cell.right) return;

    setPlayerR(nr);
    setPlayerC(nc);
    setMoves(m => m + 1);

    if (nr === size - 1 && nc === size - 1) setWon(true);
  }, [playerR, playerC, maze, size, won, started]);

  const panRef = useRef({ dy: 0, dx: 0 });
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderRelease: (_, gs) => {
      const absDx = Math.abs(gs.dx), absDy = Math.abs(gs.dy);
      if (Math.max(absDx, absDy) < 15) return;
      if (absDx > absDy) {
        move(0, gs.dx > 0 ? 1 : -1);
      } else {
        move(gs.dy > 0 ? 1 : -1, 0);
      }
    }
  })).current;

  const newGame = useCallback((idx: number) => {
    const s = SIZES[idx];
    setSizeIdx(idx);
    setMaze(createMaze(s));
    setPlayerR(0);
    setPlayerC(0);
    setMoves(0);
    setWon(false);
    setTime(0);
    setStarted(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Maze Runner</Text>

      <View style={styles.sizes}>
        {SIZES.map((s, i) => (
          <TouchableOpacity key={i} style={[styles.sizeBtn, sizeIdx === i && styles.sizeActive]} onPress={() => newGame(i)}>
            <Text style={[styles.sizeText, sizeIdx === i && styles.sizeTextActive]}>{s}×{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.stats}>
        <Text style={styles.stat}>Moves: {moves}</Text>
        <Text style={styles.stat}>⏱ {time}s</Text>
      </View>

      <View style={styles.boardContainer} {...panResponder.panHandlers}>
        <View style={[styles.board, { width: size * cellSize, height: size * cellSize }]}>
          {maze.map((row, r) =>
            row.map((cell, c) => {
              const isPlayer = r === playerR && c === playerC;
              const isStart = r === 0 && c === 0;
              const isEnd = r === size - 1 && c === size - 1;
              return (
                <View key={`${r}-${c}`} style={[
                  styles.mazeCell,
                  {
                    width: cellSize, height: cellSize,
                    borderTopWidth: cell.top ? 1.5 : 0,
                    borderRightWidth: cell.right ? 1.5 : 0,
                    borderBottomWidth: cell.bottom ? 1.5 : 0,
                    borderLeftWidth: cell.left ? 1.5 : 0,
                  },
                  isPlayer && styles.playerCell,
                  isEnd && styles.endCell,
                  isStart && !isPlayer && styles.startCell,
                ]}>
                  {isPlayer && <Text style={styles.playerEmoji}>🟢</Text>}
                  {isEnd && !isPlayer && <Text style={styles.endEmoji}>🏁</Text>}
                  {isStart && !isPlayer && <Text style={styles.startEmoji}>S</Text>}
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={styles.dpad}>
        <TouchableOpacity style={styles.dpadBtn} onPress={() => move(-1, 0)}>
          <Text style={styles.dpadText}>↑</Text>
        </TouchableOpacity>
        <View style={styles.dpadRow}>
          <TouchableOpacity style={styles.dpadBtn} onPress={() => move(0, -1)}>
            <Text style={styles.dpadText}>←</Text>
          </TouchableOpacity>
          <View style={styles.dpadCenter} />
          <TouchableOpacity style={styles.dpadBtn} onPress={() => move(0, 1)}>
            <Text style={styles.dpadText}>→</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.dpadBtn} onPress={() => move(1, 0)}>
          <Text style={styles.dpadText}>↓</Text>
        </TouchableOpacity>
      </View>

      {won && (
        <View style={styles.overlay}>
          <Text style={styles.wonText}>🎉 Escaped!</Text>
          <Text style={styles.wonStats}>{moves} moves in {time}s</Text>
          <TouchableOpacity style={styles.playBtn} onPress={() => newGame(sizeIdx)}>
            <Text style={styles.playBtnText}>Next Maze</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', alignItems: 'center', paddingTop: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#00ff88', marginBottom: 6 },
  sizes: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  sizeBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: '#1a1a3e' },
  sizeActive: { backgroundColor: '#00ff88' },
  sizeText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  sizeTextActive: { color: '#000' },
  stats: { flexDirection: 'row', gap: 20, marginBottom: 8 },
  stat: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  boardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  board: { flexDirection: 'row', flexWrap: 'wrap', borderColor: '#00ff88', borderWidth: 2 },
  mazeCell: { borderColor: '#00ff88', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a1a' },
  playerCell: { backgroundColor: '#1a3a1a' },
  endCell: { backgroundColor: '#1a1a3a' },
  startCell: { backgroundColor: '#1a2a1a' },
  playerEmoji: { fontSize: Math.min(16, 16) },
  endEmoji: { fontSize: Math.min(14, 14) },
  startEmoji: { color: '#00ff88', fontSize: 10, fontWeight: 'bold' },
  dpad: { alignItems: 'center', marginBottom: 10 },
  dpadRow: { flexDirection: 'row', alignItems: 'center' },
  dpadBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a3e', borderRadius: 8, margin: 2 },
  dpadText: { color: '#00ff88', fontSize: 22, fontWeight: 'bold' },
  dpadCenter: { width: 50, height: 50 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  wonText: { fontSize: 38, fontWeight: 'bold', color: '#00ff88' },
  wonStats: { fontSize: 16, color: '#aaa', marginTop: 5 },
  playBtn: { marginTop: 15, backgroundColor: '#00ff88', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  playBtnText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
});
