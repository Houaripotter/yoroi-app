//
//  YoroiTimerWidgetBundle.swift
//  YoroiTimerWidget
//
//  Created by Houari BOUKEROUCHA on 25/01/2026.
//

import WidgetKit
import SwiftUI

@main
struct YoroiTimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        YoroiTimerWidget()
        YoroiTimerWidgetLiveActivity()

        // YoroiTimerWidgetControl nécessite iOS 18.0+
        // Décommenté quand tu upgrades le deployment target
        // if #available(iOS 18.0, *) {
        //     YoroiTimerWidgetControl()
        // }
    }
}
