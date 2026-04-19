import { Piece, Vector, LayoutConfig } from "../types";
import { BOARD_SIZE, POCKET_RADIUS, FRICTION, WALL_BOUNCE, MIN_VELOCITY } from "../constants";

export function updatePhysics(pieces: Piece[], layout: LayoutConfig): { pieces: Piece[]; pocketed: { piece: Piece, pocketIndex: number }[] } {
  const pocketed: { piece: Piece, pocketIndex: number }[] = [];
  const updatedPieces = pieces.map(p => ({ ...p }));
  const pocketRadius = layout.pocketRadius;
  const offset = layout.pocketOffset;
  const RESTITUTION = 0.7;

  // Move pieces
  updatedPieces.forEach(p => {
    if (p.isPocketed) return;

    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;

    // Friction
    p.vel.x *= FRICTION;
    p.vel.y *= FRICTION;

    // Velocity Cut-off Logic
    if (Math.abs(p.vel.x) < MIN_VELOCITY) p.vel.x = 0;
    if (Math.abs(p.vel.y) < MIN_VELOCITY) p.vel.y = 0;

    // Wall collisions (Wall Dampening)
    if (p.pos.x - p.radius < 0) {
      p.pos.x = p.radius;
      p.vel.x *= -WALL_BOUNCE;
    } else if (p.pos.x + p.radius > BOARD_SIZE) {
      p.pos.x = BOARD_SIZE - p.radius;
      p.vel.x *= -WALL_BOUNCE;
    }

    if (p.pos.y - p.radius < 0) {
      p.pos.y = p.radius;
      p.vel.y *= -WALL_BOUNCE;
    } else if (p.pos.y + p.radius > BOARD_SIZE) {
      p.pos.y = BOARD_SIZE - p.radius;
      p.vel.y *= -WALL_BOUNCE;
    }

    // Pocket detection
    const pockets = [
      { x: offset, y: offset },
      { x: BOARD_SIZE - offset, y: offset },
      { x: offset, y: BOARD_SIZE - offset },
      { x: BOARD_SIZE - offset, y: BOARD_SIZE - offset }
    ];

    pockets.forEach((pocket, index) => {
      const dist = Math.sqrt((p.pos.x - pocket.x) ** 2 + (p.pos.y - pocket.y) ** 2);
      if (dist < pocketRadius) {
        p.isPocketed = true;
        p.vel = { x: 0, y: 0 };
        pocketed.push({ piece: p, pocketIndex: index });
      }
    });
  });

  // Piece collisions (High-Performance Elastic Collisions)
  for (let i = 0; i < updatedPieces.length; i++) {
    for (let j = i + 1; j < updatedPieces.length; j++) {
      const p1 = updatedPieces[i];
      const p2 = updatedPieces[j];

      if (p1.isPocketed || p2.isPocketed) continue;

      const dx = p2.pos.x - p1.pos.x;
      const dy = p2.pos.y - p1.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = p1.radius + p2.radius;

      if (dist < minDist) {
        // Resolve overlap
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        
        p1.pos.x -= nx * overlap / 2;
        p1.pos.y -= ny * overlap / 2;
        p2.pos.x += nx * overlap / 2;
        p2.pos.y += ny * overlap / 2;

        // Elastic collision math with restitution
        const v1n = p1.vel.x * nx + p1.vel.y * ny;
        const v2n = p2.vel.x * nx + p2.vel.y * ny;

        // Relative velocity in normal direction
        const relVel = v1n - v2n;

        // Only collide if moving towards each other
        if (relVel > 0) {
          const m1 = p1.mass;
          const m2 = p2.mass;

          // Impulse scalar
          const j = -(1 + RESTITUTION) * relVel / (1/m1 + 1/m2);

          // Apply impulse
          p1.vel.x += (j / m1) * nx;
          p1.vel.y += (j / m1) * ny;
          p2.vel.x -= (j / m2) * nx;
          p2.vel.y -= (j / m2) * ny;
        }
      }
    }
  }

  return { pieces: updatedPieces, pocketed };
}

export function isBoardAtRest(pieces: Piece[]): boolean {
  return pieces.every(p => p.isPocketed || (p.vel.x === 0 && p.vel.y === 0));
}
