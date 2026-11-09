const test = require('node:test');
const assert = require('node:assert');
const { getPagination, paginate } = require('../../src/utils/pagination');

const reqWith = (query) => ({ query });

test('getPagination uses defaults when no query is supplied', () => {
  assert.deepEqual(getPagination(reqWith({})), { page: 1, limit: 20, offset: 0 });
});

test('getPagination parses page and limit', () => {
  assert.deepEqual(getPagination(reqWith({ page: '3', limit: '50' })), { page: 3, limit: 50, offset: 100 });
});

test('getPagination clamps limit to the maximum and floors page at 1', () => {
  assert.deepEqual(getPagination(reqWith({ page: '0', limit: '500' })), { page: 1, limit: 100, offset: 0 });
  assert.deepEqual(getPagination(reqWith({ page: '-2', limit: '-5' })), { page: 1, limit: 1, offset: 0 });
});

test('paginate returns rows with pagination metadata', async () => {
  const calls = [];
  const fakeDb = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT COUNT')) return { rows: [{ count: '45' }] };
      return { rows: [{ id: 1 }] };
    }
  };

  const result = await paginate(
    fakeDb,
    'SELECT COUNT(*) FROM t',
    'SELECT * FROM t WHERE a = $1 ORDER BY created_at DESC',
    ['a'],
    reqWith({ page: '2', limit: '10' })
  );

  assert.deepEqual(result, { items: [{ id: 1 }], page: 2, limit: 10, total: 45, totalPages: 5 });
  assert.deepEqual(calls[1].params, ['a', 10, 10]);
  assert.match(calls[1].sql, /LIMIT \$2 OFFSET \$3$/);
});

test('paginate reports a single empty page when there are no rows', async () => {
  const fakeDb = {
    query: async (sql) => (sql.startsWith('SELECT COUNT') ? { rows: [{ count: '0' }] } : { rows: [] })
  };

  const result = await paginate(fakeDb, 'SELECT COUNT(*) FROM t', 'SELECT * FROM t', [], reqWith({}));

  assert.deepEqual(result, { items: [], page: 1, limit: 20, total: 0, totalPages: 1 });
});
