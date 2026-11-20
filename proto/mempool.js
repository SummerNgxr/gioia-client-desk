/* Prototype only: an in-memory stand-in for Postgres that answers the exact queries the core uses. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.MemPool = factory(); })(this, function () {
  'use strict';
  return function MemPool() {
    let db = { kv: {}, clients: {}, accounts: {}, feed: [], seq: 0 }, snap = null;
    const out = rows => ({ rows: rows.map(r => JSON.parse(JSON.stringify(r))) });
    const vals = t => Object.values(db[t]).map(s => ({ v: JSON.parse(s) }));
    const Q = {
      'begin': () => { snap = JSON.stringify(db); return out([]); },
      'commit': () => { snap = null; return out([]); },
      'rollback': () => { if (snap) db = JSON.parse(snap); snap = null; return out([]); },
      'select pg_advisory_xact_lock(7)': () => out([]),
      'select k, v from kv': () => out(Object.entries(db.kv).map(([k, v]) => ({ k, v: JSON.parse(v) }))),
      'select v from kv where k=$1': ([k]) => out(k in db.kv ? [{ v: JSON.parse(db.kv[k]) }] : []),
      'insert into kv(k,v) values($1,$2) on conflict(k) do update set v=excluded.v': ([k, v]) => { db.kv[k] = v; return out([]); },
      'select v from clients where id=$1': ([id]) => out(id in db.clients ? [{ v: JSON.parse(db.clients[id]) }] : []),
      'select v from clients': () => out(vals('clients')),
      "select v from clients where v->>'aid'=$1": ([a]) => out(vals('clients').filter(r => r.v.aid === a)),
      'insert into clients(id,v) values($1,$2) on conflict(id) do update set v=excluded.v': ([id, v]) => { db.clients[id] = v; return out([]); },
      'delete from clients where id=$1': ([id]) => { delete db.clients[id]; return out([]); },
      'select v from accounts where id=$1': ([id]) => out(id in db.accounts ? [{ v: JSON.parse(db.accounts[id]) }] : []),
      'select v from accounts': () => out(vals('accounts')),
      "select v from accounts where lower(v->>'email')=$1 limit 1": ([e]) => out(vals('accounts').filter(r => String(r.v.email || '').toLowerCase() === e).slice(0, 1)),
      'insert into accounts(id,v) values($1,$2) on conflict(id) do update set v=excluded.v': ([id, v]) => { db.accounts[id] = v; return out([]); },
      'delete from accounts where id=$1': ([id]) => { delete db.accounts[id]; return out([]); },
      'insert into feed(cid,v) values($1,$2)': ([cid, v]) => { db.feed.push({ id: ++db.seq, cid, v: JSON.parse(v) }); return out([]); },
      'delete from feed where cid=$1': ([cid]) => { db.feed = db.feed.filter(r => r.cid !== cid); return out([]); },
      'select v,cid from feed order by id desc limit 400': () => out(db.feed.slice().reverse().slice(0, 400)),
      'select v,cid from feed order by id desc limit 5000': () => out(db.feed.slice().reverse().slice(0, 5000)),
      'select v,cid from feed where cid = any($1) order by id desc limit 400': ([ids]) => out(db.feed.filter(r => ids.includes(r.cid)).reverse().slice(0, 400))
    };
    const query = async (sql, p) => { if (/^create table/.test(sql)) return out([]); const h = Q[sql]; if (!h) throw new Error('Prototype database does not know: ' + sql); return h(p || []); };
    return { query, connect: async () => ({ query, release() {} }), dump: () => JSON.stringify(db), load: s => { db = JSON.parse(s); } };
  };
});
