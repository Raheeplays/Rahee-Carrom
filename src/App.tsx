import React, { useEffect } from 'react';
import { CapacitorUpdater } from 'capacitor-updater';

const App: React.FC = () => {
  useEffect(() => {
    const handleSilentUpdate = async () => {
      try {
        // 1. Download naya code background mein
        const version = await CapacitorUpdater.download({
          url: 'https://github.com',
        });

        // 2. Agar download ho gaya, to ise install kar do
        // Ye silent hai, naya code agli baar app khulne par dikhega
        if (version) {
          await CapacitorUpdater.set(version);
        }
      } catch (error) {
        console.error("Update failed", error);
      }
    };

    handleSilentUpdate();
  }, []);

  return (
    <div className="App">
      <h1>My App (Version 1)</h1>
      {/* Aapka baaki UI */}
    </div>
  );
};

export default App;


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { LogOut, Users, Coins, ChevronLeft } from 'lucide-react';
import { GameState, Piece, PieceType, User, Lobby, AppMode, GameMode, LayoutConfig, PuckConfig, Proposal, Arena, BotPlayer, AiConfig } from './types';
import { BOARD_SIZE, COIN_RADIUS, STRIKER_RADIUS, THEME, DEFAULT_LAYOUT } from './constants';
import { updatePhysics, isBoardAtRest } from './engine/physics';
import Board from './components/Board';
import HUD from './components/HUD';
import Menu from './components/Menu';
import SplashScreen from './components/SplashScreen';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import Feedback from './components/Feedback';
import LayoutEditor from './components/LayoutEditor';
import GameOver from './components/GameOver';
import { LobbyService, GameService, LayoutService, ArenaService, BotService, ConfigService } from './services/gameService';
import { AuthService } from './services/authService';
import SoundService from './services/SoundService';

const getInitialPieces = (layout: LayoutConfig): Piece[] => [
  // Queen
  { id: 'queen', type: 'queen', pos: { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 }, vel: { x: 0, y: 0 }, radius: layout.coinRadius, mass: 1, isPocketed: false },
  // Inner circle (6 pieces)
  ...Array.from({ length: 6 }).map((_, i) => {
    const angle = (i * Math.PI * 2) / 6;
    const dist = layout.coinRadius * 2.1;
    return {
      id: `inner-${i}`,
      type: i % 2 === 0 ? 'white' : 'black' as PieceType,
      pos: { x: BOARD_SIZE / 2 + Math.cos(angle) * dist, y: BOARD_SIZE / 2 + Math.sin(angle) * dist },
      vel: { x: 0, y: 0 },
      radius: layout.coinRadius,
      mass: 1,
      isPocketed: false
    };
  }),
  // Outer circle (12 pieces)
  ...Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * Math.PI * 2) / 12;
    const dist = layout.coinRadius * 4.2;
    return {
      id: `outer-${i}`,
      type: i % 2 === 0 ? 'black' : 'white' as PieceType,
      pos: { x: BOARD_SIZE / 2 + Math.cos(angle) * dist, y: BOARD_SIZE / 2 + Math.sin(angle) * dist },
      vel: { x: 0, y: 0 },
      radius: layout.coinRadius,
      mass: 1,
      isPocketed: false
    };
  }),
  // Striker
  { id: 'striker', type: 'striker', pos: { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 + layout.baselineMarginFromCenter - layout.baselineWidth / 2 + layout.strikerYOffset }, vel: { x: 0, y: 0 }, radius: layout.strikerRadius, mass: 2, isPocketed: false }
];

const getInitialGameState = (layout: LayoutConfig): GameState => ({
  pieces: getInitialPieces(layout),
  currentPlayerIndex: 0,
  scores: [0, 0],
  playerColors: ['black', 'white'],
  strikerPos: BOARD_SIZE / 2,
  isAiming: true,
  aimAngle: -Math.PI / 2,
  aimPower: 50,
  isMoving: false,
  gameId: '',
  playerIds: [],
  playerNames: [],
  playerPoints: [1000, 1000],
  pendingQueenIndex: null,
  coveredQueenIndex: null,
  pocketedThisTurn: [],
  ownedAssets: {},
  entryFee: 160,
  roundNumber: 1,
  mode: 'classic',
  isSetupPhase: true,
  setupRotation: 0,
  status: 'playing',
  turnTimer: 16,
  turnStartTime: null,
  proposals: {},
  ownedTerritories: {},
  moveId: 0,
});

const PuckIcon = ({ type, size = 16, className = "" }: { type: PieceType, size?: number, className?: string }) => {
  let color = '';
  let stroke = '';
  switch (type) {
    case 'white': color = '#F5F5DC'; stroke = '#D2B48C'; break;
    case 'black': color = '#212121'; stroke = '#000'; break;
    case 'queen': color = '#D32F2F'; stroke = '#B71C1C'; break;
    default: color = '#2196F3'; stroke = '#1976D2';
  }
  return (
    <div 
      className={`rounded-full border shadow-sm flex-shrink-0 ${className}`} 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        backgroundColor: color, 
        borderColor: stroke,
        borderWidth: '2px'
      }} 
    />
  );
};

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [matchmaking, setMatchmaking] = useState<{ active: boolean; arena: Arena | null; opponent: BotPlayer | null; timer: number } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [gameType, setGameType] = useState<'solo' | 'multiplayer'>('solo');
  const [gameState, setGameState] = useState<GameState>(getInitialGameState(DEFAULT_LAYOUT));
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [roundNumber, setRoundNumber] = useState(1);
  const [showEntryFeeModal, setShowEntryFeeModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(10);
  const [selectedPucks, setSelectedPucks] = useState<PuckConfig>({ white: 0, black: 1, queen: 0 });
  const [showAssetReturnModal, setShowAssetReturnModal] = useState<{ assetId: string, price: number } | null>(null);
  const [globalAiConfig, setGlobalAiConfig] = useState<AiConfig | null>(null);
  const [returnPucksSelection, setReturnPucksSelection] = useState<PieceType[]>([]);
  const [showModMenu, setShowModMenu] = useState(false);
  const [modLongAim, setModLongAim] = useState(false);
  const [modAIPlay, setModAIPlay] = useState(false);
  const [modAlwaysMyTurn, setModAlwaysMyTurn] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showInGameMenu, setShowInGameMenu] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastProcessedMoveIdRef = useRef<number>(-1);

  // Sync striker and aim in real-time
  const syncStrikerAndAim = (updates: Partial<GameState>) => {
    if (gameState.gameId && user?.id === gameState.playerIds[gameState.currentPlayerIndex]) {
      GameService.updateGameState(gameState.gameId, updates);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await ConfigService.getAiConfig();
      setGlobalAiConfig(config);
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (appMode === 'splash') {
      SoundService.play('splash');
    }
  }, [appMode]);

  const handleLongPressStart = () => {
    if (!user?.isAdmin) return;
    longPressTimer.current = setTimeout(() => {
      setShowModMenu(true);
    }, 5000);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleWinRound = () => {
    if (!user?.isAdmin) return;
    
    setGameState(prev => {
      const adminId = user.id;
      const adminIdx = prev.playerIds.indexOf(adminId);
      if (adminIdx === -1) return prev;

      const newScores = [...prev.scores];
      const remainingPieces = prev.pieces.filter(p => p.type !== 'striker' && !p.isPocketed);
      
      remainingPieces.forEach(p => {
        let points = 1;
        if (prev.mode === 'rich-poor' || prev.mode === 'buy-sell') {
          points = p.type === 'queen' ? 50 : (p.type === 'white' ? 20 : 10);
        }
        newScores[adminIdx] += points;
      });

      const finalPieces = prev.pieces.map(p => p.type === 'striker' ? p : { ...p, isPocketed: true });
      
      // Own all assets
      const allAssets = [
        ...Array.from({ length: 4 }).map((_, i) => `arrow_${i}`),
        ...Array.from({ length: 4 }).map((_, i) => `baseline_${i}`),
        ...Array.from({ length: 4 }).map((_, i) => `pocket_${i}`),
        'center'
      ];
      const newOwned = { ...prev.ownedAssets };
      newOwned[adminId] = [...(newOwned[adminId] || []), ...allAssets];

      const updates = {
        pieces: finalPieces,
        scores: newScores,
        ownedAssets: newOwned,
        status: 'finished' as const
      };

      if (prev.gameId) GameService.updateGameState(prev.gameId, updates);
      
      return { ...prev, ...updates };
    });
    setShowModMenu(false);
  };

  const resetGame = useCallback((nextRound: boolean = false) => {
    setGameState(prev => {
      const newColors: ('white' | 'black')[] = nextRound 
        ? [prev.playerColors[1], prev.playerColors[0]] 
        : prev.playerColors;
      
      if (nextRound) setRoundNumber(r => r + 1);

      const initial = getInitialGameState(layout);
      return {
        ...initial,
        gameId: prev.gameId,
        playerIds: prev.playerIds,
        playerNames: prev.playerNames,
        playerPoints: prev.playerPoints,
        pendingQueenIndex: null,
        pocketedThisTurn: [],
        ownedAssets: prev.ownedAssets || {},
        playerColors: newColors,
        mode: prev.mode,
      };
    });
  }, [layout]);

  useEffect(() => {
    AuthService.testConnection();
    const unsubscribe = LayoutService.subscribeToLayout((newLayout) => {
      setLayout(newLayout);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      const data = await ArenaService.getArenas();
      setArenas(data);
    };
    loadConfig();
  }, []);

  // Splash Screen Timer
  useEffect(() => {
    if (appMode === 'splash') {
      const timer = setTimeout(() => {
        const savedUser = localStorage.getItem('rahee_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setAppMode('menu');
        } else {
          setAppMode('login');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [appMode]);

  // Lobby Subscription
  useEffect(() => {
    if (lobby && lobby.status === 'waiting') {
      const unsubscribe = LobbyService.subscribeToLobby(lobby.id, (updatedLobby) => {
        setLobby(updatedLobby);
        if (updatedLobby.status === 'playing') {
          startMultiplayerGame(updatedLobby);
        }
      });
      return () => unsubscribe();
    }
  }, [lobby?.id]);

  useEffect(() => {
    if (appMode !== 'playing' || gameState.isMoving || gameState.isSetupPhase || gameState.status !== 'playing' || showAssetReturnModal || showEntryFeeModal) return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (!prev.turnStartTime || prev.status !== 'playing') return prev;
        
        const elapsed = Math.floor((Date.now() - prev.turnStartTime) / 1000);
        const remaining = Math.max(0, 16 - elapsed);

        // Turn timeout logic
        if (remaining === 0 && prev.playerIds[prev.currentPlayerIndex] === user?.id && !prev.isMoving) {
          const nextIdx = (prev.currentPlayerIndex + 1) % prev.playerIds.length;
          const nextStrikerY = nextIdx === 0 
            ? BOARD_SIZE / 2 + layout.baselineMarginFromCenter - layout.baselineWidth / 2 + layout.strikerYOffset
            : BOARD_SIZE / 2 - layout.baselineMarginFromCenter + layout.baselineWidth / 2 - layout.strikerYOffset;

          const updates = {
            currentPlayerIndex: nextIdx,
            turnStartTime: Date.now(),
            turnTimer: 16,
            pieces: prev.pieces.map(p => 
              p.type === 'striker' 
                ? { ...p, pos: { x: prev.strikerPos, y: nextStrikerY }, vel: { x: 0, y: 0 } } 
                : p
            )
          };
          
          if (prev.gameId) GameService.updateGameState(prev.gameId, updates);
          return { ...prev, ...updates };
        }

        return { ...prev, turnTimer: remaining };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [appMode, gameState.isMoving, gameState.isSetupPhase, gameState.status, gameState.currentPlayerIndex, gameState.gameId, user?.id, layout, showAssetReturnModal, showEntryFeeModal]);

  // Game Subscription
  useEffect(() => {
    if ((appMode === 'playing' || appMode === 'gameOver') && gameState.gameId) {
      const unsubscribe = GameService.subscribeToGame(gameState.gameId, (remoteState) => {
        const myId = user?.id;
        
        setGameState(prev => {
          // Identify valid context
          const currentStrikerId = remoteState.playerIds?.[remoteState.currentPlayerIndex];
          const isMyTurnNow = myId && currentStrikerId === myId;
          const turnIndexChanged = remoteState.currentPlayerIndex !== prev.currentPlayerIndex;

          // 1. SEQUENCE VALIDATION (Pillar 1)
          const remoteMoveId = remoteState.moveId || 0;
          const isNewMoveId = remoteMoveId > (lastProcessedMoveIdRef.current);
          
          // 2. Metadata Sync (Always follow the DB for non-physics state)
          const metadataUpdates: Partial<GameState> = {
            ...remoteState,
            // Ensure lists are valid to prevent stalling
            playerIds: remoteState.playerIds || prev.playerIds,
            playerNames: remoteState.playerNames || prev.playerNames,
            playerPoints: remoteState.playerPoints || prev.playerPoints,
            scores: remoteState.scores || prev.scores,
            pocketedThisTurn: remoteState.pocketedThisTurn || prev.pocketedThisTurn,
            ownedAssets: remoteState.ownedAssets || prev.ownedAssets,
          };

          // 3. Authority Logic (Pillar 4)
          if (isMyTurnNow) {
            // I am the MASTER. I drive the physics locally.
            // Only accept remote pieces if the turn just changed to me or during setup.
            if (turnIndexChanged || prev.isSetupPhase) {
              lastProcessedMoveIdRef.current = remoteMoveId;
              return { ...prev, ...metadataUpdates, pieces: remoteState.pieces, isMoving: false };
            }
            // Otherwise, keep my local state to avoid the "loop" (DB resetting my local movement)
            return { ...prev, ...metadataUpdates, pieces: prev.pieces, moveId: prev.moveId };
          }

          // I am the GUEST (Opponent). 
          // To fix the "loop", I should only adopt the DB's physics simulation when:
          // a) A FRESH shot just started (Pillar 1 validation)
          // b) A shot just finished (pieces are resting)
          // c) The turn or game status changed
          const mastersStartedShotNow = !prev.isMoving && remoteState.isMoving && isNewMoveId;
          const mastersFinishedShotNow = prev.isMoving && !remoteState.isMoving;
          const statusChanged = remoteState.status !== prev.status;

          const shouldSyncPieces = mastersStartedShotNow || mastersFinishedShotNow || turnIndexChanged || statusChanged;

          if (shouldSyncPieces) {
            if (isNewMoveId) lastProcessedMoveIdRef.current = remoteMoveId;
            return { ...prev, ...metadataUpdates, pieces: remoteState.pieces };
          }

          // During an ongoing shot, the Guest simulates locally and ignores DB pieces to avoid jitter.
          return { ...prev, ...metadataUpdates, pieces: prev.pieces };
        });

        if (remoteState.status === 'gameOver') {
          setAppMode('gameOver');
          setShowEntryFeeModal(false);
        } else if (remoteState.status === 'playing' && appMode === 'gameOver') {
          setAppMode('playing');
          setShowEntryFeeModal(false);
        }
      });
      return () => unsubscribe();
    }
  }, [gameState.gameId, appMode, user?.id]);

  const startMultiplayerGame = async (l: Lobby) => {
    const isHost = l.playerIds[0] === user?.id;
    const mode = l.mode || 'classic';
    
    const points = await Promise.all(l.playerIds.map(async (id) => {
      const u = await AuthService.getUser(id);
      return u?.raheeCoins || 0;
    }));

    if (isHost) {
      const opColor = selectedPuckColor === 'white' ? 'black' : 'white';
      const initialPieces = getInitialPieces(layout);
      await GameService.createGame(l.id, l.playerIds, l.playerNames, points, initialPieces);
      await GameService.updateGameState(l.id, { 
        mode, 
        isSetupPhase: true, 
        setupRotation: 0,
        playerColors: [selectedPuckColor, opColor]
      });
    }
    
    setGameType('multiplayer');
    setGameState(prev => ({
      ...prev,
      gameId: l.id,
      playerIds: l.playerIds,
      playerNames: l.playerNames,
      playerPoints: points,
      pendingQueenIndex: null,
      pocketedThisTurn: [],
      ownedAssets: {},
      scores: l.playerIds.map(() => 0),
      mode,
      isSetupPhase: true
    }));
    setAppMode('playing');
  };

  const [selectedPuckColor, setSelectedPuckColor] = useState<'white' | 'black'>('white');

  const handleJoinLobby = async (maxPlayers: number, mode: GameMode, playerColor: 'white' | 'black' = 'white') => {
    if (!user) return;
    setAppMode('lobby');
    setGameType('multiplayer');
    setSelectedPuckColor(playerColor);
    const lobbyId = await LobbyService.findOrCreateLobby(user, maxPlayers, mode);
    setLobby({ id: lobbyId, playerIds: [user.id], playerNames: [user.name], status: 'waiting', maxPlayers, mode, createdAt: null });
  };

  const handleStartOnline = async (arena: Arena, mode: GameMode = 'classic', playerColor: 'white' | 'black' = 'white') => {
    if (!user) return;
    if (user.raheeCoins < arena.entryFee) {
      alert('Not enough coins!');
      return;
    }

    setMatchmaking({ active: true, arena, opponent: null, timer: 0 });
    
    // 1-8 seconds illusion
    const delay = 1000 + Math.random() * 7000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      setMatchmaking(prev => prev ? { ...prev, timer: Math.floor((Date.now() - startTime) / 1000) } : null);
    }, 1000);

    setTimeout(async () => {
      clearInterval(interval);
      const bot = await BotService.findMatchForRank(user.rank || 1);
      setMatchmaking(prev => prev ? { ...prev, opponent: bot } : null);

      setTimeout(() => {
        setMatchmaking(null);
        setGameType('solo');
        const initial = getInitialGameState(layout);
        
        // Deduct entry fee
        const entryFee = arena.entryFee;
        const aiColor = playerColor === 'white' ? 'black' : 'white';
        
        setGameState({
          ...initial,
          playerIds: [user.id, bot.id],
          playerNames: [user.name, bot.name],
          playerPoints: [user.raheeCoins - entryFee, bot.xp], // Bot uses XP as points
          entryFee: entryFee,
          mode: mode,
          status: 'playing',
          playerColors: [playerColor, aiColor]
        });
        
        // Update user coins locally
        setUser(prev => prev ? { ...prev, raheeCoins: prev.raheeCoins - entryFee } : null);
        AuthService.updateUserStats(user.id, { raheeCoins: user.raheeCoins - entryFee });

        setAppMode('playing');
      }, 2000);
    }, delay);
  };

  const handleSetupRotate = (angle: number) => {
    if (gameType === 'multiplayer' && gameState.playerIds[gameState.currentPlayerIndex] !== user?.id) return;
    
    setGameState(prev => {
      const rotatedPieces = prev.pieces.map(p => {
        if (p.type === 'striker') return p;
        const dx = p.pos.x - BOARD_SIZE / 2;
        const dy = p.pos.y - BOARD_SIZE / 2;
        const currentAngle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const newAngle = currentAngle + (angle - prev.setupRotation);
        return {
          ...p,
          pos: {
            x: BOARD_SIZE / 2 + Math.cos(newAngle) * dist,
            y: BOARD_SIZE / 2 + Math.sin(newAngle) * dist
          }
        };
      });
      
      return { ...prev, pieces: rotatedPieces, setupRotation: angle };
    });
  };

  const getReturnPos = useCallback((currentPieces: Piece[], ideal: {x: number, y: number}) => {
    let pos = { ...ideal };
    let offset = 0;
    let angle = 0;
    const refRadius = layout.coinRadius;
    
    let found = false;
    let safety = 0;
    // Iterate more steps with smaller angle increments for a denser search
    while (!found && safety < 100) {
      const collision = currentPieces.some(p => {
        if (p.isPocketed || p.type === 'striker') return false;
        const dx = p.pos.x - pos.x;
        const dy = p.pos.y - pos.y;
        // Check for actual physical overlap with a tiny 1px padding
        return (dx * dx + dy * dy) < (p.radius + refRadius - 1) * (p.radius + refRadius - 1);
      });
      
      if (!collision) {
        found = true;
      } else {
        // Spiral outwards
        angle += 0.5;
        offset += 1.5;
        pos.x = ideal.x + Math.cos(angle) * offset;
        pos.y = ideal.y + Math.sin(angle) * offset;
        safety++;
      }
    }
    return pos;
  }, [layout.coinRadius]);

  const handleStrike = async (angle: number, power: number, isAI: boolean = false) => {
    setGameState(prev => {
      if (prev.isMoving) return prev;
      
      // Guard: Only current player can strike
      if (!isAI && prev.playerIds[prev.currentPlayerIndex] !== user?.id) return prev;

      // TURN ID / MOVE ID Implementation
      const nextMoveId = (prev.moveId || 0) + 1;
      lastProcessedMoveIdRef.current = nextMoveId;

      SoundService.play('strike');
      
      const powerScale = 0.4;
      const vx = Math.cos(angle) * power * powerScale;
      const vy = Math.sin(angle) * power * powerScale;

      const updatedPieces = prev.pieces.map(p => 
        p.type === 'striker' ? { ...p, vel: { x: vx, y: vy } } : p
      );

      const newState: GameState = {
        ...prev,
        isMoving: true,
        isAiming: false,
        isSetupPhase: false,
        turnTimer: 16,
        turnStartTime: null,
        pieces: updatedPieces,
        moveId: nextMoveId
      };

      if (prev.gameId) {
        // Sync the pieces with their initial velocities and new moveId
        GameService.updateGameState(prev.gameId, {
          pieces: updatedPieces,
          isMoving: true,
          isSetupPhase: false,
          turnStartTime: null,
          aimAngle: angle,
          aimPower: power,
          moveId: nextMoveId
        });
      }

      return newState;
    });
  };

  useEffect(() => {
    if (appMode !== 'playing' || !gameState.isMoving) return;

    const loop = () => {
      setGameState(prev => {
        const { pieces, pocketed } = updatePhysics(prev.pieces, layout);
        if (pocketed.length > 0) SoundService.play('pocket');
        
        const newScores = [...prev.scores];
        const newPocketedThisTurn = [...prev.pocketedThisTurn];

          pocketed.forEach(({ piece, pocketIndex }) => {
            newPocketedThisTurn.push(piece.type);
            
            // Check if pocket is owned
            const pocketOwnerId = Object.keys(prev.ownedAssets).find(pid => prev.ownedAssets[pid].includes(`pocket_${pocketIndex}`));
            const finalPocketedBy = pocketOwnerId || prev.playerIds[prev.currentPlayerIndex];
            
            // Update the piece in the pieces array
            const pieceInArray = pieces.find(p => p.id === piece.id);
            if (pieceInArray) {
              pieceInArray.pocketedBy = finalPocketedBy;
            }
            
            if (pocketOwnerId) {
              const ownerIdx = prev.playerIds.indexOf(pocketOwnerId);
              if (ownerIdx !== -1) {
                let points = 1;
                if (prev.mode === 'rich-poor' || prev.mode === 'buy-sell' || prev.mode === 'classic') {
                  // Queen points are only awarded when covered
                  if (prev.mode === 'classic') {
                    points = (piece.type === 'white' || piece.type === 'black') ? 1 : 0;
                  } else {
                    points = piece.type === 'queen' ? 0 : (piece.type === 'white' ? 20 : 10);
                  }
                }
                newScores[ownerIdx] += points;
              }
            } else {
              // Default: points to current player or opponent based on color in classic
              let points = 1;
              if (prev.mode === 'rich-poor' || prev.mode === 'buy-sell' || prev.mode === 'classic') {
                // Queen points are only awarded when covered
                if (prev.mode === 'classic') {
                  points = (piece.type === 'white' || piece.type === 'black') ? 1 : 0;
                } else {
                  points = piece.type === 'queen' ? 0 : (piece.type === 'white' ? 20 : 10);
                }
                
                if (prev.mode === 'classic') {
                  // In classic, points go to the player whose color matches the piece
                  const player1Color = prev.playerColors[0];
                  const player2Color = prev.playerColors[1];
                  
                  if (piece.type === player1Color) {
                    newScores[0] += points;
                  } else if (piece.type === player2Color) {
                    newScores[1] += points;
                  }
                } else {
                  newScores[prev.currentPlayerIndex] += points;
                }
              } else {
                newScores[prev.currentPlayerIndex] += points;
              }
            }
          });

        const stillMoving = !isBoardAtRest(pieces);

        if (!stillMoving) {
          // Check if any piece stopped on an owned asset area
          const checkAssetCollision = (piece: Piece) => {
            if (piece.type === 'striker' || piece.isPocketed) return null;

            const centerX = BOARD_SIZE / 2;
            const centerY = BOARD_SIZE / 2;
            const dx = piece.pos.x - centerX;
            const dy = piece.pos.y - centerY;

            // Check Center
            const centerOwner = Object.keys(prev.ownedAssets).find(pid => prev.ownedAssets[pid].includes('center'));
            if (centerOwner) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < layout.centerCircleRadius + piece.radius) return { ownerId: centerOwner, assetId: 'center' };
            }

            // Check Baselines
            const rotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
            for (let i = 0; i < rotations.length; i++) {
              const rot = rotations[i];
              const localX = dx * Math.cos(-rot) - dy * Math.sin(-rot);
              const localY = dx * Math.sin(-rot) + dy * Math.cos(-rot);
              
              const baselineOwner = Object.keys(prev.ownedAssets).find(pid => prev.ownedAssets[pid].includes(`baseline_${i}`));
              if (baselineOwner) {
                const onBaseline = localY > (layout.baselineMarginFromCenter - layout.baselineWidth - piece.radius) && 
                                   localY < (layout.baselineMarginFromCenter + piece.radius);
                const withinX = Math.abs(localX) < (layout.baselineLength / 2 + piece.radius);
                if (onBaseline && withinX) return { ownerId: baselineOwner, assetId: `baseline_${i}` };
              }
            }

            // Check Arrows
            for (let i = 0; i < rotations.length; i++) {
              const rot = rotations[i];
              const localX = dx * Math.cos(-rot) - dy * Math.sin(-rot);
              const localY = dx * Math.sin(-rot) + dy * Math.cos(-rot);
              
              const arrowOwner = Object.keys(prev.ownedAssets).find(pid => prev.ownedAssets[pid].includes(`arrow_${i}`));
              if (arrowOwner) {
                const arrowX = layout.arrowOffset;
                const arrowY = layout.arrowOffset;
                const distToArrowCenter = Math.sqrt((localX - arrowX) ** 2 + (localY - arrowY) ** 2);
                if (distToArrowCenter < layout.arrowArcRadius + piece.radius + 5) return { ownerId: arrowOwner, assetId: `arrow_${i}` };
              }
            }
            return null;
          };

          // Apply asset pocketing
          const piecesWithAssets = pieces.map(p => {
            const collision = checkAssetCollision(p);
            if (collision) {
              const { ownerId } = collision;
              const ownerIdx = prev.playerIds.indexOf(ownerId);
              
              newPocketedThisTurn.push(p.type);
              if (ownerIdx !== -1) {
                let points = 1;
                if (prev.mode === 'rich-poor' || prev.mode === 'buy-sell' || prev.mode === 'classic') {
                  points = p.type === 'queen' ? 0 : (p.type === 'white' ? 20 : 10);
                }
                newScores[ownerIdx] += points;
              }
              return { ...p, isPocketed: true, pocketedBy: ownerId, vel: { x: 0, y: 0 } };
            }
            return p;
          });

          let newPendingQueenIndex = prev.pendingQueenIndex ?? null;
          let newCoveredQueenIndex = prev.coveredQueenIndex ?? null;
          const strikerPocketed = newPocketedThisTurn.includes('striker');
          const coinsPocketed = newPocketedThisTurn.filter(p => p !== 'striker');
          const hasQueen = newPocketedThisTurn.includes('queen');
          const hasCoin = newPocketedThisTurn.some(p => p === 'white' || p === 'black');

          // Handle Queen Cover
          if (hasQueen) {
            newPendingQueenIndex = prev.currentPlayerIndex;
          }

          const playerColor = prev.playerColors[prev.currentPlayerIndex];
          const opponentColor = prev.playerColors[(prev.currentPlayerIndex + 1) % 2];
          const pocketedOwnColor = coinsPocketed.includes(playerColor);
          const pocketedOpponentColor = coinsPocketed.includes(opponentColor);

          // If a coin was pocketed and there was a pending queen for this player
          if (hasCoin && newPendingQueenIndex === prev.currentPlayerIndex) {
            if (prev.mode === 'classic') {
              if (pocketedOwnColor) {
                newCoveredQueenIndex = prev.currentPlayerIndex;
                newPendingQueenIndex = null;
              } else if (pocketedOpponentColor) {
                // Pocketing opponent piece fails to cover queen
                newPendingQueenIndex = null; 
                // Piece will be returned below in the "Return Queen if not covered" block
              }
            } else {
              newScores[prev.currentPlayerIndex] += 50;
              newPendingQueenIndex = null;
            }
          }

          let nextPlayerIndex = prev.currentPlayerIndex;
          const isAdmin = user?.isAdmin && prev.playerIds[prev.currentPlayerIndex] === user?.id;
          
          if (modAlwaysMyTurn && isAdmin) {
            nextPlayerIndex = prev.currentPlayerIndex;
          } else if (prev.mode === 'classic') {
            // Standard carrom: Turn continues if you pocket own color OR the queen (unless striker is pocketed)
            const hasQueenInThisTurn = newPocketedThisTurn.includes('queen');
            if (strikerPocketed || (coinsPocketed.length === 0 && !hasQueenInThisTurn) || (!pocketedOwnColor && !hasQueenInThisTurn)) {
              nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.playerIds.length;
            }
          } else {
            if (coinsPocketed.length === 0 || strikerPocketed) {
              nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.playerIds.length;
            }
          }

          // Return Queen if not covered
          const nextStrikerY = nextPlayerIndex === 0 
            ? BOARD_SIZE / 2 + layout.baselineMarginFromCenter - layout.baselineWidth / 2 + layout.strikerYOffset
            : BOARD_SIZE / 2 - layout.baselineMarginFromCenter + layout.baselineWidth / 2 - layout.strikerYOffset;

          let finalPieces = piecesWithAssets.map(p => 
            p.type === 'striker' 
              ? { ...p, isPocketed: false, pocketedBy: undefined, pos: { x: prev.strikerPos, y: nextStrikerY }, vel: { x: 0, y: 0 } } 
              : p
          );

          // Case 1: Striker pocketed penalty (Fine)
          if (strikerPocketed) {
             const currentPlayerId = prev.playerIds[prev.currentPlayerIndex];
             // Preference: 1. Black (10), 2. White (20), 3. Queen (50)
             // Fine value is always 10 points (value of 1 black puck)
             
             const myPocketed = finalPieces.filter(p => p.isPocketed && p.pocketedBy === currentPlayerId);
             
             if (prev.mode === 'classic') {
                const myColorPiece = myPocketed.find(p => p.type === playerColor);
                if (myColorPiece) {
                   const returnPos = getReturnPos(finalPieces, { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
                   finalPieces = finalPieces.map(p => 
                     p.id === myColorPiece.id 
                       ? { ...p, isPocketed: false, pocketedBy: undefined, pos: returnPos, vel: { x: 0, y: 0 } } 
                       : p
                   );
                }
             } else {
                const blackToReturn = myPocketed.find(p => p.type === 'black');
                const whiteToReturn = myPocketed.find(p => p.type === 'white');
                const queenToReturn = myPocketed.find(p => p.type === 'queen');

                let pieceToReturn = null;
                let changeOwed = 0;

                if (blackToReturn) {
                  pieceToReturn = blackToReturn;
                } else if (whiteToReturn) {
                  pieceToReturn = whiteToReturn;
                  changeOwed = 10; // Paid 20 for 10
                } else if (queenToReturn) {
                  pieceToReturn = queenToReturn;
                  changeOwed = 40; // Paid 50 for 10
                }

                if (pieceToReturn) {
                   const returnPos = getReturnPos(finalPieces, { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
                   finalPieces = finalPieces.map(p => 
                     p.id === pieceToReturn!.id 
                       ? { ...p, isPocketed: false, pocketedBy: undefined, pos: returnPos, vel: { x: 0, y: 0 } } 
                       : p
                   );

                   // Handle change: Pocket pieces from the board totaling changeOwed
                   if (changeOwed > 0) {
                      let remainingChange = changeOwed;
                      // We'll try to find pieces on the board to "pocket" as change
                      // Priority: Black (10), then White (20)
                      // Sort pieces by value descending to optimize but here user mentioned specific counts
                      const boardPieces = finalPieces.filter(p => !p.isPocketed && p.type !== 'striker' && (p.type === 'black' || p.type === 'white'));
                      
                      const blacksOnBoard = boardPieces.filter(p => p.type === 'black');
                      const whitesOnBoard = boardPieces.filter(p => p.type === 'white');

                      let changeCollected: string[] = []; // ids
                      
                      // Try to collect exactly the change needed
                      while (remainingChange >= 10 && blacksOnBoard.length > 0) {
                         const p = blacksOnBoard.pop()!;
                         changeCollected.push(p.id);
                         remainingChange -= 10;
                      }
                      while (remainingChange >= 20 && whitesOnBoard.length > 0) {
                         const p = whitesOnBoard.pop()!;
                         changeCollected.push(p.id);
                         remainingChange -= 20;
                      }

                      if (changeCollected.length > 0) {
                         finalPieces = finalPieces.map(p => 
                            changeCollected.includes(p.id) 
                              ? { ...p, isPocketed: true, pocketedBy: currentPlayerId, vel: { x: 0, y: 0 } } 
                              : p
                         );
                      }
                   }
                }
             }
          }

          // Case 3: Return queen if turn ends and it's not covered
          if (prev.mode === 'classic') {
            const turnEnding = nextPlayerIndex !== prev.currentPlayerIndex;
            const queenPocketedButNotCovered = (newPendingQueenIndex !== null || newPocketedThisTurn.includes('queen')) && newCoveredQueenIndex === null;
            
            if (turnEnding && queenPocketedButNotCovered) {
              const returnPos = getReturnPos(finalPieces, { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
              finalPieces = finalPieces.map(p => p.type === 'queen' ? { ...p, isPocketed: false, pocketedBy: undefined, pos: returnPos, vel: { x: 0, y: 0 } } : p);
              newPendingQueenIndex = null;
            }
          }

          // Force scores to match final physical state of pieces after all return rules are applied
          prev.playerIds.forEach((_, idx) => {
            newScores[idx] = finalPieces
              .filter(p => p.isPocketed)
              .reduce((sum, p) => {
                const ownerOfPiece = p.pocketedBy;
                const ownerIdx = prev.playerIds.indexOf(ownerOfPiece || '');
                
                if (ownerIdx !== idx) return sum;

                let points = 0;
                if (prev.mode !== 'classic') {
                  points = p.type === 'queen' ? 50 : (p.type === 'white' ? 20 : 10);
                } else {
                  // In classic, score is just the count of own pieces pocketed
                  return p.type === prev.playerColors[idx] ? sum + 1 : sum;
                }
                return sum + points;
              }, 0);
          });

          // Check win condition (9 pucks in classic mode or all pieces in other modes)
          const classicWin = prev.mode === 'classic' && newScores.some(s => s >= 9);
          const boardEmpty = finalPieces.filter(p => p.type !== 'striker' && !p.isPocketed).length === 0;
          
          let isFinished = classicWin || boardEmpty;
          let isGameOverResult = classicWin;
          let finalPlayerPoints = [...prev.playerPoints];

          // Bankruptcy check for Rich and Poor / Buy-Sell when board is empty
          if (!isGameOverResult && boardEmpty && (prev.mode === 'rich-poor' || prev.mode === 'buy-sell')) {
            const potentialFinalPoints = prev.playerIds.map((_, i) => prev.playerPoints[i] + newScores[i]);
            // Deduct the minimum fee from previous round (entryFee) to see if they can survive
            if (potentialFinalPoints.some(p => p < prev.entryFee)) {
              isGameOverResult = true;
              finalPlayerPoints = potentialFinalPoints;
            }
          }

          if (isFinished) SoundService.play('win');

          const finalState: GameState = {
            ...prev,
            pieces: finalPieces,
            scores: newScores,
            playerPoints: isGameOverResult ? finalPlayerPoints : prev.playerPoints,
            pendingQueenIndex: newPendingQueenIndex,
            coveredQueenIndex: newCoveredQueenIndex,
            pocketedThisTurn: [],
            currentPlayerIndex: nextPlayerIndex,
            strikerPos: prev.strikerPos,
            isMoving: false,
            isAiming: !isFinished,
            turnTimer: 16,
            turnStartTime: isFinished ? null : Date.now(),
            status: (isFinished ? (isGameOverResult ? 'gameOver' : 'finished') : 'playing') as 'playing' | 'finished' | 'gameOver',
            aimAngle: -Math.PI / 2, // Pillar 2: Explicit Reset
            aimPower: 50, // Pillar 2: Explicit Reset
            moveId: prev.moveId // Keep current moveId for the resting state
          };

          if (prev.gameId && user?.id === prev.playerIds[prev.currentPlayerIndex]) {
            GameService.updateGameState(prev.gameId, {
              pieces: finalState.pieces,
              scores: finalState.scores,
              ownedAssets: finalState.ownedAssets,
              pendingQueenIndex: newPendingQueenIndex,
              coveredQueenIndex: newCoveredQueenIndex,
              pocketedThisTurn: [],
              currentPlayerIndex: nextPlayerIndex,
              isMoving: false,
              turnStartTime: finalState.turnStartTime,
              status: finalState.status,
              aimAngle: finalState.aimAngle,
              aimPower: finalState.aimPower
            });
          }

          return finalState;
        }

        return { ...prev, pieces, scores: newScores, pocketedThisTurn: newPocketedThisTurn };
      });
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoopRef.current!);
  }, [appMode, gameState.isMoving]);

  const getPiecesForPoints = (totalPoints: number, customPucks?: PuckConfig) => {
    // For rich-poor mode, if no custom pucks, use full set, but if custom pucks provided, use them
    if (gameState.mode === 'rich-poor' && !customPucks) {
      return getInitialPieces(layout);
    }

    const pieces: Piece[] = [];
    
    // Always include striker
    pieces.push({ id: 'striker', type: 'striker', pos: { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 + layout.baselineMarginFromCenter - layout.baselineWidth / 2 + layout.strikerYOffset }, vel: { x: 0, y: 0 }, radius: layout.strikerRadius, mass: 2, isPocketed: false });

    const coins: { type: PieceType, points: number }[] = [];

    if (customPucks) {
      for (let i = 0; i < customPucks.white; i++) coins.push({ type: 'white', points: 20 });
      for (let i = 0; i < customPucks.black; i++) coins.push({ type: 'black', points: 10 });
      for (let i = 0; i < customPucks.queen; i++) coins.push({ type: 'queen', points: 50 });
    } else {
      let remainingPoints = totalPoints;

      // Fill with white (up to 9)
      let whiteCount = 0;
      while (remainingPoints >= 20 && whiteCount < 9) {
        coins.push({ type: 'white', points: 20 });
        remainingPoints -= 20;
        whiteCount++;
      }

      // Fill with black (up to 9)
      let blackCount = 0;
      while (remainingPoints >= 10 && blackCount < 9) {
        coins.push({ type: 'black', points: 10 });
        remainingPoints -= 10;
        blackCount++;
      }

      // Include Queen if points allow (50 points)
      if (remainingPoints >= 50) {
        coins.push({ type: 'queen', points: 50 });
        remainingPoints -= 50;
      }

      // If still have points (for very high stakes), fill more white/black
      while (remainingPoints >= 20) {
        coins.push({ type: 'white', points: 20 });
        remainingPoints -= 20;
      }
      while (remainingPoints >= 10) {
        coins.push({ type: 'black', points: 10 });
        remainingPoints -= 10;
      }
    }
    
    // Distribute pieces
    const queenIndex = coins.findIndex(c => c.type === 'queen');
    if (queenIndex !== -1) {
      const queen = coins.splice(queenIndex, 1)[0];
      pieces.push({
        id: `queen_center_${Date.now()}`,
        type: 'queen',
        pos: { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 },
        vel: { x: 0, y: 0 },
        radius: layout.coinRadius,
        mass: 1,
        isPocketed: false
      });
    }

    const totalCount = coins.length;
    for (let i = 0; i < totalCount; i++) {
      const angle = (i / totalCount) * Math.PI * 2;
      const radius = layout.coinRadius * (totalCount > 6 ? 3.5 : 2.5);
      const coin = coins[i];
      
      pieces.push({
        id: `${coin.type}_${i}_${Date.now()}`,
        type: coin.type,
        pos: {
          x: BOARD_SIZE / 2 + Math.cos(angle) * radius,
          y: BOARD_SIZE / 2 + Math.sin(angle) * radius
        },
        vel: { x: 0, y: 0 },
        radius: layout.coinRadius,
        mass: 1,
        isPocketed: false
      });
    }

    return pieces;
  };

  useEffect(() => {
    const total = selectedPucks.white * 20 + selectedPucks.black * 10 + selectedPucks.queen * 50;
    setSelectedFee(Math.ceil(total / 2));
  }, [selectedPucks]);

  // AI Proposal Logic
  useEffect(() => {
    if (gameType === 'solo' && showEntryFeeModal && gameState.status === 'finished') {
      const aiId = gameState.playerIds[1];
      const aiPoints = gameState.playerPoints[1];
      const playerProposal = gameState.proposals?.[gameState.playerIds[0]];
      
      const isRichPoor = gameState.mode === 'rich-poor';
      const aiIsPoor = isRichPoor && (gameState.playerPoints[1] < gameState.playerPoints[0]);
      const playerProposed = playerProposal !== undefined;

      if (playerProposed || aiIsPoor) {
        // AI tries to match player, but limited by its own points
        // If AI is poor and player hasn't proposed, AI sets the baseline
        const playerFee = playerProposed ? playerProposal.fee : (isRichPoor ? 160 : 50);
        const desiredAIFee = Math.min(playerFee, aiPoints);
        
        if (gameState.proposals?.[aiId]?.fee !== desiredAIFee) {
          const timer = setTimeout(() => {
            // For AI, we just match the pucks if fee matches, or use auto-gen if limited
            const aiPucks = playerProposed && desiredAIFee === playerFee 
              ? playerProposal.pucks 
              : { white: 9, black: 9, queen: 1 }; // Default for AI proposer
              
            setGameState(prev => ({
              ...prev,
              proposals: { ...prev.proposals, [aiId]: { fee: desiredAIFee, pucks: aiPucks } }
            }));
          }, 2000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [gameType, showEntryFeeModal, gameState.status, gameState.proposals, gameState.playerPoints, gameState.playerIds, gameState.mode]);

  // Handle Next Round Start when all players agree
  useEffect(() => {
    if (gameState.status === 'finished' && showEntryFeeModal) {
      const allProposed = gameState.playerIds.every(pid => gameState.proposals?.[pid] !== undefined);
      if (allProposed) {
        // Find the pucks associated with the minimum fee
        // In rich-poor mode, prioritize the proposal from the "poor" player (one with fewer points)
        const fees = gameState.playerIds.map(pid => gameState.proposals[pid].fee);
        let minFeePid = gameState.playerIds[0];
        const playerPoints = gameState.playerPoints || [0, 0];
        const isRichPoor = gameState.mode === 'rich-poor';
        
        if (isRichPoor) {
          const poorPlayerIdx = playerPoints[0] < playerPoints[1] ? 0 : 1;
          const poorPlayerId = gameState.playerIds[poorPlayerIdx];
          // If the poor player has proposed, use their fee and pucks as the baseline
          if (gameState.proposals?.[poorPlayerId]) {
            minFeePid = poorPlayerId;
          } else {
            const minFeeValue = Math.min(...fees);
            minFeePid = gameState.playerIds.find(pid => gameState.proposals[pid].fee === minFeeValue) || gameState.playerIds[0];
          }
        } else {
          const minFeeValue = Math.min(...fees);
          minFeePid = gameState.playerIds.find(pid => gameState.proposals[pid].fee === minFeeValue) || gameState.playerIds[0];
        }

        const minFee = isRichPoor && gameState.proposals?.[minFeePid] ? gameState.proposals[minFeePid].fee : Math.min(...fees);
        const minFeePucks = gameState.proposals[minFeePid].pucks;

        // In Solo mode, the player triggers it. In Multiplayer, the host triggers it.
        const isHost = user?.id === gameState.playerIds[0];
        if (isHost) {
          handleStartNextRound(minFee, minFeePucks);
        }
      }
    }
  }, [gameState.proposals, gameState.status, showEntryFeeModal, gameState.playerIds, user?.id]);

  // AI Turn Logic
  useEffect(() => {
    const isAdminTurn = user?.isAdmin && gameState.playerIds[gameState.currentPlayerIndex] === user.id;
    const isAIPlayerTurn = gameType === 'solo' && gameState.currentPlayerIndex === 1;
    
    const shouldAIPlay = gameType === 'solo' && (isAIPlayerTurn || (modAIPlay && isAdminTurn)) && 
                        appMode === 'playing' && 
                        !gameState.isMoving && 
                        !gameState.isSetupPhase && 
                        gameState.status === 'playing';

    if (shouldAIPlay) {
      const aiThinkTime = modAIPlay && isAdminTurn ? 500 : 2000;
      const timer = setTimeout(async () => {
        const targetCoins = gameState.pieces.filter(p => p.type !== 'striker' && !p.isPocketed);
        if (targetCoins.length > 0) {
          // Get AI Config
          const aiId = gameState.playerIds[gameState.currentPlayerIndex];
          let config = globalAiConfig;
          
          // Check if this is a real player with an override
          if (aiId !== 'AI') {
            const player = await AuthService.getUser(aiId);
            if (player?.aiConfig) {
              config = player.aiConfig;
            }
          }

          if (!config) config = { skillLevel: 50, accuracy: 70, powerMultiplier: 1, reactionTime: 1000, behavior: 'balanced' };

          let angle = 0;
          let power = 60;
          let strikerX = gameState.strikerPos;

          // AI Striker Y position
          const isPlayer1 = gameState.currentPlayerIndex === 0;
          const strikerY = isPlayer1 
            ? BOARD_SIZE / 2 + layout.baselineMarginFromCenter - layout.baselineWidth / 2 + layout.strikerYOffset
            : BOARD_SIZE / 2 - layout.baselineMarginFromCenter + layout.baselineWidth / 2 - layout.strikerYOffset;

          // Advanced AI Logic
          const pockets = [
            { x: layout.pocketOffset, y: layout.pocketOffset },
            { x: BOARD_SIZE - layout.pocketOffset, y: layout.pocketOffset },
            { x: layout.pocketOffset, y: BOARD_SIZE - layout.pocketOffset },
            { x: BOARD_SIZE - layout.pocketOffset, y: BOARD_SIZE - layout.pocketOffset }
          ];

          let bestShot = null;
          let maxScore = -Infinity;

          // Skill-based noise
          const skillNoise = (100 - config.skillLevel) / 100;
          const accuracyNoise = (100 - config.accuracy) / 100;

          for (const piece of targetCoins) {
            for (const pocket of pockets) {
              // Angle from piece to pocket
              const anglePieceToPocket = Math.atan2(pocket.y - piece.pos.y, pocket.x - piece.pos.x);
              
              // Ideal impact point on piece (opposite to pocket)
              const impactX = piece.pos.x - Math.cos(anglePieceToPocket) * (piece.radius + layout.strikerRadius);
              const impactY = piece.pos.y - Math.sin(anglePieceToPocket) * (piece.radius + layout.strikerRadius);

              // Check if impact point is reachable from baseline
              const minX = BOARD_SIZE / 2 - layout.baselineLength / 2;
              const maxX = BOARD_SIZE / 2 + layout.baselineLength / 2;
              
              // Find the best strikerX on baseline to hit impact point
              // We want the striker to be on the line connecting impact point and strikerY
              // (impactY - strikerY) / (impactX - strikerX) = slope
              // strikerX = impactX - (impactY - strikerY) / slope ... wait
              // The line is: y - strikerY = m(x - strikerX)
              // m = (impactY - strikerY) / (impactX - strikerX)
              // But we want to find strikerX that makes the line pass through impact point.
              // Actually, any strikerX on the baseline can hit the impact point if there's no obstruction.
              // But some positions give a better angle.
              
              const sX = Math.max(minX, Math.min(maxX, impactX));
              const dx = impactX - sX;
              const dy = impactY - strikerY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              // Score the shot
              let score = 1000 / (dist + 1);
              if (piece.type === 'queen') score *= 2;
              
              // Add some randomness to score based on skill
              score *= (1 + (Math.random() - 0.5) * skillNoise);

              if (score > maxScore) {
                maxScore = score;
                bestShot = { x: sX, angle: Math.atan2(dy, dx), power: 70 + Math.random() * 20 };
              }
            }
          }

          // Sometimes do a random shot if noob
          if (config.behavior === 'noob' && Math.random() > 0.4) {
            bestShot = {
              x: BOARD_SIZE / 2 + (Math.random() - 0.5) * layout.baselineLength,
              angle: (isPlayer1 ? -1 : 1) * Math.PI / 2 + (Math.random() - 0.5) * 0.5,
              power: 40 + Math.random() * 40
            };
          }

          if (bestShot) {
            // Apply noise to angle and power
            const finalAngle = bestShot.angle + (Math.random() - 0.5) * accuracyNoise * 0.2;
            const finalPower = bestShot.power * config.powerMultiplier * (1 + (Math.random() - 0.5) * accuracyNoise * 0.1);
            const finalStrikerX = bestShot.x + (Math.random() - 0.5) * accuracyNoise * 20;

            strikerX = Math.max(BOARD_SIZE / 2 - layout.baselineLength / 2, Math.min(BOARD_SIZE / 2 + layout.baselineLength / 2, finalStrikerX));
            angle = finalAngle;
            power = Math.max(20, Math.min(100, finalPower));
          }

          // First move striker
          setGameState(prev => ({
            ...prev,
            strikerPos: strikerX,
            pieces: prev.pieces.map(p => p.type === 'striker' ? { ...p, pos: { x: strikerX, y: strikerY } } : p)
          }));

          // Then strike after a short delay
          setTimeout(() => {
            handleStrike(angle, power, true);
          }, 500);
        }
      }, aiThinkTime);
      return () => clearTimeout(timer);
    }
  }, [appMode, gameType, gameState.currentPlayerIndex, gameState.isMoving, gameState.isSetupPhase, gameState.status, gameState.pieces, layout, modAIPlay, user, globalAiConfig]);

  const handleSellAsset = async (assetId: string) => {
    if (!user) return;
    const myIdx = gameState.playerIds.indexOf(user.id);
    if (myIdx === -1) return;

    const assets = [
      { id: 'arrow', price: 50 },
      { id: 'baseline', price: 100 },
      { id: 'pocket', price: 150 },
      { id: 'center', price: 200 }
    ];

    const assetType = assetId.split('_')[0];
    const assetConfig = assets.find(a => a.id === assetType);
    if (!assetConfig) return;

    // Refund 50% of the price
    const refund = Math.floor(assetConfig.price * 0.5);

    setGameState(prev => {
      const newOwned = { ...prev.ownedAssets };
      newOwned[user.id] = (newOwned[user.id] || []).filter(id => id !== assetId);
      
      const newScores = [...prev.scores];
      newScores[myIdx] += refund;

      const updates = { ownedAssets: newOwned, scores: newScores };
      if (prev.gameId) GameService.updateGameState(prev.gameId, updates);
      return { ...prev, ...updates };
    });

    SoundService.play('click');
  };

  const handleConfirmAssetReturn = () => {
    if (!showAssetReturnModal || !user) return;
    const { assetId, price } = showAssetReturnModal;
    const currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
    const currentPlayerIdx = gameState.currentPlayerIndex;

    // Calculate total value of selected pucks
    const totalValue = returnPucksSelection.reduce((acc, type) => {
      if (type === 'white') return acc + 20;
      if (type === 'black') return acc + 10;
      if (type === 'queen') return acc + 50;
      return acc;
    }, 0);

    if (totalValue < price) return;

    // Update game state: deduct pucks from pocketed, add to board center, add asset
    const newOwned = { ...gameState.ownedAssets };
    newOwned[currentPlayerId] = [...(newOwned[currentPlayerId] || []), assetId];

    // Remove selected pucks from pocketed state and return to board
    let remainingToReturn = [...returnPucksSelection];
    let updatedPieces = [...gameState.pieces];
    
    // Imperative update to ensure getReturnPos sees the physical state after each piece is returned
    for (let i = 0; i < updatedPieces.length; i++) {
      const p = updatedPieces[i];
      if (p.isPocketed && p.pocketedBy === currentPlayerId) {
        const idx = remainingToReturn.indexOf(p.type);
        if (idx !== -1) {
          remainingToReturn.splice(idx, 1);
          // Return to center with smart avoidance based on CURRENT updatedPieces
          const returnPos = getReturnPos(updatedPieces, { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 });
          updatedPieces[i] = { 
            ...p, 
            isPocketed: false, 
            pocketedBy: undefined,
            pos: returnPos,
            vel: { x: 0, y: 0 } 
          };
        }
      }
    }

    // Update scores: Deduct the value of RETURNED pieces
    const newScores = [...gameState.scores];
    newScores[currentPlayerIdx] = Math.max(0, newScores[currentPlayerIdx] - totalValue);

    const updates = { 
      ownedAssets: newOwned, 
      pieces: updatedPieces,
      scores: newScores
    };
    
    setGameState(prev => ({ ...prev, ...updates }));
    if (gameState.gameId) GameService.updateGameState(gameState.gameId, updates);
    setShowAssetReturnModal(null);
    setReturnPucksSelection([]);
    SoundService.play('click');
  };

  const handleGameOver = async (loserIndex: number, winnerByAssetsIndex: number, newPlayerPoints: number[]) => {
    const actualWinnerIndex = winnerByAssetsIndex !== -1 ? winnerByAssetsIndex : (loserIndex === 0 ? 1 : 0);
    
    // Update database first to sync other players
    if (gameState.gameId) {
      await GameService.updateGameState(gameState.gameId, { 
        status: 'gameOver',
        playerPoints: newPlayerPoints 
      });
    }

    if (user) {
      const isHumanWinner = actualWinnerIndex === 0;
      const statsUpdate = isHumanWinner ? { wins: user.wins + 1 } : { losses: user.losses + 1 };
      await AuthService.updateUserStats(user.id, statsUpdate);
      setUser(prev => prev ? { ...prev, ...statsUpdate } : null);
    }
    
    setAppMode('gameOver');
    setShowEntryFeeModal(false);
  };

  const handleStartNextRound = async (agreedFee?: number, agreedPucks?: PuckConfig) => {
    if (gameState.status === 'playing') return;
    
    const oldFee = gameState.entryFee;
    const newFee = agreedFee ?? oldFee;
    const newPlayerPoints = [...gameState.playerPoints];
    
    // 1. Settle the round that just finished using the OLD fee
    const winnerIndex = gameState.scores.indexOf(Math.max(...gameState.scores));
    const oldPot = oldFee * gameState.playerIds.length;
    
    // Apply 10% game fee if it's an arena game
    const arena = arenas.find(a => a.entryFee === oldFee);
    const feePercent = arena?.gameFeePercent || 0;
    const houseCut = Math.floor(oldPot * (feePercent / 100));
    const winnerPot = oldPot - houseCut;
    
    // Winner gets the pot from the previous round
    newPlayerPoints[winnerIndex] += winnerPot;

    // In rich-poor and buy-sell, players also keep the value of pucks they pocketed
    if (gameState.mode === 'rich-poor' || gameState.mode === 'buy-sell') {
      for (let i = 0; i < newPlayerPoints.length; i++) {
        newPlayerPoints[i] += gameState.scores[i];
      }
    }
    
    // Award XP
    if (user) {
      const isWinner = gameState.playerIds[winnerIndex] === user.id;
      const xpAward = isWinner ? 100 : 20;
      await AuthService.addXP(user.id, xpAward);
      const updatedUser = await AuthService.getUser(user.id);
      if (updatedUser) setUser(updatedUser);
    }

    // 2. Deduct the NEW fee from everyone for the next round
    for (let i = 0; i < newPlayerPoints.length; i++) {
      newPlayerPoints[i] = Math.max(0, newPlayerPoints[i] - newFee);
    }

    // Check for Game Over: if any player cannot afford the next round or one player has all assets
    const totalAssetsCount = 9; // 1 center + 4 baselines + 4 arrows
    const loserIndex = newPlayerPoints.findIndex(p => p < newFee);
    const winnerByAssetsIndex = gameState.playerIds.findIndex(pid => (gameState.ownedAssets[pid] || []).length === totalAssetsCount);
    
    if (loserIndex !== -1 || newPlayerPoints.some(p => p <= 0)) {
      const actualLoserIndex = loserIndex !== -1 ? loserIndex : newPlayerPoints.findIndex(p => p <= 0);
      const loserId = gameState.playerIds[actualLoserIndex];
      const loserAssets = gameState.ownedAssets[loserId] || [];
      
      // In buy-sell mode, if loser has assets, they MUST sell them to continue
      if (gameState.mode === 'buy-sell' && loserAssets.length > 0) {
        // Automatically sell the first asset to allow the game to continue
        const assetToSell = loserAssets[0];
        const assets = [
          { id: 'arrow', price: 50 },
          { id: 'baseline', price: 100 },
          { id: 'pocket', price: 150 },
          { id: 'center', price: 200 }
        ];
        const assetType = assetToSell.split('_')[0];
        const assetConfig = assets.find(a => a.id === assetType);
        const refund = assetConfig ? Math.floor(assetConfig.price * 0.5) : 0;
        
        newPlayerPoints[loserIndex] += refund;
        
        // Update owned assets
        const newOwned = { ...gameState.ownedAssets };
        newOwned[loserId] = loserAssets.filter(id => id !== assetToSell);
        
        // If they still can't afford it, check again (recursive-ish logic but handled by the loop)
        if (newPlayerPoints[loserIndex] < newFee && newOwned[loserId].length > 0) {
          // They still have more assets, let's just sell all if needed
          while (newPlayerPoints[loserIndex] < newFee && newOwned[loserId].length > 0) {
            const nextAsset = newOwned[loserId][0];
            const nextType = nextAsset.split('_')[0];
            const nextConfig = assets.find(a => a.id === nextType);
            const nextRefund = nextConfig ? Math.floor(nextConfig.price * 0.5) : 0;
            newPlayerPoints[loserIndex] += nextRefund;
            newOwned[loserId] = newOwned[loserId].filter(id => id !== nextAsset);
          }
        }

        // If they can finally afford it, update state and continue
        if (newPlayerPoints[loserIndex] >= newFee) {
          const updates = { ownedAssets: newOwned, playerPoints: newPlayerPoints };
          if (gameState.gameId) GameService.updateGameState(gameState.gameId, updates);
          setGameState(prev => ({ ...prev, ...updates }));
          // Continue with the rest of handleStartNextRound
        } else {
          // Still can't afford, game over
          const updates = { status: 'gameOver' as const, playerPoints: newPlayerPoints };
          if (gameState.gameId) GameService.updateGameState(gameState.gameId, updates);
          setGameState(prev => ({ ...prev, ...updates }));
          return;
        }
      } else {
        const updates = { status: 'gameOver' as const, playerPoints: newPlayerPoints };
        if (gameState.gameId) GameService.updateGameState(gameState.gameId, updates);
        setGameState(prev => ({ ...prev, ...updates }));
        return;
      }
    }

    // Update in database for user stats in parallel
    const statsPromises = newPlayerPoints.map((points, i) => 
      AuthService.updateUserStats(gameState.playerIds[i], { raheeCoins: points })
    );
    
    if (user) {
      const userIdx = gameState.playerIds.indexOf(user.id);
      if (userIdx !== -1) {
        setUser(prev => prev ? { ...prev, raheeCoins: newPlayerPoints[userIdx] } : null);
      }
    }
    
    await Promise.all(statsPromises);

    const nextRoundUpdates = {
      entryFee: newFee,
      playerPoints: newPlayerPoints,
      status: 'playing' as const,
      roundNumber: gameState.roundNumber + 1,
      pieces: getPiecesForPoints(newFee * 2, agreedPucks),
      isSetupPhase: true,
      currentPlayerIndex: 0,
      scores: gameState.playerIds.map(() => 0),
      pendingQueenIndex: null,
      proposals: {},
      turnStartTime: null
    };
    
    SoundService.play('start');
    if (gameState.gameId) await GameService.updateGameState(gameState.gameId, nextRoundUpdates);
    setGameState(prev => ({ ...prev, ...nextRoundUpdates }));
    setShowEntryFeeModal(false);
  };

  useEffect(() => {
    if (gameState.status === 'gameOver') {
      const winnerIndex = (() => {
        const totalAssetsCount = 9;
        const assetsWinner = gameState.playerIds.findIndex(pid => (gameState.ownedAssets[pid] || []).length === totalAssetsCount);
        if (assetsWinner !== -1) return assetsWinner;
        if (gameState.mode === 'classic') {
          return gameState.scores[0] >= gameState.scores[1] ? 0 : 1;
        }
        return gameState.playerPoints[0] >= gameState.playerPoints[1] ? 0 : 1;
      })();

      // Update stats and user state
      if (user) {
        const userIdx = gameState.playerIds.indexOf(user.id);
        if (userIdx !== -1) {
          const isUserWinner = userIdx === winnerIndex;
          const statsUpdate = isUserWinner ? { wins: user.wins + 1 } : { losses: user.losses + 1 };
          AuthService.updateUserStats(user.id, { ...statsUpdate, raheeCoins: gameState.playerPoints[userIdx] });
          setUser(prev => prev ? { ...prev, ...statsUpdate, raheeCoins: gameState.playerPoints[userIdx] } : null);
        }
      }

      // Sync other players' coin stats too
      gameState.playerIds.forEach((id, i) => {
        if (user && id === user.id) return;
        AuthService.updateUserStats(id, { raheeCoins: gameState.playerPoints[i] });
      });

      const timer = setTimeout(() => {
        setAppMode('gameOver');
        setShowEntryFeeModal(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.status === 'playing' && showEntryFeeModal) {
      setShowEntryFeeModal(false);
    }
  }, [gameState.status, showEntryFeeModal]);

  useEffect(() => {
    // Only show entry fee modal for next rounds (roundNumber > 0 and status is finished)
    if (appMode === 'playing' && gameState.status === 'finished' && !showEntryFeeModal) {
      setShowEntryFeeModal(true);
    }
  }, [appMode, gameState.status, showEntryFeeModal]);

  const handleConfirmEntryFee = async () => {
    if (!lobby || !user) return;
    
    SoundService.play('click');
    const updates = { entryFee: selectedFee };
    setGameState(prev => ({ ...prev, ...updates }));
    if (gameState.gameId) GameService.updateGameState(gameState.gameId, updates);
  };

  useEffect(() => {
    // Update pieces for preview when status is finished and fee changes
    if (appMode === 'playing' && gameState.status === 'finished' && showEntryFeeModal) {
      const previewPieces = getPiecesForPoints(selectedFee * 2);
      // Only update if pieces are different (simple check: length or first piece pos)
      if (gameState.pieces.length !== previewPieces.length) {
        setGameState(prev => ({ ...prev, pieces: previewPieces }));
      }
    }
  }, [appMode, gameState.status, showEntryFeeModal, selectedFee, gameState.pieces.length]);

  if (appMode === 'splash') return <SplashScreen />;
  
  if (appMode === 'login' || appMode === 'signup') {
    return (
      <Auth 
        mode={appMode}
        onAuthSuccess={(u) => {
          setUser(u);
          setAppMode('menu');
        }}
        onSwitchToSignup={() => setAppMode('signup')}
        onSwitchToLogin={() => setAppMode('login')}
      />
    );
  }

  if (appMode === 'admin') return <AdminPanel onBack={() => setAppMode('menu')} onEnterEditor={() => setAppMode('layout-editor')} />;

  if (appMode === 'layout-editor') return <LayoutEditor onBack={() => setAppMode('admin')} />;

  if (appMode === 'profile' && selectedPlayer) {
    const isOwnProfile = user?.id === selectedPlayer.id;
    
    const handleSendFriendRequest = async (targetUserId: string) => {
      if (!user) return;
      try {
        await AuthService.sendFriendRequest(user.id, user.name, targetUserId);
        alert('Friend request sent!');
      } catch (err) {
        console.error(err);
        alert('Failed to send friend request.');
      }
    };

    return (
      <Profile 
        user={selectedPlayer} 
        currentUser={user!}
        onBack={() => setAppMode(gameState.status === 'playing' ? 'playing' : 'menu')} 
        backLabel={gameState.status === 'playing' ? 'Back to Game' : 'Back to Menu'}
        onLogout={isOwnProfile ? () => {
          localStorage.removeItem('rahee_user');
          setUser(null);
          setAppMode('login');
        } : undefined}
        onSendFriendRequest={handleSendFriendRequest}
      />
    );
  }

  if (appMode === 'feedback' && user) {
    return <Feedback user={user} onBack={() => setAppMode('menu')} />;
  }

  const handleStartGame = async () => {
    if (!lobby || !user) return;
    const isHost = lobby.playerIds[0] === user.id;
    if (!isHost) return;

    // Transition lobby status to trigger all subscribed players to start
    await LobbyService.updateLobby(lobby.id, { 
      status: 'playing' 
    });
  };

    if (appMode === 'lobby') {
      const isHost = lobby?.playerIds[0] === user?.id;
      const isFull = lobby?.playerIds.length === lobby?.maxPlayers;
  
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white relative">
          <button 
            onClick={() => {
              if (lobby) LobbyService.leaveLobby(lobby.id, user?.id || '');
              setAppMode('menu');
            }}
            className="absolute top-8 left-8 p-4 bg-white/5 rounded-full hover:bg-white/10 transition-all border border-white/10 z-10"
          >
            <ChevronLeft size={24} />
          </button>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-neutral-800 p-12 rounded-[40px] border border-white/10 text-center shadow-2xl"
        >
          {!isFull ? (
            <div className="w-24 h-24 border-8 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-8" />
          ) : (
            <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <Users className="text-orange-500 w-12 h-12" />
            </div>
          )}
          
          <h2 className="text-3xl font-black italic tracking-tighter mb-4 uppercase">
            {isFull ? 'Lobby Full' : 'Waiting for Players'}
          </h2>
          <p className="text-neutral-400 font-bold tracking-widest text-sm mb-8">
            Lobby: {lobby?.playerIds.length} / {lobby?.maxPlayers}
          </p>
          <div className="space-y-2 mb-8">
            {lobby?.playerNames.map((name, i) => (
              <p key={i} className="text-orange-500 font-black tracking-widest">{name}</p>
            ))}
          </div>

          {isFull && isHost && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartGame}
              className="w-full py-4 bg-orange-500 rounded-2xl font-black italic uppercase tracking-tighter text-xl shadow-lg shadow-orange-500/20 mb-4"
            >
              Start Game
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (lobby) LobbyService.leaveLobby(lobby.id, user?.id || '');
              setAppMode('menu');
            }}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
          >
            Leave Lobby
          </motion.button>

          {isFull && !isHost && (
            <p className="text-neutral-500 font-bold tracking-widest text-xs animate-pulse">
              Waiting for host to start...
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  if (appMode === 'menu' && user) {
    return (
      <>
        <Menu 
          user={user}
          arenas={arenas}
          onStartSolo={(mode = 'classic', playerColor = 'white') => {
            setGameType('solo');
            const aiColor = playerColor === 'white' ? 'black' : 'white';
            const initial = getInitialGameState(layout);
            // Give AI 1000 starting points so it can match player proposals
            setGameState({
              ...initial,
              playerIds: [user.id, 'ai'],
              playerNames: [user.name, 'AI'],
              playerPoints: [user.raheeCoins || 0, 1000],
              pendingQueenIndex: null,
              pocketedThisTurn: [],
              ownedAssets: {},
              playerColors: [playerColor, aiColor],
              mode,
            });
            setAppMode('playing');
          }}
          onJoinLobby={(maxPlayers, mode, color) => handleJoinLobby(maxPlayers, mode, color)}
          onStartOnline={(arena, mode, color) => handleStartOnline(arena, mode, color)}
          onOpenAdmin={() => setAppMode('admin')}
          onLogout={() => {
            localStorage.removeItem('rahee_user');
            setUser(null);
            setAppMode('login');
          }}
          onOpenFeedback={() => setAppMode('feedback')}
          onOpenProfile={(u) => {
            setSelectedPlayer(u);
            setAppMode('profile');
          }}
        />

        {matchmaking?.active && (
          <div className="fixed inset-0 z-[500] bg-neutral-950 flex flex-col items-center justify-center p-6 text-white">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="w-32 h-32 border-8 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-8" />
              <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Finding Opponent</h2>
              <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs mb-12">Arena: {matchmaking.arena?.name}</p>

              <div className="flex items-center justify-center space-x-12">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-neutral-800 border border-white/10 overflow-hidden mb-3 mx-auto">
                    <img src={`https://picsum.photos/seed/${user.name}/100/100`} alt="You" referrerPolicy="no-referrer" />
                  </div>
                  <p className="font-black text-sm">{user.name}</p>
                  <p className="text-[10px] font-bold text-blue-500 uppercase">Rank {user.rank || 1}</p>
                </div>

                <div className="text-4xl font-black italic text-neutral-700">VS</div>

                <div className="text-center">
                  {matchmaking.opponent ? (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                      <div className="w-20 h-20 rounded-2xl bg-neutral-800 border border-orange-500 overflow-hidden mb-3 mx-auto">
                        <img src={`https://picsum.photos/seed/${matchmaking.opponent.name}/100/100`} alt="Opponent" referrerPolicy="no-referrer" />
                      </div>
                      <p className="font-black text-sm">{matchmaking.opponent.name}</p>
                      <p className="text-[10px] font-bold text-orange-500 uppercase">Rank {matchmaking.opponent.rank}</p>
                    </motion.div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-3 mx-auto animate-pulse">
                      <Users className="text-neutral-700" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </>
    );
  }

  if (appMode === 'gameOver' && user) {
    const winnerIndex = (() => {
      // 1. Asset Dominance (Buy/Sell)
      const totalAssetsCount = 9;
      const assetsWinner = gameState.playerIds.findIndex(pid => (gameState.ownedAssets[pid] || []).length === totalAssetsCount);
      if (assetsWinner !== -1) return assetsWinner;
      
      // 2. Classic Win (9 pieces)
      if (gameState.mode === 'classic') {
        const p1Score = gameState.scores[0];
        const p2Score = gameState.scores[1];
        if (p1Score >= 9) return 0;
        if (p2Score >= 9) return 1;
        return p1Score >= p2Score ? 0 : 1;
      }
      
      // 3. Bankruptcy / Points (Rich/Poor, Buy/Sell)
      const p1Points = gameState.playerPoints[0];
      const p2Points = gameState.playerPoints[1];
      if (p1Points <= 0 && p2Points > 0) return 1;
      if (p2Points <= 0 && p1Points > 0) return 0;
      return p1Points >= p2Points ? 0 : 1;
    })();

    const isWinner = gameState.playerIds[winnerIndex] === user.id;
    const winnerName = gameState.playerNames[winnerIndex];
    
    const handleRestartMatch = async () => {
      if (!gameState.gameId) return;
      
      // Fetch fresh points for all players
      const points = await Promise.all(gameState.playerIds.map(async (id) => {
        const u = await AuthService.getUser(id);
        return u?.raheeCoins || 0;
      }));

      const initialPieces = getInitialPieces(layout);
      const restartUpdates = {
        status: 'playing' as const,
        roundNumber: 1,
        pieces: initialPieces,
        isSetupPhase: true,
        currentPlayerIndex: 0,
        scores: gameState.playerIds.map(() => 0),
        playerPoints: points,
        pendingQueenIndex: null,
        proposals: {},
        turnStartTime: null,
        pocketedThisTurn: [],
        ownedAssets: {},
        ownedTerritories: {},
        isMoving: false
      };
      
      SoundService.play('start');
      if (gameState.gameId) await GameService.updateGameState(gameState.gameId, restartUpdates);
      setGameState(prev => ({ ...prev, ...restartUpdates }));
      setAppMode('playing');
    };

    return (
      <GameOver 
        winnerName={winnerName}
        isWinner={isWinner}
        onRestart={handleRestartMatch}
        onHome={() => setAppMode('menu')}
        stats={{
          coins: user.raheeCoins,
          diamonds: user.raheeDiamonds,
          assets: (gameState.ownedAssets[user.id] || []).length,
          xp: user.xp || 0,
          rank: user.rank || 1
        }}
      />
    );
  }

  if (appMode === 'playing') {
    const whiteCount = gameState.pieces.filter(p => p.type === 'white' && !p.isPocketed).length;
    const blackCount = gameState.pieces.filter(p => p.type === 'black' && !p.isPocketed).length;
    const perspectiveRotation = (user && gameState.playerIds[1] === user.id) ? Math.PI : 0;

    return (
      <div 
        className="min-h-screen flex items-center justify-center transition-colors duration-500 overflow-hidden p-2 sm:p-4"
        style={{ backgroundColor: THEME.backgroundColor }}
      >
        {/* Mod Menu Modal */}
        {showModMenu && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border border-orange-500/50 p-8 rounded-[40px] max-w-md w-full text-center shadow-[0_0_50px_rgba(249,115,22,0.2)]"
            >
              <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2 text-orange-500">Admin Mod Menu</h2>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-8">Welcome back, Rahee</p>
              
              <div className="space-y-4">
                <button
                  onClick={() => setModLongAim(!modLongAim)}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all border ${
                    modLongAim 
                      ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' 
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'
                  }`}
                >
                  {modLongAim ? 'Long Aim: ON' : 'Long Aim: OFF'}
                </button>

                <button
                  onClick={() => setModAIPlay(!modAIPlay)}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all border ${
                    modAIPlay 
                      ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' 
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'
                  }`}
                >
                  {modAIPlay ? 'AI Play: ON' : 'AI Play: OFF'}
                </button>

                <button
                  onClick={() => setModAlwaysMyTurn(!modAlwaysMyTurn)}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all border ${
                    modAlwaysMyTurn 
                      ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' 
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'
                  }`}
                >
                  {modAlwaysMyTurn ? 'Always Human Turn: ON' : 'Always Human Turn: OFF'}
                </button>

                <button
                  onClick={handleWinRound}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
                >
                  Win Round & Own All
                </button>

                <button
                  onClick={() => setShowModMenu(false)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-neutral-400 rounded-2xl font-black uppercase tracking-widest transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Next Round Modal */}
        {showEntryFeeModal && gameState.status === 'finished' && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border border-white/10 p-8 rounded-[40px] max-w-md w-full text-center shadow-2xl"
            >
              <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Round Finished</h2>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-4">Select points for the next round</p>
              
              <div className="flex justify-center gap-4 mb-8">
                {(() => {
                  const isRichPoor = gameState.mode === 'rich-poor';
                  return gameState.playerNames.map((name, i) => {
                    const pid = gameState.playerIds[i];
                    const points = gameState.playerPoints[i];
                    const proposal = gameState.proposals?.[pid];
                    const isPoor = isRichPoor && (i === (gameState.playerPoints[0] < gameState.playerPoints[1] ? 0 : 1));
                    
                    return (
                      <div key={i} className={`bg-white/5 p-4 rounded-2xl border flex-1 transition-all ${proposal ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10'} ${isPoor ? 'ring-2 ring-orange-500/20' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-neutral-500">{name}</p>
                          {isPoor && <span className="text-[7px] font-black bg-orange-500 text-white px-1 rounded">Proposer</span>}
                        </div>
                        <p className="text-xs font-bold text-orange-500 mb-2">{points} pts</p>
                        <p className="text-2xl font-black text-white mb-1">
                          {proposal ? proposal.fee : '...'}
                        </p>
                        {proposal && (
                          <div className="flex justify-center gap-1 mt-1">
                            {proposal.pucks.white > 0 && <div className="w-2 h-2 rounded-full bg-white border border-neutral-400" title="White" />}
                            {proposal.pucks.black > 0 && <div className="w-2 h-2 rounded-full bg-neutral-800 border border-neutral-600" title="Black" />}
                            {proposal.pucks.queen > 0 && <div className="w-2 h-2 rounded-full bg-red-600 border border-red-400" title="Queen" />}
                          </div>
                        )}
                        <p className="text-[8px] font-bold text-neutral-600 uppercase">Proposal</p>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">Customize Pucks</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { type: 'white', label: 'White', color: 'bg-white', points: 20 },
                    { type: 'black', label: 'Black', color: 'bg-neutral-800', points: 10 },
                    { type: 'queen', label: 'Queen', color: 'bg-red-600', points: 50 }
                  ].map(p => (
                    <div key={p.type} className="flex flex-col items-center gap-2 bg-white/5 p-3 rounded-2xl border border-white/10">
                      <div className={`w-6 h-6 rounded-full ${p.color} border border-white/20 shadow-sm`} />
                      <p className="text-[10px] font-black text-neutral-400 uppercase">{p.label}</p>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            SoundService.play('click');
                            const newPucks = { ...selectedPucks, [p.type]: Math.max(0, selectedPucks[p.type as keyof PuckConfig] - 1) };
                            setSelectedPucks(newPucks);
                          }}
                          className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white font-bold hover:bg-white/20"
                        >
                          -
                        </button>
                        <span className="text-lg font-black text-white">{selectedPucks[p.type as keyof PuckConfig]}</span>
                        <button 
                          onClick={() => {
                            SoundService.play('click');
                            const newPucks = { ...selectedPucks, [p.type]: selectedPucks[p.type as keyof PuckConfig] + 1 };
                            const totalPoints = newPucks.white * 20 + newPucks.black * 10 + newPucks.queen * 50;
                            const entryFee = Math.ceil(totalPoints / 2);
                            
                            if (entryFee <= (user?.raheeCoins || 0)) {
                              setSelectedPucks(newPucks);
                            }
                          }}
                          className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white font-bold hover:bg-white/20"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[8px] font-bold text-orange-500/50">{p.points} pts</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center mb-8">
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Round Value (Pot)</p>
                <div className="text-5xl font-black text-white">{selectedFee * 2}</div>
                <p className="text-[10px] font-bold text-neutral-600 uppercase mt-1">Entry Fee: {selectedFee} pts</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: '10 pts', fee: 10, pucks: { white: 0, black: 2, queen: 0 } },
                  { label: '50 pts', fee: 50, pucks: { white: 4, black: 2, queen: 0 } },
                  { label: '100 pts', fee: 100, pucks: { white: 8, black: 4, queen: 0 } },
                  { label: '160 pts', fee: 160, pucks: { white: 9, black: 9, queen: 1 } },
                  { label: 'Classic', fee: 160, pucks: { white: 9, black: 9, queen: 1 } },
                  { label: 'Max', fee: Math.min(160, user?.raheeCoins || 0), pucks: { white: 9, black: 9, queen: 1 } }
                ].map(preset => {
                  const canAfford = (user?.raheeCoins || 0) >= preset.fee;
                  return (
                    <button
                      key={preset.label}
                      disabled={!canAfford}
                      onClick={() => {
                        SoundService.play('click');
                        setSelectedFee(preset.fee);
                        setSelectedPucks(preset.pucks);
                      }}
                      className={`py-3 rounded-xl font-black transition-all border text-[10px] uppercase tracking-widest ${
                        selectedFee === preset.fee 
                          ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' 
                          : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'
                      } ${!canAfford ? 'opacity-20 cursor-not-allowed' : ''}`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  disabled={(() => {
                    const isRichPoor = gameState.mode === 'rich-poor';
                    if (!isRichPoor) return false;
                    const poorPlayerIdx = gameState.playerPoints[0] < gameState.playerPoints[1] ? 0 : 1;
                    return gameState.playerIds[poorPlayerIdx] !== user?.id;
                  })() || (
                    gameState.proposals?.[user?.id || '']?.fee === selectedFee && 
                    JSON.stringify(gameState.proposals?.[user?.id || '']?.pucks) === JSON.stringify(selectedPucks)
                  )}
                  onClick={() => {
                    if (user) {
                      const proposal: Proposal = { fee: selectedFee, pucks: selectedPucks };
                      const newProposals = { ...gameState.proposals, [user.id]: proposal };
                      setGameState(prev => ({ ...prev, proposals: newProposals }));
                      if (gameState.gameId) {
                        GameService.updateGameState(gameState.gameId, { proposals: newProposals });
                      }
                    }
                  }}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg ${
                    gameState.proposals?.[user?.id || '']?.fee === selectedFee && 
                    JSON.stringify(gameState.proposals?.[user?.id || '']?.pucks) === JSON.stringify(selectedPucks)
                      ? 'bg-neutral-800 text-neutral-500 cursor-default'
                      : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'
                  } ${
                    (() => {
                      const isRichPoor = gameState.mode === 'rich-poor';
                      if (!isRichPoor) return false;
                      const poorPlayerIdx = gameState.playerPoints[0] < gameState.playerPoints[1] ? 0 : 1;
                      return gameState.playerIds[poorPlayerIdx] !== user?.id;
                    })() ? 'opacity-20 cursor-not-allowed' : ''
                  }`}
                >
                  {(() => {
                      const isRichPoor = gameState.mode === 'rich-poor';
                      if (isRichPoor) {
                        const poorPlayerIdx = gameState.playerPoints[0] < gameState.playerPoints[1] ? 0 : 1;
                        if (gameState.playerIds[poorPlayerIdx] !== user?.id) return 'Poor player proposes...';
                      }
                      return (gameState.proposals?.[user?.id || '']?.fee === selectedFee && 
                              JSON.stringify(gameState.proposals?.[user?.id || '']?.pucks) === JSON.stringify(selectedPucks))
                        ? 'Waiting for others...' 
                        : 'Propose Round';
                  })()}
                </button>
                <p className="text-[10px] font-bold text-neutral-600 uppercase mt-4 text-center">
                  Note: The round will start with the minimum fee proposed by any player.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Asset Return Modal */}
        {showAssetReturnModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border border-white/10 p-8 rounded-[40px] max-w-md w-full text-center shadow-2xl"
            >
              <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Buy {showAssetReturnModal.assetId.split('_')[0]}</h2>
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-8">Price: {showAssetReturnModal.price} Points. Select pucks to return to game.</p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {['white', 'black', 'queen'].map(type => {
                  const currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
                  const count = gameState.pieces.filter(p => p.type === type && p.isPocketed && p.pocketedBy === currentPlayerId).length;
                  const selectedCount = returnPucksSelection.filter(t => t === type).length;
                  const value = type === 'white' ? 20 : (type === 'black' ? 10 : 50);
                  
                  return (
                    <button
                      key={type}
                      disabled={count === 0}
                      onClick={() => {
                        if (selectedCount < count) {
                          setReturnPucksSelection([...returnPucksSelection, type as PieceType]);
                        } else {
                          const idx = returnPucksSelection.indexOf(type as PieceType);
                          if (idx !== -1) {
                            const next = [...returnPucksSelection];
                            next.splice(idx, 1);
                            setReturnPucksSelection(next);
                          }
                        }
                      }}
                      className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                        selectedCount > 0 ? 'bg-orange-500/20 border-orange-500' : 'bg-white/5 border-white/10'
                      } ${count === 0 ? 'opacity-20 grayscale' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full shadow-lg ${
                        type === 'white' ? 'bg-neutral-200' : (type === 'black' ? 'bg-neutral-900' : 'bg-red-500')
                      }`} />
                      <p className="text-[10px] font-black uppercase tracking-widest">{type}</p>
                      <p className="text-xs font-black text-orange-500">{value} pts</p>
                      <p className="text-[8px] font-bold text-neutral-500">{selectedCount} / {count}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowAssetReturnModal(null)}
                  className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssetReturn}
                  disabled={returnPucksSelection.reduce((acc, t) => acc + (t === 'white' ? 20 : (t === 'black' ? 10 : 50)), 0) < showAssetReturnModal.price}
                  className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm ({returnPucksSelection.reduce((acc, t) => acc + (t === 'white' ? 20 : (t === 'black' ? 10 : 50)), 0)} / {showAssetReturnModal.price})
                </button>
              </div>
            </motion.div>
          </div>
        )}
        <div className="relative w-full max-w-4xl flex flex-col gap-2 sm:gap-6">
          {/* Player Info Bar (One Line) */}
          <div className="flex flex-row justify-between items-center bg-black/40 backdrop-blur-xl p-2 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-white/10 gap-1 sm:gap-4">
            {/* Left Player Info (Always Current User if in game) */}
            {(() => {
              const isP2 = user?.id === gameState.playerIds[1];
              const leftIdx = isP2 ? 1 : 0;
              const rightIdx = isP2 ? 0 : 1;

              const leftPlayerId = gameState.playerIds[leftIdx];
              const rightPlayerId = gameState.playerIds[rightIdx];

              const leftPockets = gameState.pieces.filter(p => p.isPocketed && p.pocketedBy === leftPlayerId);
              const rightPockets = gameState.pieces.filter(p => p.isPocketed && p.pocketedBy === rightPlayerId);

              const leftWhite = leftPockets.filter(p => p.type === 'white').length;
              const leftBlack = leftPockets.filter(p => p.type === 'black').length;
              const leftQueen = leftPockets.filter(p => p.type === 'queen').length;

              const leftScoreValue = leftWhite * 20 + leftBlack * 10 + leftQueen * 50;

              const rightWhite = rightPockets.filter(p => p.type === 'white').length;
              const rightBlack = rightPockets.filter(p => p.type === 'black').length;
              const rightQueen = rightPockets.filter(p => p.type === 'queen').length;

              const rightScoreValue = rightWhite * 20 + rightBlack * 10 + rightQueen * 50;

              return (
                <>
                  <div className="flex items-center space-x-1 sm:space-x-4 flex-1 min-w-0">
                    <div 
                      className="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-neutral-800 overflow-hidden border border-white/10 relative flex-shrink-0 cursor-pointer"
                      onMouseDown={gameState.playerIds[leftIdx] === user?.id ? handleLongPressStart : undefined}
                      onMouseUp={gameState.playerIds[leftIdx] === user?.id ? handleLongPressEnd : undefined}
                      onMouseLeave={gameState.playerIds[leftIdx] === user?.id ? handleLongPressEnd : undefined}
                      onTouchStart={gameState.playerIds[leftIdx] === user?.id ? handleLongPressStart : undefined}
                      onTouchEnd={gameState.playerIds[leftIdx] === user?.id ? handleLongPressEnd : undefined}
                      onClick={async () => {
                        const targetId = gameState.playerIds[leftIdx];
                        if (targetId === 'ai') {
                          const botUser: User = {
                            id: 'ai',
                            name: 'AI Player',
                            raheeCoins: 1000,
                            raheeDiamonds: 0,
                            xp: 5000,
                            rank: 10,
                            wins: 100,
                            losses: 50,
                            isAdmin: false,
                            isApproved: true,
                            key: '',
                            friends: [],
                            createdAt: new Date().toISOString()
                          };
                          setSelectedPlayer(botUser);
                          setAppMode('profile');
                          return;
                        }
                        const targetUser = await AuthService.getUser(targetId);
                        if (targetUser) {
                          setSelectedPlayer(targetUser);
                          setAppMode('profile');
                        }
                      }}
                    >
                      {/* Circular Timer for Left Player */}
                      {gameState.currentPlayerIndex === leftIdx && (
                        <svg className="absolute inset-0 w-full h-full -rotate-90 z-10 pointer-events-none">
                          <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-orange-500"
                            strokeDasharray="100"
                            strokeDashoffset={100 - (gameState.turnTimer / 16) * 100}
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                          />
                        </svg>
                      )}
                      <img src={`https://picsum.photos/seed/${gameState.playerNames[leftIdx]}/100/100`} alt="P_Left" referrerPolicy="no-referrer" />
                      <div 
                        className="absolute bottom-0 right-0 w-2 h-2 sm:w-4 sm:h-4 rounded-full border-2 border-neutral-900 shadow-sm"
                        style={{ backgroundColor: gameState.playerColors[leftIdx] === 'white' ? '#F5F5DC' : '#212121' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] sm:text-[11px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1 truncate">
                        {String(gameState.playerNames[leftIdx] || '')}
                      </p>
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        {gameState.mode === 'classic' && (
                          <div className="flex items-center gap-1">
                             <PuckIcon type={gameState.playerColors[leftIdx]} size={window.innerWidth < 640 ? 12 : 24} />
                             {gameState.coveredQueenIndex === leftIdx && <PuckIcon type="queen" size={window.innerWidth < 640 ? 10 : 16} />}
                          </div>
                        )}
                        <p className="text-lg sm:text-4xl font-black text-white leading-none">{gameState.mode === 'classic' ? Number(gameState.scores[leftIdx] || 0) : leftScoreValue}</p>
                        <div className="hidden sm:flex flex-col gap-0.5">
                          {gameState.mode === 'classic' ? (
                            <p className="text-[7px] sm:text-[9px] font-black text-orange-500 uppercase tracking-widest">
                              {gameState.playerColors[leftIdx] === 'white' ? `${whiteCount} W` : `${blackCount} B`}
                            </p>
                          ) : (
                            <div className="flex gap-1">
                              {leftWhite > 0 && <span className="text-[7px] font-black text-neutral-200">{leftWhite}W</span>}
                              {leftBlack > 0 && <span className="text-[7px] font-black text-neutral-500">{leftBlack}B</span>}
                              {leftQueen > 0 && <span className="text-[7px] font-black text-red-500">{leftQueen}Q</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Game Name (Center) */}
                  <div className="flex flex-col items-center flex-shrink-0 min-w-0">
                    <div className="px-1.5 py-0.5 sm:px-8 sm:py-2.5 bg-orange-500/10 rounded-full border border-orange-500/20 backdrop-blur-md">
                      <p className="text-[6px] sm:text-[14px] font-black uppercase tracking-[0.05em] sm:tracking-[0.25em] text-orange-500 drop-shadow-sm truncate">
                        {String(gameState.mode || 'classic').replace('-', ' ')}
                      </p>
                    </div>
                  </div>

                  {/* Right Player Info */}
                  <div className="flex items-center space-x-1 sm:space-x-4 text-right flex-1 justify-end min-w-0">
                    <div className="min-w-0">
                      <p className="text-[8px] sm:text-[11px] font-black text-neutral-500 uppercase tracking-widest flex items-center justify-end gap-1 truncate">
                        {String(gameState.playerNames[rightIdx] || 'Waiting...')}
                      </p>
                      <div className="flex items-baseline justify-end gap-1 sm:gap-2">
                        {gameState.mode === 'classic' && (
                          <div className="flex items-center gap-1">
                             <PuckIcon type={gameState.playerColors[rightIdx]} size={window.innerWidth < 640 ? 12 : 24} />
                             {gameState.coveredQueenIndex === rightIdx && <PuckIcon type="queen" size={window.innerWidth < 640 ? 10 : 16} />}
                          </div>
                        )}
                        <p className="text-lg sm:text-4xl font-black text-white leading-none">{gameState.mode === 'classic' ? Number(gameState.scores[rightIdx] || 0) : rightScoreValue}</p>
                      </div>
                    </div>
                    <div 
                      className="w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-neutral-800 overflow-hidden border border-white/10 relative flex-shrink-0 cursor-pointer"
                      onMouseDown={gameState.playerIds[rightIdx] === user?.id ? handleLongPressStart : undefined}
                      onMouseUp={gameState.playerIds[rightIdx] === user?.id ? handleLongPressEnd : undefined}
                      onMouseLeave={gameState.playerIds[rightIdx] === user?.id ? handleLongPressEnd : undefined}
                      onTouchStart={gameState.playerIds[rightIdx] === user?.id ? handleLongPressStart : undefined}
                      onTouchEnd={gameState.playerIds[rightIdx] === user?.id ? handleLongPressEnd : undefined}
                      onClick={async () => {
                        const targetId = gameState.playerIds[rightIdx];
                        if (targetId === 'ai') {
                          // Create a dummy bot user for profile view
                          const botUser: User = {
                            id: 'ai',
                            name: 'AI Player',
                            raheeCoins: 1000,
                            raheeDiamonds: 0,
                            xp: 5000,
                            rank: 10,
                            wins: 100,
                            losses: 50,
                            isAdmin: false,
                            isApproved: true,
                            key: '',
                            friends: [],
                            createdAt: new Date().toISOString()
                          };
                          setSelectedPlayer(botUser);
                          setAppMode('profile');
                          return;
                        }
                        const targetUser = await AuthService.getUser(targetId);
                        if (targetUser) {
                          setSelectedPlayer(targetUser);
                          setAppMode('profile');
                        }
                      }}
                    >
                      {/* Circular Timer for Right Player */}
                      {gameState.currentPlayerIndex === rightIdx && (
                        <svg className="absolute inset-0 w-full h-full -rotate-90 z-10 pointer-events-none">
                          <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-orange-500"
                            strokeDasharray="100"
                            strokeDashoffset={100 - (gameState.turnTimer / 16) * 100}
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                          />
                        </svg>
                      )}
                      <img src={`https://picsum.photos/seed/${gameState.playerNames[rightIdx]}/100/100`} alt="P_Right" referrerPolicy="no-referrer" />
                      <div 
                        className="absolute bottom-0 left-0 w-2 h-2 sm:w-4 sm:h-4 rounded-full border-2 border-neutral-900 shadow-sm"
                        style={{ backgroundColor: gameState.playerColors[rightIdx] === 'white' ? '#F5F5DC' : '#212121' }}
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="relative board-container">
            <Board 
              gameState={gameState}
              user={user}
              onStrike={handleStrike}
              onSetupRotate={handleSetupRotate}
              rotation={perspectiveRotation}
              onBuyAsset={(assetId) => {
                const currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
                if (gameState.mode !== 'buy-sell') return;
                if (!currentPlayerId || (user && user.id !== currentPlayerId)) return;

                const assets = [
                  { id: 'arrow', price: 50 },
                  { id: 'baseline', price: 100 },
                  { id: 'pocket', price: 150 },
                  { id: 'center', price: 200 }
                ];

                // Check if already owned by anyone
                const isOwnedByAnyone = Object.values(gameState.ownedAssets).some(assets => assets.includes(assetId));
                if (isOwnedByAnyone) return;

                const assetType = assetId.split('_')[0];
                const assetConfig = assets.find(a => a.id === assetType);
                if (!assetConfig) return;

                // Calculate effective score from physical pocketed pieces for Buy-Sell mode
                const myPockets = gameState.pieces.filter(p => p.isPocketed && p.pocketedBy === currentPlayerId);
                const whiteVal = myPockets.filter(p => p.type === 'white').length * 20;
                const blackVal = myPockets.filter(p => p.type === 'black').length * 10;
                const queenVal = myPockets.filter(p => p.type === 'queen').length * 50;
                
                const effectiveScore = (whiteVal + blackVal + queenVal);

                if (effectiveScore < assetConfig.price) return;

                // Open modal for all modes to allow puck selection for purchase
                // This ensures "direct buy na ho jaye" as requested.
                setShowAssetReturnModal({ assetId, price: assetConfig.price });
                setReturnPucksSelection([]);
              }}
              layout={layout}
              longAim={modLongAim && user?.isAdmin && gameState.playerIds[gameState.currentPlayerIndex] === user?.id}
              onAimUpdate={(angle, power) => {
                // Sync aim in real-time
                if (gameState.playerIds[gameState.currentPlayerIndex] === user?.id) {
                  syncStrikerAndAim({ aimAngle: angle, aimPower: power });
                }
              }}
              onStrikerMove={(x) => {
                // Guard: Only current player can move striker
                if (gameState.playerIds[gameState.currentPlayerIndex] !== user?.id) return;

                const strikerY = gameState.currentPlayerIndex === 0
                  ? BOARD_SIZE / 2 + layout.baselineMarginFromCenter - layout.baselineWidth / 2 + layout.strikerYOffset
                  : BOARD_SIZE / 2 - layout.baselineMarginFromCenter + layout.baselineWidth / 2 - layout.strikerYOffset;
                
                setGameState(prev => {
                  const newPieces = prev.pieces.map(p => 
                    p.type === 'striker' ? { ...p, pos: { x, y: strikerY } } : p
                  );
                  const updates = { pieces: newPieces, strikerPos: x };
                  syncStrikerAndAim(updates);
                  return { ...prev, ...updates };
                });
              }}
            />
            
            {/* Confirm Setup (Center Overlay) */}
            {gameState.isSetupPhase && gameState.playerIds[gameState.currentPlayerIndex] === user?.id && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="pointer-events-auto bg-black/60 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 text-center shadow-2xl"
                >
                  <p className="text-xs font-black uppercase tracking-widest text-blue-400 animate-pulse mb-4">Setup Phase: Rotate Pucks</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const updates = { isSetupPhase: false, turnStartTime: Date.now() };
                      setGameState(prev => ({ ...prev, ...updates }));
                      if (gameState.gameId) {
                        GameService.updateGameState(gameState.gameId, updates);
                      }
                    }}
                    className="px-8 py-4 bg-blue-500 rounded-2xl font-black italic uppercase tracking-tighter text-xl text-white shadow-lg shadow-blue-500/20"
                  >
                    Confirm Setup
                  </motion.button>
                </motion.div>
              </div>
            )}

            {/* Game Over / Next Round Button (Center Overlay) */}
            {gameState.status === 'finished' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="pointer-events-auto bg-black/60 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 text-center shadow-2xl"
                >
                  <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-4">
                    {gameState.mode === 'classic' ? 'Game Over!' : 'Round Complete!'}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowEntryFeeModal(true);
                      SoundService.play('click');
                    }}
                    className="px-8 py-4 bg-orange-500 rounded-2xl font-black italic uppercase tracking-tighter text-xl text-white shadow-lg shadow-orange-500/20"
                  >
                    {gameState.mode === 'classic' ? 'Show Results' : 'Next Round'}
                  </motion.button>
                </motion.div>
              </div>
            )}
          </div>

          {/* Striker Control Slider (styled like baseline) */}
          <div 
            className="relative transition-opacity duration-300"
            style={{ 
              opacity: gameState.isMoving ? 0.5 : 1,
              marginTop: `${layout.sliderBottomMargin}px`,
              '--striker-size': `${layout.strikerRadius * 2 * layout.sliderThumbScale}px`,
              '--slider-length': `${layout.sliderLength}px`,
              '--slider-width': `${layout.sliderWidth}px`,
              '--slider-circle-radius': `${layout.sliderCircleRadius}px`,
            } as React.CSSProperties}
          >
            <div 
              className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex items-center justify-between pointer-events-none w-full"
              style={{ maxWidth: `${layout.sliderLength}px`, height: `${layout.sliderWidth}px` }}
            >
              {/* Left Circle */}
              <div 
                className="rounded-full border-2 border-[#3E2723] bg-[#C62828] flex items-center justify-center shadow-lg shrink-0 relative z-20"
                style={{ width: `${layout.sliderCircleRadius * 2}px`, height: `${layout.sliderCircleRadius * 2}px`, marginLeft: `-${layout.sliderCircleRadius}px` }}
              >
                <div className="rounded-full border border-[#3E2723]/30" style={{ width: `${Math.max(0, (layout.sliderCircleRadius - 5) * 2)}px`, height: `${Math.max(0, (layout.sliderCircleRadius - 5) * 2)}px` }} />
              </div>
              
              {/* Merged Parallel Lines */}
              <div className="flex-1 h-full relative mx-[-1px]">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-[#3E2723] z-10" />
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#3E2723] z-10" />
                {/* Background to fill the gap between circles */}
                <div className="absolute inset-0 bg-transparent border-y-2 border-[#3E2723]" />
              </div>

              {/* Right Circle */}
              <div 
                className="rounded-full border-2 border-[#3E2723] bg-[#C62828] flex items-center justify-center shadow-lg shrink-0 relative z-20"
                style={{ width: `${layout.sliderCircleRadius * 2}px`, height: `${layout.sliderCircleRadius * 2}px`, marginRight: `-${layout.sliderCircleRadius}px` }}
              >
                <div className="rounded-full border border-[#3E2723]/30" style={{ width: `${Math.max(0, (layout.sliderCircleRadius - 5) * 2)}px`, height: `${Math.max(0, (layout.sliderCircleRadius - 5) * 2)}px` }} />
              </div>
            </div>
            
            <div className="relative mx-auto w-full" style={{ maxWidth: `${layout.sliderLength}px` }}>
              <input 
                type="range" 
                min={BOARD_SIZE / 2 - layout.baselineLength / 2} 
                max={BOARD_SIZE / 2 + layout.baselineLength / 2} 
                value={perspectiveRotation === Math.PI ? BOARD_SIZE - gameState.strikerPos : gameState.strikerPos}
                disabled={gameState.playerIds[gameState.currentPlayerIndex] !== user?.id || gameState.isMoving}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const x = perspectiveRotation === Math.PI ? BOARD_SIZE - val : val;
                  
                  const strikerY = gameState.currentPlayerIndex === 0
                    ? BOARD_SIZE / 2 + layout.baselineMarginFromCenter - layout.baselineWidth / 2 + layout.strikerYOffset
                    : BOARD_SIZE / 2 - layout.baselineMarginFromCenter + layout.baselineWidth / 2 - layout.strikerYOffset;

                  const updates = { 
                    strikerPos: x,
                    pieces: gameState.pieces.map(p => p.type === 'striker' ? { ...p, pos: { x, y: strikerY } } : p)
                  };
                  setGameState(prev => ({ ...prev, ...updates }));
                  syncStrikerAndAim(updates);
                }}
                className={`relative z-10 w-full h-12 appearance-none bg-transparent cursor-pointer accent-red-600 disabled:cursor-not-allowed custom-range-slider`}
              />
            </div>
          </div>
          
          {/* Turn Indicator */}
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50">
            {gameState.playerIds[gameState.currentPlayerIndex] === user?.id ? (
              <motion.div 
                initial={{ y: -20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                className="bg-orange-500 px-8 py-3 rounded-2xl font-black text-xs tracking-widest shadow-2xl text-white border border-white/20"
              >
                YOUR TURN
              </motion.div>
            ) : (
              <motion.div 
                initial={{ y: -20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                className="bg-neutral-800 px-8 py-3 rounded-2xl font-black text-xs tracking-widest shadow-2xl text-white border border-white/10"
              >
                WAITING FOR {gameState.playerNames[gameState.currentPlayerIndex]}
              </motion.div>
            )}
          </div>

          {/* Bottom Right Menu */}
          <div className="fixed bottom-8 right-8 z-[100]">
            <div className="relative">
              {showInGameMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full right-0 mb-4 w-48 bg-neutral-900 border border-white/10 rounded-3xl p-2 shadow-2xl overflow-hidden"
                >
                  <button
                    onClick={() => {
                      const next = !isSoundEnabled;
                      setIsSoundEnabled(next);
                      SoundService.toggle(next);
                      SoundService.play('click');
                    }}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Sound</span>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${isSoundEnabled ? 'bg-orange-500' : 'bg-neutral-800'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isSoundEnabled ? 'right-1' : 'left-1'}`} />
                    </div>
                  </button>
                  
                  {user && (gameState.ownedAssets[user.id] || []).length > 0 && (
                    <>
                      <div className="h-px bg-white/5 mx-2" />
                      <div className="p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-2">My Assets</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {(gameState.ownedAssets[user.id] || []).map(assetId => (
                            <div key={assetId} className="flex items-center justify-between bg-white/5 p-2 rounded-xl">
                              <span className="text-[10px] font-bold uppercase text-white truncate mr-2">{assetId.replace('_', ' ')}</span>
                              <button 
                                onClick={() => handleSellAsset(assetId)}
                                className="px-2 py-1 bg-red-500/20 text-red-500 text-[8px] font-black rounded-lg hover:bg-red-500/30 transition-colors"
                              >
                                SELL
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="h-px bg-white/5 mx-2" />
                  <button
                    onClick={() => {
                      setShowInGameMenu(false);
                      SoundService.play('click');
                    }}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Close</span>
                  </button>
                  <div className="h-px bg-white/5 mx-2" />
                  <button
                    onClick={() => {
                      SoundService.play('click');
                      setAppMode('menu');
                    }}
                    className="w-full p-4 flex items-center justify-between hover:bg-red-500/10 rounded-2xl transition-colors group"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Leave Game</span>
                    <LogOut size={14} className="text-red-500" />
                  </button>
                </motion.div>
              )}
              <button
                onClick={() => {
                  SoundService.play('click');
                  setShowInGameMenu(!showInGameMenu);
                }}
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all ${
                  showInGameMenu ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="w-4 h-0.5 bg-current rounded-full" />
                  <div className="w-4 h-0.5 bg-current rounded-full" />
                  <div className="w-4 h-0.5 bg-current rounded-full" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
