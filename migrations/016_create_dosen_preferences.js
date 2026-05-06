export function up(knex) {
  return knex.schema.createTable('dosen_preferences', (table) => {
    table.increments('id').primary();
    table.integer('dosen_id').unsigned().notNullable();
    table.string('hari', 20).notNullable(); // Senin, Selasa, etc
    table.string('sesi', 50).notNullable(); // HH:MM-HH:MM format
    table.boolean('is_available').defaultTo(true);
    table.timestamps(true, true);

    table
      .foreign('dosen_id')
      .references('id')
      .inTable('dosen')
      .onDelete('CASCADE');

    table.unique(['dosen_id', 'hari', 'sesi']);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('dosen_preferences');
}
