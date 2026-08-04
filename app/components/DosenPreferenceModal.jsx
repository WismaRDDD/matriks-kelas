'use client';

import { useEffect, useState } from 'react';
import {
  applyExistingPreferences,
  buildDefaultPreferenceGrid,
  DEFAULT_FLOOR_PREFERENCES,
  DEFAULT_PREFERENCE_DAYS,
  generatePreferenceSessions,
  isPreferenceStateDefault,
  parseFloorPreferences,
} from '@/lib/dosen-preference';

export default function DosenPreferenceModal({
  open,
  dosen,
  preset,
  onClose,
  onSaved,
  onShowMessage,
  emptyStateMessage = 'Belum ada preset jadwal. Silakan buat preset terlebih dahulu.',
}) {
  const [preferences, setPreferences] = useState({});
  const [floorPreferences, setFloorPreferences] = useState({ ...DEFAULT_FLOOR_PREFERENCES });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const presetName = preset?.nama_preset || 'Default';
  const presetStart = preset?.jam_mulai;
  const presetEnd = preset?.jam_selesai;
  const presetDuration = preset?.durasi_slot;
  const presetBreakStartWeekday = preset?.jam_istirahat_mulai_senin_kamis;
  const presetBreakEndWeekday = preset?.jam_istirahat_selesai_senin_kamis;
  const presetBreakStartFriday = preset?.jam_istirahat_mulai_jumat;
  const presetBreakEndFriday = preset?.jam_istirahat_selesai_jumat;
  const presetBreakStartSaturday = preset?.jam_istirahat_mulai_sabtu;
  const presetBreakEndSaturday = preset?.jam_istirahat_selesai_sabtu;

  useEffect(() => {
    if (!open || !dosen?.id) {
      return undefined;
    }

    let isActive = true;
    const resolvedPreset = presetStart
      ? {
        nama_preset: presetName,
        jam_mulai: presetStart,
        jam_selesai: presetEnd,
        durasi_slot: presetDuration,
        jam_istirahat_mulai_senin_kamis: presetBreakStartWeekday,
        jam_istirahat_selesai_senin_kamis: presetBreakEndWeekday,
        jam_istirahat_mulai_jumat: presetBreakStartFriday,
        jam_istirahat_selesai_jumat: presetBreakEndFriday,
        jam_istirahat_mulai_sabtu: presetBreakStartSaturday,
        jam_istirahat_selesai_sabtu: presetBreakEndSaturday,
      }
      : null;

    const loadPreferences = async () => {
      const defaultPreferences = buildDefaultPreferenceGrid(resolvedPreset);

      if (isActive) {
        setPreferences(defaultPreferences);
        setFloorPreferences({ ...DEFAULT_FLOOR_PREFERENCES });
      }

      if (!resolvedPreset?.jam_mulai) {
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`/api/dosen/preferences?dosenId=${dosen.id}`);
        const contentType = res.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await res.json() : null;

        if (!res.ok) {
          throw new Error(payload?.error || `HTTP ${res.status}`);
        }

        const existingPreferences = Array.isArray(payload) ? payload : [];

        if (!isActive) {
          return;
        }

        setPreferences(applyExistingPreferences(defaultPreferences, existingPreferences));
        setFloorPreferences(
          parseFloorPreferences(existingPreferences[0]?.dosen_prefer_lantai, DEFAULT_FLOOR_PREFERENCES),
        );
      } catch (error) {
        console.error('Error loading preferences:', error);
        if (isActive) {
          setFloorPreferences({ ...DEFAULT_FLOOR_PREFERENCES });
          onShowMessage?.('error', `Gagal memuat preferensi dosen: ${error.message}`);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      isActive = false;
    };
  }, [
    dosen?.id,
    onShowMessage,
    open,
    presetBreakEndFriday,
    presetBreakEndSaturday,
    presetBreakEndWeekday,
    presetBreakStartFriday,
    presetBreakStartSaturday,
    presetBreakStartWeekday,
    presetDuration,
    presetEnd,
    presetName,
    presetStart,
  ]);

  if (!open || !dosen) {
    return null;
  }

  const isDefaultState = isPreferenceStateDefault({
    preferences,
    floorPreferences,
    preset,
  });

  const hasPreset = Boolean(preset?.jam_mulai);
  const sessionHeader = hasPreset
    ? generatePreferenceSessions(
      preset.jam_mulai,
      preset.jam_selesai,
      preset.durasi_slot,
      preset,
      'Senin',
    )
    : [];

  const handleResetPreferences = () => {
    setPreferences(buildDefaultPreferenceGrid(preset));
    setFloorPreferences({ ...DEFAULT_FLOOR_PREFERENCES });
    onShowMessage?.('success', 'Preferensi berhasil dikembalikan ke default');
  };

  const handleSelectAllSessionsForDay = (day, sessions) => {
    setPreferences((prev) => {
      const updated = { ...prev, [day]: { ...(prev[day] || {}) } };
      const allSessionsChecked = sessions.length > 0 && sessions.every((session) => updated[day]?.[session]);
      const nextValue = !allSessionsChecked;

      sessions.forEach((session) => {
        updated[day][session] = nextValue;
      });

      return updated;
    });
  };

  const handleSelectAllDaysForSession = (session) => {
    setPreferences((prev) => {
      const updated = { ...prev };
      const allDaysChecked = DEFAULT_PREFERENCE_DAYS.every((day) => updated[day]?.[session]);
      const nextValue = !allDaysChecked;

      DEFAULT_PREFERENCE_DAYS.forEach((day) => {
        updated[day] = { ...(updated[day] || {}) };
        updated[day][session] = nextValue;
      });

      return updated;
    });
  };

  const handleSelectAllPreferences = () => {
    setPreferences((prev) => {
      const updated = { ...prev };
      let totalItems = 0;
      let checkedItems = 0;

      DEFAULT_PREFERENCE_DAYS.forEach((day) => {
        Object.keys(updated[day] || {}).forEach((session) => {
          totalItems += 1;
          if (updated[day][session]) {
            checkedItems += 1;
          }
        });
      });

      const allChecked = totalItems > 0 && checkedItems === totalItems;
      const nextValue = !allChecked;

      DEFAULT_PREFERENCE_DAYS.forEach((day) => {
        updated[day] = { ...(updated[day] || {}) };
        Object.keys(updated[day]).forEach((session) => {
          updated[day][session] = nextValue;
        });
      });

      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const preferredFloors = Object.keys(floorPreferences)
        .filter((floor) => floorPreferences[floor])
        .join(',');

      const res = await fetch('/api/dosen/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dosenId: dosen.id,
          preferences,
          preferredFloors: preferredFloors || '1,2,3,4',
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json() : null;

      if (!res.ok) {
        throw new Error(payload?.error || 'Gagal menyimpan preferensi');
      }

      onShowMessage?.('success', `Preferensi ${dosen.f_namapegawai} berhasil disimpan`);
      onSaved?.({
        dosenId: dosen.id,
        isCustom: !isPreferenceStateDefault({
          preferences,
          floorPreferences,
          preset,
        }),
      });
      onClose?.();
    } catch (error) {
      console.error('Error saving preferences:', error);
      onShowMessage?.('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalBox} onClick={(event) => event.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitleRow}>
            <h2 style={styles.modalTitle}>📅 Preferensi Dosen - {dosen.f_namapegawai}</h2>
            <span style={isDefaultState ? styles.statusBadgeDefault : styles.statusBadgeCustom}>
              {isDefaultState ? 'Default' : 'Custom'}
            </span>
          </div>
          <button style={styles.btnClose} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {loading ? <div style={styles.loading}>⏳ Memuat preferensi...</div> : null}

          {hasPreset ? (
            <>
              <div style={styles.presetInfo}>
                <strong>📋 Preset Aktif:</strong> {preset.nama_preset || 'Default'}
                <span style={styles.presetDetails}>
                  ({preset.jam_mulai} - {preset.jam_selesai}, Durasi: {preset.durasi_slot} menit)
                </span>
              </div>

              <div style={{ ...styles.presetInfo, marginTop: '1rem' }}>
                <strong>🏢 Preferensi Lantai:</strong>
                <div style={styles.floorList}>
                  {[1, 2, 3, 4].map((floor) => (
                    <label key={floor} style={styles.floorOption}>
                      <input
                        type="checkbox"
                        checked={floorPreferences[floor] || false}
                        onChange={(event) => setFloorPreferences({
                          ...floorPreferences,
                          [floor]: event.target.checked,
                        })}
                        style={styles.checkbox}
                      />
                      Lantai {floor}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.preferenceGrid}>
                <table style={styles.preferenceTable}>
                  <thead>
                    <tr>
                      <th style={styles.preferenceHeaderCell}>
                        <input
                          type="checkbox"
                          checked={DEFAULT_PREFERENCE_DAYS.every((day) =>
                            Object.keys(preferences[day] || {}).every((session) => preferences[day][session]),
                          )}
                          onChange={handleSelectAllPreferences}
                          style={styles.checkbox}
                          title="Pilih semua"
                        />
                      </th>
                      <th style={styles.preferenceHeaderCell}>Hari</th>
                      {sessionHeader.map((session) => (
                        <th key={session} style={styles.preferenceHeaderCell}>
                          <div style={styles.sessionHeaderDiv}>
                            <span>{session}</span>
                            <input
                              type="checkbox"
                              checked={DEFAULT_PREFERENCE_DAYS.length > 0 && DEFAULT_PREFERENCE_DAYS.every((day) => preferences[day]?.[session])}
                              onChange={() => handleSelectAllDaysForSession(session)}
                              style={styles.checkboxSmall}
                              title={`Pilih semua hari untuk ${session}`}
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEFAULT_PREFERENCE_DAYS.map((day) => {
                      const sessions = generatePreferenceSessions(
                        preset.jam_mulai,
                        preset.jam_selesai,
                        preset.durasi_slot,
                        preset,
                        day,
                      );
                      const allSessionsChecked = sessions.length > 0 && sessions.every((session) => preferences[day]?.[session]);

                      return (
                        <tr key={day}>
                          <td style={styles.preferenceCell}>
                            <input
                              type="checkbox"
                              checked={allSessionsChecked}
                              onChange={() => handleSelectAllSessionsForDay(day, sessions)}
                              style={styles.checkbox}
                              title={`Pilih semua sesi untuk ${day}`}
                            />
                          </td>
                          <td style={styles.preferenceRowHeader}>{day}</td>
                          {sessionHeader.map((session) => {
                            const isAvailable = sessions.includes(session) && Boolean(preferences[day]?.[session]);
                            const isSessionVisible = sessions.includes(session);

                            return (
                              <td key={`${day}-${session}`} style={styles.preferenceCell}>
                                {isSessionVisible ? (
                                  <input
                                    type="checkbox"
                                    checked={isAvailable}
                                    onChange={(event) => {
                                      setPreferences({
                                        ...preferences,
                                        [day]: {
                                          ...preferences[day],
                                          [session]: event.target.checked,
                                        },
                                      });
                                    }}
                                    style={styles.checkbox}
                                    title={`${day} jam ${session}`}
                                  />
                                ) : (
                                  <span style={styles.notAvailableMark}>-</span>
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

              <div style={styles.presetLegend}>
                <small>✅ = Tersedia | ☐ = Tidak tersedia | Default: Semua hari tersedia kecuali Sabtu</small>
              </div>
            </>
          ) : (
            <div style={styles.emptyState}>
              <p style={{ margin: 0 }}>{emptyStateMessage}</p>
            </div>
          )}

          <div style={styles.modalActions}>
            <button style={styles.btnSecondary} onClick={handleResetPreferences} disabled={!hasPreset || saving}>
              ↺ Reset ke Default
            </button>
            <button style={!hasPreset || saving ? styles.btnPrimaryDisabled : styles.btnPrimary} onClick={handleSave} disabled={!hasPreset || saving}>
              {saving ? '⏳ Menyimpan...' : '💾 Simpan'}
            </button>
            <button style={styles.btnSecondary} onClick={onClose} disabled={saving}>
              ❌ Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(20,24,40,0.5)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1.5rem',
  },
  modalBox: {
    width: 'min(960px, 100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 24px 64px rgba(20,24,40,0.28)',
  },
  modalHeader: {
    padding: '1.25rem 1.75rem',
    borderBottom: '1px solid #EEF1F8',
    backgroundColor: '#FAFBFF',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    position: 'sticky',
    top: 0,
  },
  modalTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  modalTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#1E2A45',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  },
  modalBody: {
    padding: '1.75rem',
  },
  statusBadgeDefault: {
    backgroundColor: '#E4F7F0',
    color: '#0E9B6E',
    borderRadius: '999px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.78rem',
    fontWeight: '700',
    border: '1px solid #C3EEDF',
  },
  statusBadgeCustom: {
    backgroundColor: '#FFEEDD',
    color: '#C15A00',
    borderRadius: '999px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.78rem',
    fontWeight: '700',
    border: '1px solid #FFDBA8',
  },
  btnClose: {
    backgroundColor: '#F3F5FA',
    border: '1px solid #E4E8F1',
    color: '#5B6A88',
    fontSize: '1rem',
    cursor: 'pointer',
    borderRadius: '999px',
    padding: '0.3rem 0.7rem',
    lineHeight: 1,
  },
  presetInfo: {
    backgroundColor: '#FFF6EC',
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    color: '#A85400',
    borderLeft: '4px solid #FF7A00',
    fontWeight: '500',
  },
  presetDetails: {
    display: 'block',
    fontSize: '0.82rem',
    color: '#C15A00',
    marginTop: '0.3rem',
    fontWeight: '400',
  },
  floorList: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.75rem',
    flexWrap: 'wrap',
  },
  floorOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#42506B',
    fontWeight: '500',
  },
  preferenceGrid: {
    overflowX: 'auto',
    marginBottom: '1.5rem',
    borderRadius: '14px',
    border: '1px solid #EEF1F8',
  },
  preferenceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.82rem',
    backgroundColor: 'white',
  },
  preferenceHeaderCell: {
    padding: '0.65rem 0.5rem',
    textAlign: 'center',
    fontWeight: '700',
    background: '#FAFBFF',
    color: '#5B6A88',
    border: '1px solid #EEF1F8',
    fontSize: '0.75rem',
    letterSpacing: '0.03em',
    minWidth: '92px',
  },
  preferenceRowHeader: {
    padding: '0.65rem 1rem',
    fontWeight: '700',
    backgroundColor: '#FFF6EC',
    border: '1px solid #EEF1F8',
    minWidth: '96px',
    color: '#C15A00',
    fontSize: '0.82rem',
  },
  preferenceCell: {
    padding: '0.5rem',
    textAlign: 'center',
    border: '1px solid #F3F5FA',
    minWidth: '92px',
  },
  sessionHeaderDiv: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#FF7A00',
  },
  checkboxSmall: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#FF7A00',
  },
  notAvailableMark: {
    color: '#C7CEDD',
    fontWeight: '700',
  },
  presetLegend: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#FAFBFF',
    borderRadius: '10px',
    color: '#8A96AD',
    textAlign: 'center',
    borderTop: '1px solid #EEF1F8',
    fontSize: '0.82rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: '#FAFBFF',
    borderRadius: '16px',
    color: '#8A96AD',
    border: '2px dashed #E4E8F1',
  },
  loading: {
    textAlign: 'center',
    padding: '0.5rem 0 1rem',
    color: '#FF7A00',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #EEF1F8',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '0.6rem 1.35rem',
    background: 'linear-gradient(135deg, #FF9A3C, #FF7A00)',
    color: 'white',
    border: 'none',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(255,122,0,0.35)',
  },
  btnPrimaryDisabled: {
    padding: '0.6rem 1.35rem',
    backgroundColor: '#F3F5FA',
    color: '#C2CADA',
    border: '1px solid #E4E8F1',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'not-allowed',
  },
  btnSecondary: {
    padding: '0.6rem 1.35rem',
    background: '#F3F5FA',
    color: '#5B6A88',
    border: '1px solid #E4E8F1',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};