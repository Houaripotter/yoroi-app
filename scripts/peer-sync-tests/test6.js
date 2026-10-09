const H = require('./harness');
const assert = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('ok  ', m); };
const one = (d, sql, p=[]) => d.db.raw.prepare(sql).get(...p);
(async () => {
  const A = H.makeDevice('iPhone'); const B = H.makeDevice('iPad');
  for (const d of [A, B]) d.db.raw.exec('PRAGMA foreign_keys=OFF');
  await A.svc.initPeerSync(); await B.svc.initPeerSync();
  A.db.raw.exec(`INSERT INTO weekly_plan (day_of_week, sport, time) VALUES (1, 'jjb', '19:00')`);
  await H.connectAll();                                     // plan exists on both
  B.connected = false;
  // Monday: iPhone generates this week's occurrences and validates the JJB slot
  A.db.raw.exec(`INSERT OR IGNORE INTO slot_occurrences (weekly_plan_id, week_start, status) VALUES (1, '2026-09-21', 'pending')`);
  A.db.raw.exec(`INSERT INTO trainings (sport, date, duration_minutes) VALUES ('jjb', '2026-09-21', 90)`);
  A.db.raw.exec(`UPDATE slot_occurrences SET status='done', training_id=1`);
  await A.svc.__test__.scanAll(A.db);                        // detected 15 s later (YOROI_DATA_CHANGED)
  await H.sleep(20);
  // Tuesday: iPad opened for the first time this week -> generates 'pending' occurrences, scanned
  B.db.raw.exec(`INSERT OR IGNORE INTO slot_occurrences (weekly_plan_id, week_start, status) VALUES (1, '2026-09-21', 'pending')`);
  await B.svc.__test__.scanAll(B.db);
  B.connected = true;
  await H.connectAll();
  const a = one(A, 'SELECT status FROM slot_occurrences').status, b = one(B, 'SELECT status FROM slot_occurrences').status;
  assert(a === 'done' && b === 'done', `validated slot stays 'done' (iPhone=${a}, iPad=${b})`);
})();
