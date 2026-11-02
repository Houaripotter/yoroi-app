import ActivityKit
import AppIntents
import SwiftUI
import UIKit
import WidgetKit

// Live Activity du chrono rounds : ecran verrouille et Dynamic Island.
// Round X sur Y, phase, compte a rebours natif (Text(timerInterval:)), une couleur par phase.
// Demarree, mise a jour a chaque phase et arretee par le chrono de l'app (module natif YoroiWidgets).
// 29 octobre 2026 (Houari : « tout ce qui est sur fond noir ne donne pas envie ») :
//  - ecran verrouille : fond pastel par phase (travail peche corail, repos menthe, preparation bleu ciel,
//    musculation lilas), texte bleu nuit, ton personnage dans un anneau vif, gros chiffre arrondi ;
//  - Dynamic Island : la pilule reste noire (impose par Apple), tout son contenu est en couleurs vives,
//    anneau, chiffres en degrade, icone de phase, plus de gris.

/// Les couleurs d'une phase, pour l'ecran verrouille (fond clair) et l'ile (fond noir)
enum ThemeIle {
  static let nuit = Color.hexa(0x23358F)

  /// "travail", "repos", "prepa" ou "muscu" (effort d'une seance de musculation)
  static func genre(_ s: ChronoAttributs.ContentState) -> String {
    switch s.phase {
    case "repos": return "repos"
    case "prepa": return "prepa"
    default: return s.plan != nil && s.rounds == 0 ? "muscu" : "travail"
    }
  }

  /// Degrade du fond de l'ecran verrouille
  static func fond(_ s: ChronoAttributs.ContentState) -> [Color] {
    switch genre(s) {
    case "repos": return [Color.hexa(0xDDF7E9), Color.hexa(0xA8E8C6)]
    case "prepa": return [Color.hexa(0xE2F2FF), Color.hexa(0xAFD9F7)]
    case "muscu": return [Color.hexa(0xF3E8FB), Color.hexa(0xD7BCEB)]
    default: return [Color.hexa(0xFFE4DA), Color.hexa(0xFFAF96)]
    }
  }

  /// Teinte du fond (activityBackgroundTint et banniere) : la couleur du milieu du degrade
  static func teinte(_ s: ChronoAttributs.ContentState) -> Color {
    switch genre(s) {
    case "repos": return Color.hexa(0xC2EFD7)
    case "prepa": return Color.hexa(0xC9E6FB)
    case "muscu": return Color.hexa(0xE5D2F3)
    default: return Color.hexa(0xFFC9B7)
    }
  }

  /// Couleur vive sur fond clair (anneau, barre, capitales)
  static func vif(_ s: ChronoAttributs.ContentState) -> Color {
    switch genre(s) {
    case "repos": return Color.hexa(0x16955F)
    case "prepa": return Color.hexa(0x2F7FCC)
    case "muscu": return Color.hexa(0x8447C2)
    default: return Color.hexa(0xE0603A)
    }
  }

  /// Couleur lumineuse sur la pilule noire de l'ile
  static func ile(_ s: ChronoAttributs.ContentState) -> Color {
    switch genre(s) {
    case "repos": return Color.hexa(0x7CF0B4)
    case "prepa": return Color.hexa(0x8FD3FF)
    case "muscu": return Color.hexa(0xD9A8FF)
    default: return Color.hexa(0xFF9F7E)
    }
  }

  /// Degrade des chiffres et des boutons dans l'ile
  static func degradeIle(_ s: ChronoAttributs.ContentState) -> LinearGradient {
    let c: [Color]
    switch genre(s) {
    case "repos": c = [Color.hexa(0xB8FFD9), Color.hexa(0x5FE3A1)]
    case "prepa": c = [Color.hexa(0xCFEEFF), Color.hexa(0x6FC3FF)]
    case "muscu": c = [Color.hexa(0xF0D9FF), Color.hexa(0xC08BFF)]
    default: c = [Color.hexa(0xFFD3C2), Color.hexa(0xFF8A64)]
    }
    return LinearGradient(colors: c, startPoint: .topLeading, endPoint: .bottomTrailing)
  }

  /// Texte fonce pose sur la couleur de l'ile (boutons)
  static func surIle(_ s: ChronoAttributs.ContentState) -> Color {
    switch genre(s) {
    case "repos": return Color.hexa(0x0E3D27)
    case "prepa": return Color.hexa(0x0D3557)
    case "muscu": return Color.hexa(0x3B1663)
    default: return Color.hexa(0x5A2412)
    }
  }

  static func icone(_ s: ChronoAttributs.ContentState) -> String {
    switch genre(s) {
    case "repos": return "leaf.fill"
    case "prepa": return "figure.walk"
    case "muscu": return "dumbbell.fill"
    default: return "flame.fill"
    }
  }
}

struct ActiviteChrono: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ChronoAttributs.self) { context in
      let s = AfficheIle.etat(context.state, perime: context.isStale)
      VueChronoVerrou(titre: context.attributes.titre, etat: s)
        .activityBackgroundTint(ThemeIle.teinte(s))
        .activitySystemActionForegroundColor(ThemeIle.nuit)
        .widgetURL(Liens.chronoEnCours)
    } dynamicIsland: { context in
      let s = AfficheIle.etat(context.state, perime: context.isStale)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            AvatarIle(etat: s, taille: 50, couleur: ThemeIle.ile(s), piste: ThemeIle.ile(s).opacity(0.25))
            VStack(alignment: .leading, spacing: 2) {
              HStack(spacing: 4) {
                Image(systemName: ThemeIle.icone(s))
                  .font(.system(size: 11, weight: .heavy))
                Text(ChronoTextes.phase(s))
                  .font(.libelle(13, .heavy))
              }
              .foregroundStyle(ThemeIle.ile(s))
              if s.rounds > 0 {
                Text("Round \(s.round) sur \(s.rounds)")
                  .font(.chiffre(12, .bold))
                  .foregroundStyle(ThemeIle.degradeIle(s))
              } else if let ensuite = ChronoTextes.ensuite(s) {
                Text(ensuite)
                  .font(.libelle(12, .bold))
                  .foregroundStyle(ThemeIle.degradeIle(s))
              }
            }
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          CompteChrono(etat: s)
            .font(.chiffre(32, .heavy))
            .foregroundStyle(ThemeIle.degradeIle(s))
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 120, alignment: .trailing)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 8) {
            SegmentsIle(etat: s, surClair: false)
            BoutonsSeance(etat: s, couleur: ThemeIle.ile(s), texteBouton: ThemeIle.surIle(s), fondSecond: ThemeIle.ile(s).opacity(0.22), texteSecond: ThemeIle.ile(s))
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        AvatarIle(etat: s, taille: 24, couleur: ThemeIle.ile(s), piste: ThemeIle.ile(s).opacity(0.25))
      } compactTrailing: {
        CompteChrono(etat: s)
          .font(.chiffre(14, .heavy))
          .foregroundStyle(ThemeIle.ile(s))
          .multilineTextAlignment(.trailing)
          .frame(width: 46)
      } minimal: {
        AvatarIle(etat: s, taille: 22, couleur: ThemeIle.ile(s), piste: ThemeIle.ile(s).opacity(0.25))
      }
      .widgetURL(Liens.chronoEnCours)
      .keylineTint(ThemeIle.ile(s))
    }
  }
}

/// Seance de musculation (plan present) : « Série faite », et « +15 s » pendant le repos (SeanceIle.swift)
struct BoutonsSeance: View {
  var etat: ChronoAttributs.ContentState
  var couleur: Color
  var texteBouton: Color
  var fondSecond: Color
  var texteSecond: Color

  var body: some View {
    // l'extension de widgets vise iOS 17 : Button(intent:) toujours disponible ici
    if let plan = PlanIle.lire(etat.plan), !plan.fini {
      HStack(spacing: 8) {
        Button(intent: SerieFaiteIntent()) {
          Label(plan.t.bouton, systemImage: "checkmark")
            .font(.libelle(15, .bold))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity, minHeight: 40)
            .foregroundStyle(texteBouton)
            .background(Capsule().fill(couleur))
        }
        .buttonStyle(.plain)
        if etat.phase == "repos" {
          Button(intent: ReposPlus15Intent()) {
            Text(plan.t.plus15)
              .font(.chiffre(15, .bold))
              .lineLimit(1)
              .frame(width: 76, height: 40)
              .foregroundStyle(texteSecond)
              .background(Capsule().fill(fondSecond))
          }
          .buttonStyle(.plain)
        }
      }
    }
  }
}

enum ChronoTextes {
  /// Pendant le repos d'une seance : ce qui vient ensuite (« Ensuite : Squat, série 3 »)
  static func ensuite(_ s: ChronoAttributs.ContentState) -> String? {
    guard s.phase == "repos", s.rounds == 0, s.plan != nil, !s.libelle.isEmpty else { return nil }
    return s.libelle
  }

  /// Nom de la phase en clair
  static func phase(_ s: ChronoAttributs.ContentState) -> String {
    switch s.phase {
    case "repos": return NSLocalizedString("Repos", comment: "")
    case "prepa": return NSLocalizedString("Préparation", comment: "")
    default: return s.rounds > 0 ? NSLocalizedString("Round", comment: "") : (s.libelle.isEmpty ? NSLocalizedString("Effort", comment: "") : s.libelle)
    }
  }
}

/// Le temps de la phase : compte a rebours natif, ou fige en pause
struct CompteChrono: View {
  var etat: ChronoAttributs.ContentState

  var body: some View {
    if etat.enPause || etat.fin <= etat.debut {
      Text(Fmt.chrono(etat.figeS))
    } else {
      Text(timerInterval: etat.debut...etat.fin, countsDown: !etat.monte, showsHours: false)
    }
  }
}

struct BarreChrono: View {
  var etat: ChronoAttributs.ContentState
  var couleur: Color
  var fondBarre: Color

  var body: some View {
    if etat.enPause || etat.fin <= etat.debut {
      HStack(spacing: 6) {
        Image(systemName: "pause.fill").font(.system(size: 11, weight: .bold))
        Text("En pause").font(.libelle(12, .semibold))
        Spacer(minLength: 0)
      }
      .foregroundStyle(couleur)
    } else {
      ProgressView(timerInterval: etat.debut...etat.fin, countsDown: !etat.monte) {
        EmptyView()
      } currentValueLabel: {
        EmptyView()
      }
      .progressViewStyle(.linear)
      .tint(couleur)
    }
  }
}

/// Ton personnage dans un anneau qui se vide avec la phase (compte natif, sans envoi chaque seconde)
struct AvatarIle: View {
  var etat: ChronoAttributs.ContentState
  var taille: CGFloat
  /// couleur de l'anneau (vive sur fond clair, lumineuse sur l'ile)
  var couleur: Color
  var piste: Color
  /// fond derriere le personnage
  var fond: Color = Color.white

  private var image: UIImage? { ImagesW.charger(GroupeYoroi.urlPersonnage, maxPixels: taille > 30 ? 150 : 72) }

  var body: some View {
    let ep = max(2.5, taille * 0.08)
    let dedans = taille - ep * 2.6
    ZStack {
      if etat.enPause || etat.fin <= etat.debut || etat.monte {
        Circle().stroke(couleur, lineWidth: ep)
      } else {
        Circle().stroke(piste, lineWidth: ep)
        ProgressView(timerInterval: etat.debut...etat.fin, countsDown: true) {
          EmptyView()
        } currentValueLabel: {
          EmptyView()
        }
        .progressViewStyle(.circular)
        .tint(couleur)
        .frame(width: taille, height: taille)
      }
      Group {
        if let image {
          Image(uiImage: image)
            .resizable()
            .scaledToFill()
            .frame(width: dedans * 1.9, height: dedans * 1.9)
            .offset(y: dedans * 0.42)
        } else {
          Image(systemName: ThemeIle.icone(etat))
            .font(.system(size: taille * 0.36, weight: .heavy))
            .foregroundStyle(couleur)
        }
      }
      .frame(width: dedans, height: dedans)
      .background(fond)
      .clipShape(Circle())
    }
    .frame(width: taille, height: taille)
    .accessibilityHidden(true)
  }
}

/// Un segment par round (chrono) ou par serie de l'exercice en cours (seance), sinon la barre de la phase
struct SegmentsIle: View {
  var etat: ChronoAttributs.ContentState
  /// ecran verrouille (fond pastel) ou ile (fond noir)
  var surClair: Bool

  private var vif: Color { surClair ? ThemeIle.vif(etat) : ThemeIle.ile(etat) }
  private var vide: Color { surClair ? Color.white.opacity(0.65) : ThemeIle.ile(etat).opacity(0.22) }
  private var texte: Color { surClair ? ThemeIle.nuit : ThemeIle.ile(etat) }

  var body: some View {
    if etat.rounds > 1 {
      let faits = max(0, etat.phase == "repos" ? etat.round : etat.round - 1)
      segments(total: etat.rounds, faits: faits)
    } else if let plan = PlanIle.lire(etat.plan), !plan.exos.isEmpty {
      let e = plan.exos[min(max(plan.cur, 0), plan.exos.count - 1)]
      HStack(spacing: 10) {
        Text(TexteIle.remplir(NSLocalizedString("Série {0} sur {1}", comment: ""), [String(min(e.total, e.faites + 1)), String(e.total)]))
          .font(.libelle(12.5, .heavy))
          .foregroundStyle(texte)
          .lineLimit(1)
          .fixedSize()
        segments(total: e.total, faits: e.faites)
      }
    } else {
      BarreChrono(etat: etat, couleur: vif, fondBarre: vide)
    }
  }

  private func segments(total: Int, faits: Int) -> some View {
    HStack(spacing: 4) {
      ForEach(0..<max(1, min(total, 20)), id: \.self) { i in
        Capsule()
          .fill(i < faits ? vif.opacity(surClair ? 0.55 : 0.6) : (i == faits ? vif : vide))
          .frame(height: 7)
      }
    }
  }
}

struct VueChronoVerrou: View {
  var titre: String
  var etat: ChronoAttributs.ContentState

  private var vif: Color { ThemeIle.vif(etat) }

  /// « TABATA, REPOS », « HAUT DU CORPS, REPOS »
  private var caps: String {
    "\(titre), \(ChronoTextes.phase(etat))".uppercased()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .center, spacing: 12) {
        AvatarIle(etat: etat, taille: 60, couleur: vif, piste: Color.white.opacity(0.7))
        VStack(alignment: .leading, spacing: 1) {
          HStack(spacing: 4) {
            Image(systemName: ThemeIle.icone(etat))
              .font(.system(size: 10, weight: .heavy))
            Text(caps)
              .font(.system(size: 11, weight: .heavy, design: .rounded))
              .tracking(1.2)
          }
          .foregroundStyle(vif)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
          CompteChrono(etat: etat)
            .font(.chiffre(38, .heavy))
            .foregroundStyle(ThemeIle.nuit)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
          if etat.rounds > 0 {
            Text("Round \(etat.round) sur \(etat.rounds)")
              .font(.libelle(13, .heavy))
              .foregroundStyle(ThemeIle.nuit.opacity(0.8))
              .lineLimit(1)
          }
        }
        Spacer(minLength: 4)
        if let ensuite = ChronoTextes.ensuite(etat) {
          // le libelle de l'app dit deja « Ensuite : Squat, série 3 »
          Text(ensuite)
            .font(.libelle(13.5, .heavy))
            .foregroundStyle(ThemeIle.nuit)
            .multilineTextAlignment(.trailing)
            .lineLimit(2)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: 150, alignment: .trailing)
        }
      }
      SegmentsIle(etat: etat, surClair: true)
      BoutonsSeance(etat: etat, couleur: ThemeIle.nuit, texteBouton: Color.white, fondSecond: Color.white.opacity(0.75), texteSecond: ThemeIle.nuit)
    }
    .padding(16)
    .background(LinearGradient(colors: ThemeIle.fond(etat), startPoint: .topLeading, endPoint: .bottomTrailing))
  }
}
