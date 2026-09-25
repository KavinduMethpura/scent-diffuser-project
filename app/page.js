export default function HomePage() {
  return (
    <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '10px', color: '#38bdf8' }}>
          Scent Diffuser Cloud Hub
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#94a3b8' }}>
          Affective computing relay bridging Fitbit Sense 2 physiological data to the ESP32-S3 diffuser.
        </p>
      </div>

      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        border: '1px solid #334155'
      }}>
        <h2 style={{ fontSize: '1.3rem', marginTop: 0, color: '#f1f5f9' }}>&#x1F517; Step 1: One-Time Fitbit Authorization</h2>
        <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
          To allow the Vercel Cron service to fetch your Intraday Heart Rate series, click below to log into your Fitbit account and grant permission.
        </p>
        <a
          href="/api/auth/login"
          style={{
            display: 'inline-block',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            marginTop: '10px'
          }}
        >
          Authorize Fitbit Account &rarr;
        </a>
      </div>

      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #334155'
      }}>
        <h2 style={{ fontSize: '1.3rem', marginTop: 0, color: '#f1f5f9' }}>&#x2699;&#xFE0F; API Endpoints</h2>
        <ul style={{ color: '#cbd5e1', lineHeight: '2' }}>
          <li>
            <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>GET /api/cron/poll</code>
            &mdash; Triggered by Vercel Cron every 2 min to calculate affect state.
          </li>
          <li>
            <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>GET /api/status?key=&lt;DEVICE_SHARED_KEY&gt;</code>
            &mdash; Polled by the ESP32-S3 over WiFi every 20s.
          </li>
        </ul>
      </div>

      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '24px',
        border: '1px solid #334155'
      }}>
        <h2 style={{ fontSize: '1.3rem', marginTop: 0, color: '#f1f5f9' }}>&#x2697;&#xFE0F; Scent Formula Settings</h2>
        <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
          Configure which scent channels activate for each emotional state (Elevated, Relaxed, Low Affect).
          Adjust primary/secondary channel assignments and intensity levels.
        </p>
        <a
          href="/settings"
          style={{
            display: 'inline-block',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            marginTop: '10px'
          }}
        >
          Open Settings &#x2192;
        </a>
      </div>
    </main>
  );
}
