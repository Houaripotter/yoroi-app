const H = require('./harness');
const assert = (c, m) => { if (!c) { console.log('❌ FAIL:', m); process.exitCode = 1; } else console.log('✅', m); };
const q = (d, sql, p=[]) => d.db.raw.prepare(sql).all(...p);
const one = (d, sql, p=[]) => d.db.raw.prepare(sql).get(...p);
(async () => {
  const A = H.makeDevice('iPhone'); const B = H.makeDevice('iPad');
  A.db.raw.exec(`INSERT INTO profile (name, height_cm, target_weight, start_date, profile_photo) VALUES ('Houari', 180, 80, '2026-01-01', 'file:///var/mobile/photoA.jpg')`);
  B.db.raw.exec(`INSERT INTO profile (name, height_cm, target_weight, start_date, profile_photo) VALUES ('Houari', 180, 80, '2026-01-01', 'file:///var/mobile/photoB.jpg')`);
  A.db.raw.exec(`INSERT INTO injuries (zone_id, zone_view, pain_type, cause, eva_score, date) VALUES ('shoulder','front','dull','combat',4,'2026-09-02')`);
  A.db.raw.exec(`INSERT INTO injury_treatments (injury_id, treatment_type, date) VALUES (1, 'kine', '2026-09-03')`);
  for (let i=0;i<5;i++) A.db.raw.exec(`INSERT INTO trainings (sport, date, duration_minutes) VALUES ('jjb', '2026-09-0${i+1}', 60)`);
  await A.svc.initPeerSync(); await B.svc.initPeerSync();
  await H.connectAll();
  assert(one(B,'SELECT profile_photo p FROM profile').p === 'file:///var/mobile/photoB.jpg' && q(B,'SELECT * FROM profile').length===1, '20. Photo de profil (fichier local) jamais écrasée par celle de l\'autre appareil, un seul profil');

  // Coupure en pleine synchro : seuls les 2 premiers messages passent
  const big='y'.repeat(5000);
  const st=A.db.raw.prepare(`INSERT INTO trainings (sport, date, duration_minutes, workout_details_json) VALUES ('running', ?, ?, ?)`);
  for (let i=0;i<400;i++) st.run('2024-01-'+String(1+i%28).padStart(2,'0'), i, big);
  const origSend = [];
  let dropped = 0;
  const realPush = H.network.queue.push.bind(H.network.queue);
  let passed = 0;
  H.network.queue.push = (m) => { const msg = JSON.parse(m.data); if (msg.type==='SYNC_DATA' && m.peer==='iPhone') { if (passed++ >= 2) { dropped++; return; } } return realPush(m); };
  await H.connectAll();
  H.network.queue.push = realPush;
  const partial = q(B,'SELECT COUNT(*) n FROM trainings')[0].n;
  await H.connectAll();
  const full = q(B,'SELECT COUNT(*) n FROM trainings')[0].n;
  assert(dropped>0 && partial < 405 && full === 405, `21. Coupure pendant la synchro (${dropped} paquets perdus, ${partial} reçues) puis reprise : ${full}/405 séances, aucun doublon`);

  // Suppression d'une blessure et de son soin
  await H.sleep(5);
  A.db.raw.exec(`DELETE FROM injury_treatments`); A.db.raw.exec(`DELETE FROM injuries`);
  await H.connectAll();
  assert(q(B,'SELECT * FROM injuries').length===0 && q(B,'SELECT * FROM injury_treatments').length===0, '22. Blessure et soin supprimés sur l\'iPad aussi');

  // Restauration depuis la corbeille : la séance revient partout
  await H.sleep(5);
  A.db.raw.exec(`DELETE FROM trainings WHERE date='2026-09-01' AND sport='jjb'`);
  await H.connectAll();
  const gone = q(B,"SELECT * FROM trainings WHERE date='2026-09-01' AND sport='jjb'").length;
  await H.sleep(5);
  A.db.raw.exec(`INSERT INTO trainings (sport, date, duration_minutes) VALUES ('jjb', '2026-09-01', 60)`);
  await H.connectAll();
  assert(gone===0 && q(B,"SELECT * FROM trainings WHERE date='2026-09-01' AND sport='jjb'").length===1, '23. Séance supprimée puis restaurée : revient sur l\'iPad (une seule fois)');

  // Modification d'un club : les séances restent liées
  A.db.raw.exec(`INSERT INTO clubs (name, sport) VALUES ('GB Marseille','jjb')`);
  A.db.raw.exec(`UPDATE trainings SET club_id = (SELECT id FROM clubs WHERE name='GB Marseille') WHERE sport='jjb'`);
  await H.connectAll(); await H.sleep(5);
  A.db.raw.exec(`UPDATE clubs SET name='Gracie Barra Marseille' WHERE name='GB Marseille'`);
  await H.connectAll();
  const r = q(B,"SELECT c.name FROM trainings t JOIN clubs c ON c.id=t.club_id WHERE t.sport='jjb'");
  assert(r.length===5 && r.every(x=>x.name==='Gracie Barra Marseille') && q(B,'SELECT * FROM clubs').length===1, '24. Club renommé : les 5 séances restent liées, pas de club en double');

  // Suppression sur un appareil pendant qu'il est déconnecté, modif sur l'autre ensuite : la modif la plus récente gagne
  await H.sleep(5);
  B.db.raw.exec(`DELETE FROM trainings WHERE date='2026-09-02' AND sport='jjb'`);
  // B ne synchronise pas tout de suite ; A modifie plus tard
  await H.sleep(5);
  A.db.raw.exec(`UPDATE trainings SET notes='modifiée après' WHERE date='2026-09-02' AND sport='jjb'`);
  // Les scans ont lieu au moment de la synchro : on force B à détecter sa suppression d'abord
  await B.svc.__test__.scanAll(B.db); await H.sleep(5); await A.svc.__test__.scanAll(A.db);
  await H.connectAll();
  const kept = q(A,"SELECT notes FROM trainings WHERE date='2026-09-02' AND sport='jjb'");
  const keptB = q(B,"SELECT notes FROM trainings WHERE date='2026-09-02' AND sport='jjb'");
  assert(kept.length===1 && keptB.length===1 && keptB[0].notes==='modifiée après', '25. Suppression plus ancienne qu\'une modification : la séance modifiée est conservée partout');

  const errs=[...A.logs,...B.logs].filter(l=>l[0]==='error'); assert(errs.length===0, `26. Aucune erreur (${errs.length})`);
})();
