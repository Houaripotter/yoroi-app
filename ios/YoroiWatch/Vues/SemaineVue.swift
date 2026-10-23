import SwiftUI

// Ta semaine : 7 points du lundi au dimanche, objectif X sur Y.

struct SemaineVue: View {
  @State private var synchro = Synchro.shared

  private var semaine: SemaineCtx { synchro.contexte.semaine }
  private let lettres: [String] = { var c = Calendar(identifier: .gregorian); c.locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "fr"); let s = c.veryShortStandaloneWeekdaySymbols; return Array(s[1...]) + [s[0]] }()

  private var indexAujourdhui: Int {
    let lundi = Contexte.lundiCourant()
    return Calendar.current.dateComponents([.day], from: lundi, to: Calendar.current.startOfDay(for: Date())).day ?? 0
  }

  var body: some View {
    Group {
      if !synchro.aRecuContexte && semaine.faites == 0 {
        EcranVide()
      } else {
        VStack(spacing: 8) {
          HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text("\(semaine.faites)")
              .font(.chiffre(52))
            if let o = semaine.objectif, o > 0 {
              Text("sur \(o)")
                .font(.system(size: 20, weight: .medium, design: .rounded))
                .foregroundStyle(Teinte.texteDoux)
            }
          }
          Text(semaine.faites > 1 ? NSLocalizedString("séances cette semaine", comment: "") : NSLocalizedString("séance cette semaine", comment: ""))
            .font(.system(size: 13, design: .rounded))
            .foregroundStyle(Teinte.texteDoux)

          HStack(spacing: 4) {
            ForEach(0..<7, id: \.self) { i in
              let fait = i < semaine.jours.count && semaine.jours[i]
              VStack(spacing: 3) {
                Circle()
                  .fill(fait ? Teinte.accent : Teinte.carte)
                  .overlay(Circle().stroke(i == indexAujourdhui ? Teinte.texte : Color.clear, lineWidth: 1.5))
                  .frame(width: 18, height: 18)
                Text(lettres[i])
                  .font(.system(size: 11, weight: i == indexAujourdhui ? .bold : .regular, design: .rounded))
                  .foregroundStyle(i == indexAujourdhui ? Teinte.texte : Teinte.texteDoux)
              }
              .frame(maxWidth: .infinity)
            }
          }
          .accessibilityElement(children: .ignore)
          .accessibilityLabel("\(semaine.jours.filter { $0 }.count) jours avec séance cette semaine")

          if let o = semaine.objectif, o > 0, semaine.faites >= o {
            Text("Objectif atteint")
              .font(.system(size: 13, weight: .semibold, design: .rounded))
              .foregroundStyle(Teinte.vert)
          }
        }
      }
    }
    .navigationTitle("Ta semaine")
  }
}
