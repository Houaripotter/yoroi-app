const H = require('./harness');
const assert = (c, m) => { if (!c) { console.log('FAIL:', m); process.exitCode = 1; } else console.log('ok  ', m); };
const q = (d, sql, p=[]) => d.db.raw.prepare(sql).all(...p);
const reset = () => { H.network.devices.length = 0; H.network.queue.length = 0; };

const scenarios = {
  // User deletes ONE training while a scan is paging with LIMIT/OFFSET -> a second, untouched training is seen as deleted
  async offsetShiftDuringScan() {
    reset();
    const A = H.makeDevice('iPhone'); const B = H.makeDevice('iPad');
    for (const d of [A, B]) d.db.raw.exec('PRAGMA foreign_keys=OFF');
    await A.svc.initPeerSync(); await B.svc.initPeerSync();
    const st = A.db.raw.prepare(`INSERT INTO trainings (sport, date, duration_minutes) VALUES ('jjb', ?, ?)`);
    for (let i = 0; i < 700; i++) st.run('2025-02-01', i);
    await H.connectAll();
    const before = q(B, 'SELECT COUNT(*) n FROM trainings')[0].n;
    // hook: user deletes training duration=3 right after the scan read its first page of trainings
    const orig = A.db.getAllAsync; let fired = false;
    A.db.getAllAsync = async (sql, p) => {
      const r = await orig(sql, p);
      if (!fired && /FROM trainings WHERE rowid > \? ORDER BY rowid LIMIT/.test(sql) && p[0] === -1) { fired = true; A.db.raw.exec('DELETE FROM trainings WHERE duration_minutes = 3'); }
      return r;
    };
    await H.connectAll();
    A.db.getAllAsync = orig;
    const has = (n) => q(B, 'SELECT COUNT(*) n FROM trainings WHERE duration_minutes = ?', [n])[0].n;
    // Suppression faite PENDANT le scan : détectée à la synchro suivante. Aucune autre ligne ne doit être touchée.
    assert(has(300) === 1, `iPad: untouched row #300 kept (${has(300) === 1})`);
    await H.connectAll();
    assert(has(3) === 0 && has(300) === 1, `after next sync: #3 gone (${has(3) === 0}), #300 present (${has(300) === 1})`);
  },

  // 3 devices: settings (KV) edited on C reach A through B
  async kvThreeDevices() {
    reset();
    const A = H.makeDevice('iPhone'); const B = H.makeDevice('iPad'); const C = H.makeDevice('iPad2');
    for (const d of [A, B, C]) await d.svc.initPeerSync();
    await H.connectAll();                            // everyone synced
    C.connected = false;
    await H.sleep(5);
    C.kv.set('@yoroi_belt', 'purple'); await C.svc.markKVKeyChanged('@yoroi_belt');  // edit on C at t0
    C.db.raw.exec(`INSERT INTO weights (weight, date, source) VALUES (77, '2026-09-24', 'manual')`);
    await C.svc.__test__.scanAll(C.db);
    // C's KV change is detected at C's next collect; simulate C syncing with B later, while A-B sync in between
    await H.sleep(20);
    await H.connectAll();                            // A <-> B sync (C offline) : since advances past t0
    await H.sleep(20);
    A.connected = false; C.connected = true;
    await H.connectAll();                            // B <-> C
    A.connected = true; C.connected = false;
    await H.connectAll();                            // A <-> B
    assert(q(A, "SELECT * FROM weights WHERE date='2026-09-24'").length === 1, 'row from C reaches A via B');
    assert(A.kv.get('@yoroi_belt') === 'purple', `setting from C reaches A via B (A=${A.kv.get('@yoroi_belt')}, B=${B.kv.get('@yoroi_belt')})`);
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
