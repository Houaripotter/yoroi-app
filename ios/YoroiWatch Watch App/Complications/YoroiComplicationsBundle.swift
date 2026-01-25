// ============================================
// YOROI WATCH - Complications Bundle
// Enregistre toutes les complications disponibles
// ============================================

import SwiftUI
import WidgetKit

@main
struct YoroiComplicationsBundle: WidgetBundle {
    var body: some Widget {
        TimerComplication()
        RecordsComplication()
    }
}
