export default function Home() {
  return (
    <main style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        🚀 Referent
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#666' }}>
        Минимальное приложение на Next.js
      </p>
    </main>
  );
}



