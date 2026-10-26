import AppIntents
import SwiftUI
import WidgetKit

// Morceaux communs aux widgets, dans le style choisi : poids, ecart, arrivee, lignes Semaine, Eau, Combat,
// boutons de l'eau et de la seance, etat vide.

enum Textes {
  /// "2 sur 4" ou "2 séances"
  static func semaine(_ e: EtatYoroi) -> String {
    if let o = e.objectifSemaine { return String(format: NSLocalizedString("%@ sur %@", comment: ""), "\(e.faites)", "\(o)") }
    if e.faites == 0 { return NSLocalizedString("Aucune séance", comment: "") }
    return e.faites == 1 ? NSLocalizedString("1 séance", comment: "") : String(format: NSLocalizedString("%@ séances", comment: ""), "\(e.faites)")
  }

  /// "1,2 L sur 2 L" ou "1,2 L"
  static func eau(_ e: EtatYoroi) -> String {
    if let o = e.eauObjectif { return String(format: NSLocalizedString("%@ sur %@", comment: ""), "\(Fmt.eau(e.eauMl))", "\(Fmt.eau(o))") }
    return Fmt.eau(e.eauMl)
  }

  /// "Arrivée prévue du 12 nov. au 3 déc.", ou ton objectif, ou nil
  static func arrivee(_ e: EtatYoroi) -> String? {
    guard let p = arriveeParts(e) else { return nil }
    return "\(p.0) \(p.1)"
  }

  /// ("Arrivée prévue", "du 12 nov. au 3 déc.") ou ("Objectif", "78,0 kg"), nil sans rien
  static func arriveeParts(_ e: EtatYoroi) -> (String, String)? {
    if let a = e.poids.arrivee { return (NSLocalizedString("Arrivée prévue", comment: ""), String(format: NSLocalizedString("du %@ au %@", comment: ""), "\(Fmt.jourCourt(a.du))", "\(Fmt.jourCourt(a.au))")) }
    if let c = e.poids.cap { return (NSLocalizedString("Objectif", comment: ""), "\(Fmt.poids(c, e.livres)) \(Fmt.unite(e.livres))") }
    return nil
  }

  /// La place de ta pesee par rapport au rythme prevu, en mots
  static func statut(_ s: String) -> String? {
    switch s {
    case "allure": return NSLocalizedString("dans l'allure", comment: "")
    case "dessus": return NSLocalizedString("au-dessus du rythme", comment: "")
    case "vite": return NSLocalizedString("plus vite que prévu", comment: "")
    default: return nil
    }
  }

  /// "5 x 5 min, repos 1 min"
  static func chrono(_ c: ChronoI?) -> String {
    guard let c, c.rounds > 0, c.roundS > 0 else { return NSLocalizedString("Ouvre ton chrono", comment: "") }
    let base = "\(c.rounds) x \(Fmt.duree(c.roundS))"
    return c.reposS > 0 ? String(format: NSLocalizedString("%@, repos %@", comment: ""), "\(base)", "\(Fmt.duree(c.reposS))") : base
  }

  /// "5 x 5 min" (ou "6 min" pour un seul round)
  static func chronoCourt(_ c: ChronoI?) -> String {
    guard let c, c.rounds > 0, c.roundS > 0 else { return NSLocalizedString("Ouvre ton chrono", comment: "") }
    return c.rounds > 1 ? "\(c.rounds) x \(Fmt.duree(c.roundS))" : Fmt.duree(c.roundS)
  }

  /// Le nom de ton dernier reglage ("MMA"), ou "Chrono"
  static func chronoNom(_ c: ChronoI?) -> String {
    guard let n = c?.nom.trimmingCharacters(in: .whitespacesAndNewlines), !n.isEmpty else { return NSLocalizedString("Chrono", comment: "") }
    return n
  }

  static func lienChrono(_ c: ChronoI?) -> URL {
    if c?.id == "ton_tabata" { return Liens.tabata }
    return Liens.chrono
  }

  /// "Encore 2,3 kg" ou "Dans ta catégorie", nil sans categorie
  static func resteCombat(_ c: CombatI, _ livres: Bool) -> (String, Bool)? {
    guard let ec = c.ecartKg else { return nil }
    if ec > 0.05 { return (String(format: NSLocalizedString("Encore %@ %@", comment: ""), "\(Fmt.poids(ec, livres))", "\(Fmt.unite(livres))"), false) }
    return (NSLocalizedString("Dans ta catégorie", comment: ""), true)
  }

  static func categorie(_ c: CombatI, _ livres: Bool) -> String? {
    guard let k = c.categorieKg else { return nil }
    return String(format: NSLocalizedString("Catégorie %@ %@", comment: ""), "\(Fmt.poids(k, livres))", "\(Fmt.unite(livres))")
  }

  /// "aujourd'hui", "hier" ou "12 oct." (en coin de widget)
  static func jourDiscret(_ iso: String, _ maintenant: Date) -> String {
    let t = Fmt.jourRelatif(iso, maintenant)
    if t == "Aujourd'hui" || t == NSLocalizedString("Aujourd'hui", comment: "") { return NSLocalizedString("aujourd'hui", comment: "") }
    if t == "Hier" || t == NSLocalizedString("Hier", comment: "") { return NSLocalizedString("hier", comment: "") }
    return t
  }
}

/// Le poids en grand avec son unite
struct GrosPoidsW: View {
  let pal: Palette
  var kg: Double
  var livres: Bool
  var taille: CGFloat

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 3) {
      Text(Fmt.poids(kg, livres))
        .font(pal.chiffre(taille))
        .foregroundStyle(pal.texte)
        .widgetAccentable()
      Text(Fmt.unite(livres))
        .font(pal.style == .b ? .system(size: max(11, taille * 0.4), weight: .regular, design: .serif) : pal.legende(max(11, taille * 0.4), .medium))
        .foregroundStyle(pal.doux)
    }
    .lineLimit(1)
    .minimumScaleFactor(0.6)
  }
}

/// "+1,5 kg" dans la couleur de ton allure, avec sa fleche
struct EcartW: View {
  let pal: Palette
  var etat: EtatYoroi
  var taille: CGFloat = 15

  var body: some View {
    if let ec = etat.poids.ecart {
      HStack(spacing: 4) {
        FlecheEcart(ecart: ec, taille: taille * 0.75)
        Text("\(Fmt.ecart(ec, etat.livres)) \(Fmt.unite(etat.livres))")
          .font(pal.legende(taille, .bold).monospacedDigit())
      }
      .foregroundStyle(pal.statut(etat.poids.statut))
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .accessibilityElement(children: .combine)
      .accessibilityLabel("Écart au rythme prévu \(Fmt.ecart(ec, etat.livres)) \(Fmt.unite(etat.livres))")
    }
  }
}

/// "au-dessus du rythme", en petit
struct StatutW: View {
  let pal: Palette
  var etat: EtatYoroi
  var taille: CGFloat = 12

  var body: some View {
    if etat.poids.ecart != nil, let t = Textes.statut(etat.poids.statut) {
      Text(t)
        .font(pal.legende(taille, .medium))
        .foregroundStyle(pal.doux)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }
  }
}

/// Torii, « Arrivée prévue » et les dates en gras
struct ArriveeW: View {
  let pal: Palette
  var etat: EtatYoroi
  var taille: CGFloat = 12
  var libelle: String? = nil

  var body: some View {
    if let p = Textes.arriveeParts(etat) {
      HStack(spacing: 7) {
        ToriiW(pal: pal, taille: taille * 1.2)
        (Text(libelle ?? p.0).font(pal.legende(taille, .medium)).foregroundColor(pal.doux)
          + Text("  ")
          + Text(p.1).font(pal.fort(taille + 0.5, .bold)).foregroundColor(pal.texte))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
    }
  }
}

/// Trait de separation : fin, ou touche de pinceau pour le rouleau
struct SeparateurW: View {
  let pal: Palette

  var body: some View {
    if pal.style == .b {
      Capsule()
        .fill(LinearGradient(colors: [pal.trait.opacity(0.4), pal.trait, pal.trait.opacity(0.2)], startPoint: .leading, endPoint: .trailing))
        .frame(height: 2)
    } else {
      Rectangle().fill(pal.trait).frame(height: 1)
    }
  }
}

struct LigneSemaineW: View {
  let pal: Palette
  var etat: EtatYoroi
  var taillePoints: CGFloat = 12

  var body: some View {
    HStack(alignment: .center, spacing: 8) {
      VStack(alignment: .leading, spacing: 2) {
        Text("Ta semaine")
          .font(pal.legende(12, .medium))
          .foregroundStyle(pal.doux)
        Text(Textes.semaine(etat))
          .font(pal.chiffre(19))
          .foregroundStyle(pal.texte)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .widgetAccentable()
      }
      Spacer(minLength: 4)
      PointsW(pal: pal, jours: etat.jours, aujourdhui: etat.rangAujourdhui, taille: pal.style == .b ? taillePoints * 1.45 : taillePoints)
    }
  }
}

/// Les deux boutons interactifs de l'eau
struct BoutonsEauW: View {
  let pal: Palette
  var hauteur: CGFloat = 30
  var vertical = false

  var body: some View {
    let plus = Button(intent: AjouterVerreIntent()) {
      Text("+ 1 verre")
        .font(pal.legende(hauteur > 34 ? 16 : 14, .bold))
        .foregroundStyle(pal.surBouton)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity, minHeight: hauteur, maxHeight: hauteur)
        .background(pal.bouton, in: Capsule())
    }
    .buttonStyle(.plain)
    .widgetAccentable()

    let moins = Button(intent: RetirerVerreIntent()) {
      Image(systemName: "minus")
        .font(.system(size: 14, weight: .bold))
        .foregroundStyle(pal.texte)
        .frame(width: vertical ? nil : hauteur + 6, height: hauteur)
        .frame(maxWidth: vertical ? .infinity : nil)
        .background(pal.boutonDoux, in: Capsule())
        .overlay(Capsule().stroke(pal.contourDoux, lineWidth: 1))
    }
    .buttonStyle(.plain)
    .accessibilityLabel("Retirer un verre")

    if vertical {
      VStack(spacing: 8) {
        plus
        moins
      }
    } else {
      HStack(spacing: 8) {
        moins
        plus
      }
    }
  }
}

struct BoutonSeanceW: View {
  @Environment(\.widgetRenderingMode) private var rendu
  let pal: Palette
  var hauteur: CGFloat = 28

  private var libelle: some View {
    HStack(spacing: 5) {
      Image(systemName: "checkmark")
        .font(.system(size: 12, weight: .bold))
      Text("Séance faite")
        .font(pal.legende(14, .bold))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
  }

  var body: some View {
    if rendu == .fullColor {
      libelle
        .foregroundStyle(pal.surBouton)
        .frame(maxWidth: .infinity, minHeight: hauteur, maxHeight: hauteur)
        .background(pal.bouton, in: Capsule())
    } else {
      // Ecran d'accueil teinte ou transparent (iOS 18 et plus) : la capsule doree pleine devenait un
      // aplat de teinte translucide, texte compris (26 octobre 2026). Ici un simple contour, texte lisible.
      libelle
        .foregroundStyle(.primary)
        .frame(maxWidth: .infinity, minHeight: hauteur, maxHeight: hauteur)
        .overlay(Capsule().stroke(Color.primary.opacity(0.6), lineWidth: 1.2))
        .widgetAccentable()
    }
  }
}

/// Anneau de l'eau et sa goutte
struct GoutteW: View {
  let pal: Palette
  var part: Double
  var taille: CGFloat
  var epaisseur: CGFloat

  var body: some View {
    ZStack {
      AnneauW(pal: pal, part: part, epaisseur: epaisseur)
      Image(systemName: "drop.fill")
        .font(.system(size: taille * 0.26, weight: .bold))
        .foregroundStyle(pal.eau)
        .widgetAccentable()
    }
    .frame(width: taille, height: taille)
  }
}

struct LigneEauW: View {
  let pal: Palette
  var etat: EtatYoroi
  var boutons = false

  var body: some View {
    HStack(spacing: 10) {
      GoutteW(pal: pal, part: etat.partEau ?? 0, taille: 38, epaisseur: 4.5)
      VStack(alignment: .leading, spacing: 1) {
        Text("Eau")
          .font(pal.legende(12, .medium))
          .foregroundStyle(pal.doux)
        Text(Textes.eau(etat))
          .font(pal.chiffre(16))
          .foregroundStyle(pal.texte)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      Spacer(minLength: 4)
      if boutons {
        BoutonsEauW(pal: pal, hauteur: 32)
          .frame(width: 150)
      }
    }
  }
}

struct LigneCombatW: View {
  let pal: Palette
  var etat: EtatYoroi

  var body: some View {
    HStack(alignment: .center, spacing: 10) {
      if let c = etat.combat, let n = etat.joursAvantCombat {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
          Text("Combat")
            .font(pal.legende(12, .medium))
            .foregroundStyle(pal.doux)
          Text(Fmt.jMoins(n))
            .font(pal.chiffre(22))
            .foregroundStyle(pal.texte)
            .widgetAccentable()
        }
        Spacer(minLength: 4)
        VStack(alignment: .trailing, spacing: 1) {
          if let cat = Textes.categorie(c, etat.livres) {
            Text(cat)
              .font(pal.legende(12, .medium))
              .foregroundStyle(pal.doux)
          }
          if let reste = Textes.resteCombat(c, etat.livres) {
            Text(reste.0)
              .font(pal.legende(13, .bold))
              .foregroundStyle(reste.1 ? pal.vert : pal.texte)
          }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      } else {
        Text("Combat")
          .font(pal.legende(12, .medium))
          .foregroundStyle(pal.doux)
        Text("Aucune compétition prévue")
          .font(pal.fort(13, .semibold))
          .foregroundStyle(pal.texte)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Spacer(minLength: 0)
      }
    }
  }
}

/// Etat vide propre, sans chiffre
struct VideW: View {
  let pal: Palette
  var titre: String
  var compact = false

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      TitreW(pal: pal, texte: titre)
      Spacer(minLength: 0)
      Text("Ouvre Yoroi pour commencer")
        .font(pal.fort(compact ? 15 : 17, .semibold))
        .foregroundStyle(pal.texte)
        .lineLimit(3)
        .minimumScaleFactor(0.8)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

/// En-tete d'un widget : le titre du style a gauche, une date discrete a droite
struct EnteteW: View {
  let pal: Palette
  var titre: String
  var coin: String? = nil

  var body: some View {
    HStack(alignment: .firstTextBaseline) {
      TitreW(pal: pal, texte: titre)
      Spacer(minLength: 4)
      if let coin {
        Text(coin)
          .font(pal.legende(12, .medium))
          .foregroundStyle(pal.doux)
          .lineLimit(1)
      }
    }
  }
}
