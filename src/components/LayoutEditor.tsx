import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LayoutConfig, GameState } from '../types';
import { DEFAULT_LAYOUT, BOARD_SIZE } from '../constants';
import { LayoutService } from '../services/gameService';
import Board from './Board';
import { Save, RotateCcw, ArrowLeft, Maximize, Move, Circle, Square, Download, Upload } from 'lucide-react';

interface LayoutEditorProps {
  onBack: () => void;
}

const LayoutEditor: React.FC<LayoutEditorProps> = ({ onBack }) => {
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const [saving, setSaving] = useState(false);
  const [strikerX, setStrikerX] = useState(BOARD_SIZE / 2);

  // Export Layout
  const handleExport = () => {
    const data = JSON.stringify(layout, null, 2);
    navigator.clipboard.writeText(data);
    alert('Layout code copied to clipboard!');
  };

  // Import Layout
  const handleImport = () => {
    const input = prompt('Paste your layout code here:');
    if (!input) return;
    try {
      const parsed = JSON.parse(input);
      setLayout({ ...DEFAULT_LAYOUT, ...parsed });
      alert('Layout imported successfully! Don\'t forget to save.');
    } catch (err) {
      alert('Invalid layout code. Please try again.');
    }
  };

  // Mock game state for preview
  const mockGameState: GameState = {
    pieces: [
      { id: 'striker', type: 'striker', pos: { x: strikerX, y: BOARD_SIZE / 2 + layout.baselineMarginFromCenter - layout.baselineWidth / 2 + layout.strikerYOffset }, vel: { x: 0, y: 0 }, radius: layout.strikerRadius, mass: 2, isPocketed: false },
      { id: 'queen', type: 'queen', pos: { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 }, vel: { x: 0, y: 0 }, radius: layout.coinRadius, mass: 1, isPocketed: false },
    ],
    currentPlayerIndex: 0,
    scores: [0, 0],
    playerColors: ['white', 'black'],
    strikerPos: strikerX,
    isAiming: true,
    aimAngle: -Math.PI / 2,
    aimPower: 50,
    isMoving: false,
    gameId: '',
    playerIds: [],
    playerNames: [],
    playerPoints: [0, 0],
    pendingQueenIndex: null,
    coveredQueenIndex: null,
    pocketedThisTurn: [],
    ownedAssets: {},
    entryFee: 0,
    roundNumber: 1,
    mode: 'classic',
    isSetupPhase: false,
    setupRotation: 0,
    status: 'playing',
    turnTimer: 16,
    turnStartTime: null,
    proposals: {},
    ownedTerritories: {},
    moveId: 0
  };

  useEffect(() => {
    const load = async () => {
      const saved = await LayoutService.getLayout();
      if (saved) setLayout(saved);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await LayoutService.saveLayout(layout);
      alert('Layout saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save layout.');
    } finally {
      setSaving(false);
    }
  };

  const updateLayout = (key: keyof LayoutConfig, value: number) => {
    setLayout(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 z-[100] flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase">Board Editor</h1>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Customize your carrom layout</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-3 bg-white/5 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-white/10 transition-all border border-white/10"
            title="Export Layout"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          <button 
            onClick={handleImport}
            className="flex items-center space-x-2 px-4 py-3 bg-white/5 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-white/10 transition-all border border-white/10"
            title="Import Layout"
          >
            <Upload size={16} />
            <span>Import</span>
          </button>
          <button 
            onClick={() => setLayout(DEFAULT_LAYOUT)}
            className="flex items-center space-x-2 px-6 py-3 bg-white/5 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-white/10 transition-all border border-white/10"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-8 py-3 bg-orange-500 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Layout'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-full md:w-96 h-[40vh] md:h-full bg-black/20 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar shrink-0">
          <ControlSection title="Piece Sizes" icon={<Circle size={14} />}>
            <SliderControl label="Pocket Radius" value={layout.pocketRadius} min={20} max={60} onChange={v => updateLayout('pocketRadius', v)} />
            <SliderControl label="Striker Radius" value={layout.strikerRadius} min={15} max={35} onChange={v => updateLayout('strikerRadius', v)} />
            <SliderControl label="Coin Radius" value={layout.coinRadius} min={10} max={25} onChange={v => updateLayout('coinRadius', v)} />
          </ControlSection>

          <ControlSection title="Baselines" icon={<Square size={14} />}>
            <SliderControl label="Baseline Length" value={layout.baselineLength} min={200} max={800} onChange={v => updateLayout('baselineLength', v)} />
            <SliderControl label="Margin from Center" value={layout.baselineMarginFromCenter} min={150} max={300} onChange={v => updateLayout('baselineMarginFromCenter', v)} />
            <SliderControl label="Width" value={layout.baselineWidth} min={20} max={60} onChange={v => updateLayout('baselineWidth', v)} />
            <SliderControl label="End Circle Radius" value={layout.circleRadius} min={10} max={30} onChange={v => updateLayout('circleRadius', v)} />
          </ControlSection>

          <ControlSection title="Center Design" icon={<Circle size={14} />}>
            <SliderControl label="Center Circle Radius" value={layout.centerCircleRadius} min={50} max={200} onChange={v => updateLayout('centerCircleRadius', v)} />
            <SliderControl label="Star Outer Radius" value={layout.centerStarOuterRadius} min={40} max={150} onChange={v => updateLayout('centerStarOuterRadius', v)} />
            <SliderControl label="Star Inner Radius" value={layout.centerStarInnerRadius} min={10} max={80} onChange={v => updateLayout('centerStarInnerRadius', v)} />
          </ControlSection>

          <ControlSection title="Diagonal Lines" icon={<Move size={14} />}>
            <SliderControl label="Margin from Center" value={layout.diagonalLineMarginFromCenter} min={100} max={250} onChange={v => updateLayout('diagonalLineMarginFromCenter', v)} />
            <SliderControl label="Margin from Pocket" value={layout.diagonalLineMarginFromPocket} min={50} max={150} onChange={v => updateLayout('diagonalLineMarginFromPocket', v)} />
            <SliderControl label="Arrow Offset" value={layout.arrowOffset} min={120} max={250} onChange={v => updateLayout('arrowOffset', v)} />
            <SliderControl 
              label="Arrow Rotation" 
              value={Math.round((layout.arrowRotation * 180) / Math.PI)} 
              min={0} 
              max={360} 
              onChange={v => updateLayout('arrowRotation', (v * Math.PI) / 180)} 
              unit="°"
            />
            <SliderControl label="Arrow Arc Radius" value={layout.arrowArcRadius} min={20} max={100} onChange={v => updateLayout('arrowArcRadius', v)} />
            <SliderControl 
              label="Arrow Arc Angle" 
              value={Math.round((layout.arrowArcAngle * 180) / Math.PI)} 
              min={10} 
              max={90} 
              onChange={v => updateLayout('arrowArcAngle', (v * Math.PI) / 180)} 
              unit="°"
            />
          </ControlSection>

          <ControlSection title="Pockets" icon={<Circle size={14} />}>
            <SliderControl label="Pocket Radius" value={layout.pocketRadius} min={20} max={60} onChange={v => updateLayout('pocketRadius', v)} />
            <SliderControl label="Pocket Offset" value={layout.pocketOffset} min={0} max={100} onChange={v => updateLayout('pocketOffset', v)} />
          </ControlSection>
          
          <ControlSection title="Striker" icon={<Move size={14} />}>
            <SliderControl label="Striker X Position" value={strikerX} min={BOARD_SIZE / 2 - layout.baselineLength / 2} max={BOARD_SIZE / 2 + layout.baselineLength / 2} onChange={v => setStrikerX(v)} />
            <SliderControl label="Striker Y Offset" value={layout.strikerYOffset} min={-50} max={50} onChange={v => updateLayout('strikerYOffset', v)} />
          </ControlSection>

          <ControlSection title="Striker Slider" icon={<Move size={14} />}>
            <SliderControl label="Slider Length" value={layout.sliderLength} min={200} max={600} onChange={v => updateLayout('sliderLength', v)} />
            <SliderControl label="Slider Width" value={layout.sliderWidth} min={20} max={80} onChange={v => updateLayout('sliderWidth', v)} />
            <SliderControl label="Circle Radius" value={layout.sliderCircleRadius} min={10} max={40} onChange={v => updateLayout('sliderCircleRadius', v)} />
            <SliderControl label="Thumb Scale" value={layout.sliderThumbScale} min={0.5} max={2} step={0.1} onChange={v => updateLayout('sliderThumbScale', v)} unit="x" />
            <SliderControl label="Bottom Margin" value={layout.sliderBottomMargin} min={0} max={100} onChange={v => updateLayout('sliderBottomMargin', v)} />
          </ControlSection>

          <ControlSection title="Board Frame" icon={<Square size={14} />}>
            <SliderControl label="Frame Roundness" value={layout.frameRoundness} min={0} max={100} onChange={v => updateLayout('frameRoundness', v)} />
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Frame Color</p>
              <div className="flex flex-wrap gap-2">
                {['#4E342E', '#8d6e63', '#3E2723', '#212121', '#1a1a1a', '#5D4037', '#795548'].map(color => (
                  <button
                    key={color}
                    onClick={() => setLayout(prev => ({ ...prev, frameColor: color }))}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${layout.frameColor === color ? 'border-orange-500 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </ControlSection>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-neutral-900 flex items-center justify-center p-4 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Board 
              gameState={mockGameState} 
              user={null}
              onStrike={() => {}} 
              onStrikerMove={() => {}} 
              onSetupRotate={() => {}} 
              layout={layout}
            />

            {/* Striker Control Slider Preview */}
            <div 
              className="relative w-full max-w-md"
              style={{ 
                marginTop: `${layout.sliderBottomMargin}px`,
                '--striker-size': `${layout.strikerRadius * 2 * layout.sliderThumbScale}px`,
                '--slider-length': `${layout.sliderLength}px`,
                '--slider-width': `${layout.sliderWidth}px`,
                '--slider-circle-radius': `${layout.sliderCircleRadius}px`,
              } as React.CSSProperties}
            >
              <div 
                className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex items-center justify-between pointer-events-none"
                style={{ width: `${layout.sliderLength}px`, height: `${layout.sliderWidth}px` }}
              >
                <div 
                  className="rounded-full border-2 border-[#3E2723] bg-[#C62828] flex items-center justify-center shadow-lg shrink-0"
                  style={{ width: `${layout.sliderCircleRadius * 2}px`, height: `${layout.sliderCircleRadius * 2}px`, marginLeft: `-${layout.sliderCircleRadius}px` }}
                >
                  <div className="rounded-full border border-[#3E2723]/30" style={{ width: `${Math.max(0, (layout.sliderCircleRadius - 5) * 2)}px`, height: `${Math.max(0, (layout.sliderCircleRadius - 5) * 2)}px` }} />
                </div>
                <div className="flex-1 h-full relative">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-[#3E2723]" />
                  <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#3E2723]" />
                </div>
                <div 
                  className="rounded-full border-2 border-[#3E2723] bg-[#C62828] flex items-center justify-center shadow-lg shrink-0"
                  style={{ width: `${layout.sliderCircleRadius * 2}px`, height: `${layout.sliderCircleRadius * 2}px`, marginRight: `-${layout.sliderCircleRadius}px` }}
                >
                  <div className="rounded-full border border-[#3E2723]/30" style={{ width: `${Math.max(0, (layout.sliderCircleRadius - 5) * 2)}px`, height: `${Math.max(0, (layout.sliderCircleRadius - 5) * 2)}px` }} />
                </div>
              </div>
              
              <div className="relative mx-auto" style={{ width: `${layout.sliderLength}px` }}>
                <input 
                  type="range" 
                  min={BOARD_SIZE / 2 - layout.baselineLength / 2} 
                  max={BOARD_SIZE / 2 + layout.baselineLength / 2} 
                  value={strikerX}
                  onChange={(e) => setStrikerX(parseInt(e.target.value))}
                  className="relative z-10 w-full h-12 appearance-none bg-transparent cursor-pointer accent-red-600 custom-range-slider"
                />
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-400">
            Preview Mode: Changes apply instantly
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2 text-orange-500">
      {icon}
      <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
    </div>
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

const SliderControl: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }> = ({ label, value, min, max, step = 1, onChange, unit = 'px' }) => {
  const safeValue = isNaN(value) || value === undefined ? min : value;
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{label}</span>
        <span className="text-xs font-black text-white bg-white/5 px-2 py-0.5 rounded-lg">{safeValue}{unit}</span>
      </div>
      <div className="flex items-center space-x-4">
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step}
          value={safeValue} 
          onChange={e => onChange(parseFloat(e.target.value) || min)}
          className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
        <input 
          type="number" 
          value={safeValue} 
          step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-16 bg-black/40 border border-white/10 rounded-lg p-1 text-[10px] font-black text-center"
        />
      </div>
    </div>
  );
};

export default LayoutEditor;
