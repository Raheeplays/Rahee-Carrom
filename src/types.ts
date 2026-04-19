
export type PieceType = 'striker' | 'white' | 'black' | 'queen';

export interface Vector {
  x: number;
  y: number;
}

export interface Piece {
  id: string;
  type: PieceType;
  pos: Vector;
  vel: Vector;
  radius: number;
  mass: number;
  isPocketed: boolean;
  pocketedBy?: string;
}

export interface AiConfig {
  skillLevel: number; // 0 to 100
  powerMultiplier: number; // 0.5 to 1.5
  accuracy: number; // 0 to 100
  reactionTime: number; // ms
  behavior: 'noob' | 'pro' | 'balanced' | 'aggressive';
}

export interface User {
  id: string;
  name: string;
  key: string;
  isApproved: boolean;
  isAdmin: boolean;
  uid?: string;
  raheeCoins: number;
  raheeDiamonds: number;
  wins: number;
  losses: number;
  xp: number;
  rank: number;
  friends: string[]; // Array of user IDs
  createdAt: any;
  aiConfig?: AiConfig;
}

export interface Arena {
  id: string;
  name: string;
  entryFee: number;
  gameFeePercent: number; // e.g., 10 for 10%
  image?: string;
}

export interface BotPlayer {
  id: string;
  name: string;
  rank: number;
  xp: number;
  avatar?: string;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: any;
}

export interface Lobby {
  id: string;
  playerIds: string[];
  playerNames: string[];
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  mode?: GameMode;
  createdAt: any;
}

export type GameMode = 'classic' | 'rich-poor' | 'buy-sell';

export interface PuckConfig {
  white: number;
  black: number;
  queen: number;
}

export interface Proposal {
  fee: number;
  pucks: PuckConfig;
}

export interface GameState {
  pieces: Piece[];
  currentPlayerIndex: number;
  scores: number[];
  playerColors: ('white' | 'black')[];
  strikerPos: number;
  isAiming: boolean;
  aimAngle: number;
  aimPower: number;
  isMoving: boolean;
  gameId: string;
  playerIds: string[];
  playerNames: string[];
  playerPoints: number[];
  pendingQueenIndex: number | null;
  coveredQueenIndex: number | null;
  pocketedThisTurn: PieceType[];
  ownedAssets: { [playerId: string]: string[] };
  entryFee: number;
  roundNumber: number;
  mode: GameMode;
  isSetupPhase: boolean;
  setupRotation: number;
  status: 'playing' | 'finished' | 'gameOver';
  turnTimer: number;
  turnStartTime: number | null;
  proposals: { [playerId: string]: Proposal };
  ownedTerritories: { [key: string]: string }; // userId -> territoryId[]
  moveId: number;
}

export interface LayoutConfig {
  pocketRadius: number;
  strikerRadius: number;
  coinRadius: number;
  baselineLength: number;
  baselineMarginFromCenter: number;
  baselineWidth: number;
  circleRadius: number;
  diagonalLineMarginFromCenter: number;
  diagonalLineMarginFromPocket: number;
  arrowOffset: number;
  arrowRotation: number;
  centerCircleRadius: number;
  centerStarOuterRadius: number;
  centerStarInnerRadius: number;
  pocketOffset: number;
  arrowArcRadius: number;
  arrowArcAngle: number;
  strikerYOffset: number;
  // Slider Customization
  sliderLength: number;
  sliderWidth: number;
  sliderCircleRadius: number;
  sliderThumbScale: number;
  sliderBottomMargin: number;
  frameRoundness: number;
  frameColor: string;
}

export type AppMode = 'splash' | 'login' | 'signup' | 'menu' | 'admin' | 'lobby' | 'playing' | 'gameOver' | 'profile' | 'feedback' | 'layout-editor';
