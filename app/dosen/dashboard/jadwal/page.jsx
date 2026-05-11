'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DosenJadwalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jadwalCopy, setJadwalCopy] = useState([]);
  const [dosenNidn, setDosenNidn] = useState(null);
  const [dosenId, setDosenId] = useState(null);
  const [ruanganList, setRuanganList] = useState([]);
  const [error, setError] = useState('');
  const [tahunAkademik, setTahunAkademik] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('Gasal');
  const [preset, setPreset] = useState(null);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  // Helper function to get semester numbers based on label
  const getSemesterNumbers = (semesterLabel) => {
    if (semesterLabel === 'Gasal') return [1, 3, 5, 7, 9];
    if (semesterLabel === 'Genap') return [2, 4, 6, 8, 10];
    return [];
  };

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Generate time slots based on preset
  const generateTimeSlots = () => {
    if (!preset) return [];

    const slots = [];
    const [startHour, startMin] = preset.jam_mulai.split(':').map(Number);
    const [endHour, endMin] = preset.jam_selesai.split(':').map(Number);
    const durationMin = preset.durasi_slot;

    let currentTime = new Date();
    currentTime.setHours(startHour, startMin, 0);

    const endTime = new Date();
    endTime.setHours(endHour, endMin, 0);

    while (currentTime < endTime) {
      const slotStart = new Date(currentTime);
      const slotEnd = new Date(currentTime.getTime() + durationMin * 60000);
      slots.push({
        start: `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`,
        end: `${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`,
        isBreak: false,
      });
      currentTime = new Date(slotEnd);
    }

    return slots;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get session
        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) {
          router.push('/login');
          return;
        }

        const sessionData = await sessionRes.json();
        const { nidn, dosenId: sessionDosenId } = sessionData.session;
        setDosenNidn(nidn);

        // Get dosen info if needed
        let finalDosenId = sessionDosenId;
        if (!finalDosenId && nidn) {
          const dosenRes = await fetch(`/api/dosen?nidn=${nidn}`);
          if (dosenRes.ok) {
            const dosenDataList = await dosenRes.json();
            if (Array.isArray(dosenDataList) && dosenDataList.length > 0) {
              finalDosenId = dosenDataList[0].id;
            }
          }
        }
        setDosenId(finalDosenId);

        // Get default preset
        const presetRes = await fetch('/api/preset?default=true');
        if (presetRes.ok) {
          const presetData = await presetRes.json();
          if (Array.isArray(presetData) && presetData.length > 0) {
            setPreset(presetData[0]);
          } else if (presetData && !Array.isArray(presetData)) {
            setPreset(presetData);
          }
        }

        // Get current tahun akademik
        const tahunRes = await fetch('/api/tahun-akademik');
        if (tahunRes.ok) {
          const tahunData = await tahunRes.json();
          if (Array.isArray(tahunData) && tahunData.length > 0) {
            const latestTahun = tahunData.reduce((latest, current) => 
              new Date(current.created_at) > new Date(latest.created_at) ? current : latest
            );
            setTahunAkademik(latestTahun);
          }
        }

        // Get ruangan list
        const ruanganRes = await fetch('/api/ruangan');
        if (ruanganRes.ok) {
          const ruanganData = await ruanganRes.json();
          setRuanganList(Array.isArray(ruanganData) ? ruanganData : []);
        }

        // Get jadwal_copy for this dosen
        if (finalDosenId) {
          const jadwalCopyRes = await fetch(`/api/jadwal-copy?dosen_id=${finalDosenId}`);
          if (jadwalCopyRes.ok) {
            const jadwalCopyData = await jadwalCopyRes.json();
            setJadwalCopy(Array.isArray(jadwalCopyData) ? jadwalCopyData : []);
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Terjadi kesalahan: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.card}>Memuat jadwal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.container}>
        <div style={{ ...s.card, background: '#fed7d7', color: '#c53030', fontWeight: '500' }}>
          {error}
        </div>
      </div>
    );
  }

  // Group jadwal_copy by day and ruangan
  const jadwalByDayAndRuangan = {};
  const semesterNumbers = getSemesterNumbers(selectedSemester);
  const filteredJadwalCopy = jadwalCopy.filter(j => semesterNumbers.includes(Number(j.semester || 0)));

  days.forEach(day => {
    jadwalByDayAndRuangan[day] = {};
    ruanganList.forEach(ruangan => {
      jadwalByDayAndRuangan[day][ruangan.id] = filteredJadwalCopy.filter(
        j => j.hari === day && j.ruangan_id === ruangan.id
      );
    });
  });

  const timeSlots = generateTimeSlots();

  // Calculate total sessions
  const totalSessions = Object.values(jadwalByDayAndRuangan).reduce((sum, dayData) => {
    return sum + Object.values(dayData).reduce((daySum, sessions) => daySum + sessions.length, 0);
  }, 0);

  // Function to handle Daring/Luring button click
  const handleLearningTypeClick = async (jadwalCopyItem, type) => {
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      await fetch('/api/jadwal-copy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jadwal_id: jadwalCopyItem.jadwal_id,
          learning_type: type,
          learning_time: new Date(),
        }),
      });

      // Update local state
      setJadwalCopy(prev => 
        prev.map(j => 
          j.jadwal_id === jadwalCopyItem.jadwal_id 
            ? { ...j, learning_type: type, learning_time: new Date() }
            : j
        )
      );
    } catch (err) {
      console.error('Error updating learning type:', err);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h2 style={s.title}>📅 Jadwal Kuliah</h2>

        {/* Info Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.75rem', color: '#4a5568', textTransform: 'uppercase', marginBottom: '0.4rem' }}>📅 Tahun Akademik</label>
            <div style={{ padding: '0.65rem 0.9rem', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '0.9rem', color: '#37474f', fontWeight: '500' }}>
              {tahunAkademik ? `${tahunAkademik.tahun_awal}/${tahunAkademik.tahun_akhir}` : '-'}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.75rem', color: '#4a5568', textTransform: 'uppercase', marginBottom: '0.4rem' }}>📚 Pilih Semester</label>
            <select 
              value={selectedSemester} 
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1.5px solid #667eea', fontSize: '0.875rem', color: '#37474f', boxSizing: 'border-box', outline: 'none', backgroundColor: 'white', cursor: 'pointer' }}>
              <option value="Gasal">Gasal (1,3,5,7,9)</option>
              <option value="Genap">Genap (2,4,6,8,10)</option>
            </select>
          </div>
        </div>

        {/* Table Section */}
        <div style={s.tableWrapper}>
          {days.map((day) => {
            const dayData = jadwalByDayAndRuangan[day] || {};
            const totalSesiHari = Object.values(dayData).flat().length;

            if (totalSesiHari === 0) return null;

            return (
              <div key={day} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#4a148c', margin: 0 }}>{day}</h3>
                  <span style={{ padding: '0.3rem 0.8rem', background: '#f3e5f5', color: '#4a148c', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>{totalSesiHari} sesi</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,#7b1fa2 0%,#4527a0 100%)' }}>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: '0.78rem', width: '120px', border: '1px solid rgba(255,255,255,0.15)' }}>Ruangan</th>
                        {timeSlots.map((slot, idx) => (
                          <th key={idx} style={{ padding: '0.5rem 0.25rem', textAlign: 'center', color: 'white', fontWeight: 600, fontSize: '0.68rem', width: '80px', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <div>{slot.start}</div><div style={{ fontSize: '0.6rem', opacity: 0.7 }}>–</div><div>{slot.end}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || '')).map((ruangan) => {
                        const ruanganSessions = Object.values(dayData[ruangan.id] || []);
                        if (ruanganSessions.length === 0) return null;

                        return (
                          <tr key={ruangan.id} style={{ borderBottom: '1px solid #f0f2ff' }}>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, fontSize: '0.8rem', color: '#37474f', backgroundColor: '#fafbff', border: '1px solid #f0f2ff', verticalAlign: 'middle' }}>
                              {ruangan.f_namaruang}
                            </td>
                            {timeSlots.map((slot, idx) => {
                              const sessionInSlot = (dayData[ruangan.id] || []).find(s => s.jam_mulai === slot.start && s.jam_selesai === slot.end);
                              const isDosenSession = sessionInSlot && sessionInSlot.dosen_id === dosenId;
                              const sks = sessionInSlot?.sks || 1;

                              return (
                                <td key={idx} style={{ padding: '0.6rem 0.5rem', border: '1px solid #f0f2ff', minHeight: '80px', verticalAlign: 'top', backgroundColor: isDosenSession ? '#fff9c4' : (sessionInSlot ? '#e8eaf6' : '#fafbff') }}>
                                  {sessionInSlot && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                      <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.3, padding: '0.4rem', background: '#c8e6c9', borderRadius: '3px' }}>
                                        {sessionInSlot.nama_mk || sessionInSlot.display_name || 'Matakuliah'}
                                      </div>
                                      <div style={{ fontSize: '0.65rem', color: '#555', lineHeight: 1.2 }}>
                                        <div>📚 {sessionInSlot.f_nama_kelas || sessionInSlot.nama_kelas || '-'}</div>
                                        {sessionInSlot.nama_dosen && <div>👨‍🏫 {sessionInSlot.nama_dosen}</div>}
                                      </div>

                                      {/* Daring/Luring buttons untuk sesi dosen sendiri */}
                                      {isDosenSession && (
                                        <div style={{ marginTop: '0.3rem' }}>
                                          {!sessionInSlot.learning_type ? (
                                            <div style={{ display: 'flex', gap: '0.2rem', fontSize: '0.6rem' }}>
                                              <button
                                                onClick={() => handleLearningTypeClick(sessionInSlot, 'daring')}
                                                style={{ flex: 1, padding: '0.25rem 0.3rem', background: '#2196F3', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: 600 }}
                                              >
                                                Daring
                                              </button>
                                              <button
                                                onClick={() => handleLearningTypeClick(sessionInSlot, 'luring')}
                                                style={{ flex: 1, padding: '0.25rem 0.3rem', background: '#FF6F00', color: 'white', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: 600 }}
                                              >
                                                Luring
                                              </button>
                                            </div>
                                          ) : (
                                            <div style={{ padding: '0.25rem 0.3rem', background: sessionInSlot.learning_type === 'daring' ? '#2196F3' : '#FF6F00', color: 'white', borderRadius: '2px', fontSize: '0.65rem', fontWeight: 700, textAlign: 'center' }}>
                                              {(() => {
                                                const time = new Date(sessionInSlot.learning_time);
                                                const hours = String(time.getHours()).padStart(2, '0');
                                                const mins = String(time.getMinutes()).padStart(2, '0');
                                                return `${hours}:${mins} ${sessionInSlot.learning_type === 'daring' ? '🌐' : '🏫'}`;
                                              })()}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {totalSessions === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666', background: '#f5f5f5', borderRadius: '8px', marginTop: '2rem' }}>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📭 Belum ada jadwal</div>
            <div style={{ fontSize: '0.9rem' }}>Tidak ada jadwal yang dijadwalkan untuk semester {selectedSemester}. Admin harus membuat copy jadwal terlebih dahulu.</div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: {
    padding: '2rem',
    minHeight: '100vh',
    background: '#f9fafb',
  },
  card: {
    background: 'white',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  title: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#2d3748',
    borderBottom: '2px solid #667eea',
    paddingBottom: '1rem',
  },
  tableWrapper: {
    marginTop: '1.5rem',
  },
};
