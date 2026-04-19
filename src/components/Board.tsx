import React, { useEffect, useRef, useState } from 'react';
import { BOARD_SIZE, THEME, DEFAULT_LAYOUT } from '../constants';
import { GameState, Piece, LayoutConfig, PieceType, User } from '../types';

interface BoardProps {
  gameState: GameState;
  user: User | null;
  onStrike: (angle: number, power: number) => void;
  onStrikerMove: (x: number) => void;
  onAimUpdate?: (angle: number, power: number) => void;
  onSetupRotate?: (angle: number) => void;
  onBuyAsset?: (assetId: string) => void;
  layout?: LayoutConfig;
  rotation?: number;
  longAim?: boolean;
}

const Board: React.FC<BoardProps> = ({ 
  gameState, 
  user,
  onStrike, 
  onStrikerMove, 
  onAimUpdate,
  onSetupRotate, 
  onBuyAsset, 
  layout = DEFAULT_LAYOUT, 
  rotation = 0, 
  longAim = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMovingStriker, setIsMovingStriker] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number, y: number } | null>(null);
  const theme = THEME;

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Raw coordinates relative to canvas
    const rawX = (clientX - rect.left) * scaleX;
    const rawY = (clientY - rect.top) * scaleY;

    // Apply inverse rotation
    if (rotation === 0) return { x: rawX, y: rawY };

    const centerX = BOARD_SIZE / 2;
    const centerY = BOARD_SIZE / 2;
    const dx = rawX - centerX;
    const dy = rawY - centerY;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    
    return {
      x: centerX + (dx * cos - dy * sin),
      y: centerY + (dx * sin + dy * cos)
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.isMoving) return;
    const coords = getCanvasCoords(e);

    // Check for asset clicks if it's the current player's turn and not moving
    if (!gameState.isMoving && onBuyAsset) {
      const currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
      if (user && user.id !== currentPlayerId) return;
      
      // Calculate effective score based on round score (which includes pocketed puck values)
      const effectiveScore = gameState.scores[gameState.currentPlayerIndex];

      const allOwned = Object.values(gameState.ownedAssets).flat();
      
      const assets = [
        { id: 'arrow', label: 'Arrow', price: 50, count: 4 },
        { id: 'baseline', label: 'Baseline', price: 100, count: 4 },
        { id: 'pocket', label: 'Pocket', price: 150, count: 4 },
        { id: 'center', label: 'Center', price: 200, count: 1 }
      ];

      // Find the first asset type that is not fully owned
      let nextTypeToBuy: string | null = null;
      for (const asset of assets) {
        const ownedCount = allOwned.filter(a => a.startsWith(asset.id)).length;
        if (ownedCount < asset.count) {
          nextTypeToBuy = asset.id;
          break;
        }
      }

      const centerX = BOARD_SIZE / 2;
      const centerY = BOARD_SIZE / 2;

      // Check Center
      if (nextTypeToBuy === 'center' && effectiveScore >= 200 && !allOwned.includes('center')) {
        const dist = Math.sqrt((coords.x - centerX) ** 2 + (coords.y - centerY) ** 2);
        if (dist < layout.centerCircleRadius) {
          onBuyAsset('center');
          return;
        }
      }

      // Check Pockets
      if (nextTypeToBuy === 'pocket' && effectiveScore >= 150) {
        const offset = layout.pocketOffset;
        const pockets = [[offset, offset], [BOARD_SIZE - offset, offset], [offset, BOARD_SIZE - offset], [BOARD_SIZE - offset, BOARD_SIZE - offset]];
        for (let i = 0; i < pockets.length; i++) {
          if (allOwned.includes(`pocket_${i}`)) continue;
          const [px, py] = pockets[i];
          const dist = Math.sqrt((coords.x - px) ** 2 + (coords.y - py) ** 2);
          if (dist < layout.pocketRadius * 1.5) {
            onBuyAsset(`pocket_${i}`);
            return;
          }
        }
      }

      // Check Baselines
      if (nextTypeToBuy === 'baseline' && effectiveScore >= 100) {
        const rotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        for (let i = 0; i < rotations.length; i++) {
          if (allOwned.includes(`baseline_${i}`)) continue;
          const rot = rotations[i];
          const dx = coords.x - centerX;
          const dy = coords.y - centerY;
          const localX = dx * Math.cos(-rot) - dy * Math.sin(-rot);
          const localY = dx * Math.sin(-rot) + dy * Math.cos(-rot);
          if (Math.abs(localX) < layout.baselineLength / 2 + layout.circleRadius && 
              Math.abs(localY - layout.baselineMarginFromCenter + layout.baselineWidth / 2) < layout.baselineWidth) {
            onBuyAsset(`baseline_${i}`);
            return;
          }
        }
      }

      // Check Arrows
      if (nextTypeToBuy === 'arrow' && effectiveScore >= 50) {
        const rotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        for (let i = 0; i < rotations.length; i++) {
          if (allOwned.includes(`arrow_${i}`)) continue;
          const rot = rotations[i];
          const dx = coords.x - centerX;
          const dy = coords.y - centerY;
          const localX = dx * Math.cos(-rot) - dy * Math.sin(-rot);
          const localY = dx * Math.sin(-rot) + dy * Math.cos(-rot);
          const arrowX = layout.arrowOffset;
          const arrowY = layout.arrowOffset;
          const dist = Math.sqrt((localX - arrowX) ** 2 + (localY - arrowY) ** 2);
          if (dist < 50) {
            onBuyAsset(`arrow_${i}`);
            return;
          }
        }
      }
    }

    const striker = gameState.pieces.find(p => p.type === 'striker');
    if (!striker) return;

    const dist = Math.sqrt((coords.x - striker.pos.x) ** 2 + (coords.y - striker.pos.y) ** 2);
    if (dist < layout.strikerRadius * 2) {
      // Striker movement is now only via slider, so we don't set setIsMovingStriker(true) here.
      // Clicking the striker will now start the standard aiming process.
      setIsDragging(true);
      setDragStart(coords);
      setDragCurrent(coords);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const coords = getCanvasCoords(e);
    setDragCurrent(coords);
    
    if (isMovingStriker && onStrikerMove) {
      const minX = BOARD_SIZE / 2 - layout.baselineLength / 2 + layout.strikerRadius;
      const maxX = BOARD_SIZE / 2 + layout.baselineLength / 2 - layout.strikerRadius;
      const constrainedX = Math.max(minX, Math.min(maxX, coords.x));
      onStrikerMove(constrainedX);
    } else if (gameState.isSetupPhase && dragStart && onSetupRotate) {
      // If setup phase, rotate pieces
      const angle = Math.atan2(coords.y - dragStart.y, coords.x - dragStart.x);
      onSetupRotate(angle);
    } else if (dragStart && onAimUpdate) {
      const dx = dragStart.x - coords.x;
      const dy = dragStart.y - coords.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(dist / 3, 100);
      onAimUpdate(angle, power);
    }
  };

  const handleEnd = () => {
    if (!isDragging || !dragStart || !dragCurrent) {
      setIsDragging(false);
      setIsMovingStriker(false);
      return;
    }

    if (isMovingStriker) {
      setIsDragging(false);
      setIsMovingStriker(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const striker = gameState.pieces.find(p => p.type === 'striker');
    if (!striker || gameState.isSetupPhase) {
      setIsDragging(false);
      setIsMovingStriker(false);
      return;
    }

    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(dist / 3, 100);

    if (power > 5) {
      onStrike(angle, power);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const [pocketingAnims, setPocketingAnims] = useState<{ id: string, type: PieceType, from: { x: number, y: number }, to: { x: number, y: number }, progress: number }[]>([]);
  const lastPiecesRef = useRef<Piece[]>([]);

  useEffect(() => {
    const currentPieces = gameState.pieces;
    const lastPieces = lastPiecesRef.current;

    if (lastPieces.length > 0) {
      currentPieces.forEach(p => {
        const lastP = lastPieces.find(lp => lp.id === p.id);
        if (p.isPocketed && lastP && !lastP.isPocketed) {
          // Piece just got pocketed
          // Find nearest pocket
          const offset = layout.pocketOffset;
          const pockets = [
            { x: offset, y: offset },
            { x: BOARD_SIZE - offset, y: offset },
            { x: offset, y: BOARD_SIZE - offset },
            { x: BOARD_SIZE - offset, y: BOARD_SIZE - offset }
          ];
          let nearestPocket = pockets[0];
          let minDist = Infinity;
          pockets.forEach(pkt => {
            const d = Math.sqrt((lastP.pos.x - pkt.x) ** 2 + (lastP.pos.y - pkt.y) ** 2);
            if (d < minDist) {
              minDist = d;
              nearestPocket = pkt;
            }
          });

          setPocketingAnims(prev => [...prev, {
            id: p.id,
            type: p.type,
            from: { ...lastP.pos },
            to: { ...nearestPocket },
            progress: 0
          }]);
        }
      });
    }
    lastPiecesRef.current = currentPieces;
  }, [gameState.pieces, layout.pocketOffset]);

  useEffect(() => {
    if (pocketingAnims.length === 0) return;

    let frame: number;
    const animate = () => {
      setPocketingAnims(prev => {
        const next = prev.map(a => ({ ...a, progress: a.progress + 0.05 }))
                         .filter(a => a.progress < 1);
        if (next.length === 0 && prev.length > 0) return [];
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [pocketingAnims.length]);

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    
    // Apply rotation
    if (rotation !== 0) {
      ctx.translate(BOARD_SIZE / 2, BOARD_SIZE / 2);
      ctx.rotate(rotation);
      ctx.translate(-BOARD_SIZE / 2, -BOARD_SIZE / 2);
    }

    const centerX = BOARD_SIZE / 2;
    const centerY = BOARD_SIZE / 2;
    const time = performance.now() / 1000;
    const pulse = (Math.sin(time * 5) + 1) / 2; // 0 to 1 pulse

    // Determine which assets can be bought
    const currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
    const allOwned = Object.values(gameState.ownedAssets).flat();
    const owned = gameState.ownedAssets[currentPlayerId] || [];
    
    // Calculate effective score based on pocketed pucks (for non-classic modes)
    const myPockets = gameState.pieces.filter(p => p.isPocketed && p.pocketedBy === currentPlayerId);
    const whiteVal = myPockets.filter(p => p.type === 'white').length * 20;
    const blackVal = myPockets.filter(p => p.type === 'black').length * 10;
    const queenVal = myPockets.filter(p => p.type === 'queen').length * 50;
    const effectiveScore = (gameState.mode === 'classic' || gameState.mode === 'rich-poor') 
      ? gameState.scores[gameState.currentPlayerIndex] 
      : (whiteVal + blackVal + queenVal);

    const assets = [
      { id: 'arrow', price: 50, count: 4 },
      { id: 'baseline', price: 100, count: 4 },
      { id: 'pocket', price: 150, count: 4 },
      { id: 'center', price: 200, count: 1 }
    ];

    // Find the current active asset type in the series
    let activeTypeInSeries: string | null = null;
    for (const asset of assets) {
      const ownedCount = allOwned.filter(a => a.startsWith(asset.id)).length;
      if (ownedCount < asset.count) {
        activeTypeInSeries = asset.id;
        break;
      }
    }

    const affordableTypes = (gameState.mode === 'buy-sell') 
      ? assets.filter(a => a.id === activeTypeInSeries && effectiveScore >= a.price).map(a => a.id)
      : [];
    const canAffordAny = affordableTypes.length > 0;

    // Board Background (Wood Texture)
    const woodGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, BOARD_SIZE);
    woodGradient.addColorStop(0, '#F5DEB3'); // Wheat
    woodGradient.addColorStop(1, '#D2B48C'); // Tan
    ctx.fillStyle = woodGradient;
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // Subtle wood grain lines (Vertical)
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, BOARD_SIZE);
      ctx.stroke();
    }

    // Frame (Rounded Corners)
    const frameWidth = 45;
    ctx.strokeStyle = layout.frameColor || '#4E342E';
    ctx.lineWidth = frameWidth;
    ctx.lineJoin = 'round';
    
    if (layout.frameRoundness > 0) {
      ctx.beginPath();
      const r = layout.frameRoundness;
      const x = -frameWidth/2;
      const y = -frameWidth/2;
      const w = BOARD_SIZE + frameWidth;
      const h = BOARD_SIZE + frameWidth;
      
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(-frameWidth/2, -frameWidth/2, BOARD_SIZE + frameWidth, BOARD_SIZE + frameWidth);
    }

    // Center Circles
    const isCenterOwned = gameState.mode === 'classic' || Object.values(gameState.ownedAssets).some(assets => assets.includes('center'));
    const isCenterOwnedByMe = owned.includes('center');
    const isCenterAffordable = affordableTypes.includes('center');
    const isCenterNext = isCenterAffordable && !gameState.isMoving && !isCenterOwned;
    
    ctx.save();
    if (isCenterNext) {
      ctx.shadowBlur = 10 + pulse * 10;
      ctx.shadowColor = 'rgba(255, 165, 0, 0.8)';
    }
    
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, layout.centerCircleRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, layout.centerCircleRadius - 5, 0, Math.PI * 2);
    ctx.stroke();

    // Center Star (Detailed)
    const outerRadius = layout.centerStarOuterRadius;
    const innerRadius = layout.centerStarInnerRadius;
    const spikes = 8;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Center Red Spot
    ctx.fillStyle = '#C62828';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Baselines (Symmetrical & Equal on all sides)
    const { baselineMarginFromCenter, baselineLength, baselineWidth, circleRadius } = layout;
    
    const drawBaseline = (rotation: number, index: number) => {
      const isOwned = gameState.mode === 'classic' || Object.values(gameState.ownedAssets).some(assets => assets.includes(`baseline_${index}`));
      const isOwnedByMe = owned.includes(`baseline_${index}`);
      const isAffordable = affordableTypes.includes('baseline');
      const isNext = isAffordable && !gameState.isMoving && !isOwned;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      
      if (isNext) {
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.shadowColor = 'rgba(255, 165, 0, 0.8)';
      }

      const y = baselineMarginFromCenter;
      const startX = -baselineLength / 2;
      const endX = baselineLength / 2;
      
      // Two parallel lines
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      ctx.moveTo(startX + circleRadius, y - baselineWidth);
      ctx.lineTo(endX - circleRadius, y - baselineWidth);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX + circleRadius, y);
      ctx.lineTo(endX - circleRadius, y);
      ctx.stroke();

      // Red circles at ends
      ctx.fillStyle = '#C62828';
      const circleY = y - baselineWidth / 2;

      [startX, endX].forEach(cx => {
        ctx.beginPath();
        ctx.arc(cx, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Inner circle detail
        ctx.beginPath();
        ctx.arc(cx, circleY, circleRadius - 5, 0, Math.PI * 2);
        ctx.stroke();
      });
      
      // Add "RAHEE CARROM" text on the first player's baseline (index 0)
      if (index === 0) {
        ctx.save();
        ctx.fillStyle = '#3E2723';
        ctx.font = 'italic 900 14px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // letterSpacing is not widely supported in all canvas environments, 
        // but we can simulate it or just use a bold font.
        ctx.fillText('RAHEE CARROM', 0, y - baselineWidth / 2);
        ctx.restore();
      }
      
      ctx.restore();
    };

    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((rot, i) => drawBaseline(rot, i));

    // Diagonal Lines & Curved Arrows (Positioned in between baselines)
    const drawDiagonalAndArrow = (rotation: number, index: number) => {
      const isArrowOwned = gameState.mode === 'classic' || Object.values(gameState.ownedAssets).some(assets => assets.includes(`arrow_${index}`));
      const isArrowOwnedByMe = owned.includes(`arrow_${index}`);
      const isAffordable = affordableTypes.includes('arrow');
      const isNext = isAffordable && !gameState.isMoving && !isArrowOwned;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      
      // Diagonal Line (Passing through the gap)
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(layout.diagonalLineMarginFromCenter, layout.diagonalLineMarginFromCenter);
      ctx.lineTo(BOARD_SIZE / 2 - layout.diagonalLineMarginFromPocket, BOARD_SIZE / 2 - layout.diagonalLineMarginFromPocket);
      ctx.stroke();

      // Curved Arrows (In the gap between baseline ends)
      ctx.translate(layout.arrowOffset, layout.arrowOffset);
      ctx.rotate(layout.arrowRotation);
      
      if (isNext) {
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.shadowColor = 'rgba(255, 165, 0, 0.8)';
        ctx.globalAlpha = 1.0;
      }

      // Decorative center circle for the arrow
      ctx.fillStyle = '#3E2723';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = '#3E2723';
      ctx.arc(0, 0, layout.arrowArcRadius, -layout.arrowArcAngle, layout.arrowArcAngle); // Slightly smaller arc for more margin
      ctx.stroke();
      
      // Arrow heads
      const drawHead = (angle: number) => {
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(layout.arrowArcRadius, 0); // Match arc radius
        ctx.lineTo(layout.arrowArcRadius - 7, 6);
        ctx.lineTo(layout.arrowArcRadius + 10, 0);
        ctx.lineTo(layout.arrowArcRadius - 7, -6);
        ctx.closePath();
        ctx.fillStyle = '#3E2723';
        ctx.fill();
        ctx.restore();
      };
      
      drawHead(layout.arrowArcAngle);
      drawHead(-layout.arrowArcAngle);
      
      ctx.restore();
    };

    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((rot, i) => drawDiagonalAndArrow(rot, i));

    // Draw Pockets (Deep Black with Rim)
    const offset = layout.pocketOffset;
    [
      [offset, offset], 
      [BOARD_SIZE - offset, offset], 
      [offset, BOARD_SIZE - offset], 
      [BOARD_SIZE - offset, BOARD_SIZE - offset]
    ].forEach(([x, y], i) => {
      const isOwned = gameState.mode === 'classic' || Object.values(gameState.ownedAssets).some(assets => assets.includes(`pocket_${i}`));
      const isOwnedByMe = owned.includes(`pocket_${i}`);
      const isAffordable = affordableTypes.includes('pocket');
      const isNext = isAffordable && !gameState.isMoving && !isOwned;

      ctx.save();
      if (isNext) {
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.shadowColor = 'rgba(255, 165, 0, 0.8)';
      }
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(x, y, layout.pocketRadius, 0, Math.PI * 2);
      ctx.fill();
      // Pocket rim
      ctx.strokeStyle = '#2D1B14';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
    });

    // Draw Pieces
    gameState.pieces.forEach(p => {
      if (p.isPocketed) return;

      ctx.save();
      
      if (p.type !== 'striker' && gameState.isSetupPhase) {
        ctx.translate(BOARD_SIZE / 2, BOARD_SIZE / 2);
        ctx.rotate(gameState.setupRotation);
        ctx.translate(-BOARD_SIZE / 2, -BOARD_SIZE / 2);
      }

      ctx.translate(p.pos.x, p.pos.y);
      
      // Shadow
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowOffsetY = 3;

      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      
      let color = '';
      let strokeColor = 'rgba(0,0,0,0.3)';
      switch (p.type) {
        case 'striker': 
          color = '#2196F3'; // Blue
          strokeColor = '#1976D2';
          break;
        case 'white': 
          color = '#F5F5DC'; // Beige/Wood
          strokeColor = '#D2B48C';
          break;
        case 'black': 
          color = '#212121'; 
          strokeColor = '#000';
          break;
        case 'queen': 
          color = '#D32F2F'; 
          strokeColor = '#B71C1C';
          break;
      }
      
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner details (rings)
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });

    // Draw Pocketing Animations
    pocketingAnims.forEach(anim => {
      const x = anim.from.x + (anim.to.x - anim.from.x) * anim.progress;
      const y = anim.from.y + (anim.to.y - anim.from.y) * anim.progress;
      const scale = 1 - anim.progress;
      const radius = layout.coinRadius * scale;

      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      
      let color = '';
      switch (anim.type) {
        case 'striker': color = '#2196F3'; break;
        case 'white': color = '#F5F5DC'; break;
        case 'black': color = '#212121'; break;
        case 'queen': color = '#D32F2F'; break;
      }
      
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });

    // Interaction Visuals
    const isMyTurn = gameState.playerIds[gameState.currentPlayerIndex] === user?.id;
    const showAim = (isDragging && dragStart && dragCurrent) || (!isMyTurn && gameState.aimPower > 5);

    if (showAim && !gameState.isMoving && !gameState.isSetupPhase) {
      const striker = gameState.pieces.find(p => p.type === 'striker');
      if (striker) {
        let angle, power;
        if (isDragging && dragStart && dragCurrent) {
          const dx = dragStart.x - dragCurrent.x;
          const dy = dragStart.y - dragCurrent.y;
          angle = Math.atan2(dy, dx);
          const dist = Math.sqrt(dx * dx + dy * dy);
          power = Math.min(dist / 4, 100);
        } else {
          angle = gameState.aimAngle;
          power = gameState.aimPower;
        }

        // Aim Line
        ctx.beginPath();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.moveTo(striker.pos.x, striker.pos.y);
        const aimLength = longAim ? power * 10 : power * 3;
        const aimX = striker.pos.x + Math.cos(angle) * aimLength;
        const aimY = striker.pos.y + Math.sin(angle) * aimLength;
        ctx.lineTo(aimX, aimY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Trajectory Prediction for Admin
        if (longAim) {
          const pockets = [
            { x: layout.pocketOffset, y: layout.pocketOffset },
            { x: BOARD_SIZE - layout.pocketOffset, y: layout.pocketOffset },
            { x: layout.pocketOffset, y: BOARD_SIZE - layout.pocketOffset },
            { x: BOARD_SIZE - layout.pocketOffset, y: BOARD_SIZE - layout.pocketOffset }
          ];

          const checkPocket = (pos: {x: number, y: number}, angle: number, radius: number = 0) => {
            let targetPocket = null;
            pockets.forEach(pkt => {
              const pdx = pkt.x - pos.x;
              const pdy = pkt.y - pos.y;
              const pProj = pdx * Math.cos(angle) + pdy * Math.sin(angle);
              if (pProj > 0 && pProj < 800) {
                const pPerp = Math.abs(-pdx * Math.sin(angle) + pdy * Math.cos(angle));
                if (pPerp < (layout.pocketRadius + radius) * 0.9) { 
                  targetPocket = pkt;
                }
              }
            });
            return targetPocket;
          };

          // Recursive function to trace path with rebounds
          const tracePath = (
            start: {x: number, y: number}, 
            angle: number, 
            radius: number, 
            maxDist: number, 
            ignoreIds: string[] = [],
            color: string = 'rgba(255, 255, 255, 0.3)',
            dash: number[] = [4, 4]
          ): { end: {x: number, y: number}, hitPiece: Piece | null, hitWall: boolean } => {
            let currentPos = { ...start };
            let currentAngle = angle;
            let remainingDist = maxDist;
            let firstHit: { piece: Piece, dist: number } | null = null;
            let wallHit: { side: string, dist: number } | null = null;

            // Check piece collisions
            gameState.pieces.forEach(p => {
              if (p.isPocketed || ignoreIds.includes(p.id)) return;
              const dx = p.pos.x - currentPos.x;
              const dy = p.pos.y - currentPos.y;
              const proj = dx * Math.cos(currentAngle) + dy * Math.sin(currentAngle);
              
              // Even if proj is small or negative (contact), we check if it's a valid hit
              const perpDist = Math.abs(-dx * Math.sin(currentAngle) + dy * Math.cos(currentAngle));
              if (perpDist < p.radius + radius) {
                // Actual distance to collision point
                const distSq = Math.pow(p.radius + radius, 2) - Math.pow(perpDist, 2);
                if (distSq >= 0) {
                  const collisionDist = proj - Math.sqrt(distSq);
                  // Use a small negative epsilon to allow contact hits
                  if (collisionDist > -0.1 && collisionDist < remainingDist) {
                    if (!firstHit || collisionDist < firstHit.dist) {
                      firstHit = { piece: p, dist: Math.max(0, collisionDist) };
                    }
                  }
                }
              }
            });

            // Check wall collisions
            const cos = Math.cos(currentAngle);
            const sin = Math.sin(currentAngle);
            const wallMargin = radius;
            
            if (cos > 0) { // Right wall
              const d = (BOARD_SIZE - wallMargin - currentPos.x) / cos;
              if (d > 0 && d < remainingDist && (!wallHit || d < wallHit.dist)) wallHit = { side: 'right', dist: d };
            } else if (cos < 0) { // Left wall
              const d = (wallMargin - currentPos.x) / cos;
              if (d > 0 && d < remainingDist && (!wallHit || d < wallHit.dist)) wallHit = { side: 'left', dist: d };
            }
            
            if (sin > 0) { // Bottom wall
              const d = (BOARD_SIZE - wallMargin - currentPos.y) / sin;
              if (d > 0 && d < remainingDist && (!wallHit || d < wallHit.dist)) wallHit = { side: 'bottom', dist: d };
            } else if (sin < 0) { // Top wall
              const d = (wallMargin - currentPos.y) / sin;
              if (d > 0 && d < remainingDist && (!wallHit || d < wallHit.dist)) wallHit = { side: 'top', dist: d };
            }

            // Determine what we hit first
            if (firstHit && (!wallHit || firstHit.dist < wallHit.dist)) {
              const endX = currentPos.x + cos * firstHit.dist;
              const endY = currentPos.y + sin * firstHit.dist;
              
              ctx.beginPath();
              ctx.setLineDash(dash);
              ctx.strokeStyle = color;
              ctx.moveTo(currentPos.x, currentPos.y);
              ctx.lineTo(endX, endY);
              ctx.stroke();
              
              return { end: { x: endX, y: endY }, hitPiece: firstHit.piece, hitWall: false };
            } else if (wallHit) {
              const endX = currentPos.x + cos * wallHit.dist;
              const endY = currentPos.y + sin * wallHit.dist;
              
              ctx.beginPath();
              ctx.setLineDash(dash);
              ctx.strokeStyle = color;
              ctx.moveTo(currentPos.x, currentPos.y);
              ctx.lineTo(endX, endY);
              ctx.stroke();

              // Reflect and continue
              let nextAngle = currentAngle;
              if (wallHit.side === 'left' || wallHit.side === 'right') nextAngle = Math.PI - currentAngle;
              else nextAngle = -currentAngle;

              return tracePath({ x: endX, y: endY }, nextAngle, radius, remainingDist - wallHit.dist, ignoreIds, color, dash);
            } else {
              const endX = currentPos.x + cos * remainingDist;
              const endY = currentPos.y + sin * remainingDist;
              
              ctx.beginPath();
              ctx.setLineDash(dash);
              ctx.strokeStyle = color;
              ctx.moveTo(currentPos.x, currentPos.y);
              ctx.lineTo(endX, endY);
              ctx.stroke();
              
              return { end: { x: endX, y: endY }, hitPiece: null, hitWall: false };
            }
          };

          // Trace Striker
          const strikerPath = tracePath(striker.pos, angle, striker.radius, power * 10, [striker.id]);
          
          if (strikerPath.hitPiece) {
            const hitPiece = strikerPath.hitPiece;
            const impactX = strikerPath.end.x;
            const impactY = strikerPath.end.y;
            
            // Calculate piece trajectory after impact
            const dx = hitPiece.pos.x - impactX;
            const dy = hitPiece.pos.y - impactY;
            const pieceAngle = Math.atan2(dy, dx);

            // Ghost striker at impact
            ctx.beginPath();
            ctx.arc(impactX, impactY, striker.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.stroke();

            // Trace Piece A
            const pieceAPath = tracePath(hitPiece.pos, pieceAngle, hitPiece.radius, 600, [striker.id, hitPiece.id], 'rgba(0, 255, 0, 0.6)', []);
            
            // Check if Piece A goes into pocket
            const targetPocketA = checkPocket(hitPiece.pos, pieceAngle, hitPiece.radius);
            if (targetPocketA) {
              ctx.beginPath();
              ctx.arc(targetPocketA.x, targetPocketA.y, layout.pocketRadius, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
              ctx.fill();
            }

            if (pieceAPath.hitPiece) {
              const hitPieceB = pieceAPath.hitPiece;
              const impactXB = pieceAPath.end.x;
              const impactYB = pieceAPath.end.y;
              
              const dxB = hitPieceB.pos.x - impactXB;
              const dyB = hitPieceB.pos.y - impactYB;
              const pieceAngleB = Math.atan2(dyB, dxB);

              // Trace Piece B
              tracePath(hitPieceB.pos, pieceAngleB, hitPieceB.radius, 400, [striker.id, hitPiece.id, hitPieceB.id], 'rgba(255, 165, 0, 0.6)', []);
              
              const targetPocketB = checkPocket(hitPieceB.pos, pieceAngleB, hitPieceB.radius);
              if (targetPocketB) {
                ctx.beginPath();
                ctx.arc(targetPocketB.x, targetPocketB.y, layout.pocketRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
                ctx.fill();
              }
            }
          }
        }

        // Power Indicator
        ctx.beginPath();
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 6;
        ctx.arc(striker.pos.x, striker.pos.y, striker.radius + 10, 0, (power / 100) * Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const render = () => {
      draw(ctx);
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, isDragging, dragCurrent, layout]);

  return (
    <div className="w-full h-full max-w-full max-h-full relative mx-auto flex items-center justify-center p-0 sm:p-4" ref={containerRef}>
      <div 
        className="relative aspect-square max-w-full max-h-full rounded-[40px] overflow-hidden shadow-2xl border-[12px] bg-neutral-800"
        style={{ borderColor: theme.frameColor }}
      >
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="w-full h-full cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
};

export default Board;
