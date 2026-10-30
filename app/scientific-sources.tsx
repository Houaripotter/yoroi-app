/**
 * Sources scientifiques (refonte v2) : les references qui fondent les conseils de l'app,
 * rangees par theme, chacune ouvrable dans le navigateur.
 */
import React from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Enter, Glass, Icon, P, Press } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, Hanko } from '@/components/yoroi/v2/ornements/screens';
import { XIcon } from '@/components/yoroi/v2/competition/ui';
import { safeOpenURL } from '@/lib/security/validators';
import { traduire } from '@/lib/i18n/tr';

/**
 * 18 octobre 2026 (calcul du poids d'apres les etudes) : « Poids et projection », la liste complete des references
 * du calcul du poids (lib/v2/pesee/tendance.ts, predictions.ts, estimation.ts, etatObjectif.ts). Chaque reference a
 * ete verifiee en ligne (titre, auteurs, annee, DOI). Le detail du poids y renvoie (« Voir toutes les sources »).
 */
export const SOURCES_POIDS: { title: string; description: string; url: string }[] = [
  { title: traduire('Kalman, R. E. (1960). A New Approach to Linear Filtering and Prediction Problems. Journal of Basic Engineering, 82(1), 35-45'), description: traduire('Le filtre de ta tendance : il suit ton niveau et ta pente, même avec des jours sans pesée'), url: 'https://doi.org/10.1115/1.3662552' },
  { title: traduire('Walker, J. The Hacker’s Diet, Fourmilab'), description: traduire('La tendance lissée à 10 % par jour, la référence des moyennes de poids (et son retard sur une perte)'), url: 'https://www.fourmilab.ch/hackdiet/www/subsubsection1_4_1_0_8_3.html' },
  { title: traduire('MacroFactor, Weight Trend'), description: traduire('Une appli de référence : tendance lissée, pesées manquantes comblées, eau et glycogène filtrés'), url: 'https://help.macrofactorapp.com/dashboard/weight_trend/' },
  { title: traduire('Sen, P. K. (1968). Estimates of the Regression Coefficient Based on Kendall’s Tau. Journal of the American Statistical Association, 63(324), 1379-1389'), description: traduire('Ton rythme : la médiane des pentes entre tes pesées, qu’une pesée bizarre ne tire pas'), url: 'https://doi.org/10.1080/01621459.1968.10480934' },
  { title: traduire('Turicchi, J. et al. (2020). Weekly, seasonal and holiday body weight fluctuation patterns. PLoS ONE, 15(4), e0232152'), description: traduire('Le poids varie d’environ 0,35 % dans la semaine : il faut plusieurs pesées pour une tendance'), url: 'https://doi.org/10.1371/journal.pone.0232152' },
  { title: traduire('Kreitzman, S. N., Coxon, A. Y. et Szaz, K. F. (1992). Glycogen storage: illusions of easy weight loss. American Journal of Clinical Nutrition, 56(1), 292S-293S'), description: traduire('Le glycogène retient de l’eau : la perte rapide du début est en partie de l’eau'), url: 'https://doi.org/10.1093/ajcn/56.1.292S' },
  { title: traduire('White, C. P., Hitchcock, C. L., Vigna, Y. M. et Prior, J. C. (2011). Fluid Retention over the Menstrual Cycle. Obstetrics and Gynecology International, 138451'), description: traduire('La rétention d’eau est la plus forte au premier jour des règles'), url: 'https://doi.org/10.1155/2011/138451' },
  { title: traduire('Hall, K. D. et al. (2011). Quantification of the effect of energy imbalance on bodyweight. The Lancet, 378(9793), 826-837'), description: traduire('Le poids répond lentement, avec une demi vie d’environ un an : la perte ralentit'), url: 'https://doi.org/10.1016/S0140-6736(11)60812-X' },
  { title: traduire('Thomas, D. M. et al. (2013). Can a weight loss of one pound a week be achieved with a 3500-kcal deficit? International Journal of Obesity, 37(12), 1611-1613'), description: traduire('La règle des 7 700 kcal par kilo surestime la perte sur la durée'), url: 'https://doi.org/10.1038/ijo.2013.51' },
  { title: traduire('NIH, Body Weight Planner'), description: traduire('Le calculateur du NIH, tiré du modèle de Hall'), url: 'https://www.niddk.nih.gov/bwp' },
  { title: traduire('Helms, E. R., Aragon, A. A. et Fitschen, P. J. (2014). Evidence-based recommendations for natural bodybuilding contest preparation. Journal of the International Society of Sports Nutrition, 11, 20'), description: traduire('Perdre 0,5 à 1 % de son poids par semaine pour garder son muscle'), url: 'https://doi.org/10.1186/1550-2783-11-20' },
  { title: traduire('Garthe, I. et al. (2011). Effect of Two Different Weight-Loss Rates on Body Composition and Strength and Power-Related Performance in Elite Athletes. IJSNEM, 21(2), 97-104'), description: traduire('À 0,7 % par semaine, les athlètes gagnent du muscle ; à 1,4 %, non'), url: 'https://doi.org/10.1123/ijsnem.21.2.97' },
  { title: traduire('Iraki, J., Fitschen, P., Espinar, S. et Helms, E. (2019). Nutrition Recommendations for Bodybuilders in the Off-Season. Sports, 7(7), 154'), description: traduire('Prendre 0,25 à 0,5 % de son poids par semaine pour limiter le gras'), url: 'https://doi.org/10.3390/sports7070154' },
  { title: traduire('CDC, perdre du poids'), description: traduire('Une perte graduelle, environ 0,5 à 0,9 kg par semaine, tient mieux dans le temps'), url: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html' },
  { title: traduire('Ricci, A. A. et al. (2025). ISSN position stand: nutrition and weight cut strategies for mixed martial arts and other combat sports. Journal of the International Society of Sports Nutrition, 22(1), 2467909'), description: traduire('Sports de combat : perte progressive au camp, la coupe d’eau reste encadrée et de courte durée'), url: 'https://doi.org/10.1080/15502783.2025.2467909' },
  { title: traduire('Reale, R., Slater, G. et Burke, L. M. (2017). Acute-Weight-Loss Strategies for Combat Sports and Applications to Olympic Success. IJSPP, 12(2), 142-151'), description: traduire('Perdre du poids pour une pesée : les stratégies et leurs limites'), url: 'https://doi.org/10.1123/ijspp.2016-0211' },
  { title: traduire('Barley, O. R., Chapman, D. W. et Abbiss, C. R. (2019). The Current State of Weight-Cutting in Combat Sports. Sports, 7(5), 123'), description: traduire('60 à 80 % des combattants coupent du poids, souvent par déshydratation'), url: 'https://doi.org/10.3390/sports7050123' },
];

const SOURCES: { category: string; color: string; soft: string; items: { title: string; description: string; url: string }[] }[] = [
  {
    category: traduire('Poids et projection'),
    color: P.mossText,
    soft: P.mossSoft,
    items: SOURCES_POIDS,
  },
  {
    category: traduire('Sommeil'),
    color: P.indigo,
    soft: P.indigoSoft,
    items: [
      { title: traduire('National Sleep Foundation'), description: traduire('Sept à neuf heures de sommeil recommandées pour un adulte'), url: 'https://www.sleepfoundation.org/how-sleep-works/how-much-sleep-do-we-really-need' },
      { title: traduire('Walker, M. (2017). Why We Sleep'), description: traduire("Recherche sur l'impact du sommeil sur la performance physique"), url: 'https://www.amazon.fr/Why-We-Sleep-Science-Dreams/dp/0141983760' },
    ],
  },
  {
    category: traduire('Hydratation'),
    color: '#3D5D9E',
    soft: P.indigoSoft,
    items: [
      { title: traduire('Sawka et al. (2007), ACSM'), description: traduire("Position de l'ACSM sur l'hydratation pendant l'effort"), url: 'https://pubmed.ncbi.nlm.nih.gov/17277604/' },
    ],
  },
  {
    category: traduire("Charge d'entraînement"),
    color: P.lacquer,
    soft: '#EEF0F7',
    items: [
      { title: traduire('Bompa et Haff (2009)'), description: traduire('Periodization: Theory and Methodology of Training'), url: 'https://www.abebooks.com/9780736074834/Periodization-Theory-Methodology-Training-Bompa-073607483X/plp' },
    ],
  },
  {
    category: traduire('Régularité'),
    color: P.goldDark,
    soft: P.goldSoft,
    items: [
      { title: traduire('Lally et al. (2010)'), description: traduire('En moyenne 66 jours pour ancrer une habitude'), url: 'https://doi.org/10.1002/ejsp.674' },
      { title: traduire('Clear, J. (2018). Atomic Habits'), description: traduire("L'importance de la constance dans la performance"), url: 'https://www.amazon.fr/Atomic-Habits-Proven-Build-Break/dp/0735211299' },
    ],
  },
  {
    category: traduire('Poids et composition corporelle'),
    color: P.mossText,
    soft: P.mossSoft,
    items: [
      { title: traduire('OMS, mode de vie sain'), description: traduire("Gestes du quotidien pour la santé, un IMC au dessus de 25 est un facteur de risque"), url: 'https://www.who.int/europe/news-room/fact-sheets/item/a-healthy-lifestyle---who-recommendations' },
      { title: traduire('Hall et Kahan (2018)'), description: traduire('Garder sur la durée le poids perdu'), url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5764193/' },
      // vague 28 : les bases de la fourchette d'arrivee sont passees dans « Poids et projection » (18 octobre 2026)
      { title: traduire('CDC, catégories d’IMC'), description: traduire('Sous 18,5, l’IMC est en dessous des repères de santé'), url: 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html' },
    ],
  },
];

export default function ScientificSourcesScreen() {
  const total = SOURCES.reduce((n, s) => n + s.items.length, 0);
  return (
    <DetailScreen title={traduire("Sources scientifiques")} subtitle={traduire("Ce sur quoi reposent nos conseils")}>
      <Enter i={0}>
        <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Ink size={20} weight="black" tight>
              {traduire("Basé sur la science")}</Ink>
            <Ink size={13} weight="medium" color={P.ink2}>
              {traduire("Nos recommandations s'appuient sur {0} références, rangées par thème. Touche une source pour l'ouvrir.", total)}
            </Ink>
          </View>
          <Hanko size={50} />
        </Glass>
      </Enter>

      {SOURCES.map((s, si) => (
        <Enter key={s.category} i={si + 1} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginTop: 4 }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Glyph kind="sakura" size={18} color={s.color} />
            </View>
            <Ink size={18} weight="black" tight>
              {traduire(s.category)}
            </Ink>
          </View>
          <Card style={{ padding: 6 }}>
            {s.items.map((it, i) => (
              <Press key={it.url} onPress={() => safeOpenURL(it.url)} accessibilityRole="link" accessibilityLabel={`${it.title}. ${it.description}. Ouvrir`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 64, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: P.line2 }}>
                  <XIcon name="book" size={20} color={s.color} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={15} weight="extraBold" numberOfLines={2}>
                      {traduire(it.title)}
                    </Ink>
                    <Ink size={13} weight="medium" color={P.ink2}>
                      {traduire(it.description)}
                    </Ink>
                  </View>
                  <Icon name="share" size={17} color={P.muted} />
                </View>
              </Press>
            ))}
          </Card>
        </Enter>
      ))}

      <Ink size={12} weight="bold" color={P.muted} style={{ textAlign: 'center', paddingVertical: 6 }}>
        {traduire("Chaque source s'ouvre sur sa page d'origine.")}</Ink>
    </DetailScreen>
  );
}
