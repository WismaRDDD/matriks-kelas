'use client';

import { useEffect, useState } from 'react';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getDeviceNow() {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    day: DAY_NAMES[now.getDay()],
    minutes: now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60,
  };
}

function toMinutes(value) {
  const [hour, minute] = String(value || '').split(':').map(Number);
  return hour * 60 + minute;
}

function toTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getSessionState(item, now) {
  if (item.presensi_status === 'approved') return 'approved';
  if (item.presensi_status === 'rejected') return 'rejected';
  const start = toMinutes(item.jam_mulai);
  const end = toMinutes(item.jam_selesai);
  if (now < start) return 'upcoming';
  if (now < end) return item.presensi_status === 'pending' ? 'pending' : 'ongoing';
  return 'missed';
}

export default function PresensiPage({ role }) {
  const [schedules, setSchedules] = useState([]);
  const [date, setDate] = useState('');
  const [day, setDay] = useState('');
  const [now, setNow] = useState(getDeviceNow());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchSchedules = async (deviceNow = getDeviceNow()) => {
    try {
      if (!deviceNow?.date || !deviceNow?.day) deviceNow = getDeviceNow();
      const query = new URLSearchParams({ date: deviceNow.date, day: deviceNow.day });
      const response = await fetch(`/api/presensi?${query}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Gagal memuat presensi');
      setSchedules(Array.isArray(payload.schedules) ? payload.schedules : []);
      setDate(payload.date || '');
      setDay(payload.day || '');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules(getDeviceNow());
    const timer = setInterval(() => {
      const current = getDeviceNow();
      setNow(current);
      setDay((previousDay) => {
        if (previousDay && previousDay !== current.day) fetchSchedules(current);
        return current.day;
      });
      setDate((previousDate) => previousDate === current.date ? previousDate : current.date);
      fetchSchedules(current);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handlePresensi = async (jadwalId) => {
    try {
      const response = await fetch('/api/presensi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jadwal_id: jadwalId, deviceDate: now.date, deviceDay: now.day, deviceMinutes: now.minutes }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Presensi gagal');
      setMessage(role === 'admin' ? 'Presensi admin berhasil dicatat.' : 'Presensi dikirim dan menunggu persetujuan admin.');
      await fetchSchedules();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const reviewPresensi = async (id, status) => {
    try {
      const response = await fetch('/api/presensi', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Gagal memproses presensi');
      await fetchSchedules();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const SLOT_MINUTES = 50;
  const firstSessionMinute = schedules.length > 0
    ? Math.min(...schedules.map((item) => toMinutes(item.jam_mulai)))
    : 0;
  const lastSessionMinute = schedules.length > 0
    ? Math.max(...schedules.map((item) => toMinutes(item.jam_selesai)))
    : 0;
  const timeColumns = [];
  for (let minute = firstSessionMinute; minute < lastSessionMinute; minute += SLOT_MINUTES) {
    timeColumns.push({ start: toTime(minute), end: toTime(Math.min(minute + SLOT_MINUTES, lastSessionMinute)) });
  }

  const roomRows = [...new Map(
    schedules.map((item) => [
      item.ruangan_id,
      item.nama_ruangan || `Ruang ${item.ruangan_id || '-'}`,
    ])
  ).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  const getSessionStartingAt = (roomId, column) => schedules.find((item) => (
    String(item.ruangan_id) === String(roomId) &&
    String(item.jam_mulai).slice(0, 5) === column.start
  ));

  const getSessionSpan = (item) => Math.max(1, Math.ceil((toMinutes(item.jam_selesai) - toMinutes(item.jam_mulai)) / SLOT_MINUTES));

  const renderSession = (item) => {
    const state = getSessionState(item, now.minutes);
    const adminLate = item.presensi_status === 'approved' && !item.presensi_dosen_id && now.minutes >= toMinutes(item.jam_selesai);
    const displayState = adminLate ? 'adminLate' : state;
    const active = state === 'ongoing' || state === 'pending' || (role === 'admin' && state === 'missed');

    return (
      <div style={{ ...styles.session, ...styles[displayState] }}>
        <div style={styles.sessionState}>{adminLate ? 'Diterima (terlambat)' : state === 'approved' ? 'Diterima' : state === 'pending' ? 'Menunggu admin' : state === 'missed' ? 'Tidak presensi' : state === 'rejected' ? 'Ditolak' : state === 'ongoing' ? 'Sedang berlangsung' : 'Belum dimulai'}</div>
        <strong style={styles.course}>{item.nama_mk || item.display_name || 'Mata kuliah'}</strong>
        <div style={styles.meta}>{item.kode_mk || '-'} · Kelas {item.display_name || item.kelas_id}</div>
        {role === 'admin' && item.nama_dosen?.trim() && <div style={styles.meta}>{item.nama_dosen}</div>}
        {item.presensi_status === 'pending' && role === 'admin' && (
          <div style={styles.reviewRow}>
            <button type="button" onClick={() => reviewPresensi(item.presensi_id, 'approved')} style={styles.approve}>Terima</button>
            <button type="button" onClick={() => reviewPresensi(item.presensi_id, 'rejected')} style={styles.reject}>Tolak</button>
          </div>
        )}
        {!item.presensi_status && active && (
          <button type="button" onClick={() => handlePresensi(item.id)} style={styles.presenceButton}>
            Presensi{role === 'admin' && state === 'missed' ? ' *admin' : ''}
          </button>
        )}
        {item.presensi_status === 'approved' && <div style={styles.clicked}>✓ Presensi tercatat{!item.presensi_dosen_id ? ' *admin' : ''}{item.clicked_at ? ` · ${new Date(item.clicked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>}
      </div>
    );
  };

  return (
    <main style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Presensi / {day || DAY_NAMES[new Date().getDay()]}</div>
          <h1 style={styles.title}>Presensi Perkuliahan</h1>
          <p style={styles.subtitle}>Jadwal perangkat: {date || 'memuat...'} · {day || '...' } · Sinkron otomatis</p>
        </div>
        <button type="button" onClick={() => fetchSchedules(getDeviceNow())} style={styles.refresh}>↻ Refresh</button>
      </div>
      {message && <div style={styles.message} role="status">{message}</div>}
      {loading ? <div style={styles.empty}>Memuat jadwal...</div> : schedules.length === 0 ? (
        <div style={styles.empty}>Tidak ada jadwal pada hari ini.</div>
      ) : (
        <div style={styles.matrixWrap}>
          <table style={styles.matrix}>
            <thead>
              <tr>
                <th style={styles.roomHeader}>Ruangan</th>
                {timeColumns.map((column) => (
                  <th key={`${column.start}-${column.end}`} style={styles.timeHeader}>
                    <div>{column.start}</div>
                    <div style={styles.timeDivider}>-</div>
                    <div>{column.end}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomRows.map(([roomId, roomName]) => (
                <tr key={roomId}>
                  <td style={styles.roomCell}>{roomName}</td>
                  {(() => {
                    const cells = [];
                    let columnIndex = 0;
                    while (columnIndex < timeColumns.length) {
                      const column = timeColumns[columnIndex];
                      const item = getSessionStartingAt(roomId, column);
                      const span = item ? Math.min(getSessionSpan(item), timeColumns.length - columnIndex) : 1;
                      cells.push(
                        <td
                          key={`${roomId}-${column.start}`}
                          colSpan={span}
                          style={item ? styles.sessionCell : styles.emptyCell}
                        >
                          {item ? renderSession(item) : <span style={styles.emptyCellText}>-</span>}
                        </td>
                      );
                      columnIndex += span;
                    }
                    return cells;
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: '2rem', background: '#F3F5FA', color: '#1E2A45' },
  header: { maxWidth: '1200px', margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem' },
  eyebrow: { color: '#FF7A00', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  title: { margin: '0.3rem 0', fontSize: '1.8rem' },
  subtitle: { margin: 0, color: '#8A96AD' },
  refresh: { border: '1px solid #DDE3EF', background: '#fff', borderRadius: 6, padding: '0.65rem 0.9rem', cursor: 'pointer' },
  message: { maxWidth: '1200px', margin: '0 auto 1rem', padding: '0.8rem 1rem', background: '#FFF6EC', color: '#995000', borderRadius: 6 },
  empty: { maxWidth: '1200px', margin: '2rem auto', padding: '3rem', textAlign: 'center', background: '#fff', border: '1px solid #EEF1F8', borderRadius: 10, color: '#8A96AD' },
  matrixWrap: { maxWidth: '1400px', margin: '0 auto', overflowX: 'auto', border: '1px solid #DDE3EF', borderRadius: 12, background: '#fff', boxShadow: '0 4px 14px rgba(30,42,69,0.05)' },
  matrix: { width: '100%', minWidth: 760, borderCollapse: 'collapse', tableLayout: 'fixed' },
  roomHeader: { width: 150, padding: '0.9rem', textAlign: 'left', background: '#FAFBFF', color: '#5B6A88', border: '1px solid #EEF1F8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  timeHeader: { minWidth: 180, padding: '0.7rem 0.4rem', textAlign: 'center', background: '#FAFBFF', color: '#5B6A88', border: '1px solid #EEF1F8', fontSize: '0.78rem', fontWeight: 800 },
  timeDivider: { color: '#B7BEC9', fontSize: '0.65rem', lineHeight: 1 },
  roomCell: { width: 150, padding: '1rem 0.9rem', background: '#FFF6EC', color: '#C15A00', border: '1px solid #EEF1F8', fontSize: '0.85rem', fontWeight: 800, verticalAlign: 'middle' },
  sessionCell: { height: 230, padding: '0.5rem', verticalAlign: 'top', border: '1px solid #EEF1F8', background: '#fff' },
  emptyCell: { height: 230, padding: '0.5rem', verticalAlign: 'middle', textAlign: 'center', border: '1px solid #EEF1F8', background: '#FCFDFE' },
  emptyCellText: { color: '#D0D5DD', fontSize: '1.1rem' },
  session: { height: '100%', minHeight: 210, padding: '0.8rem', borderRadius: 9, border: '1px solid #E5E9F2', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.3rem', boxSizing: 'border-box' },
  sessionState: { fontSize: '0.7rem', fontWeight: 800, color: '#667085', textAlign: 'right', minHeight: '1rem' },
  grid: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' },
  card: { padding: '1.2rem', borderRadius: 10, border: '1px solid #E5E9F2', minHeight: 190, boxShadow: '0 4px 14px rgba(30,42,69,0.05)' },
  upcoming: { background: '#fff' }, ongoing: { background: '#FFF4BE', borderColor: '#F5D451' }, pending: { background: '#FFF4BE', borderColor: '#F5D451' }, approved: { background: '#D9F7E8', borderColor: '#72D49A' }, adminLate: { background: '#FFE1BF', borderColor: '#FF9A3C' }, missed: { background: '#FFDCDC', borderColor: '#F19A9A' }, rejected: { background: '#FFDCDC', borderColor: '#F19A9A' },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }, time: { fontWeight: 800 }, state: { fontSize: '0.72rem', fontWeight: 700, color: '#667085', textAlign: 'right' },
  course: { fontSize: '1.1rem', margin: '1rem 0 0.5rem' }, meta: { color: '#667085', fontSize: '0.85rem', marginTop: '0.25rem' },
  presenceButton: { width: '100%', marginTop: '1rem', padding: '0.65rem', border: 0, borderRadius: 6, background: '#FF7A00', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  clicked: { marginTop: '1rem', fontSize: '0.82rem', color: '#087A42', fontWeight: 700 }, reviewRow: { display: 'flex', gap: '0.5rem', marginTop: '1rem' }, approve: { flex: 1, padding: '0.55rem', border: 0, borderRadius: 6, background: '#12B886', color: '#fff', cursor: 'pointer' }, reject: { flex: 1, padding: '0.55rem', border: 0, borderRadius: 6, background: '#D64545', color: '#fff', cursor: 'pointer' },
};