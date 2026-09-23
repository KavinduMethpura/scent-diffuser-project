export const metadata = {
  title: 'Scent Diffuser Cloud Hub',
  description: 'Fitbit OAuth relay and status cache for AI-Assisted Scent Diffuser',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}
