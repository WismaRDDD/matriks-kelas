// 019_add_learning_fields_to_jadwal.js
export async function up(knex) {
  const hasTable = await knex.schema.hasTable('jadwal');
  if (hasTable) {
    const hasLearningType = await knex.schema.hasColumn('jadwal', 'learning_type');
    const hasLearningTime = await knex.schema.hasColumn('jadwal', 'learning_time');

    if (!hasLearningType || !hasLearningTime) {
      await knex.schema.table('jadwal', (table) => {
        if (!hasLearningType) {
          table.string('learning_type').nullable().comment('Tipe pembelajaran: daring atau luring');
        }
        if (!hasLearningTime) {
          table.dateTime('learning_time').nullable().comment('Waktu dosen memilih tipe pembelajaran');
        }
      });
    }
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('jadwal');
  if (hasTable) {
    await knex.schema.table('jadwal', (table) => {
      table.dropColumn('learning_type');
      table.dropColumn('learning_time');
    });
  }
}
