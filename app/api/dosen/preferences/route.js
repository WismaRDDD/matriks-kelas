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

    // Get dosen's floor preferences
    const dosen = await knex('dosen')
      .where({ id: dosenId })
      .select('prefer_lantai')
      .first();

    if (preferences.length === 0) {
      return NextResponse.json([{ dosen_prefer_lantai: dosen?.prefer_lantai || '1,2,3,4' }]);
    }

    // Add dosen's floor preferences to each preference record
    const preferencesWithFloors = preferences.map(pref => ({
      ...pref,
      dosen_prefer_lantai: dosen?.prefer_lantai || '1,2,3,4'
    }));

    return NextResponse.json(preferencesWithFloors);
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
    const { dosenId, preferences, preferredFloors } = await req.json();

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

    // Save floor preferences to dosen table if provided
    if (preferredFloors) {
      await knex('dosen').where({ id: dosenId }).update({
        prefer_lantai: preferredFloors,
      });
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
