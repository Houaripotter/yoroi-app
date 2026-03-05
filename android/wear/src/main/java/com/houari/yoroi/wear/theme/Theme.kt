package com.houari.yoroi.wear.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color

// Couleurs Yoroi (identiques a l'app iPhone et Apple Watch)
val Gold = Color(0xFFD4AF37)
val GoldDark = Color(0xFF8B7023)
val Cyan = Color(0xFF06B6D4)
val Green = Color(0xFF10B981)
val Red = Color(0xFFEF4444)
val Orange = Color(0xFFF97316)
val Purple = Color(0xFF8B5CF6)
val NightBg = Color(0xFF0F1729)
val NightMid = Color(0xFF2563EB)
val NightLight = Color(0xFF60A5FA)
val MoonColor = Color(0xFFFBC023)

// --- Dark mode colors (default) ---
val WatchBgDark = Color(0xFF000000)
val CardBgDark = Color(0xFF1C1C1E)
val TextPrimaryDark = Color.White
val TextSecondaryDark = Color(0xFF8E8E93)
val DividerDark = Color(0xFF2C2C2E)

// --- Light mode colors ---
val WatchBgLight = Color(0xFFFFFFFF)
val CardBgLight = Color(0xFFF2F2F7)
val TextPrimaryLight = Color(0xFF1A1A1A)
val TextSecondaryLight = Color(0xFF737373)
val DividerLight = Color(0xFFE5E5EA)

// Legacy aliases (dark mode)
val WatchBg = WatchBgDark
val CardBg = CardBgDark
val TextPrimary = TextPrimaryDark
val TextSecondary = TextSecondaryDark
val Divider = DividerDark

/**
 * Dynamic theme colors that adapt to light/dark mode.
 * Uses synced colors from the phone app when available.
 */
data class YoroiWatchColors(
    val bg: Color,
    val cardBg: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val divider: Color,
    val textOnAccent: Color,
    val isDark: Boolean
)

@Composable
fun rememberWatchColors(isDarkMode: Boolean): YoroiWatchColors {
    return remember(isDarkMode) {
        if (isDarkMode) {
            YoroiWatchColors(
                bg = WatchBgDark,
                cardBg = CardBgDark,
                textPrimary = TextPrimaryDark,
                textSecondary = TextSecondaryDark,
                divider = DividerDark,
                textOnAccent = Color.Black,
                isDark = true
            )
        } else {
            YoroiWatchColors(
                bg = WatchBgLight,
                cardBg = CardBgLight,
                textPrimary = TextPrimaryLight,
                textSecondary = TextSecondaryLight,
                divider = DividerLight,
                textOnAccent = Color.White,
                isDark = false
            )
        }
    }
}

/**
 * Creates theme colors from synced hex values from the phone app.
 */
@Composable
fun rememberSyncedWatchColors(
    bgHex: String,
    cardBgHex: String,
    textPrimaryHex: String,
    textSecondaryHex: String,
    dividerHex: String,
    textOnAccentHex: String,
    isDarkMode: Boolean
): YoroiWatchColors {
    return remember(bgHex, cardBgHex, textPrimaryHex, textSecondaryHex, dividerHex, textOnAccentHex, isDarkMode) {
        YoroiWatchColors(
            bg = parseHexColor(bgHex, if (isDarkMode) WatchBgDark else WatchBgLight),
            cardBg = parseHexColor(cardBgHex, if (isDarkMode) CardBgDark else CardBgLight),
            textPrimary = parseHexColor(textPrimaryHex, if (isDarkMode) TextPrimaryDark else TextPrimaryLight),
            textSecondary = parseHexColor(textSecondaryHex, if (isDarkMode) TextSecondaryDark else TextSecondaryLight),
            divider = parseHexColor(dividerHex, if (isDarkMode) DividerDark else DividerLight),
            textOnAccent = parseHexColor(textOnAccentHex, Color.White),
            isDark = isDarkMode
        )
    }
}

/**
 * Parse a hex color string (e.g. "#D4AF37") into a Compose Color.
 * Falls back to Gold if parsing fails.
 */
fun parseHexColor(hex: String, fallback: Color = Gold): Color {
    return try {
        val h = hex.trimStart('#')
        if (h.length == 6) {
            Color(
                red = h.substring(0, 2).toInt(16) / 255f,
                green = h.substring(2, 4).toInt(16) / 255f,
                blue = h.substring(4, 6).toInt(16) / 255f
            )
        } else fallback
    } catch (_: Exception) {
        fallback
    }
}
