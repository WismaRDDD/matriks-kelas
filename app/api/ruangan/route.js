import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

export async function GET() {
  const data = await knex('ruangan').select('*');
  return NextResponse.json(data);
}

export async function POST(req) {
  const body = await req.json();
  await knex('ruangan').insert(body);
  return NextResponse.json({ success: true });
}