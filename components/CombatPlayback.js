export default function CombatPlayback({ log, currentIndex }) {
  if (!log) return null;
  return (
    <div style={{ border: '1px solid #e6edf3', padding: 12, borderRadius: 8, background: '#fafbfc' }}>
      <h3 style={{ marginTop: 0 }}>Playback</h3>
      <ol style={{ paddingLeft: 18, margin: 0 }}>
        {log.map((e, i) => (
          <li key={i} style={{ marginBottom: 6, background: i === currentIndex ? '#fff6e5' : 'transparent', padding: i === currentIndex ? '6px' : 0, borderRadius: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#888', fontSize: 12, width: 48 }}>t={e.t}</span>
              <strong style={{ minWidth: 80 }}>{e.attacker}</strong>
              <span style={{ color: '#444' }}>→ {e.defender}</span>
              <span style={{ marginLeft: 8, color: e.miss ? '#999' : '#111' }}>{e.miss ? 'miss' : `${e.damage} dmg`}</span>
              {e.isCrit && <span style={{ background: '#ffdce0', color: '#b31d1d', padding: '2px 6px', borderRadius: 6, marginLeft: 8, fontSize: 12 }}>CRIT</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
