// ============================================
// PARTNER PDF EXPORT : Fiche partenaire a envoyer au coach
// ============================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ARCHETYPE_META, EXPERIENCE_LEVEL_META } from './partnerModel';
import logger from '@/lib/security/logger';
import { traduire, LOCALE } from '@/lib/i18n/tr';

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

  const strengths = (p.strengths || []).map((s: string) => `<li>${escapeHtml(s)}</li>`).join('') || traduire('<li><em>Aucune renseignee</em></li>');
  const weaknesses = (p.weaknesses || []).map((s: string) => `<li>${escapeHtml(s)}</li>`).join('') || traduire('<li><em>Aucune renseignee</em></li>');
  const whatWorks = (p.whatWorks || []).map((s: string) => `<li>${escapeHtml(s)}</li>`).join('') || traduire('<li><em>Aucune renseignee</em></li>');

  const notes = (p.notes || [])
    .slice(0, 20)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((n: any) => `
      <div class="note">
        <div class="note-date">${new Date(n.date).toLocaleDateString(LOCALE)}</div>
        <div class="note-body">${escapeHtml(n.content)}</div>
      </div>
    `).join('') || traduire('<em>Aucune note.</em>');

  const badges = (p.unlockedBadges || [])
    .map((b: any) => `<span class="badge">${escapeHtml(b.name)}</span>`)
    .join('') || '';

  const physical: string[] = [];
  if (p.weightDeltaKg != null) physical.push(`${p.weightDeltaKg > 0 ? '+' : ''}${p.weightDeltaKg} kg`);
  if (p.heightDeltaCm != null) physical.push(`${p.heightDeltaCm > 0 ? '+' : ''}${p.heightDeltaCm} cm`);
  if (p.belt) physical.push(traduire("Ceinture {0}", escapeHtml(p.belt)));

  const generatedAt = new Date().toLocaleString(LOCALE);

  return traduire("\n    <!DOCTYPE html>\n    <html>\n    <head>\n      <meta charset=\"utf-8\" />\n      <title>Fiche {0}</title>\n      <style>\n        body { font-family: -apple-system, Helvetica, sans-serif; color: #111; margin: 0; padding: 32px; }\n        h1 { font-size: 30px; margin: 0; color: #1a1a2e; letter-spacing: -1px; }\n        h2 { font-size: 16px; color: #D4AF37; margin-top: 28px; border-bottom: 2px solid #D4AF37; padding-bottom: 4px; }\n        .head { display: flex; align-items: center; gap: 20px; margin-bottom: 8px; }\n        .avatar { width: 90px; height: 90px; border-radius: 50%; background: #D4AF3720; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 900; color: #D4AF37; }\n        .meta { font-size: 13px; color: #666; }\n        .tags { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }\n        .tag { background: #f0f0f0; color: #333; font-size: 11px; padding: 4px 9px; border-radius: 12px; font-weight: 600; }\n        .badge { background: #D4AF3725; color: #8B6914; font-size: 10px; padding: 4px 9px; border-radius: 10px; font-weight: 700; display: inline-block; margin: 2px; }\n        .kpis { display: flex; gap: 10px; margin-top: 10px; }\n        .kpi { flex: 1; background: #f5f2e8; border-radius: 10px; padding: 12px; text-align: center; }\n        .kpi .num { font-size: 24px; font-weight: 900; color: #1a1a2e; }\n        .kpi .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-top: 2px; }\n        ul { margin: 8px 0; padding-left: 20px; font-size: 13px; line-height: 1.6; }\n        .note { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-top: 8px; border-left: 3px solid #D4AF37; }\n        .note-date { font-size: 10px; color: #999; font-weight: 600; }\n        .note-body { font-size: 12px; margin-top: 4px; line-height: 1.5; }\n        .footer { margin-top: 36px; padding-top: 10px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; text-align: center; }\n      </style>\n    </head>\n    <body>\n      <div class=\"head\">\n        <div class=\"avatar\">{1}</div>\n        <div>\n          <h1>{2}</h1>\n          <div class=\"meta\">{3}</div>\n          <div class=\"tags\">\n            {4}\n            {5}\n            {6}\n          </div>\n        </div>\n      </div>\n\n      <div class=\"kpis\">\n        <div class=\"kpi\"><div class=\"num\">{7}</div><div class=\"lbl\">Victoires</div></div>\n        <div class=\"kpi\"><div class=\"num\">{8}</div><div class=\"lbl\">Defaites</div></div>\n        <div class=\"kpi\"><div class=\"num\">{9}</div><div class=\"lbl\">Rounds</div></div>\n        <div class=\"kpi\"><div class=\"num\">{10}</div><div class=\"lbl\">Winrate</div></div>\n      </div>\n\n      {11}\n\n      <h2>Forces</h2>\n      <ul>{12}</ul>\n\n      <h2>Faiblesses</h2>\n      <ul>{13}</ul>\n\n      <h2>Ce qui marche contre lui</h2>\n      <ul>{14}</ul>\n\n      <h2>Notes tactiques</h2>\n      {15}\n\n      <div class=\"footer\">Fiche générée par Yoroi le {16}</div>\n    </body>\n    </html>\n  ", escapeHtml(p.name), escapeHtml(p.name.slice(0, 1).toUpperCase()), escapeHtml(p.name), physical.join(', ') || 'Informations physiques non renseignees', archMeta ? `<span class="tag" style="background:${archMeta.color}25;color:${archMeta.color}">${escapeHtml(archMeta.label)}</span>` : '', lvlMeta ? `<span class="tag" style="background:${lvlMeta.color}25;color:${lvlMeta.color}">${escapeHtml(lvlMeta.label)}</span>` : '', p.sport ? `<span class="tag">${escapeHtml(p.sport)}</span>` : '', stats.wins, stats.losses, stats.total, stats.winrate != null ? stats.winrate + '%' : 'Aucun', badges ? `<h2>Badges</h2><div>${badges}</div>` : '', strengths, weaknesses, whatWorks, notes, generatedAt);
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
