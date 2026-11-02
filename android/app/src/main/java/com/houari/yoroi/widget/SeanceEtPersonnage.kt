package com.houari.yoroi.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.view.View
import android.widget.RemoteViews
import com.houari.yoroi.R

/**
 * 30 octobre 2026 : les deux widgets de la direction B qui manquaient sur Android, toujours en style D
 * comme sur iPhone (ios/YoroiWidgets/TableauDuJour.swift, VueSeanceJour et VuePersonnage).
 * Donnees : les champs coach et dojo de l'instantane, ta scene et ton personnage deja copies par l'app
 * (setSceneImage, setPersonnageImage). Rien n'est invente : ce qui manque reste vide.
 */

/** Seance du jour : ta scene et ton personnage a gauche, la seance de ton Coach et Commencer a droite */
object VueSeanceJour : Vue {
    private val PASTILLES = intArrayOf(R.id.yw_s_m0, R.id.yw_s_m1, R.id.yw_s_m2)

    override fun construire(ctx: Context, wDp: Int, hDp: Int, d: Donnees, cls: Class<*>): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.yw_seance_d)
        v.setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, Liens.COACH))

        // le panneau de gauche (130 dp) laisse la place au texte sur un widget etroit
        val avecImage = wDp >= 230
        Rendu.montrer(v, R.id.yw_s_gauche, avecImage)
        if (avecImage) {
            val e = minOf(Rendu.echelle(ctx), 2f)
            val densite = ctx.resources.displayMetrics.density
            val r = ctx.resources.getDimension(R.dimen.yw_rayon) / densite * e
            val b = ScenePerso.composer(
                ctx, Rendu.px(130f, e), Rendu.px(hDp.toFloat(), e),
                rayons = floatArrayOf(r, r, 0f, 0f, 0f, 0f, r, r),
                margeHaut = 8f * e, margeBas = 0f, decalage = 10f * e,
                ombreRayon = 5f * e, ombreY = 4f * e, ombreAlpha = 64,
            )
            v.setImageViewBitmap(R.id.yw_s_image, b)
        }

        val co = d.inst?.coach
        if (co == null) {
            v.setTextViewText(R.id.yw_s_titre, "Ton coach")
            v.setViewVisibility(R.id.yw_s_avec, View.GONE)
            v.setViewVisibility(R.id.yw_s_vide, View.VISIBLE)
            v.setTextViewText(
                R.id.yw_s_vide,
                if (d.inst == null) ctx.getString(R.string.yw_vide) else "Choisis ton programme dans Yoroi",
            )
            return v
        }

        v.setViewVisibility(R.id.yw_s_vide, View.GONE)
        v.setViewVisibility(R.id.yw_s_avec, View.VISIBLE)
        v.setTextViewText(R.id.yw_s_titre, if (co.aujourdhui) "Ton coach t’attend" else "Jour de repos")
        v.setTextViewText(R.id.yw_s_nom, co.titre.ifEmpty { co.programme.ifEmpty { "Séance du jour" } })
        val sous = if (co.aujourdhui || co.ensuite.isEmpty()) resume(co) else co.ensuite
        Rendu.texteOuRien(v, R.id.yw_s_resume, sous)

        // jusqu'a 3 muscles en pastilles bleu, menthe, lilas ; cachees sur un widget bas
        val muscles = if (hDp >= 120) co.muscles.take(3) else emptyList()
        Rendu.montrer(v, R.id.yw_s_muscles, muscles.isNotEmpty())
        for (i in PASTILLES.indices) Rendu.texteOuRien(v, PASTILLES[i], muscles.getOrNull(i))

        v.setTextViewText(R.id.yw_s_bouton_texte, if (co.aujourdhui) "Commencer" else "Voir mon programme")
        v.setImageViewResource(R.id.yw_s_bouton_icone, if (co.aujourdhui) R.drawable.yw_d_jouer else R.drawable.yw_d_calendrier)
        v.setOnClickPendingIntent(R.id.yw_s_bouton, Liens.ouvrir(ctx, Liens.COACH))
        return v
    }

    /** « 6 exos, 45 min », comme CoachI.resume sur iPhone ; sinon le nom du programme */
    fun resume(co: CoachW): String {
        val exos = if (co.exos == 1) "1 exo" else "${co.exos} exos"
        return when {
            co.exos > 0 && co.minutes > 0 -> "$exos, ${co.minutes} min"
            co.exos > 0 -> exos
            co.minutes > 0 -> "${co.minutes} min"
            else -> co.programme
        }
    }
}

/** Ton personnage : ta scene en fond, ton personnage, ton rang et la barre vers le rang suivant */
object VuePersonnage : Vue {
    override fun construire(ctx: Context, wDp: Int, hDp: Int, d: Donnees, cls: Class<*>): RemoteViews {
        val v = RemoteViews(ctx.packageName, R.layout.yw_perso_d)
        v.setOnClickPendingIntent(android.R.id.background, Liens.ouvrir(ctx, Liens.DOJO))
        val e = minOf(Rendu.echelle(ctx), 2f)
        val densite = ctx.resources.displayMetrics.density
        val r = ctx.resources.getDimension(R.dimen.yw_rayon) / densite * e

        // capsule de verre en bas : 10 dp du bord, texte 13 sp, barre 5 dp
        val fond = ScenePerso.composer(
            ctx, Rendu.px(wDp.toFloat(), e), Rendu.px(hDp.toFloat(), e),
            rayons = floatArrayOf(r, r, r, r, r, r, r, r),
            margeHaut = 4f * e, margeBas = 44f * e, decalage = 0f,
            ombreRayon = 6f * e, ombreY = 5f * e, ombreAlpha = 77,
        )
        v.setImageViewBitmap(R.id.yw_fond_img, fond)

        val dojo = d.inst?.dojo
        v.setTextViewText(R.id.yw_p_rang, dojo?.rang?.takeIf { it.isNotEmpty() } ?: "Ton personnage")
        val barreW = (wDp - 2 * 10f - 2 * 10f).coerceAtLeast(20f)
        v.setImageViewBitmap(R.id.yw_p_barre, ScenePerso.barre(Rendu.px(barreW, e), Rendu.px(5f, e), dojo?.part ?: 0.0))
        return v
    }
}

/** Les dessins des deux widgets : ta scene recadree, ton personnage pose dessus avec son ombre, la barre du rang */
object ScenePerso {
    /** fond sans scene : peche vers lilas, comme sur iPhone */
    private val PECHE = Color.rgb(0xFF, 0xE1, 0xD6)
    private val LILAS = Color.rgb(0xEF, 0xE6, 0xF3)
    private val SOUS_SCENE = Color.rgb(0xF6, 0xEE, 0xDD)
    private val PISTE = Color.rgb(0xEC, 0xEE, 0xF5)
    private val BARRE_DEBUT = Color.rgb(0xC9, 0xB3, 0xE6)
    private val BARRE_FIN = Color.rgb(0xF4, 0xA3, 0x8C)

    /**
     * Ta scene recadree au centre (sinon le degrade peche lilas), puis ton personnage ajuste dans la zone
     * entre margeHaut et margeBas, centre en largeur, pose en bas et descendu de decalage, avec une ombre douce.
     */
    fun composer(
        ctx: Context, w: Int, h: Int, rayons: FloatArray,
        margeHaut: Float, margeBas: Float, decalage: Float,
        ombreRayon: Float, ombreY: Float, ombreAlpha: Int,
    ): Bitmap {
        val out = Bitmap.createBitmap(w.coerceAtLeast(1), h.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val c = Canvas(out)
        c.clipPath(Path().apply { addRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), rayons, Path.Direction.CW) })
        val filtre = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)

        val scene = Scene.charger(ctx)
        if (scene != null) {
            c.drawColor(SOUS_SCENE)
            c.drawBitmap(scene, centre(scene, w, h), Rect(0, 0, w, h), filtre)
            scene.recycle()
        } else {
            val p = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                shader = LinearGradient(0f, 0f, 0f, h.toFloat(), PECHE, LILAS, Shader.TileMode.CLAMP)
            }
            c.drawRect(0f, 0f, w.toFloat(), h.toFloat(), p)
        }

        val perso = Personnage.charger(ctx) ?: return out
        try {
            val zw = w.toFloat()
            val zh = (h - margeHaut - margeBas).coerceAtLeast(1f)
            val f = minOf(zw / perso.width, zh / perso.height)
            val pw = perso.width * f
            val ph = perso.height * f
            val x = (w - pw) / 2f
            val y = h - margeBas - ph + decalage
            val dst = RectF(x, y, x + pw, y + ph)
            if (ombreRayon > 0f && ombreAlpha > 0) {
                val masque = perso.extractAlpha()
                val ombre = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
                    color = Color.argb(ombreAlpha, 0, 0, 0)
                    maskFilter = BlurMaskFilter(ombreRayon, BlurMaskFilter.Blur.NORMAL)
                }
                c.drawBitmap(masque, null, RectF(dst).apply { offset(0f, ombreY) }, ombre)
                masque.recycle()
            }
            c.drawBitmap(perso, null, dst, filtre)
        } finally {
            perso.recycle()
        }
        return out
    }

    /** Barre vers le rang suivant : piste gris lavande, part faite lilas vers peche (BarreRang sur iPhone) */
    fun barre(w: Int, h: Int, part: Double): Bitmap {
        val out = Bitmap.createBitmap(w.coerceAtLeast(1), h.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val c = Canvas(out)
        val r = h / 2f
        c.drawRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), r, r, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = PISTE })
        val lw = maxOf(h.toFloat(), w * part.coerceIn(0.0, 1.0).toFloat())
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(0f, 0f, lw, 0f, BARRE_DEBUT, BARRE_FIN, Shader.TileMode.CLAMP)
        }
        c.drawRoundRect(RectF(0f, 0f, lw, h.toFloat()), r, r, p)
        return out
    }

    /** Recadrage au centre de src au rapport w sur h */
    private fun centre(src: Bitmap, w: Int, h: Int): Rect {
        val rs = src.width.toFloat() / src.height
        val rd = w.toFloat() / h
        return if (rs > rd) {
            val lw = (src.height * rd).toInt()
            val x0 = (src.width - lw) / 2
            Rect(x0, 0, x0 + lw, src.height)
        } else {
            val lh = (src.width / rd).toInt()
            val y0 = (src.height - lh) / 2
            Rect(0, y0, src.width, y0 + lh)
        }
    }
}
