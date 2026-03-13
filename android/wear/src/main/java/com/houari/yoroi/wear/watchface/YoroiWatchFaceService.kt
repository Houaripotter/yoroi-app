package com.houari.yoroi.wear.watchface

import androidx.wear.watchface.WatchFaceService

/**
 * YoroiWatchFaceService
 *
 * Service minimal requis pour enregistrer le cadran.
 * La définition visuelle complète est dans res/raw/yoroi_watchface.xml
 * via le Watch Face Format (WFF) déclaratif.
 *
 * Wear OS lit automatiquement le XML via la meta-data WATCH_FACE_DRAWABLE.
 */
class YoroiWatchFaceService : WatchFaceService()
