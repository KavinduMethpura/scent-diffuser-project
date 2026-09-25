'use client';

import { useState, useEffect } from 'react';

const STATE_META = {
  elevated: {
    label: 'Elevated / Anxious',
    emoji: '😰',
    description: 'High stress or anxiety detected (HR deviation > +8 bpm)',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  relaxed: {
    label: 'Relaxed / Calm',
    emoji: '😌',
    description: 'Calm, low-arousal state (HR deviation < -5 bpm)',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  },
  low_affect: {
    label: 'Low Affect / Sadness',
    emoji: '😔',
    description: 'Low energy or sadness detected',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
  },
  neutral: {
    label: 'Neutral / Baseline',
    emoji: '😐',
    description: 'Normal resting state — no active misting',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
  },
};

const CHANNEL_SCENTS = {
  0: { name: 'None (Off)', emoji: '⭕' },
  1: { name: 'Rose', emoji: '🌹' },
  2: { name: 'Citrus', emoji: '🍊' },
  3: { name: 'Peppermint', emoji: '🌿' },
  4: { name: 'Lavender', emoji: '💜' },
  5: { name: 'Sandalwood', emoji: '🪵' },
  6: { name: 'Eucalyptus', emoji: '🌲' },
};

export default function SettingsPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);

  useEffect(() => {
    fetchConfig();
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLiveStatus() {
    try {
      const res = await fetch('/api/cron/poll');
      const data = await res.json();
      if (data.ok) {
        setLiveStatus(data);
      }
    } catch (err) {
      /* silently ignore */
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveStatus('success');
        setConfig(data.config);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }

  function handleResetDefaults() {
    setConfig({
      elevated: { primary: 4, secondary: 5, intensity: 40, formulaName: 'Anxiolytic Lavender Blend' },
      relaxed: { primary: 1, secondary: 5, intensity: 20, formulaName: 'Relaxation Harmony Blend' },
      low_affect: { primary: 2, secondary: 3, intensity: 40, formulaName: 'Energizing Citrus Uplift' },
      neutral: { primary: 0, secondary: 0, intensity: 0, formulaName: 'Idle' },
    });
    setSaveStatus(null);
  }

  function updateStateConfig(state, field, value) {
    setConfig((prev) => ({
      ...prev,
      [state]: {
        ...prev[state],
        [field]: field === 'formulaName' ? value : parseInt(value) || 0,
      },
    }));
  }

  if (loading) {
    return (
      <main style={styles.main}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: '#94a3b8', marginTop: '16px' }}>Loading settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      {/* Header */}
      <div style={styles.header}>
        <a href="/" style={styles.backLink}>← Back to Hub</a>
        <h1 style={styles.title}>⚗️ Scent Formula Settings</h1>
        <p style={styles.subtitle}>
          Configure which scent channels activate for each emotional state.
          Each state uses a Primary (70% duty) and Secondary (30% duty) channel.
        </p>
      </div>

      {/* Live Status Banner */}
      {liveStatus && (
        <div style={{
          ...styles.liveBanner,
          borderLeft: `4px solid ${STATE_META[liveStatus.state]?.color || '#64748b'}`,
        }}>
          <div style={styles.liveBannerInner}>
            <span style={styles.liveDot} />
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>LIVE STATUS</span>
          </div>
          <div style={styles.liveBannerStats}>
            <span style={{ fontSize: '1.5rem' }}>{STATE_META[liveStatus.state]?.emoji}</span>
            <div>
              <strong style={{ color: '#f1f5f9' }}>{STATE_META[liveStatus.state]?.label || liveStatus.state}</strong>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                {liveStatus.bpm !== null ? `${liveStatus.bpm} BPM` : 'Waiting...'} · Deviation: {liveStatus.deviation?.toFixed?.(1) || '0'} bpm
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State Cards */}
      <div style={styles.cardsGrid}>
        {Object.entries(STATE_META).map(([stateKey, meta]) => {
          const stateConfig = config?.[stateKey] || {};
          return (
            <div key={stateKey} style={styles.card}>
              {/* Card Header */}
              <div style={{ ...styles.cardHeader, background: meta.gradient }}>
                <span style={{ fontSize: '1.8rem' }}>{meta.emoji}</span>
                <div>
                  <h2 style={styles.cardTitle}>{meta.label}</h2>
                  <p style={styles.cardDesc}>{meta.description}</p>
                </div>
              </div>

              {/* Card Body */}
              <div style={styles.cardBody}>
                {/* Primary Channel */}
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>
                    <span style={styles.badge70}>PRIMARY 70%</span>
                    Scent Channel
                  </label>
                  <select
                    style={styles.select}
                    value={stateConfig.primary ?? 0}
                    onChange={(e) => updateStateConfig(stateKey, 'primary', e.target.value)}
                  >
                    {Object.entries(CHANNEL_SCENTS).map(([ch, info]) => (
                      <option key={ch} value={ch}>
                        {ch === '0' ? '⭕ None (Off)' : `CH${ch}: ${info.emoji} ${info.name}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Secondary Channel */}
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>
                    <span style={styles.badge30}>SECONDARY 30%</span>
                    Scent Channel
                  </label>
                  <select
                    style={styles.select}
                    value={stateConfig.secondary ?? 0}
                    onChange={(e) => updateStateConfig(stateKey, 'secondary', e.target.value)}
                  >
                    {Object.entries(CHANNEL_SCENTS).map(([ch, info]) => (
                      <option key={ch} value={ch}>
                        {ch === '0' ? '⭕ None (Off)' : `CH${ch}: ${info.emoji} ${info.name}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Intensity Slider */}
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>
                    Intensity
                    <span style={{
                      ...styles.intensityValue,
                      color: meta.color,
                    }}>
                      {stateConfig.intensity ?? 0}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={stateConfig.intensity ?? 0}
                    onChange={(e) => updateStateConfig(stateKey, 'intensity', e.target.value)}
                    style={{
                      ...styles.slider,
                      accentColor: meta.color,
                    }}
                  />
                  <div style={styles.sliderLabels}>
                    <span>Off</span>
                    <span>Subtle</span>
                    <span>Medium</span>
                    <span>Strong</span>
                  </div>
                </div>

                {/* Formula Name */}
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Formula Name</label>
                  <input
                    type="text"
                    maxLength={50}
                    value={stateConfig.formulaName || ''}
                    onChange={(e) => updateStateConfig(stateKey, 'formulaName', e.target.value)}
                    style={styles.textInput}
                    placeholder="e.g. Custom Calming Blend"
                  />
                </div>

                {/* Preview */}
                <div style={styles.preview}>
                  <span style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Preview
                  </span>
                  <div style={styles.previewChannels}>
                    {stateConfig.primary > 0 && (
                      <span style={{ ...styles.previewPill, background: `${meta.color}22`, borderColor: meta.color }}>
                        {CHANNEL_SCENTS[stateConfig.primary]?.emoji} {CHANNEL_SCENTS[stateConfig.primary]?.name} (70%)
                      </span>
                    )}
                    {stateConfig.secondary > 0 && (
                      <span style={{ ...styles.previewPill, background: '#334155', borderColor: '#475569' }}>
                        {CHANNEL_SCENTS[stateConfig.secondary]?.emoji} {CHANNEL_SCENTS[stateConfig.secondary]?.name} (30%)
                      </span>
                    )}
                    {(!stateConfig.primary && !stateConfig.secondary) && (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>No channels assigned — Idle</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div style={styles.actionBar}>
        <button onClick={handleResetDefaults} style={styles.resetBtn}>
          ↺ Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveBtn,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '⏳ Saving...' : '💾 Save Configuration'}
        </button>
      </div>

      {/* Save Status Toast */}
      {saveStatus && (
        <div style={{
          ...styles.toast,
          background: saveStatus === 'success' ? '#16a34a' : '#dc2626',
        }}>
          {saveStatus === 'success' ? '✅ Settings saved successfully!' : '❌ Failed to save settings.'}
        </div>
      )}

      {/* Channel Reference */}
      <div style={styles.referenceCard}>
        <h3 style={{ margin: '0 0 12px 0', color: '#f1f5f9', fontSize: '1rem' }}>
          📋 Channel Reference (Hardware Pin Map)
        </h3>
        <div style={styles.refGrid}>
          {Object.entries(CHANNEL_SCENTS).filter(([ch]) => ch !== '0').map(([ch, info]) => (
            <div key={ch} style={styles.refItem}>
              <span style={styles.refCh}>CH{ch}</span>
              <span style={{ fontSize: '1.2rem' }}>{info.emoji}</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{info.name}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

const styles = {
  main: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px 20px 80px',
    minHeight: '100vh',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #334155',
    borderTop: '3px solid #38bdf8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    marginBottom: '28px',
  },
  backLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontSize: '0.9rem',
    display: 'inline-block',
    marginBottom: '12px',
  },
  title: {
    fontSize: '2rem',
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  liveBanner: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
    border: '1px solid #334155',
  },
  liveBannerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
  },
  liveBannerStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  },
  card: {
    background: '#1e293b',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #334155',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#ffffff',
    fontWeight: 700,
  },
  cardDesc: {
    margin: '2px 0 0 0',
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.75)',
  },
  cardBody: {
    padding: '18px 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: '0.82rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  badge70: {
    fontSize: '0.65rem',
    padding: '2px 6px',
    borderRadius: '4px',
    background: '#0ea5e9',
    color: '#fff',
    fontWeight: 700,
  },
  badge30: {
    fontSize: '0.65rem',
    padding: '2px 6px',
    borderRadius: '4px',
    background: '#475569',
    color: '#e2e8f0',
    fontWeight: 700,
  },
  select: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: '0.9rem',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'auto',
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
    height: '6px',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#64748b',
    fontSize: '0.7rem',
  },
  intensityValue: {
    marginLeft: 'auto',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  textInput: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#f1f5f9',
    fontSize: '0.9rem',
    outline: 'none',
  },
  preview: {
    background: '#0f172a',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  previewChannels: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  previewPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid',
    fontSize: '0.82rem',
    color: '#e2e8f0',
    fontWeight: 500,
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '28px',
  },
  resetBtn: {
    background: 'transparent',
    border: '1px solid #475569',
    borderRadius: '8px',
    padding: '12px 20px',
    color: '#94a3b8',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 28px',
    color: '#ffffff',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '14px 24px',
    borderRadius: '10px',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.9rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out',
  },
  referenceCard: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
  },
  refGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '8px',
  },
  refItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#0f172a',
    borderRadius: '8px',
  },
  refCh: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#38bdf8',
    padding: '2px 5px',
    background: '#0c4a6e',
    borderRadius: '4px',
  },
};
