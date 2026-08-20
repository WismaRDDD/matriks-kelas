import { NextResponse } from 'next/server';
import knex from '@/lib/knex';

export async function GET() {
  const data = await knex('kurikulum_master').orderBy('tahun_kurikulum', 'desc');
  return NextResponse.json(data);
}

export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.template_id || !/^\d{4}$/.test(String(body.tahun_kurikulum))) {
      return NextResponse.json({ error: 'Template dan tahun kurikulum 4 digit wajib diisi' }, { status: 400 });
    }

    const template = await knex('kurikulum_template').where({ id: body.template_id }).first();
    if (!template) {
      return NextResponse.json({ error: 'Template kurikulum tidak ditemukan' }, { status: 404 });
    }

    const tahunKurikulum = Number(body.tahun_kurikulum);
    const kodeKurikulum = `${template.kode_kurikulum} - ${tahunKurikulum}`;
    const namaKurikulum = `${template.nama_kurikulum} - Tahun Kurikulum ${tahunKurikulum}`;

    const result = await knex('kurikulum_master')
      .insert({
        kode_kurikulum: kodeKurikulum,
        nama_kurikulum: namaKurikulum,
        tahun_kurikulum: tahunKurikulum,
      })
      .returning('*');

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('POST kurikulum_master error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID kurikulum diperlukan' }, { status: 400 });
    }

    const deleted = await knex('kurikulum_master').where({ id }).del();

    if (!deleted) {
      return NextResponse.json({ error: 'Kurikulum tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE kurikulum_master error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}