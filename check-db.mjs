import pg from 'pg';
const { Pool } = pg;
const p = new Pool({ connectionString: 'postgresql://prospector:prospector_dev@localhost:5433/prospector' });
const r = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
console.log('Tabelas:', r.rows.map(x => x.table_name).join(', ') || '(nenhuma)');
await p.end();
