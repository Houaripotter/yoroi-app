const H = require('./harness');
const assert = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('ok  ', m); };
const q = (d, sql, p=[]) => d.db.raw.prepare(sql).all(...p);
const one = (d, sql, p=[]) => d.db.raw.prepare(sql).get(...p);
const reset = () => { H.network.devices.length = 0; H.network.queue.length = 0; };
async function pair() { reset(); const A = H.makeDevice('iPhone'); const B = H.makeDevice('iPad'); for (const d of [A,B]) d.db.raw.exec('PRAGMA foreign_keys=OFF'); await A.svc.initPeerSync(); await B.svc.initPeerSync(); return [A, B]; }
const scan = (d) => d.svc.__test__.scanAll(d.db);

const scenarios = {
  // 1. New iPad set up via onboarding: its default profile was detected later than the iPhone's real profile
  async profileOverwrite() {
    const [A, B] = await pair();
    A.db.raw.exec(`INSERT INTO profile (name, height_cm, target_weight, start_weight, start_date) VALUES ('Houari', 180, 80, 95, '2024-01-01')`);
    await scan(A);                           // iPhone: background scan after some edit (T1)
    await H.sleep(20);
    B.db.raw.exec(`INSERT INTO profile (name, height_cm, target_weight, start_weight, start_date) VALUES ('Houari', 175, 70, 72, '2026-09-25')`);
    await scan(B);                           // iPad onboarding done later (T2 > T1)
    await H.connectAll();
    const p = one(A, 'SELECT height_cm, target_weight, start_weight, start_date FROM profile');
    assert(p.start_date === '2024-01-01', `profile: established iPhone profile kept (got ${JSON.stringify(p)})`);
  },

  // 2. Deleting a club (no FK cascade) re-stamps all its trainings as "modified now" -> overwrites a concurrent edit on the other device
  async parentDeleteClobbersChildEdit() {
    const [A, B] = await pair();
    A.db.raw.exec(`INSERT INTO clubs (name, sport) VALUES ('GB', 'jjb')`);
    A.db.raw.exec(`INSERT INTO trainings (sport, date, duration_minutes, club_id) VALUES ('jjb', '2026-09-20', 60, 1)`);
    await H.connectAll();
    await H.sleep(5);
    B.db.raw.exec(`UPDATE trainings SET notes='iPad note' WHERE sport='jjb'`); await scan(B);   // edit at t1
    await H.sleep(5);
    A.db.raw.exec(`DELETE FROM clubs`); await scan(A);                                           // unrelated club delete at t2
    await H.connectAll();
    const nA = one(A, `SELECT notes FROM trainings`).notes, nB = one(B, `SELECT notes FROM trainings`).notes;
    assert(nA === 'iPad note' && nB === 'iPad note', `club delete must not erase concurrent training edit (A=${nA}, B=${nB})`);
  },

  // 3. Same scenario but through an unrelated uid change of a parent (HK adoption) — slot_occurrences re-stamped
  // 4. HealthKit duplicate on one device: adoption steals the row, dedup then deletes the only copy on the other device
  async hkDuplicate() {
    const [A, B] = await pair();
    A.db.raw.exec(`INSERT INTO trainings (sport, date, duration_minutes, healthkit_uuid) VALUES ('running','2026-09-01',30,'HK-9')`);
    A.db.raw.exec(`INSERT INTO trainings (sport, date, duration_minutes, healthkit_uuid, workout_details_json) VALUES ('running','2026-09-01',30,'HK-9','{"gps":1}')`);
    B.db.raw.exec(`INSERT INTO trainings (sport, date, duration_minutes, healthkit_uuid) VALUES ('running','2026-09-01',30,'HK-9')`);
    await H.connectAll();
    console.log('     after sync A', JSON.stringify(q(A, 'SELECT id, sync_uid FROM trainings')), 'B', JSON.stringify(q(B, 'SELECT id, sync_uid FROM trainings')));
    await H.sleep(5);
    // app's deduplicateTrainings(): keep the row with details, delete the other
    A.db.raw.exec(`DELETE FROM trainings WHERE healthkit_uuid='HK-9' AND workout_details_json IS NULL`);
    await H.connectAll(); await H.connectAll();
    const nB = q(B, `SELECT * FROM trainings WHERE healthkit_uuid='HK-9'`).length;
    const nA = q(A, `SELECT * FROM trainings WHERE healthkit_uuid='HK-9'`).length;
    assert(nA === 1 && nB === 1, `HK workout survives dedup on both devices (A=${nA}, B=${nB})`);
  },

  // 5. training_goals UNIQUE(sport_id): goal whose sport_id differs from its uid
  async trainingGoalUnique() {
    const [A, B] = await pair();
    B.db.raw.exec(`INSERT INTO training_goals (sport_id, weekly_target) VALUES ('boxe', 2)`);
    await scan(B);
    B.db.raw.exec(`UPDATE training_goals SET sport_id='jjb' WHERE sport_id='boxe'`);
    A.db.raw.exec(`INSERT INTO training_goals (sport_id, weekly_target) VALUES ('jjb', 5)`);
    await H.connectAll(); await H.connectAll();
    const a = q(A, 'SELECT sport_id, weekly_target FROM training_goals'), b = q(B, 'SELECT sport_id, weekly_target FROM training_goals');
    const warns = [...A.logs, ...B.logs].filter(l => l[0] === 'warn').map(l => l[1].slice(0, 120));
    assert(JSON.stringify(a) === JSON.stringify(b), `training_goals converge (A=${JSON.stringify(a)} B=${JSON.stringify(b)}) warns=${JSON.stringify(warns)}`);
  },

  // 6. slot_occurrences UNIQUE(weekly_plan_id, week_start) + progression_items (current_time column) + achievements
  async slotsAndJournal() {
    const [A, B] = await pair();
    for (const d of [A, B]) d.db.raw.exec(`INSERT INTO weekly_plan (day_of_week, sport, time) VALUES (1, 'jjb', '19:00')`);
    A.db.raw.exec(`INSERT INTO slot_occurrences (weekly_plan_id, week_start, status) VALUES (1, '2026-09-21', 'done')`);
    B.db.raw.exec(`INSERT INTO slot_occurrences (weekly_plan_id, week_start, status) VALUES (1, '2026-09-21', 'cancelled')`);
    A.db.raw.exec(`INSERT INTO progression_items (type, sport, name, current_time, target_time) VALUES ('technique','jjb','armbar', 12, 10)`);
    A.db.raw.exec(`INSERT INTO practice_logs (item_id, date, reps) VALUES (1, '2026-09-20', 10)`);
    B.db.raw.exec(`INSERT INTO achievements (id, unlocked_at) VALUES ('streak_7', '2026-09-10')`);
    A.db.raw.exec(`INSERT INTO achievements (id, unlocked_at) VALUES ('streak_7', '2026-09-12')`);
    await scan(A); await H.sleep(5); await scan(B); await H.sleep(5);
    await H.connectAll(); await H.connectAll();
    const sA = q(A, 'SELECT status FROM slot_occurrences'), sB = q(B, 'SELECT status FROM slot_occurrences');
    assert(sA.length === 1 && sB.length === 1 && sA[0].status === sB[0].status, `slot_occurrences converge (A=${JSON.stringify(sA)} B=${JSON.stringify(sB)})`);
    const pl = one(B, 'SELECT p.name, p.current_time ct FROM practice_logs l JOIN progression_items p ON p.id=l.item_id');
    assert(pl && pl.ct === 12, `journal item + log with current_time column synced (${JSON.stringify(pl)})`);
    const aA = q(A, 'SELECT * FROM achievements'), aB = q(B, 'SELECT * FROM achievements');
    assert(aA.length === 1 && aB.length === 1 && aA[0].unlocked_at === aB[0].unlocked_at, `achievements converge ${JSON.stringify(aA)} ${JSON.stringify(aB)}`);
    const errs = [...A.logs, ...B.logs].filter(l => l[0] !== 'info').map(l => l[1].slice(0, 150));
    if (errs.length) console.log('     logs:', errs);
  },

  // 7. Same-ms conflict: equal timestamps -> each side keeps its own version forever
  async tieDiverges() {
    const [A, B] = await pair();
    A.db.raw.exec(`INSERT INTO weights (weight, date, source, note) VALUES (80, '2026-09-01', 'manual', null)`);
    await H.connectAll();
    A.db.raw.exec(`UPDATE weights SET note='A'`); B.db.raw.exec(`UPDATE weights SET note='B'`);
    const realNow = Date.now; const T = realNow(); Date.now = () => T;   // both scans in the same ms
    await scan(A); await scan(B);
    Date.now = realNow;
    await H.connectAll();
    const a = one(A, 'SELECT note FROM weights').note, b = one(B, 'SELECT note FROM weights').note;
    assert(a === b, `equal-timestamp conflict converges (A=${a}, B=${b})`);
  },

  // 8. Performance: 6000 trainings with 4 KB details, first sync
  async perf() {
    const [A, B] = await pair();
    const big = 'x'.repeat(4000);
    const st = A.db.raw.prepare(`INSERT INTO trainings (sport, date, duration_minutes, workout_details_json, healthkit_uuid) VALUES ('running', ?, ?, ?, ?)`);
    for (let i = 0; i < 6000; i++) st.run(`2025-01-${String(1 + i % 28).padStart(2, '0')}`, i, big, 'HK-' + i);
    let calls = 0; const wrap = (d) => { for (const k of ['getAllAsync', 'getFirstAsync', 'runAsync']) { const f = d.db[k]; d.db[k] = (...a) => { calls++; return f(...a); }; } };
    wrap(A); wrap(B);
    const m0 = process.memoryUsage().heapUsed; const t0 = Date.now(); A.sentMsgs = 0;
    await H.connectAll();
    console.log(`     6000 trainings: ${Date.now() - t0} ms, ${calls} DB calls, ${A.sentMsgs} msgs, heap +${((process.memoryUsage().heapUsed - m0) / 1e6).toFixed(0)} MB, B=${q(B, 'SELECT COUNT(*) n FROM trainings')[0].n}`);
    calls = 0; const t1 = Date.now();
    await H.connectAll();
    console.log(`     idle resync: ${Date.now() - t1} ms, ${calls} DB calls`);
  },
};

(async () => {
  const only = process.argv[2];
  for (const [name, fn] of Object.entries(scenarios)) {
    if (only && name !== only) continue;
    console.log('--', name);
    try { await fn(); } catch (e) { console.log('FAIL (exception)', name, e); process.exitCode = 1; }
  }
})();
