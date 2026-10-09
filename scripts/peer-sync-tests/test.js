const H = require('./harness');
const assert = (c, m) => { if (!c) { console.log('❌ FAIL:', m); process.exitCode = 1; } else console.log('✅', m); };
const q = (d, sql, p=[]) => d.db.raw.prepare(sql).all(...p);
const one = (d, sql, p=[]) => d.db.raw.prepare(sql).get(...p);

(async () => {
  const A = H.makeDevice('iPhone'); const B = H.makeDevice('iPad');
  // Données existantes AVANT la synchro (ids qui se chevauchent)
  A.db.raw.exec(`INSERT INTO profile (name, height_cm, target_weight, start_date) VALUES ('Houari', 180, 80, '2026-01-01')`);
  A.db.raw.exec(`INSERT INTO clubs (name, sport) VALUES ('Gracie Barra', 'jjb')`);           // A club id 1
  B.db.raw.exec(`INSERT INTO clubs (name, sport) VALUES ('Boxing Club', 'boxe')`);           // B club id 1
  B.db.raw.exec(`INSERT INTO clubs (name, sport) VALUES ('MMA Factory', 'mma')`);            // B club id 2
  A.db.raw.exec(`INSERT INTO trainings (sport, date, club_id, duration_minutes) VALUES ('jjb', '2026-09-20', 1, 90)`); // A t1 -> GB
  B.db.raw.exec(`INSERT INTO trainings (sport, date, club_id, duration_minutes) VALUES ('boxe', '2026-09-21', 1, 60)`); // B t1 -> Boxing
  // Même pesée des deux côtés (ex : même sauvegarde restaurée)
  for (const d of [A,B]) d.db.raw.exec(`INSERT INTO weights (weight, date, source) VALUES (78.4, '2026-09-01', 'manual')`);
  // Même séance Apple Santé, ids différents
  A.db.raw.exec(`INSERT INTO trainings (sport, date, duration_minutes, healthkit_uuid) VALUES ('running', '2026-09-10', 30, 'HK-1')`);
  B.db.raw.exec(`INSERT INTO trainings (sport, date, duration_minutes, healthkit_uuid, calories) VALUES ('running', '2026-09-10', 30, 'HK-1', 300)`);
  // Blessure + soin (FK)
  A.db.raw.exec(`INSERT INTO injuries (zone_id, zone_view, pain_type, cause, eva_score, date) VALUES ('knee_l','front','sharp','training',6,'2026-09-05')`);
  A.db.raw.exec(`INSERT INTO injury_treatments (injury_id, treatment_type, date) VALUES (1, 'ice', '2026-09-05')`);
  // Badge (clé texte) + objectif (clé unique)
  A.db.raw.exec(`INSERT INTO achievements (id, unlocked_at) VALUES ('first_blood', '2026-09-01')`);
  B.db.raw.exec(`INSERT INTO achievements (id, unlocked_at) VALUES ('first_blood', '2026-09-01')`);
  A.kv.set('@yoroi_sparring_partners', JSON.stringify(['Karim']));

  await A.svc.initPeerSync(); await B.svc.initPeerSync();
  await H.connectAll();

  const tA = q(A, 'SELECT t.sport, t.date, c.name club FROM trainings t LEFT JOIN clubs c ON c.id=t.club_id ORDER BY t.sport');
  const tB = q(B, 'SELECT t.sport, t.date, c.name club FROM trainings t LEFT JOIN clubs c ON c.id=t.club_id ORDER BY t.sport');
  console.log('A trainings', JSON.stringify(tA)); console.log('B trainings', JSON.stringify(tB));
  assert(tA.length === 3 && tB.length === 3, '1. Séances des deux appareils réunies, sans écrasement (3 de chaque côté)');
  assert(JSON.stringify(tA) === JSON.stringify(tB), '1b. Contenu identique des deux côtés');
  assert(tB.find(t => t.sport==='jjb').club === 'Gracie Barra', '2. Clé étrangère traduite : la séance JJB pointe vers Gracie Barra sur l\'iPad (et pas vers Boxing Club)');
  assert(tA.find(t => t.sport==='boxe').club === 'Boxing Club', '2b. Et inversement sur l\'iPhone');
  assert(q(A,'SELECT * FROM clubs').length === 3 && q(B,'SELECT * FROM clubs').length === 3, '3. Clubs : 3 de chaque côté, aucun doublon');
  assert(q(A,'SELECT * FROM weights').length === 1 && q(B,'SELECT * FROM weights').length === 1, '4. Même pesée des deux côtés : pas de doublon');
  assert(q(A,"SELECT * FROM trainings WHERE healthkit_uuid='HK-1'").length === 1 && q(B,"SELECT * FROM trainings WHERE healthkit_uuid='HK-1'").length === 1, '5. Même séance Apple Santé : pas de doublon');
  const inj = one(B, 'SELECT i.zone_id, t.treatment_type FROM injury_treatments t JOIN injuries i ON i.id = t.injury_id');
  assert(inj && inj.zone_id==='knee_l' && inj.treatment_type==='ice', '6. Blessure + soin arrivés sur l\'iPad avec le bon lien');
  assert(q(B,'SELECT * FROM achievements').length === 1, '7. Badge (clé texte) : pas de doublon');
  assert(one(B,'SELECT name FROM profile')?.name === 'Houari', '8. Profil transmis à l\'iPad');
  assert(B.kv.get('@yoroi_sparring_partners') === JSON.stringify(['Karim']), '9. Réglages (partenaires) transmis');

  // Pas d'écho : une 2e synchro sans changement n'envoie aucune ligne
  A.sentBytes = 0; B.sentBytes = 0; A.logs.length = 0; B.logs.length = 0;
  await H.connectAll();
  const sentLines = [...A.logs, ...B.logs].filter(l => l[1].includes('Envoyé à')).map(l => l[1]);
  console.log('  ', sentLines.join(' | '));
  assert(sentLines.every(l => / 0 lignes, 0 suppressions/.test(l)), '10. Synchro suivante sans changement : 0 ligne renvoyée (pas de ping-pong)');

  // Modification sur l'iPhone -> iPad
  await H.sleep(5);
  A.db.raw.exec(`UPDATE trainings SET duration_minutes = 120, notes = 'Grosse séance' WHERE sport = 'jjb'`);
  await H.connectAll();
  assert(one(B, "SELECT duration_minutes d, notes n FROM trainings WHERE sport='jjb'").d === 120, '11. Modification propagée (90 -> 120 min)');

  // Suppression sur l'iPad -> iPhone
  await H.sleep(5);
  B.db.raw.exec(`DELETE FROM trainings WHERE sport = 'boxe'`);
  await H.connectAll();
  assert(q(A, "SELECT * FROM trainings WHERE sport='boxe'").length === 0, '12. Suppression propagée');
  await H.connectAll();
  assert(q(A, "SELECT * FROM trainings WHERE sport='boxe'").length === 0 && q(B, "SELECT * FROM trainings WHERE sport='boxe'").length === 0, '12b. La séance supprimée ne ressuscite pas');

  // Conflit : les deux modifient la même séance, la plus récente gagne
  await H.sleep(5);
  // détection des modifs au moment de la synchro : on simule iPad modifié puis synchro plus tard
  A.db.raw.exec(`UPDATE trainings SET notes = 'version iPhone' WHERE sport = 'jjb'`);
  await A.svc.__test__ && null;
  await H.connectAll();
  await H.sleep(5);
  B.db.raw.exec(`UPDATE trainings SET notes = 'version iPad' WHERE sport = 'jjb'`);
  await H.connectAll();
  assert(one(A,"SELECT notes FROM trainings WHERE sport='jjb'").notes === 'version iPad' && one(B,"SELECT notes FROM trainings WHERE sport='jjb'").notes === 'version iPad', '13. Conflit : la modification la plus récente gagne partout');

  // Réinitialisation / disparition massive : rien n'est supprimé sur l'autre appareil
  for (let i=0;i<25;i++) A.db.raw.exec(`INSERT INTO weights (weight, date, source) VALUES (${70+i/10}, '2026-08-${String(1+i).padStart(2,'0')}', 'manual')`);
  await H.connectAll();
  const wB = q(B,'SELECT * FROM weights').length;
  A.db.raw.exec('DELETE FROM weights');
  await H.connectAll();
  assert(q(B,'SELECT * FROM weights').length === wB && wB === 26, `14. Suppression massive (reset) NON propagée : l'iPad garde ses ${wB} pesées`);

  // Gros volume : 1500 séances avec détails GPS -> plusieurs paquets
  const big = 'x'.repeat(3000);
  const stmt = A.db.raw.prepare(`INSERT INTO trainings (sport, date, duration_minutes, workout_details_json) VALUES ('running', ?, ?, ?)`);
  for (let i=0;i<1500;i++) stmt.run(`2025-${String(1+i%12).padStart(2,'0')}-${String(1+i%28).padStart(2,'0')}`, 20+i, big);
  const t0 = Date.now(); A.sentMsgs = 0;
  await H.connectAll();
  console.log(`   volume: ${A.sentMsgs} messages envoyés par l'iPhone, ${Date.now()-t0} ms`);
  assert(q(B,"SELECT * FROM trainings").length === q(A,"SELECT * FROM trainings").length, `15. 1500 séances transférées en plusieurs paquets (${q(B,'SELECT * FROM trainings').length} des deux côtés)`);

  // Appareil encore en v2 : ses tables sont ignorées
  const before = q(A,'SELECT * FROM trainings').length;
  await A.onData({ peer: 'Vieil iPad', data: JSON.stringify({ type:'SYNC_DATA', v:'2', device:'Vieil iPad', tables:{ trainings:[{ id:1, sport:'ECRASE', date:'2020-01-01', created_at:'2099-01-01' }] }, kv:{}, ts:'2099-01-01 00:00:00' }) });
  await H.settle();
  assert(q(A,'SELECT * FROM trainings').length === before && q(A,"SELECT * FROM trainings WHERE sport='ECRASE'").length===0, '16. Données d\'un appareil en ancienne version ignorées (rien d\'écrasé)');

  // Troisième appareil qui arrive (nouvel iPad) : reçoit tout
  const C = H.makeDevice('iPad 2'); await C.svc.initPeerSync();
  await H.connectAll();
  assert(q(C,'SELECT * FROM trainings').length === q(A,'SELECT * FROM trainings').length && q(C,'SELECT * FROM clubs').length === 3, '17. Nouvel appareil : reçoit toutes les données, sans doublon');
  // un 2e passage ne crée aucun doublon nulle part
  await H.connectAll();
  const counts = [A,B,C].map(d => q(d,'SELECT COUNT(*) n FROM trainings')[0].n);
  assert(new Set(counts).size === 1, `18. Trois appareils alignés (${counts.join(' / ')} séances)`);

  const errs = [...A.logs,...B.logs,...C.logs].filter(l=>l[0]==='error');
  assert(errs.length === 0, `19. Aucune erreur (${errs.length})`);
  if (errs.length) console.log(errs.slice(0,5));
})();
