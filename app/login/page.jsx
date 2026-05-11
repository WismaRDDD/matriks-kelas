'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState('admin');
  const [username, setUsername] = useState('');
  const [nidn, setNidn] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            // Redirect based on role
            if (data.session.role === 'admin') {
              router.push('/dashboard');
            } else if (data.session.role === 'dosen') {
              router.push('/dosen/dashboard');
            }
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        role,
        ...(role === 'admin' ? { username, password } : { nidn }),
      };

      console.log('📤 Sending login request:', { role: payload.role });

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', res.status);
      console.log('📥 Response headers:', res.headers.get('content-type'));

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        const text = await res.text();
        console.error('Response text:', text.substring(0, 200));
        setError('Server error: Invalid response format. Check console for details.');
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Login gagal');
        if (data.details) {
          console.error('Server error details:', data.details);
        }
        return;
      }

      console.log('✅ Login successful, redirecting to:', data.redirect);
      // Redirect based on role
      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div style={styles.loadingContainer}>Memuat...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📊 Matriks Kelas</h1>
        <p style={styles.subtitle}>Sistem Penjadwalan Kelas</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Role Selection */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Pilih Role:</label>
            <div style={styles.roleButtons}>
              <button
                type="button"
                onClick={() => {
                  setRole('admin');
                  setError('');
                }}
                style={{
                  ...styles.roleButton,
                  ...(role === 'admin' ? styles.roleButtonActive : {}),
                }}
              >
                👨‍💼 Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('dosen');
                  setError('');
                }}
                style={{
                  ...styles.roleButton,
                  ...(role === 'dosen' ? styles.roleButtonActive : {}),
                }}
              >
                👨‍🏫 Dosen
              </button>
            </div>
          </div>

          {/* Admin Login Form */}
          {role === 'admin' && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>Username:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin"
                  style={styles.input}
                  required
                />
                <small style={styles.hint}>Dummy: admin</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  style={styles.input}
                  required
                />
                <small style={styles.hint}>Dummy: admin123</small>
              </div>
            </>
          )}

          {/* Dosen Login Form */}
          {role === 'dosen' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>NIDN:</label>
              <input
                type="text"
                value={nidn}
                onChange={(e) => setNidn(e.target.value)}
                placeholder="Masukkan NIDN Anda"
                style={styles.input}
                required
              />
              <small style={styles.hint}>
                NIDN harus terdaftar di database
              </small>
            </div>
          )}

          {/* Error Message */}
          {error && <div style={styles.error}>{error}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              ...(loading ? styles.submitButtonDisabled : {}),
            }}
          >
            {loading ? 'Mengecek...' : 'Masuk'}
          </button>
        </form>

        {/* Info Box */}
        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>🔐 Akun Demo</h3>
          <div style={styles.infoContent}>
            <p>
              <strong>Admin:</strong>
              <br />
              Username: admin
              <br />
              Password: admin123
            </p>
            <p>
              <strong>Dosen:</strong>
              <br />
              Gunakan NIDN dari database
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '1rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '2.5rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.8rem',
    fontWeight: '700',
    textAlign: 'center',
    color: '#2d3748',
  },
  subtitle: {
    margin: '0 0 1.5rem 0',
    fontSize: '0.9rem',
    textAlign: 'center',
    color: '#718096',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#2d3748',
  },
  roleButtons: {
    display: 'flex',
    gap: '1rem',
  },
  roleButton: {
    flex: 1,
    padding: '0.75rem',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    background: 'white',
    color: '#2d3748',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '0.9rem',
  },
  roleButtonActive: {
    borderColor: '#667eea',
    background: '#edf2f7',
    color: '#667eea',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #cbd5e0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    color: '#000000',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#a0aec0',
    marginTop: '0.25rem',
  },
  error: {
    padding: '0.75rem',
    background: '#fed7d7',
    color: '#c53030',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  submitButton: {
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '0.95rem',
  },
  submitButtonDisabled: {
    opacity: '0.6',
    cursor: 'not-allowed',
  },
  infoBox: {
    marginTop: '2rem',
    padding: '1rem',
    background: '#f7fafc',
    borderRadius: '8px',
    borderLeft: '4px solid #667eea',
  },
  infoTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.9rem',
    color: '#2d3748',
  },
  infoContent: {
    fontSize: '0.85rem',
    color: '#4a5568',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '1.2rem',
  },
};
