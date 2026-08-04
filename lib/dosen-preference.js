export const DEFAULT_PREFERENCE_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const DEFAULT_FLOOR_PREFERENCES = { 1: true, 2: true, 3: true, 4: true };

export const DEFAULT_LOCAL_PREFERENCE_PRESET = {
  jamMulai: '07:10',
  durasiSlot: 50,
  jamIstirahatMulaiSeninKamis: '12:10',
  jamIstirahatSelesaiSeninKamis: '13:00',
  jamIstirahatMulaiSabtu: '12:10',
  jamIstirahatSelesaiSabtu: '13:00',
  jamIstirahatMulaiJumat: '11:20',
  jamIstirahatSelesaiJumat: '13:30',
  jamSelesai: '18:00',
};

export function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = String(time).split(':').map(Number);
  return (hours * 60) + minutes;
}

export function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function normalizePreferencePreset({
  databasePreset = null,
  localPreset = null,
  localPresetName = 'Default',
} = {}) {
  if (databasePreset?.jam_mulai) {
    return {
      nama_preset: databasePreset.nama_preset || 'Default',
      jam_mulai: databasePreset.jam_mulai,
      jam_selesai: databasePreset.jam_selesai,
      durasi_slot: databasePreset.durasi_slot,
      jam_istirahat_mulai_senin_kamis: databasePreset.jam_istirahat_mulai_senin_kamis,
      jam_istirahat_selesai_senin_kamis: databasePreset.jam_istirahat_selesai_senin_kamis,
      jam_istirahat_mulai_jumat: databasePreset.jam_istirahat_mulai_jumat,
      jam_istirahat_selesai_jumat: databasePreset.jam_istirahat_selesai_jumat,
      jam_istirahat_mulai_sabtu: databasePreset.jam_istirahat_mulai_sabtu,
      jam_istirahat_selesai_sabtu: databasePreset.jam_istirahat_selesai_sabtu,
    };
  }

  if (!localPreset?.jamMulai || !localPreset?.jamSelesai || !localPreset?.durasiSlot) {
    return null;
  }

  return {
    nama_preset: localPresetName || 'Default',
    jam_mulai: localPreset.jamMulai,
    jam_selesai: localPreset.jamSelesai,
    durasi_slot: localPreset.durasiSlot,
    jam_istirahat_mulai_senin_kamis: localPreset.jamIstirahatMulaiSeninKamis,
    jam_istirahat_selesai_senin_kamis: localPreset.jamIstirahatSelesaiSeninKamis,
    jam_istirahat_mulai_jumat: localPreset.jamIstirahatMulaiJumat,
    jam_istirahat_selesai_jumat: localPreset.jamIstirahatSelesaiJumat,
    jam_istirahat_mulai_sabtu: localPreset.jamIstirahatMulaiSabtu,
    jam_istirahat_selesai_sabtu: localPreset.jamIstirahatSelesaiSabtu,
  };
}

export function getEffectivePreferencePreset({
  databasePresets = [],
  localPreset = null,
  localPresetName = 'Default',
} = {}) {
  const databasePreset = Array.isArray(databasePresets) ? databasePresets[0] : null;

  return normalizePreferencePreset({
    databasePreset,
    localPreset,
    localPresetName,
  });
}

export function generatePreferenceSessions(jamMulai, jamSelesai, durasi, preset, day = 'Senin') {
  const sessions = [];
  if (!jamMulai || !jamSelesai || !durasi) {
    return sessions;
  }

  const durationNumber = typeof durasi === 'string' ? parseInt(durasi, 10) : durasi;
  let current = timeToMinutes(jamMulai);
  const end = timeToMinutes(jamSelesai);

  let breakStart = null;
  let breakEnd = null;

  if (preset) {
    if (day === 'Jumat') {
      breakStart = timeToMinutes(preset.jam_istirahat_mulai_jumat || '11:20');
      breakEnd = timeToMinutes(preset.jam_istirahat_selesai_jumat || '13:30');
    } else if (day === 'Sabtu') {
      breakStart = timeToMinutes(preset.jam_istirahat_mulai_sabtu || '12:10');
      breakEnd = timeToMinutes(preset.jam_istirahat_selesai_sabtu || '13:00');
    } else {
      breakStart = timeToMinutes(preset.jam_istirahat_mulai_senin_kamis || '12:10');
      breakEnd = timeToMinutes(preset.jam_istirahat_selesai_senin_kamis || '13:00');
    }
  }

  while (current < end) {
    const sessionStart = current;
    const sessionEnd = current + durationNumber;

    if (breakStart !== null && breakEnd !== null && sessionEnd > breakStart && sessionStart < breakEnd) {
      current = breakEnd;
      continue;
    }

    sessions.push(`${minutesToTime(sessionStart)}-${minutesToTime(sessionEnd)}`);
    current = sessionEnd;
  }

  return sessions;
}

export function buildDefaultPreferenceGrid(preset, days = DEFAULT_PREFERENCE_DAYS) {
  const preferences = {};

  days.forEach((day, index) => {
    preferences[day] = {};

    if (!preset?.jam_mulai) {
      return;
    }

    const sessions = generatePreferenceSessions(
      preset.jam_mulai,
      preset.jam_selesai,
      preset.durasi_slot,
      preset,
      day,
    );

    sessions.forEach((session) => {
      preferences[day][session] = index !== 5;
    });
  });

  return preferences;
}

export function applyExistingPreferences(defaultPreferences, existingPreferences = []) {
  const nextPreferences = JSON.parse(JSON.stringify(defaultPreferences || {}));

  if (!Array.isArray(existingPreferences)) {
    return nextPreferences;
  }

  existingPreferences.forEach((preference) => {
    if (nextPreferences[preference.hari]) {
      nextPreferences[preference.hari][preference.sesi] = Boolean(preference.is_available);
    }
  });

  return nextPreferences;
}

export function parseFloorPreferences(rawValue, fallback = DEFAULT_FLOOR_PREFERENCES) {
  if (!rawValue) {
    return { ...fallback };
  }

  const floorNumbers = String(rawValue)
    .split(',')
    .map((item) => parseInt(item.trim(), 10))
    .filter((item) => !Number.isNaN(item));

  return {
    1: floorNumbers.includes(1),
    2: floorNumbers.includes(2),
    3: floorNumbers.includes(3),
    4: floorNumbers.includes(4),
  };
}

export function isPreferenceStateDefault({
  preferences,
  floorPreferences,
  preset,
  days = DEFAULT_PREFERENCE_DAYS,
  defaultFloorPreferences = DEFAULT_FLOOR_PREFERENCES,
}) {
  const defaultPreferences = buildDefaultPreferenceGrid(preset, days);

  const hasSameSessions = days.every((day) =>
    Object.keys(defaultPreferences[day] || {}).every(
      (session) => preferences?.[day]?.[session] === defaultPreferences[day][session],
    )
  );

  const hasSameFloors = Object.keys(defaultFloorPreferences).every(
    (floor) => floorPreferences?.[floor] === defaultFloorPreferences[floor],
  );

  return hasSameSessions && hasSameFloors;
}