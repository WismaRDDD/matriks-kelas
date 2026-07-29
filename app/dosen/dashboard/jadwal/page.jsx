'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function DosenJadwalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dosen, setDosen] = useState(null);
  const [allJadwal, setAllJadwal] = useState([]);
  const [kelasMap, setKelasMap] = useState({});
  const [tahunAkademikList, setTahunAkademikList] = useState([]);
  const [selectedTahunAkademik, setSelectedTahunAkademik] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Gasal');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) {
          router.push('/login');
          return;
        }

        const sessionData = await sessionRes.json();
        if (sessionData?.session?.role !== 'dosen') {
          router.push('/login');
          return;
        }

        const nidn = sessionData?.session?.nidn;
        if (!nidn) {
          setError('Session dosen tidak valid. Silakan login ulang.');
          return;
        }

        const dosenRes = await fetch(`/api/dosen/get-by-nidn?nidn=${encodeURIComponent(nidn)}`);
        if (!dosenRes.ok) {
          setError('Gagal mengambil data dosen.');
          return;
        }

        const dosenData = await dosenRes.json();
        setDosen(dosenData);

        const [jadwalRes, kelasRes, tahunRes] = await Promise.all([
          fetch(`/api/jadwal?dosen_id=${dosenData.id}`),
          fetch('/api/kelas'),
          fetch('/api/tahun-akademik'),
        ]);

        if (!jadwalRes.ok || !kelasRes.ok || !tahunRes.ok) {
          setError('Gagal mengambil data jadwal.');
          return;
        }

        const jadwalData = await jadwalRes.json();
        const kelasData = await kelasRes.json();
        const tahunData = await tahunRes.json();

        const nextKelasMap = {};
        (Array.isArray(kelasData) ? kelasData : []).forEach((kelas) => {
          nextKelasMap[kelas.id] = kelas;
        });

        const safeTahun = Array.isArray(tahunData) ? tahunData : [];

        setAllJadwal(Array.isArray(jadwalData) ? jadwalData : []);
        setKelasMap(nextKelasMap);
        setTahunAkademikList(safeTahun);
        if (safeTahun.length > 0) {
          setSelectedTahunAkademik(String(safeTahun[0].id));
        }
      } catch (err) {
        setError(`Terjadi kesalahan: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const filteredJadwal = useMemo(() => {
    const selectedTahun = String(selectedTahunAkademik || '');

    return allJadwal.filter((item) => {
      const kelasMeta = kelasMap[item.kelas_id];
      const itemTahun = String(kelasMeta?.f_tahun_akademik || '');

      if (selectedTahun && itemTahun && itemTahun !== selectedTahun) {
        return false;
      }

      const semesterNumber = Number(item.semester || kelasMeta?.f_semester || 0);
      if (!semesterNumber) {
        return false;
      }

      const isGasal = semesterNumber % 2 === 1;
      return selectedSemester === 'Gasal' ? isGasal : !isGasal;
    });
  }, [allJadwal, kelasMap, selectedSemester, selectedTahunAkademik]);

  const groupedByDay = useMemo(() => {
    const grouped = {
      Senin: [],
      Selasa: [],
      Rabu: [],
      Kamis: [],
      Jumat: [],
      Sabtu: [],
    };

    filteredJadwal.forEach((item) => {
      if (grouped[item.hari]) {
        grouped[item.hari].push(item);
      }
    });

    DAYS.forEach((day) => {
      grouped[day].sort((a, b) => String(a.jam_mulai || '').localeCompare(String(b.jam_mulai || '')));
    });

    return grouped;
  }, [filteredJadwal]);

  const totalSesi = filteredJadwal.length;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>Memuat jadwal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, ...styles.errorCard }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Jadwal Dosen</h1>
            <p style={styles.subtitle}>Read-only jadwal dari admin</p>
          </div>
          <div style={styles.summaryBadge}>{totalSesi} sesi</div>
        </div>

        {dosen && (
          <div style={styles.infoBox}>
            <strong>{dosen.f_namapegawai}</strong>
            <span style={styles.infoMeta}>NIDN: {dosen.f_nidn}</span>
          </div>
        )}

        <div style={styles.filterRow}>
          <div style={styles.filterItem}>
            <label style={styles.label}>Tahun Akademik</label>
            <select
              value={selectedTahunAkademik}
              onChange={(e) => setSelectedTahunAkademik(e.target.value)}
              style={styles.select}
            >
              <option value="">Semua Tahun</option>
              {tahunAkademikList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tahun_akademik}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={styles.select}
            >
              <option value="Gasal">Gasal</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
        </div>

        {totalSesi === 0 ? (
          <div style={styles.emptyState}>Belum ada jadwal untuk filter yang dipilih.</div>
        ) : (
          DAYS.map((day) => {
            const sessions = groupedByDay[day] || [];
            if (sessions.length === 0) {
              return null;
            }

            return (
              <div key={day} style={styles.daySection}>
                <div style={styles.dayHeader}>
                  <h2 style={styles.dayTitle}>{day}</h2>
                  <span style={styles.dayCount}>{sessions.length} sesi</span>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Jam</th>
                        <th style={styles.th}>Mata Kuliah</th>
                        <th style={styles.th}>Ruangan</th>
                        <th style={styles.th}>Kelas</th>
                        <th style={styles.th}>Semester</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((item) => {
                        const kelasMeta = kelasMap[item.kelas_id] || {};
                        const mataKuliah =
                          item.nama_matakuliah ||
                          item.nama_mk ||
                          item.display_name ||
                          kelasMeta.f_namamk ||
                          kelasMeta.nama_kelas ||
                          '-';

                        const namaRuangan = item.nama_ruangan_db || item.nama_ruangan || '-';
                        const namaKelas = kelasMeta.nama_kelas || item.display_name || '-';

                        return (
                          <tr key={item.id}>
                            <td style={styles.td}>{item.jam_mulai} - {item.jam_selesai}</td>
                            <td style={styles.td}>{mataKuliah}</td>
                            <td style={styles.td}>{namaRuangan}</td>
                            <td style={styles.td}>{namaKelas}</td>
                            <td style={styles.td}>{item.semester || kelasMeta.f_semester || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    padding: '2rem',
    background: '#f4f6fb',
  },
  card: {
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
  },
  errorCard: {
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.9rem',
    color: '#312e81',
  },
  subtitle: {
    margin: '0.35rem 0 0 0',
    color: '#64748b',
    fontSize: '0.95rem',
  },
  summaryBadge: {
    background: '#e0e7ff',
    color: '#3730a3',
    borderRadius: '999px',
    padding: '0.4rem 0.9rem',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  infoBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '0.85rem 1rem',
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '10px',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  infoMeta: {
    color: '#4338ca',
    fontWeight: 500,
    fontSize: '0.9rem',
  },
  filterRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '0.9rem',
    marginBottom: '1.5rem',
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.78rem',
    color: '#475569',
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  select: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  emptyState: {
    padding: '1.2rem',
    borderRadius: '10px',
    border: '1px dashed #cbd5e1',
    background: '#f8fafc',
    color: '#475569',
    textAlign: 'center',
  },
  daySection: {
    marginBottom: '1.25rem',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f8fafc',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  dayTitle: {
    margin: 0,
    color: '#1e1b4b',
    fontSize: '1rem',
  },
  dayCount: {
    color: '#334155',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '0.7rem 0.9rem',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '0.8rem',
    color: '#334155',
    backgroundColor: '#f8fafc',
  },
  td: {
    padding: '0.7rem 0.9rem',
    borderBottom: '1px solid #f1f5f9',
    color: '#0f172a',
    fontSize: '0.88rem',
    verticalAlign: 'top',
  },
};
