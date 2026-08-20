export async function up(knex) {
  await knex.schema.createTable('presensi', (table) => {
    table.increments('id').primary();
    table.integer('jadwal_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('jadwal')
      .onDelete('CASCADE');
    table.date('tanggal').notNullable();
    table.integer('dosen_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('dosen')
      .onDelete('SET NULL');
    table.string('status').notNullable().defaultTo('pending');
    table.timestamp('clicked_at').notNullable();
    table.timestamp('reviewed_at').nullable();
    table.string('reviewed_by').nullable();
    table.timestamps(true, true);

    table.unique(['jadwal_id', 'tanggal']);
    table.index(['tanggal', 'status']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('presensi');
}