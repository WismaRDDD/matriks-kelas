export async function up(knex) {
  await knex.schema.table('kurikulum_master', (table) => {
    table.integer('f_tahun_akademik').unsigned().references('id').inTable('tahun_akademik').onDelete('SET NULL');
  });
}

export async function down(knex) {
  await knex.schema.table('kurikulum_master', (table) => {
    table.dropColumn('f_tahun_akademik');
  });
}
