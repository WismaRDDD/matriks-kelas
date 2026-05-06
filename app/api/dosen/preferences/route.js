import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

// GET: Get preferences for a specific dosen
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const dosenId = searchParams.get('dosenId');

    if (!dosenId) {
      return NextResponse.json(
        { error: 'dosenId diperlukan' },
        { status: 400 }
      );
    }

    const preferences = await knex('dosen_preferences')
      .where({ dosen_id: dosenId });

    if (preferences.length === 0) {
      return NextResponse.json([]);
    }

    return NextResponse.json(preferences);
  } catch (err) {
    console.error('❌ Get preferences error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST: Save preferences for a dosen
export async function POST(req) {
  try {
    const { dosenId, preferences } = await req.json();

    if (!dosenId || !preferences) {
      return NextResponse.json(
        { error: 'dosenId dan preferences diperlukan' },
        { status: 400 }
      );
    }

    // Delete existing preferences
    await knex('dosen_preferences').where({ dosen_id: dosenId }).del();

    // Insert new preferences
    const preferencesData = [];
    for (const [day, sessions] of Object.entries(preferences)) {
      for (const [session, isAvailable] of Object.entries(sessions)) {
        preferencesData.push({
          dosen_id: dosenId,
          hari: day,
          sesi: session,
          is_available: isAvailable,
        });
      }
    }

    if (preferencesData.length > 0) {
      await knex('dosen_preferences').insert(preferencesData);
    }

    return NextResponse.json({
      success: true,
      message: 'Preferensi dosen berhasil disimpan',
    });
  } catch (err) {
    console.error('❌ Save preferences error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
