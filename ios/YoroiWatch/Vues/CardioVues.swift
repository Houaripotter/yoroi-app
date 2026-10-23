import SwiftUI

// Coeur et oxygene : chiffres d'Apple Sante, sans diagnostic ni seuil d'alerte.
// Page verticale avec les deux cartes, puis un ecran detaille pour chacun.

private func minutesDepuisMinuit(_ d: Date) -> Int {
  Int(d.timeIntervalSince(Calendar.current.startOfDay(for: d)) / 60)
}

struct CardioVue: View {
  @State private var cardio = SanteCardio.shared
  @State private var routeur = Routeur.shared

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        CarteMesure(
          titre: "Cœur", icone: "heart.fill", unite: "bpm", couleur: Teinte.coeur,
          mesure: cardio.etat?.fc, enPoints: false
        ) { routeur.ouvrir(.coeur) }
        CarteMesure(
          titre: "Oxygène", icone: "lungs.fill", unite: "%", couleur: Teinte.oxygene,
          mesure: cardio.etat?.oxygene, enPoints: true, bas: 90, haut: 100, fenetre: FenetreMesure.oxygene
        ) { routeur.ouvrir(.oxygene) }
      }
    }
    .navigationTitle("Cœur et oxygène")
    .task { await cardio.actualiser() }
  }
}

/// Carte de la page : derniere valeur, heure, petite courbe du jour, plage du jour.
struct CarteMesure: View {
  var titre: String
  var icone: String
  var unite: String
  var couleur: Color
  var mesure: MesureJour?
  var enPoints: Bool
  var bas: Double? = nil
  var haut: Double? = nil
  /// Duree pendant laquelle la derniere mesure reste fraiche (chiffre blanc).
  var fenetre: TimeInterval = FenetreMesure.coeur
  var action: () -> Void

  var body: some View {
    let maintenant = Date()
    Button(action: action) {
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 4) {
          Image(systemName: icone).font(.system(size: 12, weight: .bold))
          Text(titre).font(.system(size: 13, weight: .heavy, design: .rounded))
          Spacer(minLength: 2)
          if let m = mesure {
            Text(Format.heure(m.date))
              .font(.system(size: 12, weight: .bold, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
        }
        .foregroundStyle(couleur)

        HStack(alignment: .bottom, spacing: 6) {
          HStack(alignment: .firstTextBaseline, spacing: 2) {
            Text(mesure.map { Format.entier($0.valeur) } ?? "--")
              .font(.chiffre(36, .bold))
              .foregroundStyle(mesure.map { $0.estRecente(a: maintenant, fenetre: fenetre) } == true ? Teinte.texte : Teinte.texteDoux)
            Text(unite)
              .font(.system(size: 13, weight: .bold, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
          Spacer(minLength: 0)
          if let m = mesure, !m.serieDuJour(maintenant).isEmpty {
            CourbeJour(
              serie: m.serieDuJour(maintenant), couleur: couleur, finMinutes: minutesDepuisMinuit(maintenant),
              enPoints: enPoints, epaisseur: 1.6, bas: bas, haut: haut
            )
            .frame(width: 72, height: 32)
          }
        }

        Text(ligneBas(maintenant))
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 9)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Teinte.carte, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
    .buttonStyle(StyleAppui())
  }

  private func ligneBas(_ maintenant: Date) -> String {
    guard let m = mesure else { return "Pas encore de mesure" }
    if let a = m.miniDuJour(maintenant), let b = m.maxiDuJour(maintenant) {
      return "\(Format.entier(a)) à \(Format.entier(b)) aujourd'hui"
    }
    return "Dernière mesure \(Format.quand(m.date, maintenant: maintenant))"
  }
}

struct CoeurVue: View {
  @State private var cardio = SanteCardio.shared

  var body: some View {
    MesureDetailVue(
      titre: "Cœur", icone: "heart.fill", unite: "bpm", couleur: Teinte.coeur,
      mesure: cardio.etat?.fc, enPoints: false,
      repos: cardio.etat?.repos, variabilite: cardio.etat?.variabilite, respiration: cardio.etat?.respiration,
      texteVide: "Pas encore de fréquence cardiaque. Autorise Yoroi dans Santé sur ton iPhone : Réglages, Santé, Accès aux données et appareils."
    )
    .task { await cardio.actualiser() }
  }
}

struct OxygeneVue: View {
  @State private var cardio = SanteCardio.shared

  var body: some View {
    MesureDetailVue(
      titre: "Oxygène", icone: "lungs.fill", unite: "%", couleur: Teinte.oxygene,
      mesure: cardio.etat?.oxygene, enPoints: true, bas: 90, haut: 100, fenetre: FenetreMesure.oxygene,
      texteVide: "Pas de mesure d'oxygène. Ta montre doit la mesurer et Yoroi doit y avoir accès dans Santé."
    )
    .task { await cardio.actualiser() }
  }
}

struct MesureDetailVue: View {
  var titre: String
  var icone: String
  var unite: String
  var couleur: Color
  var mesure: MesureJour?
  var enPoints: Bool
  var bas: Double? = nil
  var haut: Double? = nil
  var fenetre: TimeInterval = FenetreMesure.coeur
  var repos: ValeurDatee? = nil
  var variabilite: ValeurDatee? = nil
  var respiration: ValeurDatee? = nil
  var texteVide: String

  var body: some View {
    let maintenant = Date()
    Group {
      if let m = mesure {
        ScrollView {
          VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 5) {
              Image(systemName: icone)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(couleur)
              Text(Format.entier(m.valeur))
                .font(.chiffre(56, .bold))
                .foregroundStyle(m.estRecente(a: maintenant, fenetre: fenetre) ? Teinte.texte : Teinte.texteDoux)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
              Text(unite)
                .font(.system(size: 16, weight: .heavy, design: .rounded))
                .foregroundStyle(Teinte.texteDoux)
            }
            Text(Format.quand(m.date, maintenant: maintenant))
              .font(.system(size: 13, weight: .bold, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)

            let serie = m.serieDuJour(maintenant)
            if !serie.isEmpty {
              VStack(spacing: 2) {
                CourbeJour(
                  serie: serie, couleur: couleur, finMinutes: max(60, minutesDepuisMinuit(maintenant)),
                  enPoints: enPoints, bas: bas, haut: haut
                )
                .frame(height: 56)
                HStack {
                  Text("0 h")
                  Spacer()
                  Text(Format.heure(maintenant))
                }
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(Teinte.texte.opacity(0.32))
              }
            }

            HStack(spacing: 8) {
              tuile("Mini", m.miniDuJour(maintenant), unite: unite, couleur: Teinte.texte)
              tuile("Maxi", m.maxiDuJour(maintenant), unite: unite, couleur: Teinte.texte)
            }
            if let r = repos {
              tuileLarge("Au repos", r, unite: "bpm", maintenant: maintenant)
            }
            if let v = variabilite {
              tuileLarge("Variabilité", v, unite: "ms", maintenant: maintenant)
            }
            if let r = respiration {
              tuileLarge("Respiration", r, unite: "/min", maintenant: maintenant)
            }
            Text("Chiffres d'Apple Santé, mis à jour à chaque nouvelle mesure.")
              .font(.system(size: 11, weight: .medium, design: .rounded))
              .foregroundStyle(Teinte.texteDoux)
          }
        }
      } else {
        VStack(spacing: 8) {
          Image(systemName: icone)
            .font(.system(size: 28, weight: .bold))
            .foregroundStyle(couleur)
          Text("--")
            .font(.chiffre(44, .bold))
            .foregroundStyle(Teinte.texteDoux)
          Text(texteVide)
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)
            .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 6)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
    }
    .navigationTitle(titre)
  }

  private func tuile(_ titre: String, _ valeur: Double?, unite: String, couleur: Color) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(titre)
        .font(.system(size: 11, weight: .heavy, design: .rounded))
        .foregroundStyle(Teinte.texteDoux)
      HStack(alignment: .firstTextBaseline, spacing: 2) {
        Text(valeur.map { Format.entier($0) } ?? "--")
          .font(.chiffre(22, .bold))
          .foregroundStyle(couleur)
        Text(unite)
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
      }
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 6)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Teinte.carte, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
  }

  private func tuileLarge(_ titre: String, _ v: ValeurDatee, unite: String, maintenant: Date) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack {
        Text(titre)
        Spacer()
        Text(Format.quand(v.date, maintenant: maintenant))
      }
      .font(.system(size: 11, weight: .heavy, design: .rounded))
      .foregroundStyle(Teinte.texteDoux)
      HStack(alignment: .firstTextBaseline, spacing: 2) {
        Text(Format.entier(v.valeur))
          .font(.chiffre(22, .bold))
          .foregroundStyle(couleur)
        Text(unite)
          .font(.system(size: 11, weight: .bold, design: .rounded))
          .foregroundStyle(Teinte.texteDoux)
      }
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 6)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Teinte.carte, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
  }
}
