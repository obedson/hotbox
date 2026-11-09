const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getPagination(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
  return { page, limit, offset: (page - 1) * limit };
}

// Runs a count query and a page query, returning the rows plus pagination
// metadata. `dataSql` must not contain a LIMIT clause.
async function paginate(db, countSql, dataSql, params, req) {
  const { page, limit, offset } = getPagination(req);
  const countResult = await db.query(countSql, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const dataResult = await db.query(
    `${dataSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    items: dataResult.rows,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}

module.exports = { getPagination, paginate };
