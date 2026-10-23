package com.houari.yoroi.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import org.json.JSONObject

/**
 * Les 6 widgets Android de Yoroi. Les noms de classe Dashboard, Hydration et Streak sont gardes
 * pour que les widgets deja poses sur l'ecran d'accueil passent au nouveau design sans etre retires.
 */
class YoroiPoidsWidget : WidgetYoroi(VuePoids)
class YoroiStreakWidget : WidgetYoroi(VueSemaine)
class YoroiHydrationWidget : WidgetYoroi(VueEau)
class YoroiCombatWidget : WidgetYoroi(VueCombat)
class YoroiChronoWidget : WidgetYoroi(VueChrono)
class YoroiDashboardWidget : WidgetYoroi(VueTableau)

abstract class WidgetYoroi(private val vue: Vue) : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val d = Donnees.charger(context)
        for (id in appWidgetIds) WidgetsYoroi.majUn(context, appWidgetManager, id, vue, javaClass, d)
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        WidgetsYoroi.majUn(context, appWidgetManager, appWidgetId, vue, javaClass, Donnees.charger(context))
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Liens.ACTION_EAU_PLUS, Liens.ACTION_EAU_MOINS -> {
                if (intent.getStringExtra(Liens.EXTRA_JETON) == Magasin.jeton(context)) {
                    WidgetsYoroi.ajouterEau(context, plus = intent.action == Liens.ACTION_EAU_PLUS)
                    WidgetsYoroi.toutMettreAJour(context)
                }
            }
            else -> super.onReceive(context, intent)
        }
    }
}

object WidgetsYoroi {
    private const val TAG = "YoroiWidgets"

    private val tous: List<Pair<Class<out AppWidgetProvider>, Vue>> = listOf(
        YoroiPoidsWidget::class.java to VuePoids,
        YoroiStreakWidget::class.java to VueSemaine,
        YoroiHydrationWidget::class.java to VueEau,
        YoroiCombatWidget::class.java to VueCombat,
        YoroiChronoWidget::class.java to VueChrono,
        YoroiDashboardWidget::class.java to VueTableau,
    )

    /** Redessine tous les widgets poses, avec les donnees du moment */
    fun toutMettreAJour(context: Context) {
        val ctx = context.applicationContext
        val mgr = AppWidgetManager.getInstance(ctx) ?: return
        val d = Donnees.charger(ctx)
        for ((cls, vue) in tous) {
            val ids = try {
                mgr.getAppWidgetIds(ComponentName(ctx, cls))
            } catch (e: Exception) {
                IntArray(0)
            }
            for (id in ids) majUn(ctx, mgr, id, vue, cls, d)
        }
    }

    fun majUn(context: Context, mgr: AppWidgetManager, id: Int, vue: Vue, cls: Class<*>, d: Donnees) {
        try {
            val (w, h) = taille(mgr, id)
            mgr.updateAppWidget(id, vue.construire(context, w, h, d, cls))
        } catch (e: Exception) {
            Log.w(TAG, "Widget $id non mis a jour", e)
        }
    }

    /** Taille en dp du widget en portrait (largeur mini, hauteur maxi) */
    private fun taille(mgr: AppWidgetManager, id: Int): Pair<Int, Int> {
        val o = mgr.getAppWidgetOptions(id)
        val w = o?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) ?: 0
        val h = o?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0) ?: 0
        return Pair(if (w > 0) w else 160, if (h > 0) h else 160)
    }

    /**
     * Un verre en plus ou en moins : l'action part dans la file (l'app l'appliquera, dedoublonnee par id)
     * et le widget l'affiche tout de suite.
     */
    fun ajouterEau(context: Context, plus: Boolean) {
        val d = Donnees.charger(context)
        val eau = d.inst?.eau ?: return
        val actuel = d.eauMl ?: 0
        val delta = if (plus) eau.verre else -minOf(eau.verre, actuel)
        if (delta == 0) return
        val action = JSONObject()
            .put("v", 1)
            .put("id", java.util.UUID.randomUUID().toString())
            .put("type", "eau")
            .put("at", Magasin.maintenantIso())
            .put("deltaMl", delta)
        Magasin.ajouterAction(context, action)
    }
}
