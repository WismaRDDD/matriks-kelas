export async function up(knex) {
  await knex.schema.createTable('ruangan_kelas_filter', (table) => {
    table.increments('id').primary();
    table.integer('ruangan_id').unsigned().notNullable().references('id').inTable('ruangan').onDelete('CASCADE');
    table.integer('kelas_id').unsigned().notNullable().references('id').inTable('kelas').onDelete('CASCADE');
    table.string('jenis_kelas', 20).notNullable();
    table.unique(['ruangan_id', 'kelas_id', 'jenis_kelas']);
    table.index(['ruangan_id', 'jenis_kelas']);
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ruangan_kelas_filter');
}
