// ============================================
// YOROI WATCH - Widget Bundle
// Enregistre toutes les complications
// ============================================

import WidgetKit
import SwiftUI

@main
struct YoroiWidgetBundle: WidgetBundle {
    var body: some Widget {
        HydrationComplication()
        StreakComplication()
        StepsComplication()
        TimerComplication()
    }
}
