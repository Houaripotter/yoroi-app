import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAllMeasurements } from './storage';
import { getMeasurements, getProfile, Measurement } from './database';

// ============================================
// EXPORT PDF - YOROI
// ============================================
// Genere un PDF recapitulatif pour medecin/dieteticien

export type ExportPeriod = '30j' | '90j' | 'tout';

interface WeightData {
  date: string;
  weight: number;
  bodyFat?: number;
  muscle?: number;
  water?: number;
}

// Couleurs du theme
const COLORS = {
  gold: '#D4AF37',
  background: '#0D0D0D',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// Generer le HTML pour le PDF
const generatePDFHTML = async (period: ExportPeriod): Promise<string> => {
  // Charger les donnees
  const profile = await getProfile();
  const allWeights = await getAllMeasurements();
  const allMeasurements = await getMeasurements();

  // Filtrer par periode
  const now = new Date();
  const days = period === '30j' ? 30 : period === '90j' ? 90 : 365;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const weights: WeightData[] = allWeights
    .filter(w => period === 'tout' || new Date(w.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const measurements: Measurement[] = allMeasurements
    .filter(m => period === 'tout' || new Date(m.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculs
  const firstWeight = weights[0];
  const lastWeight = weights[weights.length - 1];
  const weightDelta = lastWeight && firstWeight ? lastWeight.weight - firstWeight.weight : 0;

  // Calculer IMC si taille disponible
  const heightM = profile?.height_cm ? profile.height_cm / 100 : null;
  const firstIMC = firstWeight && heightM ? firstWeight.weight / (heightM * heightM) : null;
  const lastIMC = lastWeight && heightM ? lastWeight.weight / (heightM * heightM) : null;

  // Premiere et derniere mensuration
  const firstMeasurement = measurements[0];
  const lastMeasurement = measurements[measurements.length - 1];

  const dateStr = format(now, 'dd MMMM yyyy', { locale: fr });
  const periodLabel = period === '30j' ? '30 derniers jours' : period === '90j' ? '90 derniers jours' : 'Toutes les donnees';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #FFFFFF;
      color: #1F2937;
      padding: 40px;
      font-size: 14px;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${COLORS.gold};
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      color: ${COLORS.gold};
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6B7280;
      font-size: 14px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      margin-top: 16px;
      font-size: 12px;
      color: #6B7280;
    }
    h2 {
      color: ${COLORS.gold};
      font-size: 18px;
      margin: 30px 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #E5E7EB;
    }
    .card {
      background: #F9FAFB;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .stats-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .stat-item {
      flex: 1;
      min-width: 120px;
      text-align: center;
      padding: 16px;
      background: white;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
    }
    .stat-value.success { color: ${COLORS.success}; }
    .stat-value.danger { color: ${COLORS.danger}; }
    .stat-value.gold { color: ${COLORS.gold}; }
    .stat-label {
      font-size: 12px;
      color: #6B7280;
      margin-top: 4px;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 13px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #E5E7EB;
    }
    th {
      background: #F3F4F6;
      font-weight: 600;
      color: #374151;
    }
    tr:nth-child(even) {
      background: #F9FAFB;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E5E7EB;
      text-align: center;
      font-size: 11px;
      color: #9CA3AF;
    }
    .measurement-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .measurement-label {
      color: #374151;
    }
    .measurement-values {
      display: flex;
      gap: 20px;
    }
    .measurement-value {
      text-align: right;
    }
    .delta {
      font-size: 12px;
      margin-left: 8px;
    }
    .delta.positive { color: ${COLORS.danger}; }
    .delta.negative { color: ${COLORS.success}; }
    .page-break {
      page-break-before: always;
    }
    @media print {
      body { padding: 20px; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo">YOROI</div>
    <div class="subtitle">Rapport de suivi - ${profile?.name || 'Guerrier'}</div>
    <div class="meta">
      <span>Genere le ${dateStr}</span>
      <span>${periodLabel}</span>
    </div>
  </div>

  <!-- RESUME POIDS -->
  <h2>Resume du poids</h2>
  <div class="card">
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">${firstWeight ? firstWeight.weight.toFixed(1) : '--'}</div>
        <div class="stat-label">Poids initial (kg)</div>
      </div>
      <div class="stat-item">
        <div class="stat-value gold">${lastWeight ? lastWeight.weight.toFixed(1) : '--'}</div>
        <div class="stat-label">Poids actuel (kg)</div>
      </div>
      <div class="stat-item">
        <div class="stat-value ${weightDelta < 0 ? 'success' : weightDelta > 0 ? 'danger' : ''}">${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)}</div>
        <div class="stat-label">Evolution (kg)</div>
      </div>
      ${heightM ? `
      <div class="stat-item">
        <div class="stat-value">${lastIMC ? lastIMC.toFixed(1) : '--'}</div>
        <div class="stat-label">IMC actuel</div>
      </div>
      ` : ''}
    </div>
  </div>

  ${weights.length > 0 ? `
  <!-- HISTORIQUE POIDS -->
  <h2>Historique des pesees (${weights.length} entrees)</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Poids (kg)</th>
        <th>Graisse (%)</th>
        <th>Muscle (%)</th>
        <th>Eau (%)</th>
      </tr>
    </thead>
    <tbody>
      ${weights.slice(-20).reverse().map(w => `
      <tr>
        <td>${format(new Date(w.date), 'dd/MM/yyyy')}</td>
        <td><strong>${w.weight.toFixed(1)}</strong></td>
        <td>${w.bodyFat ? w.bodyFat.toFixed(1) : '-'}</td>
        <td>${w.muscle ? w.muscle.toFixed(1) : '-'}</td>
        <td>${w.water ? w.water.toFixed(1) : '-'}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ${weights.length > 20 ? `<p style="font-size: 11px; color: #9CA3AF; margin-top: 8px;">Affichage des 20 dernieres entrees sur ${weights.length}</p>` : ''}
  ` : ''}

  ${measurements.length > 0 ? `
  <!-- MENSURATIONS -->
  <div class="page-break"></div>
  <h2>Mensurations (${measurements.length} entrees)</h2>
  <div class="card">
    ${lastMeasurement ? `
    <div class="measurement-row" style="border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; margin-bottom: 12px;">
      <span style="font-weight: 600;">Mesure</span>
      <div class="measurement-values">
        <span style="width: 80px; font-weight: 600;">Debut</span>
        <span style="width: 80px; font-weight: 600;">Actuel</span>
        <span style="width: 60px; font-weight: 600;">Delta</span>
      </div>
    </div>
    ${generateMeasurementRow('Tour de taille', firstMeasurement?.waist, lastMeasurement.waist)}
    ${generateMeasurementRow('Tour de hanches', firstMeasurement?.hips, lastMeasurement.hips)}
    ${generateMeasurementRow('Tour de poitrine', firstMeasurement?.chest, lastMeasurement.chest)}
    ${generateMeasurementRow('Epaules', firstMeasurement?.shoulders, lastMeasurement.shoulders)}
    ${generateMeasurementRow('Cou', firstMeasurement?.neck, lastMeasurement.neck)}
    ${generateMeasurementRow('Bras gauche', firstMeasurement?.left_arm, lastMeasurement.left_arm)}
    ${generateMeasurementRow('Bras droit', firstMeasurement?.right_arm, lastMeasurement.right_arm)}
    ${generateMeasurementRow('Cuisse gauche', firstMeasurement?.left_thigh, lastMeasurement.left_thigh)}
    ${generateMeasurementRow('Cuisse droite', firstMeasurement?.right_thigh, lastMeasurement.right_thigh)}
    ${generateMeasurementRow('Mollet gauche', firstMeasurement?.left_calf, lastMeasurement.left_calf)}
    ${generateMeasurementRow('Mollet droit', firstMeasurement?.right_calf, lastMeasurement.right_calf)}
    ` : ''}
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <p>Document genere par <strong>YOROI</strong> - Application de suivi fitness</p>
    <p style="margin-top: 4px;">Ce rapport est fourni a titre informatif. Consultez un professionnel de sante pour toute decision medicale.</p>
  </div>
</body>
</html>
`;
};

// Helper pour generer une ligne de mensuration
const generateMeasurementRow = (label: string, first?: number, last?: number): string => {
  if (!last && !first) return '';

  const delta = first && last ? last - first : 0;
  const deltaClass = delta < 0 ? 'negative' : delta > 0 ? 'positive' : '';

  return `
    <div class="measurement-row">
      <span class="measurement-label">${label}</span>
      <div class="measurement-values">
        <span class="measurement-value" style="width: 80px;">${first ? first.toFixed(0) + ' cm' : '-'}</span>
        <span class="measurement-value" style="width: 80px;"><strong>${last ? last.toFixed(0) + ' cm' : '-'}</strong></span>
        <span class="measurement-value delta ${deltaClass}" style="width: 60px;">${delta !== 0 ? (delta > 0 ? '+' : '') + delta.toFixed(0) + ' cm' : '-'}</span>
      </div>
    </div>
  `;
};

// Fonction principale d'export
export const generateProgressPDF = async (period: ExportPeriod = '30j'): Promise<void> => {
  try {
    // Generer le HTML
    const html = await generatePDFHTML(period);

    // Generer le PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Partager le PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exporter mon rapport Yoroi',
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Le partage n\'est pas disponible sur cet appareil');
    }
  } catch (error) {
    console.error('Erreur export PDF:', error);
    throw error;
  }
};

// Previsualiser le PDF
export const previewPDF = async (period: ExportPeriod = '30j'): Promise<void> => {
  try {
    const html = await generatePDFHTML(period);
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Erreur preview PDF:', error);
    throw error;
  }
};

export default {
  generateProgressPDF,
  previewPDF,
};
