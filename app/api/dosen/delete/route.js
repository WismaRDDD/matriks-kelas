import { NextResponse } from 'next/server';
import knex from '@/lib/knex';

export async function POST(req) {
  const { ids } = await req.json();

  await knex('dosen').whereIn('id', ids).del();

  return NextResponse.json({ success: true });
}