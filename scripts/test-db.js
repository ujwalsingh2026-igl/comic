const { PGlite } = require('@electric-sql/pglite');

async function main() {
  const db = new PGlite();
  await db.exec('CREATE TABLE test(id text primary key, name text);');
  const res = await db.query('INSERT INTO test(id, name) VALUES ($1, $2) RETURNING *;', ['1', 'Alice']);
  console.log('Query result:', res.rows);
}

main().catch(console.error);
