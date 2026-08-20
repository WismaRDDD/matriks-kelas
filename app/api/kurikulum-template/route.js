import { NextResponse } from 'next/server';
import knex from '@/lib/knex';

export async function GET() {
  try {
    const data = await knex('kurikulum_template').orderBy('nama_kurikulum', 'asc');
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET kurikulum-template error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const kodeKurikulum = body.kode_kurikulum?.trim().toUpperCase();
    const namaKurikulum = body.nama_kurikulum?.trim();

    if (!kodeKurikulum || !namaKurikulum) {
      return NextResponse.json({ error: 'Kode dan nama kurikulum wajib diisi' }, { status: 400 });
    }

    const [template] = await knex('kurikulum_template')
      .insert({ kode_kurikulum: kodeKurikulum, nama_kurikulum: namaKurikulum })
      .returning('*');

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const id = body.id;
    const sync = body.sync === true;
    const kodeKurikulum = body.kode_kurikulum?.trim().toUpperCase();
    const namaKurikulum = body.nama_kurikulum?.trim();

    if (!id || !kodeKurikulum || !namaKurikulum) {
      return NextResponse.json({ error: 'ID, kode, dan nama kurikulum wajib diisi' }, { status: 400 });
    }

    const template = await knex('kurikulum_template').where({ id }).first();
    if (!template) {
      return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 });
    }

    const affected = await knex('kurikulum as k')
      .join('kurikulum_master as km', 'km.id', 'k.f_kurikulum')
      .where('km.kode_kurikulum', 'like', `${template.kode_kurikulum} - %`)
      .countDistinct('k.id as count')
      .first();
    const affectedCount = Number(affected?.count || 0);

    if (affectedCount > 0 && !sync) {
      return NextResponse.json(
        { error: 'Template digunakan oleh kurikulum yang sudah dibuat', requiresSync: true, affectedCount },
        { status: 409 }
      );
    }

    const trx = await knex.transaction();
    try {
      const updated = await trx('kurikulum_template')
        .where({ id })
        .update({ kode_kurikulum: kodeKurikulum, nama_kurikulum: namaKurikulum });

      if (sync) {
        await trx('kurikulum_master')
          .where('kode_kurikulum', 'like', `${template.kode_kurikulum} - %`)
          .update({
            kode_kurikulum: trx.raw('REPLACE(??, ?, ?)', ['kode_kurikulum', `${template.kode_kurikulum} - `, `${kodeKurikulum} - `]),
            nama_kurikulum: trx.raw('REPLACE(??, ?, ?)', ['nama_kurikulum', `${template.nama_kurikulum} - `, `${namaKurikulum} - `]),
          });
      }

      await trx.commit();

      if (!updated) {
        return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json({ success: true, synced: sync && affectedCount > 0, affectedCount });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const sync = searchParams.get('sync') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'ID template diperlukan' }, { status: 400 });
    }

    const template = await knex('kurikulum_template').where({ id }).first();
    if (!template) {
      return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 });
    }

    const affected = await knex('kurikulum as k')
      .join('kurikulum_master as km', 'km.id', 'k.f_kurikulum')
      .where('km.kode_kurikulum', 'like', `${template.kode_kurikulum} - %`)
      .countDistinct('k.id as count')
      .first();
    const affectedCount = Number(affected?.count || 0);

    if (affectedCount > 0 && !sync) {
      return NextResponse.json(
        { error: 'Template digunakan oleh kurikulum yang sudah dibuat', requiresSync: true, affectedCount },
        { status: 409 }
      );
    }

    const trx = await knex.transaction();
    try {
      if (sync) {
        const masterIds = await trx('kurikulum_master')
          .where('kode_kurikulum', 'like', `${template.kode_kurikulum} - %`)
          .pluck('id');

        if (masterIds.length > 0) {
          await trx('kurikulum').whereIn('f_kurikulum', masterIds).del();
          await trx('kurikulum_master').whereIn('id', masterIds).del();
        }
      }

      const deleted = await trx('kurikulum_template').where({ id }).del();
      await trx.commit();

      if (!deleted) {
        return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json({ success: true, synced: sync && affectedCount > 0, affectedCount });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}