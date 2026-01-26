//
//  YoroiComplicationsBundle.swift
//  YoroiComplications
//
//  Bundle regroupant toutes les complications Yoroi
//

import WidgetKit
import SwiftUI

@main
struct YoroiComplicationsBundle: WidgetBundle {
    var body: some Widget {
        // 6 Complications pour le cadran Apple Watch
        StreakComplication()      // 🔥 Série d'entraînements
        WeightComplication()      // ⚖️ Poids actuel
        WorkoutsComplication()    // 💪 Séances cette semaine
        WaterComplication()       // 💧 Hydratation
        StepsComplication()       // 🚶 Pas du jour
        RankComplication()        // ⭐ Rang et niveau
    }
}
