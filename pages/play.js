import { useState } from 'react';
import CombatPlayback from '../components/CombatPlayback';
import PlayerEditor from '../components/PlayerEditor';
import PlaybackControls from '../components/PlaybackControls';
import { useEffect, useRef } from 'react';

// Client-side derived stats (mirror server-side computeDerived with sensible defaults)
function computeDerived(player) {
  const stats = player.stats || {};
  const equip = player.equip || {};
  const atk = Math.floor((stats.str || 0) * 1.0 + (stats.int || 0) * 0.5);
  const def = Math.floor((stats.end || 0) * 1.5) + ((equip.armor && equip.armor.defFlat) || 0);
  const maxHp = 50 + (stats.con || 0) * 10 + (player.level || 0) * 5;
  const baseCrit = 0.05;
  const luckToCrit = 0; // server config fallback
  const critRate = (baseCrit || 0.05) + ((stats.luck || 0) * (luckToCrit || 0));
  const baseCritDamage = 0.5;
  const luckToCritDamageBoost = 0;
  const critDamage = (baseCritDamage || 0.5) + ((stats.luck || 0) * (luckToCritDamageBoost || 0));
  return { atk, def, maxHp, critRate, critDamage };
}

const PRESETS = ['p1_vs_p2', 'p1_vs_p2_stronger_p1'];

export default function Play() {
  const [preset, setPreset] = useState('p1_vs_p2');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [seedOverride, setSeedOverride] = useState('');
  const [customJson, setCustomJson] = useState('');
  const [players, setPlayers] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const playRef = useRef();

  // load preset into players state for editing
  async function loadPreset(name) {
    try {
      const presetRes = await fetch('/data/presets/' + name + '.json');
      if (!presetRes.ok) throw new Error('Failed to load preset');
      const payload = await presetRes.json();
      // fetch configs used for weapon/base calculations
      const [basesRes, combatRes] = await Promise.all([fetch('/api/config/weapon-bases'), fetch('/api/config/combat')]);
      const bases = basesRes.ok ? await basesRes.json() : {};
      const combatCfg = combatRes.ok ? await combatRes.json() : {};

      setPlayers(payload.players || null);
      // attach computed weapon metrics to each player for UI
      if (payload.players) {
        const withMetrics = payload.players.map(p => {
          const weapon = p.equip && (p.equip.weapon || p.equip.weapon_main);
          const baseType = weapon && weapon.baseType;
          const wbase = (bases && bases[baseType]) || { roundsPerAttack: 1, attacksPerTrigger: 1 };
          // compute a simple DPS estimate: average damage per attack * attacksPerTrigger / roundsPerAttack per second
          const derived = computeDerived(p);
          const sourceVal = p.stats && (p.stats[wbase.sourceAttr] || 0);
          let damageBase = (sourceVal * (wbase.conversionPct || 1)) + (derived.atk || 0) + ((weapon && weapon.powerFlat) || 0);
          damageBase = damageBase * (1 + ((weapon && weapon.powerPct) || 0));
          const attacks = (wbase.attacksPerTrigger || 1);
          const rounds = (wbase.roundsPerAttack || 1);
          const avgDamage = Math.round(damageBase);
          const dpsEstimate = Math.round((avgDamage * attacks) / Math.max(1, rounds));
          return { ...p, weaponMetrics: { attacksPerTrigger: attacks, roundsPerAttack: rounds, avgDamage, dpsEstimate, baseType } };
        });
        setPlayers(withMetrics);
      }
      setSeedOverride(payload.seed ? String(payload.seed) : '');
      setCustomJson('');
      setResult(null);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }

  async function run() {
    setError(null);
    setLoading(true);
    try {
      let payload = null;
      if (customJson.trim()) {
        try {
          payload = JSON.parse(customJson);
        } catch (err) {
          setError('Invalid JSON in custom input');
          setLoading(false);
          return;
        }
      } else if (players) {
        payload = { players, seed: seedOverride ? Number(seedOverride) : undefined };
      } else {
        const presetRes = await fetch('/data/presets/' + preset + '.json');
        if (!presetRes.ok) throw new Error('Failed to load preset');
        payload = await presetRes.json();
      }

      // optionally override seed
      if (seedOverride.trim()) {
        const s = Number(seedOverride);
        if (!Number.isFinite(s)) {
          setError('Seed must be a number');
          setLoading(false);
          return;
        }
        payload = { ...payload, seed: s };
      }

      const resp = await fetch('/api/combat/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error('Server error: ' + resp.status + ' ' + txt);
      }

      const js = await resp.json();
      setResult(js);
      setCurrentIndex(-1);
      setPlaying(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!playing) {
      if (playRef.current) { clearInterval(playRef.current); playRef.current = null; }
      return;
    }
    const intervalMs = Math.max(200, 1000 / speed);
    playRef.current = setInterval(() => {
      setCurrentIndex(i => {
        if (!result || !result.log) return i;
        const next = Math.min(i + 1, result.log.length - 1);
        if (next === i) { setPlaying(false); clearInterval(playRef.current); playRef.current = null; }
        return next;
      });
    }, intervalMs);
    return () => { if (playRef.current) { clearInterval(playRef.current); playRef.current = null; } };
  }, [playing, speed, result]);

  function downloadResult() {
    if (!result) return;
    const a = document.createElement('a');
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    a.href = URL.createObjectURL(blob);
    a.download = 'combat-result.json';
    a.click();
  }

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, Arial' }}>
      <h1>Play (Combat Simulator)</h1>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>Preset:</label>
        <select value={preset} onChange={e => setPreset(e.target.value)}>
          {PRESETS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button onClick={() => loadPreset(preset)} style={{ marginLeft: 6 }}>Load</button>

        <label style={{ marginLeft: 8 }}>Seed (optional):</label>
        <input value={seedOverride} onChange={e => setSeedOverride(e.target.value)} placeholder="numeric seed" style={{ width: 120 }} />

        <button onClick={run} disabled={loading} style={{ marginLeft: 8 }}>{loading ? 'Running...' : 'Run'}</button>
        <button onClick={() => { setCustomJson(''); setResult(null); setError(null); }} style={{ marginLeft: 8 }}>Reset</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Or paste custom scenario JSON:</label>
        <textarea value={customJson} onChange={e => setCustomJson(e.target.value)} rows={6} style={{ width: '100%', fontFamily: 'monospace' }} placeholder='{"players": [...], "seed": 123}'></textarea>
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3>Players (editable)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {players ? players.map(p => (
              <PlayerEditor key={p.playerId} player={p} onChange={np => setPlayers(players.map(x => x.playerId === np.playerId ? np : x))} />
            )) : <div style={{ color: '#666' }}>Load a preset to edit players</div>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {error && <div style={{ color: 'crimson', marginBottom: 8 }}>Error: {error}</div>}

        {result ? (
          <div>
            <h2>Result — winner: {result.winner}</h2>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ minWidth: 260 }}>
                <h3>Players</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(result && result.log && result.log.length) ? (
                    () => {}
                  ) : null}
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(players || (result && result.players) || []).map(p => {
                      // initial hp from players state or derived max
                      const initialHp = (p && p.hp) || (p && p.derived && p.derived.maxHp) || 100;
                      // compute hp after applying log up to currentIndex
                      let hp = initialHp;
                      if (result && result.log && currentIndex >= 0) {
                        for (let i = 0; i <= currentIndex; i++) {
                          const ev = result.log[i];
                          if (ev.defender === p.playerId && !ev.miss && typeof ev.damage === 'number') {
                            hp = Math.max(0, hp - ev.damage);
                          }
                        }
                      }
                      return (
                        <div key={p.playerId} style={{ padding: 8, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>{p.playerId}</strong>
                            <span style={{ color: '#666' }}>HP: {hp}</span>
                          </div>
                          <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
                            <div><strong>Level</strong>: {p.level}</div>
                            {(() => {
                              const d = computeDerived(p);
                              return (
                                <div style={{ marginTop: 6 }}>
                                  <div><strong>Derived</strong>:</div>
                                  <div style={{ fontSize: 13, color: '#444', marginLeft: 6 }}>
                                    <div>ATK: {d.atk}</div>
                                    <div>DEF: {d.def}</div>
                                    <div>MaxHP: {d.maxHp}</div>
                                    <div>Crit%: {(d.critRate * 100).toFixed(1)}%</div>
                                    <div>CritDmg: {(d.critDamage * 100).toFixed(1)}%</div>
                                  </div>
                                </div>
                              );
                            })()}

                            {p.weaponMetrics && (
                              <div style={{ marginTop: 8 }}>
                                <div><strong>Weapon Metrics</strong>:</div>
                                <div style={{ fontSize: 13, color: '#444', marginLeft: 6 }}>
                                  <div>attacksPerTrigger: {p.weaponMetrics.attacksPerTrigger}</div>
                                  <div>roundsPerAttack: {p.weaponMetrics.roundsPerAttack}</div>
                                  <div>avgDamage: {p.weaponMetrics.avgDamage}</div>
                                  <div>DPS-est: {p.weaponMetrics.dpsEstimate}</div>
                                </div>
                              </div>
                            )}

                            <div style={{ marginTop: 6 }}><strong>Equip</strong>:</div>
                            <div style={{ fontSize: 13, color: '#444', marginLeft: 6 }}>
                              {Object.keys(p.equip || {}).length ? Object.entries(p.equip || {}).map(([k, v]) => (
                                <div key={k}><em>{k}</em>: {JSON.stringify(v)}</div>
                              )) : <div style={{ color: '#888' }}>No equipment</div>}
                            </div>
                            {Object.keys(p).filter(k => !['playerId','level','stats','equip','hp'].includes(k)).length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                <strong>Other props</strong>
                                <pre style={{ background: '#f6f8fa', padding: 6, borderRadius: 6, fontSize: 12 }}>{JSON.stringify(Object.fromEntries(Object.entries(p).filter(([k]) => !['playerId','level','stats','equip','hp'].includes(k))), null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
                  <div style={{ flex: 1 }}>
                    <h3>Playback</h3>
                    <PlaybackControls playing={playing} onPlayToggle={() => setPlaying(p => !p)} onStepForward={() => setCurrentIndex(i => Math.min((result?.log?.length || 1) - 1, Math.max(-1, i + 1)))} onStepBack={() => setCurrentIndex(i => Math.max(-1, i - 1))} onReset={() => setCurrentIndex(-1)} speed={speed} />
                    <div style={{ marginTop: 8 }}>
                      <label style={{ marginRight: 8 }}>Speed:</label>
                      <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
                        <option value={0.5}>0.5</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <CombatPlayback log={result.log} currentIndex={currentIndex} />
                    </div>
                  </div>

              <div style={{ width: 420 }}>
                <h3>Raw JSON</h3>
                <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto', background: '#f6f8fa', padding: 8 }}>{JSON.stringify(result, null, 2)}</pre>
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(result))}>Copy JSON</button>
                  <button onClick={downloadResult} style={{ marginLeft: 8 }}>Download</button>
                </div>
              </div>
            </div>
          </div>
        ) : <div>No result yet</div>}
      </div>
    </div>
  );
}
