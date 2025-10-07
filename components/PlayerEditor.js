import React from 'react';

export default function PlayerEditor({ player, onChange }) {
  if (!player) return null;

  function updateStat(key, value) {
    const v = Number(value);
    if (!Number.isFinite(v)) return;
    onChange({ ...player, stats: { ...player.stats, [key]: v } });
  }

  function updateEquipField(equipKey, field, value) {
    const updatedEquip = { ...player.equip };
    updatedEquip[equipKey] = { ...updatedEquip[equipKey], [field]: value };
    onChange({ ...player, equip: updatedEquip });
  }

  // gather secondary props (anything besides id/level/stats/equip)
  const secondary = Object.keys(player).reduce((acc, k) => {
    if (!['playerId', 'level', 'stats', 'equip', 'hp'].includes(k)) acc[k] = player[k];
    return acc;
  }, {});

  return (
    <div style={{ border: '1px solid #e1e4e8', padding: 12, borderRadius: 8, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{player.playerId}</strong>
        <span style={{ color: '#666' }}>Level {player.level}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
        {Object.entries(player.stats || {}).map(([k, v]) => (
          <label key={k} style={{ fontSize: 13 }}>
            <div style={{ color: '#333', marginBottom: 4 }}>{k}</div>
            <input style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }} value={v} onChange={e => updateStat(k, e.target.value)} />
          </label>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, color: '#333', marginBottom: 6 }}>Equipment</div>
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          {Object.entries(player.equip || {}).map(([ek, ev]) => (
            <div key={ek} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ minWidth: 80, color: '#444' }}>{ek}</div>
              {Object.entries(ev || {}).map(([fk, fv]) => (
                <div key={fk} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>{fk}:</div>
                  <input value={fv ?? ''} onChange={e => updateEquipField(ek, fk, e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {Object.keys(secondary).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, color: '#333', marginBottom: 6 }}>Secondary props</div>
          <pre style={{ background: '#f6f8fa', padding: 8, borderRadius: 6, fontSize: 12, overflow: 'auto' }}>{JSON.stringify(secondary, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
