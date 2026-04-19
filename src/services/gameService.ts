import { 
  ref, 
  set, 
  get, 
  child, 
  update, 
  push, 
  onValue,
  off,
  serverTimestamp 
} from 'firebase/database';
import { db } from '../firebase';
import { Lobby, GameState, User, Piece, GameMode, LayoutConfig, Arena, BotPlayer, AiConfig } from '../types';

import { DEFAULT_LAYOUT } from '../constants';

export const LayoutService = {
  async saveLayout(layout: LayoutConfig) {
    const layoutRef = ref(db, 'config/layout');
    await set(layoutRef, layout);
  },

  async getLayout(): Promise<LayoutConfig | null> {
    const layoutRef = ref(db, 'config/layout');
    const snapshot = await get(layoutRef);
    if (snapshot.exists()) {
      return { ...DEFAULT_LAYOUT, ...snapshot.val() } as LayoutConfig;
    }
    return null;
  },

  subscribeToLayout(callback: (layout: LayoutConfig) => void) {
    const layoutRef = ref(db, 'config/layout');
    const listener = onValue(layoutRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...DEFAULT_LAYOUT, ...snapshot.val() } as LayoutConfig);
      }
    });
    return () => off(layoutRef, 'value', listener);
  }
};

export const LobbyService = {
  async findOrCreateLobby(user: User, maxPlayers: number, mode: GameMode) {
    const lobbiesRef = ref(db, 'lobbies');
    const snapshot = await get(lobbiesRef);
    
    let availableLobbyId = null;
    if (snapshot.exists()) {
      const lobbies = snapshot.val();
      for (const id in lobbies) {
        const lobby = lobbies[id];
        if (lobby.status === 'waiting' && lobby.maxPlayers === maxPlayers && lobby.mode === mode && lobby.playerIds.length < maxPlayers) {
          availableLobbyId = id;
          break;
        }
      }
    }

    if (availableLobbyId) {
      const lobbyRef = ref(db, `lobbies/${availableLobbyId}`);
      const lobbySnapshot = await get(lobbyRef);
      const lobby = lobbySnapshot.val();
      
      if (!lobby.playerIds.includes(user.id)) {
        const updatedPlayerIds = [...lobby.playerIds, user.id];
        const updatedPlayerNames = [...lobby.playerNames, user.name];
        
        const updates: any = {
          playerIds: updatedPlayerIds,
          playerNames: updatedPlayerNames
        };

        await update(lobbyRef, updates);
      }
      return availableLobbyId;
    } else {
      const newLobbyRef = push(lobbiesRef);
      const newLobby: Lobby = {
        id: newLobbyRef.key!,
        playerIds: [user.id],
        playerNames: [user.name],
        status: 'waiting',
        maxPlayers,
        mode,
        createdAt: serverTimestamp()
      };
      await set(newLobbyRef, newLobby);
      return newLobbyRef.key!;
    }
  },

  subscribeToLobby(lobbyId: string, callback: (lobby: Lobby) => void) {
    const lobbyRef = ref(db, `lobbies/${lobbyId}`);
    const listener = onValue(lobbyRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as Lobby);
      }
    });
    return () => off(lobbyRef, 'value', listener);
  },
  
  async updateLobby(lobbyId: string, updates: Partial<Lobby>) {
    const lobbyRef = ref(db, `lobbies/${lobbyId}`);
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    if (Object.keys(cleanUpdates).length > 0) {
      await update(lobbyRef, cleanUpdates);
    }
  },

  async leaveLobby(lobbyId: string, userId: string) {
    const lobbyRef = ref(db, `lobbies/${lobbyId}`);
    const snapshot = await get(lobbyRef);
    if (snapshot.exists()) {
      const lobby = snapshot.val() as Lobby;
      const playerIds = lobby.playerIds.filter(id => id !== userId);
      const playerNames = lobby.playerNames.filter((_, i) => lobby.playerIds[i] !== userId);
      
      if (playerIds.length === 0) {
        await set(lobbyRef, null);
      } else {
        await update(lobbyRef, { playerIds, playerNames });
      }
    }
  }
};

export const ArenaService = {
  async getArenas(): Promise<Arena[]> {
    const arenasRef = ref(db, 'config/arenas');
    const snapshot = await get(arenasRef);
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as Arena[];
    }
    // Default arenas if none exist
    return [
      { id: 'rahee_city', name: 'Rahee City', entryFee: 100, gameFeePercent: 10 },
      { id: 'carrom_city', name: 'Carrom City', entryFee: 200, gameFeePercent: 10 },
      { id: 'cartoon_city', name: 'Cartoon City', entryFee: 300, gameFeePercent: 10 },
      { id: 'card_city', name: 'Card City', entryFee: 400, gameFeePercent: 10 },
      { id: 'game_city', name: 'Game City', entryFee: 500, gameFeePercent: 10 }
    ];
  },

  async saveArena(arena: Arena) {
    await set(ref(db, `config/arenas/${arena.id}`), arena);
  },

  async deleteArena(arenaId: string) {
    await set(ref(db, `config/arenas/${arenaId}`), null);
  }
};

export const BotService = {
  async getBots(): Promise<BotPlayer[]> {
    const botsRef = ref(db, 'config/bots');
    const snapshot = await get(botsRef);
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as BotPlayer[];
    }
    return [];
  },

  async saveBot(bot: BotPlayer) {
    await set(ref(db, `config/bots/${bot.id}`), bot);
  },

  async deleteBot(botId: string) {
    await set(ref(db, `config/bots/${botId}`), null);
  },

  async findMatchForRank(rank: number): Promise<BotPlayer> {
    const bots = await this.getBots();
    if (bots.length === 0) {
      // Fallback bot if none configured
      return { id: 'bot_' + Date.now(), name: 'Player_' + Math.floor(Math.random() * 1000), rank: rank, xp: rank * 100 };
    }
    
    // Filter bots within ±3 ranks
    const suitableBots = bots.filter(b => Math.abs(b.rank - rank) <= 3);
    const pool = suitableBots.length > 0 ? suitableBots : bots;
    return pool[Math.floor(Math.random() * pool.length)];
  }
};

export const ConfigService = {
  async getAiConfig(): Promise<AiConfig> {
    const configRef = ref(db, 'config/ai');
    const snapshot = await get(configRef);
    if (snapshot.exists()) {
      return snapshot.val() as AiConfig;
    }
    return {
      skillLevel: 50,
      powerMultiplier: 1.0,
      accuracy: 70,
      reactionTime: 1000,
      behavior: 'balanced'
    };
  },

  async saveAiConfig(config: AiConfig) {
    const configRef = ref(db, 'config/ai');
    await set(configRef, config);
  }
};

export const GameService = {
  async createGame(gameId: string, playerIds: string[], playerNames: string[], playerPoints: number[], pieces: Piece[]) {
    const gameState: GameState = {
      gameId,
      playerIds,
      playerNames,
      playerPoints,
      pendingQueenIndex: null,
      coveredQueenIndex: null,
      pocketedThisTurn: [],
      ownedAssets: {},
      entryFee: 0,
      roundNumber: 1,
      pieces,
      currentPlayerIndex: 0,
      scores: playerIds.map(() => 0),
      strikerPos: 300,
      isAiming: true,
      aimAngle: -Math.PI / 2,
      aimPower: 50,
      isMoving: false,
      mode: 'classic',
      isSetupPhase: true,
      setupRotation: 0,
      status: 'playing',
      turnTimer: 16,
      turnStartTime: null,
      proposals: {},
      playerColors: ['white', 'black'],
      ownedTerritories: {},
      moveId: 0
    };
    await set(ref(db, `games/${gameId}`), gameState);
  },

  async updateGameState(gameId: string, updates: Partial<GameState>) {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    if (Object.keys(cleanUpdates).length > 0) {
      await update(ref(db, `games/${gameId}`), cleanUpdates);
    }
  },

  subscribeToGame(gameId: string, callback: (state: GameState) => void) {
    const gameRef = ref(db, `games/${gameId}`);
    const listener = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as GameState);
      }
    });
    return () => off(gameRef, 'value', listener);
  },

  async recordWin(userId: string, isWinner: boolean) {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const userData = snapshot.val();
      const updates: any = {};
      if (isWinner) {
        updates.wins = (userData.wins || 0) + 1;
        updates.raheeCoins = (userData.raheeCoins || 0) + 50;
        updates.raheeDiamonds = (userData.raheeDiamonds || 0) + 1;
      } else {
        updates.losses = (userData.losses || 0) + 1;
      }
      await update(userRef, updates);
    }
  }
};
