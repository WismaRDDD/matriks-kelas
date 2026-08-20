export async function up(knex) {
  await knex.schema.alterTable('ruangan_kelas_filter', (table) => {
    table.integer('kelas_id').nullable().alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('ruangan_kelas_filter', (table) => {
    table.integer('kelas_id').unsigned().notNullable().alter();
  });
}
