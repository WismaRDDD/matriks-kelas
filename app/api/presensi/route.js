import { NextResponse } from 'next/server';
import knex from '@/lib/knex';
import { getSession } from '@/lib/auth/session';

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  return hours * 60 + minutes;
}

async function getAuthorizedSession() {
  const session = await getSession();
  if (!session || !['admin', 'dosen'].includes(session.role)) {
    return null;
  }
  return session;
}

export async function GET(req) {
  const session = await getAuthorizedSession();
  if (!session) return NextResponse.json({ error: 'Silahkan login terlebih dahulu' }, { status: 401 });

  try {
    const params = new URL(req.url).searchParams;
    const date = params.get('date');
    const day = params.get('day');
    if (!date || !day) return NextResponse.json({ error: 'Waktu perangkat diperlukan' }, { status: 400 });
    let query = knex('jadwal')
      .leftJoin('presensi', function joinPresensi() {
        this.on('presensi.jadwal_id', '=', 'jadwal.id').andOnVal('presensi.tanggal', '=', date);
      })
      .leftJoin('kelas', 'kelas.id', 'jadwal.kelas_id')
      .select(
        'jadwal.id', 'jadwal.hari', 'jadwal.jam_mulai', 'jadwal.jam_selesai',
        'jadwal.ruangan_id', 'jadwal.dosen_id', 'jadwal.display_name', 'jadwal.nama_mk',
        'jadwal.kode_mk', 'jadwal.nama_dosen', 'jadwal.nama_ruangan', 'jadwal.semester',
        'jadwal.sks', 'presensi.id as presensi_id', 'presensi.status as presensi_status',
        'presensi.dosen_id as presensi_dosen_id', 'presensi.clicked_at',
        'presensi.reviewed_at', 'presensi.reviewed_by'
      )
      .where('jadwal.hari', day);

    if (session.role === 'dosen') {
      query = query.where(function filterLecturerSchedule() {
        this.where('jadwal.dosen_id', session.dosenId)
          .orWhere('kelas.dosen', session.nidn)
          .orWhere('kelas.dosen', session.nama);
      });
    }

    const schedules = await query.orderBy('jadwal.jam_mulai', 'asc');
    return NextResponse.json({ date, day, schedules });
  } catch (error) {
    console.error('GET presensi error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getAuthorizedSession();
  if (!session) return NextResponse.json({ error: 'Silahkan login terlebih dahulu' }, { status: 401 });

  try {
    const { jadwal_id: jadwalId, deviceDate, deviceDay, deviceMinutes } = await req.json();
    const jadwal = await knex('jadwal')
      .leftJoin('kelas', 'kelas.id', 'jadwal.kelas_id')
      .select('jadwal.*', 'kelas.dosen as kelas_dosen')
      .where('jadwal.id', jadwalId)
      .first();
    if (!jadwal) return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });

    let assignedDosenId = jadwal.dosen_id;
    if (!assignedDosenId && jadwal.kelas_dosen) {
      const assignedDosen = await knex('dosen')
        .where({ f_nidn: jadwal.kelas_dosen })
        .orWhere({ f_namapegawai: jadwal.kelas_dosen })
        .first();
      assignedDosenId = assignedDosen?.id || null;
    }

    if (session.role === 'dosen' && String(assignedDosenId) !== String(session.dosenId)) {
      return NextResponse.json({ error: 'Anda hanya dapat presensi pada jadwal mengajar sendiri' }, { status: 403 });
    }

    const date = deviceDate;
    const day = deviceDay;
    const nowMinutes = Number(deviceMinutes);
    if (!date || !day || !Number.isFinite(nowMinutes)) {
      return NextResponse.json({ error: 'Waktu perangkat diperlukan' }, { status: 400 });
    }
    if (jadwal.hari !== day) return NextResponse.json({ error: 'Presensi hanya dapat dilakukan pada hari jadwal' }, { status: 400 });
    if (session.role !== 'admin' && (nowMinutes < timeToMinutes(jadwal.jam_mulai) || nowMinutes >= timeToMinutes(jadwal.jam_selesai))) {
      return NextResponse.json({ error: 'Presensi hanya dapat dilakukan selama sesi berlangsung' }, { status: 400 });
    }

    const existing = await knex('presensi').where({ jadwal_id: jadwalId, tanggal: date }).first();
    if (existing) return NextResponse.json({ error: 'Presensi untuk sesi ini sudah tercatat' }, { status: 409 });

    const [id] = await knex('presensi').insert({
      jadwal_id: jadwalId,
      tanggal: date,
      dosen_id: session.role === 'dosen' ? session.dosenId : null,
      status: session.role === 'admin' ? 'approved' : 'pending',
      clicked_at: knex.fn.now(),
      reviewed_at: session.role === 'admin' ? knex.fn.now() : null,
      reviewed_by: session.role === 'admin' ? session.username : null,
    }).returning('id');

    return NextResponse.json({ success: true, id: id?.id || id });
  } catch (error) {
    console.error('POST presensi error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const session = await getAuthorizedSession();
  if (!session) return NextResponse.json({ error: 'Silahkan login terlebih dahulu' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Hanya admin yang dapat memproses presensi' }, { status: 403 });

  try {
    const { id, status } = await req.json();
    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'ID dan status presensi tidak valid' }, { status: 400 });
    }
    const updated = await knex('presensi').where({ id }).update({
      status,
      reviewed_at: knex.fn.now(),
      reviewed_by: session.username || 'admin',
      updated_at: knex.fn.now(),
    });
    if (!updated) return NextResponse.json({ error: 'Presensi tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT presensi error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}