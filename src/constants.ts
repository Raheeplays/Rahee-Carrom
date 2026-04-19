
import { LayoutConfig } from "./types";

export const BOARD_SIZE = 800;

export const DEFAULT_LAYOUT: LayoutConfig = {
  pocketRadius: 45,
  strikerRadius: 25,
  coinRadius: 18,
  baselineLength: 350,
  baselineMarginFromCenter: 220,
  baselineWidth: 40,
  circleRadius: 20,
  diagonalLineMarginFromCenter: 160,
  diagonalLineMarginFromPocket: 85,
  arrowOffset: 190,
  arrowRotation: Math.PI / 4,
  centerCircleRadius: 110,
  centerStarOuterRadius: 100,
  centerStarInnerRadius: 40,
  pocketOffset: 0,
  arrowArcRadius: 42,
  arrowArcAngle: Math.PI / 3.5,
  strikerYOffset: 0,
  sliderLength: 350,
  sliderWidth: 40,
  sliderCircleRadius: 20,
  sliderThumbScale: 1,
  sliderBottomMargin: 32,
  frameRoundness: 40,
  frameColor: '#8d6e63',
};

export const POCKET_RADIUS = DEFAULT_LAYOUT.pocketRadius;
export const STRIKER_RADIUS = DEFAULT_LAYOUT.strikerRadius;
export const COIN_RADIUS = DEFAULT_LAYOUT.coinRadius;

export const FRICTION = 0.98;
export const WALL_BOUNCE = 0.9;
export const MIN_VELOCITY = 0.5;

export const THEME = {
  boardColor: '#fdf5e6',
  frameColor: '#8d6e63',
  pocketColor: '#212121',
  lineColor: '#bcaaa4',
  backgroundColor: '#e0e0e0',
  strikerColor: '#2196f3',
  whiteCoinColor: '#ffffff',
  blackCoinColor: '#424242',
  queenColor: '#ff5252',
  fontFamily: 'sans-serif',
};
