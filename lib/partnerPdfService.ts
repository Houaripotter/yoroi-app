// ============================================
// PARTNER PDF EXPORT · Fiche partenaire a envoyer au coach
// ============================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ARCHETYPE_META, EXPERIENCE_LEVEL_META } from './partnerModel';
import logger from '@/lib/security/logger';

const PARTNERS_KEY = '@yoroi_sparring_partners';

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] || c));
}

function buildPartnerHTML(p: any, stats: {
  wins: number; losses: number; draws: number; total: number; winrate: number | null;
}): string {
  const archMeta = p.archetype ? ARCHETYPE_META[p.archetype as keyof typeof ARCHETYPE_META] : null;
  const lvlMeta = p.experienceLevel ? EXPERIENCE_LEVEL_META[p.experienceLevel as keyof typeof EXPERIENCE_LEVEL_META] : null;

  const strengths = (p.strengths || []).map((s: string) => `<li>${escapeHtml(s)}</li>`).join('') || '<li><em>Aucune renseignee</em></li>';
  const weaknesses = (p.weaknesses || []).map((s: string) => `<li>${escapeHtml(s)}</li>`).join('') || '<li><em>Aucune renseignee</em></li>';
  const whatWorks = (p.whatWorks || []).map((s: string) => `<li>${escapeHtml(s)}</li>`).join('') || '<li><em>Aucune renseignee</em></li>';

  const notes = (p.notes || [])
    .slice(0, 20)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((n: any) => `
      <div class="note">
        <div class="note-date">${new Date(n.date).toLocaleDateString('fr-FR')}</div>
        <div class="note-body">${escapeHtml(n.content)}</div>
      </div>
    `).join('') || '<em>Aucune note.</em>';

  const badges = (p.unlockedBadges || [])
    .map((b: any) => `<span class="badge">${escapeHtml(b.name)}</span>`)
    .join('') || '';

  const physical: string[] = [];
  if (p.weightDeltaKg != null) physical.push(`${p.weightDeltaKg > 0 ? '+' : ''}${p.weightDeltaKg} kg`);
  if (p.heightDeltaCm != null) physical.push(`${p.heightDeltaCm > 0 ? '+' : ''}${p.heightDeltaCm} cm`);
  if (p.belt) physical.push(`Ceinture ${escapeHtml(p.belt)}`);

  const generatedAt = new Date().toLocaleString('fr-FR');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Fiche ${escapeHtml(p.name)}</title>
      <style>
        body { font-family: -apple-system, Helvetica, sans-serif; color: #111; margin: 0; padding: 32px; }
        h1 { font-size: 30px; margin: 0; color: #1a1a2e; letter-spacing: -1px; }
        h2 { font-size: 16px; color: #D4AF37; margin-top: 28px; border-bottom: 2px solid #D4AF37; padding-bottom: 4px; }
        .head { display: flex; align-items: center; gap: 20px; margin-bottom: 8px; }
        .avatar { width: 90px; height: 90px; border-radius: 50%; background: #D4AF3720; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 900; color: #D4AF37; }
        .meta { font-size: 13px; color: #666; }
        .tags { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
        .tag { background: #f0f0f0; color: #333; font-size: 11px; padding: 4px 9px; border-radius: 12px; font-weight: 600; }
        .badge { background: #D4AF3725; color: #8B6914; font-size: 10px; padding: 4px 9px; border-radius: 10px; font-weight: 700; display: inline-block; margin: 2px; }
        .kpis { display: flex; gap: 10px; margin-top: 10px; }
        .kpi { flex: 1; background: #f5f2e8; border-radius: 10px; padding: 12px; text-align: center; }
        .kpi .num { font-size: 24px; font-weight: 900; color: #1a1a2e; }
        .kpi .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-top: 2px; }
        ul { margin: 8px 0; padding-left: 20px; font-size: 13px; line-height: 1.6; }
        .note { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-top: 8px; border-left: 3px solid #D4AF37; }
        .note-date { font-size: 10px; color: #999; font-weight: 600; }
        .note-body { font-size: 12px; margin-top: 4px; line-height: 1.5; }
        .footer { margin-top: 36px; padding-top: 10px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; text-align: center; }
      </style>
    </head>
    <body>
      <div class="head">
        <div class="avatar">${escapeHtml(p.name.slice(0, 1).toUpperCase())}</div>
        <div>
          <h1>${escapeHtml(p.name)}</h1>
          <div class="meta">${physical.join(' · ') || 'Informations physiques non renseignees'}</div>
          <div class="tags">
            ${archMeta ? `<span class="tag" style="background:${archMeta.color}25;color:${archMeta.color}">${escapeHtml(archMeta.label)}</span>` : ''}
            ${lvlMeta ? `<span class="tag" style="background:${lvlMeta.color}25;color:${lvlMeta.color}">${escapeHtml(lvlMeta.label)}</span>` : ''}
            ${p.sport ? `<span class="tag">${escapeHtml(p.sport)}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi"><div class="num">${stats.wins}</div><div class="lbl">Victoires</div></div>
        <div class="kpi"><div class="num">${stats.losses}</div><div class="lbl">Defaites</div></div>
        <div class="kpi"><div class="num">${stats.total}</div><div class="lbl">Rounds</div></div>
        <div class="kpi"><div class="num">${stats.winrate != null ? stats.winrate + '%' : '—'}</div><div class="lbl">Winrate</div></div>
      </div>

      ${badges ? `<h2>Badges</h2><div>${badges}</div>` : ''}

      <h2>Forces</h2>
      <ul>${strengths}</ul>

      <h2>Faiblesses</h2>
      <ul>${weaknesses}</ul>

      <h2>Ce qui marche contre lui</h2>
      <ul>${whatWorks}</ul>

      <h2>Notes tactiques</h2>
      ${notes}

      <div class="footer">Fiche generee par Yoroi · ${generatedAt}</div>
    </body>
    </html>
  `;
}

/**
 * Genere et partage la fiche PDF d'un partenaire.
 */
export async function exportPartnerPDF(
  partnerId: string,
  liveStats?: { wins: number; losses: number; draws: number; total: number },
): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(PARTNERS_KEY);
    if (!raw) return null;
    const list: any[] = JSON.parse(raw);
    const partner = list.find(p => p.id === partnerId);
    if (!partner) return null;

    const wins = liveStats?.wins ?? partner.wins ?? 0;
    const losses = liveStats?.losses ?? partner.losses ?? 0;
    const draws = liveStats?.draws ?? partner.draws ?? 0;
    const total = liveStats?.total ?? partner.matchCount ?? (wins + losses + draws);
    const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : null;

    const html = buildPartnerHTML(partner, { wins, losses, draws, total, winrate });
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const can = await Sharing.isAvailableAsync();
    if (can) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Fiche partenaire ${partner.name}`,
        UTI: 'com.adobe.pdf',
      });
    }
    return uri;
  } catch (e) {
    logger.warn('[PartnerPDF] erreur', e);
    return null;
  }
}
