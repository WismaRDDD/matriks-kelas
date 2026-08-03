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
  const totalHariAktif = DAYS.filter((day) => (groupedByDay[day] || []).length > 0).length;
  const totalMataKuliah = useMemo(() => {
    const set = new Set();
    filteredJadwal.forEach((item) => {
      const kelasMeta = kelasMap[item.kelas_id] || {};
      const mataKuliah = item.nama_matakuliah || item.nama_mk || item.display_name || kelasMeta.f_namamk || kelasMeta.nama_kelas;
      if (mataKuliah) set.add(mataKuliah);
    });
    return set.size;
  }, [filteredJadwal, kelasMap]);
  const totalRuangan = useMemo(() => {
    const set = new Set();
    filteredJadwal.forEach((item) => {
      const namaRuangan = item.nama_ruangan_db || item.nama_ruangan;
      if (namaRuangan) set.add(namaRuangan);
    });
    return set.size;
  }, [filteredJadwal]);

  // Add hover styles + font import on client side only (matches Edumy theme)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Jost:wght@400;500;600&display=swap');

      * { font-family: 'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; }

      select:hover {
        border-color: #FF7A00 !important;
      }

      select:focus {
        outline: none;
        border-color: #FF7A00 !important;
        box-shadow: 0 0 0 3px rgba(255,122,0,0.14) !important;
      }

      tr.edumy-row:hover {
        background-color: #FFF6EC !important;
      }

      ::-webkit-scrollbar { height: 8px; width: 8px; }
      ::-webkit-scrollbar-thumb { background: #E4E8F1; border-radius: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.pageWrap}>
          <div style={styles.card}>
            <div style={styles.loading}>⏳ Memuat jadwal...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.pageWrap}>
          <div style={styles.card}>
            <div style={styles.errorBox}>❌ {error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.pageWrap}>

        {/* Edumy-style breadcrumb / page header */}
        <div style={styles.pageHeader}>
          <div>
            <div style={styles.breadcrumb}>Dashboard <span style={styles.breadcrumbSep}>/</span> Jadwal Saya <span style={styles.breadcrumbSep}>/</span> <span style={styles.breadcrumbActive}>Jadwal Dosen</span></div>
            <h1 style={styles.title}>Jadwal Dosen</h1>
            <p style={styles.subtitle}>Jadwal mengajar Anda yang telah disusun oleh admin (read-only).</p>
          </div>
          <div style={styles.headerIconWrap}>
            <span style={styles.headerIcon}>🗓️</span>
          </div>
        </div>

        {/* Stat widgets */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#FFEEDD', color: '#FF7A00' }}>📅</div>
            <div>
              <div style={styles.statNumber}>{totalSesi}</div>
              <div style={styles.statLabel}>Total Sesi</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E7EEFF', color: '#3E5EF0' }}>📖</div>
            <div>
              <div style={styles.statNumber}>{totalMataKuliah}</div>
              <div style={styles.statLabel}>Mata Kuliah</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E4F7F0', color: '#12B886' }}>🏫</div>
            <div>
              <div style={styles.statNumber}>{totalRuangan}</div>
              <div style={styles.statLabel}>Ruangan Digunakan</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#FDE8F1', color: '#E0448A' }}>📌</div>
            <div>
              <div style={styles.statNumber}>{totalHariAktif}</div>
              <div style={styles.statLabel}>Hari Aktif Mengajar</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {dosen && (
            <div style={styles.infoBox}>
              <div style={styles.infoBoxLeft}>
                <span style={styles.infoAvatar}>🧑‍🏫</span>
                <div>
                  <strong style={styles.infoName}>{dosen.f_namapegawai}</strong>
                  <div style={styles.infoMeta}>NIDN: <span style={styles.badgeCode}>{dosen.f_nidn}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Filter toolbar */}
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

          {/* Schedule Section */}
          <div style={styles.tableWrapper}>
            <div style={styles.tableHeader}>
              <h2 style={styles.tableTitle}>📋 Jadwal Mengajar</h2>
              <span style={styles.badgeCount}>Total: {totalSesi} sesi</span>
            </div>

            {totalSesi === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Belum ada jadwal untuk filter yang dipilih</p>
                <small style={{ color: '#8A96AD' }}>Coba ubah tahun akademik atau semester</small>
              </div>
            ) : (
              DAYS.map((day) => {
                const sessions = groupedByDay[day] || [];
                if (sessions.length === 0) {
                  return null;
                }

                return (
                  <div key={day} style={styles.daySection}>
                    <div style={styles.dayHeader}>
                      <h3 style={styles.dayTitle}>{day}</h3>
                      <span style={styles.dayCount}>{sessions.length} sesi</span>
                    </div>

                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.tableHeaderRow}>
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
                              <tr key={item.id} className="edumy-row" style={styles.tableRow}>
                                <td style={styles.td}>
                                  <span style={styles.badgeDate}>{item.jam_mulai} - {item.jam_selesai}</span>
                                </td>
                                <td style={styles.td}>
                                  <strong style={{ color: '#2B3654' }}>{mataKuliah}</strong>
                                </td>
                                <td style={styles.td}>
                                  <span style={styles.badgeProdi}>{namaRuangan}</span>
                                </td>
                                <td style={styles.td}>{namaKelas}</td>
                                <td style={styles.td}>
                                  <span style={styles.badgeCode}>{item.semester || kelasMeta.f_semester || '-'}</span>
                                </td>
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
      </div>
    </div>
  );
}


// ── Edumy-inspired design tokens (matches DosenPage) ──────────
// Primary: #FF7A00 (Edumy signature orange)
// Ink/navy: #1E2A45 · Muted text: #8A96AD · Background: #F3F5FA
// Accents: indigo #3E5EF0, pink #E0448A, teal #12B886

const styles = {

  // ── Page shell ────────────────────────────────────────────
  container: {
    minHeight: '100vh',
    background: '#F3F5FA',
    padding: '2rem',
    fontFamily: "'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  pageWrap: {
    maxWidth: '1400px',
    margin: '0 auto',
  },

  // ── Header / breadcrumb ─────────────────────────────────────
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  breadcrumb: {
    fontSize: '0.8rem',
    color: '#9AA5BC',
    fontWeight: '500',
    marginBottom: '0.5rem',
  },
  breadcrumbSep: {
    color: '#C7CEDD',
    margin: '0 0.25rem',
  },
  breadcrumbActive: {
    color: '#FF7A00',
    fontWeight: '600',
  },
  title: {
    fontSize: '1.9rem',
    fontWeight: '700',
    color: '#1E2A45',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#8A96AD',
    margin: '0.35rem 0 0 0',
  },
  headerIconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #FF9A3C, #FF7A00)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(255,122,0,0.28)',
  },
  headerIcon: {
    fontSize: '1.6rem',
  },

  // ── Stat widgets ────────────────────────────────────────────
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.1rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.15rem 1.25rem',
    boxShadow: '0 4px 18px rgba(30,42,69,0.06)',
    border: '1px solid #EEF1F8',
  },
  statIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  statNumber: {
    fontSize: '1.45rem',
    fontWeight: '700',
    color: '#1E2A45',
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#8A96AD',
    fontWeight: '500',
    marginTop: '0.15rem',
  },

  // ── Main card ────────────────────────────────────────────
  card: {
    backgroundColor: 'white',
    borderRadius: '18px',
    boxShadow: '0 4px 22px rgba(30,42,69,0.06)',
    border: '1px solid #EEF1F8',
    padding: '1.75rem',
  },

  // ── Info box (dosen identity) ───────────────────────────────
  infoBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#FFF6EC',
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    marginBottom: '1.5rem',
    border: '1px solid #FFE1BF',
    flexWrap: 'wrap',
  },
  infoBoxLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
  },
  infoAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    border: '1px solid #FFE1BF',
    flexShrink: 0,
  },
  infoName: {
    color: '#1E2A45',
    fontSize: '1rem',
    fontFamily: "'Poppins', sans-serif",
  },
  infoMeta: {
    color: '#A85400',
    fontWeight: '500',
    fontSize: '0.85rem',
    marginTop: '0.25rem',
  },

  // ── Filter toolbar ──────────────────────────────────────────
  filterRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '1.75rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #EEF1F8',
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontWeight: '600',
    color: '#5B6A88',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  select: {
    padding: '0.7rem 0.9rem',
    borderRadius: '10px',
    border: '1.5px solid #E4E8F1',
    fontSize: '0.9rem',
    color: '#1E2A45',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    backgroundColor: 'white',
  },

  // ── Table section ──────────────────────────────────────────
  tableWrapper: {
    marginTop: '0.25rem',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.1rem',
    padding: '0 0.1rem',
  },
  tableTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#1E2A45',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  },
  badgeCount: {
    backgroundColor: '#FFEEDD',
    color: '#C15A00',
    padding: '0.3rem 0.9rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: '700',
    letterSpacing: '0.02em',
  },

  // ── Day section ──────────────────────────────────────────────
  daySection: {
    marginBottom: '1.5rem',
    borderRadius: '14px',
    border: '1px solid #EEF1F8',
    overflow: 'hidden',
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#FAFBFF',
    padding: '0.85rem 1.1rem',
    borderBottom: '1px solid #EEF1F8',
  },
  dayTitle: {
    margin: 0,
    color: '#C15A00',
    fontSize: '0.95rem',
    fontWeight: '700',
    fontFamily: "'Poppins', sans-serif",
  },
  dayCount: {
    color: '#8A96AD',
    fontSize: '0.78rem',
    fontWeight: '700',
    backgroundColor: '#FFEEDD',
    padding: '0.25rem 0.7rem',
    borderRadius: '999px',
  },

  // ── Empty / loading / error states ─────────────────────────
  emptyState: {
    textAlign: 'center',
    padding: '3.5rem 2rem',
    backgroundColor: '#FAFBFF',
    borderRadius: '16px',
    color: '#9AA5BC',
    border: '2px dashed #E4E8F1',
  },
  emptyIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#FF7A00',
    fontSize: '1rem',
    fontWeight: '600',
  },
  errorBox: {
    padding: '1.25rem',
    borderRadius: '14px',
    backgroundColor: '#FDF1F2',
    borderLeft: '4px solid #E5484D',
    color: '#B91C1C',
    fontWeight: '500',
  },

  // ── Table ──────────────────────────────────────────────────
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  tableHeaderRow: {
    backgroundColor: '#FAFBFF',
  },
  th: {
    padding: '0.85rem 1rem',
    textAlign: 'left',
    fontWeight: '700',
    color: '#8A96AD',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #EEF1F8',
  },
  td: {
    padding: '0.85rem 1rem',
    color: '#42506B',
    fontSize: '0.875rem',
    verticalAlign: 'middle',
  },
  tableRow: {
    borderBottom: '1px solid #F3F5FA',
    transition: 'background-color 0.15s',
  },

  // ── Data badges (pill style) ────────────────────────────────
  badgeCode: {
    backgroundColor: '#EDEBFF',
    color: '#5B4FE0',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'inline-block',
    fontFamily: 'monospace',
    letterSpacing: '0.03em',
  },
  badgeDate: {
    backgroundColor: '#F3F5FA',
    color: '#5B6A88',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
  badgeProdi: {
    backgroundColor: '#E4F7F0',
    color: '#0E9B6E',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '500',
    display: 'inline-block',
  },
};