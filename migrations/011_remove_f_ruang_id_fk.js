export function up(knex) {
  // Use raw SQL to safely drop column if exists
  return knex.raw('ALTER TABLE "ruangan" DROP COLUMN IF EXISTS "f_ruang_id_fk"');
}

export function down(knex) {
  return knex.schema.alterTable('ruangan', table => {
    table.integer('f_ruang_id_fk').nullable();
  });
}
