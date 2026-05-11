'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DosenProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dosen, setDosen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDosenData = async () => {
      try {
        // Check session first to get NIDN
        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) {
          router.push('/login');
          return;
        }

        const sessionData = await sessionRes.json();
        const nidn = sessionData.session.nidn;

        // Fetch dosen data
        const res = await fetch(`/api/dosen/get-by-nidn?nidn=${nidn}`);
        if (!res.ok) {
          setError('Gagal mengambil data profil');
          return;
        }

        const data = await res.json();
        setDosen(data);
      } catch (err) {
        console.error('Error:', err);
        setError('Terjadi kesalahan: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDosenData();
  }, [router]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>Memuat profil...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{...styles.card, ...styles.errorCard}}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>👤 Profil Dosen</h2>

        {dosen && (
          <div style={styles.profileContent}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Informasi Pribadi</h3>
              <div style={styles.fieldGroup}>
                <div style={styles.field}>
                  <label style={styles.label}>NIDN:</label>
                  <span style={styles.value}>{dosen.f_nidn}</span>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>NIP:</label>
                  <span style={styles.value}>{dosen.f_nip || '-'}</span>
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Nama dan Gelar</h3>
              <div style={styles.fieldGroup}>
                <div style={styles.field}>
                  <label style={styles.label}>Gelar Depan:</label>
                  <span style={styles.value}>{dosen.f_title_depan || '-'}</span>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Nama Lengkap:</label>
                  <span style={styles.value}>{dosen.f_namapegawai}</span>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Gelar Belakang:</label>
                  <span style={styles.value}>{dosen.f_title_belakang || '-'}</span>
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Data Demografis</h3>
              <div style={styles.fieldGroup}>
                <div style={styles.field}>
                  <label style={styles.label}>Tempat Lahir:</label>
                  <span style={styles.value}>{dosen.f_tempatlahir || '-'}</span>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Tanggal Lahir:</label>
                  <span style={styles.value}>
                    {dosen.f_tanggallahir
                      ? new Date(dosen.f_tanggallahir).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '-'}
                  </span>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Jenis Kelamin:</label>
                  <span style={styles.value}>
                    {dosen.f_jeniskelamin === 'L' || dosen.f_jeniskelamin === 'Laki-laki'
                      ? 'Laki-laki'
                      : dosen.f_jeniskelamin === 'P' || dosen.f_jeniskelamin === 'Perempuan'
                      ? 'Perempuan'
                      : dosen.f_jeniskelamin || '-'}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Organisasi</h3>
              <div style={styles.fieldGroup}>
                <div style={styles.field}>
                  <label style={styles.label}>Program Studi:</label>
                  <span style={styles.value}>{dosen.f_progdi_id || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    minHeight: '100vh',
  },
  card: {
    background: 'white',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    maxWidth: '800px',
    margin: '0 auto',
  },
  errorCard: {
    background: '#fed7d7',
    color: '#c53030',
    fontWeight: '500',
  },
  title: {
    margin: '0 0 2rem 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#2d3748',
    borderBottom: '2px solid #667eea',
    paddingBottom: '1rem',
  },
  profileContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  section: {
    padding: '1.5rem',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#667eea',
  },
  fieldGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '0.25rem',
  },
  value: {
    fontSize: '1rem',
    color: '#2d3748',
    padding: '0.5rem 0.75rem',
    background: 'white',
    borderRadius: '4px',
    border: '1px solid #cbd5e0',
  },
};
