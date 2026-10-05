'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 16 }}>
          <h1 style={{ fontSize: 22 }}>TrustLance could not load</h1>
          <p style={{ color: '#555' }}>Nothing was changed. Please try again.</p>
          <button onClick={reset} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
