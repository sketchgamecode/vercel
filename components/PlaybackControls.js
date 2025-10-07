import React from 'react';

export default function PlaybackControls({ playing, onPlayToggle, onStepForward, onStepBack, onReset, speed }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button onClick={onPlayToggle}>{playing ? 'Pause' : 'Play'}</button>
      <button onClick={onStepBack}>Step ◀</button>
      <button onClick={onStepForward}>Step ▶</button>
      <button onClick={onReset}>Reset</button>
      <div style={{ marginLeft: 8, color: '#666' }}>Speed: {speed}x</div>
    </div>
  );
}
