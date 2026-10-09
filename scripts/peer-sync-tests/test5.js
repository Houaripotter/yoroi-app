const H = require('./harness');
const assert = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('ok  ', m); };
const q = (d, sql, p=[]) => d.db.raw.prepare(sql).all(...p);
(async () => {
  // Existing v2 users: rows copied by v2 (same id, same created_at), then edited on one side before upgrading to v3
  const A = H.makeDevice('iPhone'); const B = H.makeDevice('iPad');
  for (const d of [A, B]) {
    d.db.raw.exec('PRAGMA foreign_keys=OFF');
    d.db.raw.exec(`INSERT INTO trainings (id, sport, date, duration_minutes, created_at) VALUES (1, 'jjb', '2026-08-01', 60, '2026-08-01 19:00:00')`);
    d.db.raw.exec(`INSERT INTO weights (id, weight, date, source, created_at) VALUES (1, 80.2, '2026-08-01', 'manual', '2026-08-01 07:00:00')`);
  }
  A.db.raw.exec(`UPDATE trainings SET notes='great rolls', technique_rating=4 WHERE id=1`);  // edit not propagated by v2
  B.db.raw.exec(`UPDATE weights SET weight=80.4 WHERE id=1`);                                   // typo fixed on iPad
  for (const d of [A,B]) d.kv.set('@yoroi_peer_last_sync', JSON.stringify({ ts: '2026-08-02 10:00:00', device: 'x' }));
  await A.svc.initPeerSync(); await B.svc.initPeerSync();
  await H.connectAll(); await H.connectAll();
  const tA = q(A, 'SELECT COUNT(*) n FROM trainings')[0].n, tB = q(B, 'SELECT COUNT(*) n FROM trainings')[0].n;
  const wA = q(A, 'SELECT COUNT(*) n FROM weights')[0].n, wB = q(B, 'SELECT COUNT(*) n FROM weights')[0].n;
  assert(tA === 1 && tB === 1 && wA === 1 && wB === 1, `first v3 sync after v2: no duplicates (trainings A=${tA} B=${tB}, weights A=${wA} B=${wB})`);
})();
