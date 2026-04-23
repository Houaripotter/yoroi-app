// ============================================
// PDF REPORT · Bilan mensuel / annuel exportable
// ============================================
// Utilise expo-print + expo-sharing pour generer un PDF propre.
// ============================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getTrainings, getWeights, getProfile, getCompetitions, type Training, type Weight, type Profile, type Competition } from './database';
import { getAllMeasurements } from './storage';
import { getUnlockedBadges } from './badges';
import logger from '@/lib/security/logger';

export type ReportPeriod = 'month' | 'quarter' | 'year';

interface ReportData {
  period: ReportPeriod;
  periodLabel: string;
  dateFrom: Date;
  dateTo: Date;
  profile: Profile | null;
  trainings: Training[];
  weights: Weight[];
  competitions: Competition[];
  badgesCount: number;
}

async function collectData(period: ReportPeriod): Promise<ReportData> {
  const now = new Date();
  let dateFrom = new Date();
  let periodLabel = '';

  if (period === 'month') {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    periodLabel = dateFrom.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  } else if (period === 'quarter') {
    dateFrom = new Date(now.getTime() - 90 * 86400000);
    periodLabel = `90 derniers jours`;
  } else {
    dateFrom = new Date(now.getFullYear(), 0, 1);
    periodLabel = `Bilan ${now.getFullYear()}`;
  }

  const [profile, allTrainings, allWeights, competitions, badges] = await Promise.all([
    getProfile().catch(() => null),
    getTrainings(5000).catch(() => []),
    getWeights(1000).catch(() => []),
    getCompetitions().catch(() => [] as Competition[]),
    getUnlockedBadges().catch(() => []),
  ]);

  const trainings = allTrainings.filter(t => {
    const d = new Date(t.date);
    return d >= dateFrom && d <= now;
  });
  const weights = allWeights.filter(w => {
    const d = new Date(w.date);
    return d >= dateFrom && d <= now;
  });

  return {
    period,
    periodLabel,
    dateFrom,
    dateTo: now,
    profile,
    trainings,
    weights,
    competitions,
    badgesCount: badges.length,
  };
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] || c));
}

function buildHTML(data: ReportData): string {
  const { profile, trainings, weights, competitions, periodLabel, badgesCount } = data;
  const totalMin = trainings.reduce((s, t) => s + (t.duration || 0), 0);
  const totalHours = Math.round(totalMin / 60 * 10) / 10;
  const uniqueDays = new Set(trainings.map(t => new Date(t.date).toISOString().slice(0, 10))).size;

  const byType: Record<string, number> = {};
  trainings.forEach(t => {
    const type = t.sport || 'Autre';
    byType[type] = (byType[type] || 0) + 1;
  });
  const typesRows = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([type, count]) => `<tr><td>${escapeHtml(type)}</td><td>${count}</td></tr>`)
    .join('');

  const trainingRows = trainings
    .slice(0, 50)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(t => `
      <tr>
        <td>${new Date(t.date).toLocaleDateString('fr-FR')}</td>
        <td>${escapeHtml(t.sport || '-')}</td>
        <td>${t.duration ?? '-'}</td>
        <td>${t.intensity ?? (t as any).rpe ?? '-'}</td>
      </tr>
    `).join('');

  let weightEvolutionHTML = '';
  if (weights.length >= 2) {
    const sorted = [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sorted[0].weight;
    const last = sorted[sorted.length - 1].weight;
    const delta = last - first;
    const unit = (sorted[0] as any).unit || 'kg';
    const sign = delta > 0 ? '+' : '';
    weightEvolutionHTML = `
      <div class="card">
        <h3>Evolution poids</h3>
        <p>Debut : <strong>${first.toFixed(1)} ${unit}</strong> · Fin : <strong>${last.toFixed(1)} ${unit}</strong></p>
        <p style="font-size:18px;color:${delta <= 0 ? '#10B981' : '#EF4444'};margin:0;">${sign}${delta.toFixed(1)} ${unit}</p>
      </div>
    `;
  }

  const compRows = competitions
    .filter(c => {
      const d = new Date(c.date);
      return d >= data.dateFrom && d <= data.dateTo;
    })
    .map(c => `
      <tr>
        <td>${new Date(c.date).toLocaleDateString('fr-FR')}</td>
        <td>${escapeHtml(c.nom)}</td>
        <td>${escapeHtml(c.sport)}</td>
        <td>${escapeHtml(c.statut || '-')}</td>
      </tr>
    `).join('');

  const profileName = profile?.name ? escapeHtml(profile.name) : 'Yoroi';
  const generatedAt = new Date().toLocaleString('fr-FR');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Yoroi · Rapport</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, Helvetica, sans-serif; color: #111; margin: 0; padding: 32px; }
        h1 { font-size: 28px; margin: 0 0 4px; color: #1a1a2e; }
        h2 { font-size: 18px; color: #D4AF37; margin-top: 32px; border-bottom: 2px solid #D4AF37; padding-bottom: 6px; }
        h3 { font-size: 14px; margin: 0 0 6px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
        .subtitle { color: #888; font-size: 13px; margin-bottom: 24px; }
        .kpis { display: flex; gap: 12px; flex-wrap: wrap; }
        .kpi { flex: 1; min-width: 120px; background: #f5f2e8; border-radius: 12px; padding: 14px; border: 1px solid #D4AF3740; }
        .kpi .num { font-size: 28px; font-weight: 900; color: #1a1a2e; }
        .kpi .lbl { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #eee; }
        th { background: #fafafa; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
        .card { background: #f9f9f9; border-radius: 10px; padding: 14px; margin-top: 10px; border-left: 3px solid #D4AF37; }
        .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; text-align: center; }
      </style>
    </head>
    <body>
      <h1>YOROI · ${escapeHtml(periodLabel)}</h1>
      <div class="subtitle">Rapport pour ${profileName} · Genere le ${generatedAt}</div>

      <h2>Chiffres cles</h2>
      <div class="kpis">
        <div class="kpi"><div class="num">${trainings.length}</div><div class="lbl">Sessions</div></div>
        <div class="kpi"><div class="num">${uniqueDays}</div><div class="lbl">Jours actifs</div></div>
        <div class="kpi"><div class="num">${totalHours}</div><div class="lbl">Heures</div></div>
        <div class="kpi"><div class="num">${badgesCount}</div><div class="lbl">Badges</div></div>
      </div>

      ${weightEvolutionHTML}

      <h2>Repartition par type</h2>
      <table>
        <thead><tr><th>Type</th><th>Sessions</th></tr></thead>
        <tbody>${typesRows || '<tr><td colspan="2">Aucune donnee</td></tr>'}</tbody>
      </table>

      <h2>50 dernieres sessions</h2>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Min</th><th>RPE</th></tr></thead>
        <tbody>${trainingRows || '<tr><td colspan="4">Aucune session</td></tr>'}</tbody>
      </table>

      ${compRows ? `
        <h2>Competitions sur la periode</h2>
        <table>
          <thead><tr><th>Date</th><th>Nom</th><th>Sport</th><th>Statut</th></tr></thead>
          <tbody>${compRows}</tbody>
        </table>
      ` : ''}

      <div class="footer">Genere par Yoroi · Ce rapport est prive et vous appartient.</div>
    </body>
    </html>
  `;
}

/**
 * Genere et partage le PDF.
 */
export async function exportPDFReport(period: ReportPeriod): Promise<{ uri: string } | null> {
  try {
    const data = await collectData(period);
    const html = buildHTML(data);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager mon rapport Yoroi',
        UTI: 'com.adobe.pdf',
      });
    }
    return { uri };
  } catch (e) {
    logger.error('[PDF] erreur export', e);
    return null;
  }
}
