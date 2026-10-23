package com.houari.yoroi.widget

import android.graphics.Bitmap
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PointF
import android.graphics.Rect
import android.graphics.RectF
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Dessins des widgets dans des Bitmap (Canvas). Les calques sont blancs et recoivent leur couleur
 * par android:tint dans le layout : le theme clair ou sombre de l'ecran d'accueil est donc toujours juste.
 * Trois styles (13 octobre) : trait clair avec halo (A, en sombre), trait au pinceau (B), trait dore (C, halo en sombre).
 */
object Dessin {

    class Courbe(val ligne: Bitmap?, val courbe: Bitmap?, val point: Bitmap?)

    private fun vide(w: Int, h: Int): Bitmap = Bitmap.createBitmap(w.coerceAtLeast(1), h.coerceAtLeast(1), Bitmap.Config.ARGB_8888)

    private fun trait(epaisseur: Float): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = epaisseur
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }

    private fun plein(alpha: Int = 255): Paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        this.alpha = alpha
        style = Paint.Style.FILL
    }

    /** Lueur douce sous un trait (halo), de la meme teinte une fois colore */
    private fun lueur(epaisseur: Float, rayon: Float): Paint = trait(epaisseur).apply {
        alpha = 150
        maskFilter = BlurMaskFilter(rayon, BlurMaskFilter.Blur.NORMAL)
    }

    /** Epaisseur d'un trait de pinceau : fin a l'attaque et a la levee, un peu irregulier */
    private fun largeurPinceau(t: Float, i: Int, e: Float): Float {
        val corps = 0.35f + 0.65f * max(0.0, sin(Math.PI * t)).pow(0.6).toFloat()
        val grain = 0.08f * sin(i * 1.7).toFloat()
        return max(0.6f, e * (corps + grain))
    }

    /** Plus de points le long de la ligne, pour que le pinceau ait de la matiere */
    private fun densifier(pts: List<PointF>, pas: Float): List<PointF> {
        if (pts.size < 2) return pts
        val out = ArrayList<PointF>()
        out.add(pts[0])
        for (i in 1 until pts.size) {
            val a = pts[i - 1]
            val b = pts[i]
            val dx = b.x - a.x
            val dy = b.y - a.y
            val n = max(1, Math.ceil((sqrt(dx * dx + dy * dy) / pas).toDouble()).toInt())
            for (k in 1..n) {
                val t = k.toFloat() / n
                out.add(PointF(a.x + dx * t, a.y + dy * t))
            }
        }
        return out
    }

    /** Trait de pinceau d'epaisseur variable le long des points (a remplir) */
    private fun pinceau(source: List<PointF>, epaisseur: Float, pas: Float): Path {
        val pts = densifier(source, pas)
        val p = Path()
        if (pts.size < 2) return p
        val gauche = ArrayList<PointF>()
        val droite = ArrayList<PointF>()
        val n = pts.size
        for (i in 0 until n) {
            val a = pts[maxOf(0, i - 1)]
            val b = pts[minOf(n - 1, i + 1)]
            var dx = b.x - a.x
            var dy = b.y - a.y
            val l = max(0.0001f, sqrt(dx * dx + dy * dy))
            dx /= l
            dy /= l
            val t = i.toFloat() / (n - 1)
            val w = largeurPinceau(t, i, epaisseur) / 2f
            gauche.add(PointF(pts[i].x - dy * w, pts[i].y + dx * w))
            droite.add(PointF(pts[i].x + dy * w, pts[i].y - dx * w))
        }
        p.moveTo(gauche[0].x, gauche[0].y)
        for (q in gauche.drop(1)) p.lineTo(q.x, q.y)
        for (q in droite.reversed()) p.lineTo(q.x, q.y)
        p.close()
        return p
    }

    /** Arc trace d'un geste, depuis midi, part de 0 a 1 */
    private fun arcPinceau(cx: Float, cy: Float, rayon: Float, part: Float, epaisseur: Float): Path {
        val p = Path()
        val f = part.coerceIn(0f, 1f)
        if (f <= 0.001f) return p
        val n = maxOf(12, (72 * f).toInt())
        val dehors = ArrayList<PointF>()
        val dedans = ArrayList<PointF>()
        for (i in 0..n) {
            val t = i.toFloat() / n
            val a = Math.toRadians(-90.0 + 360.0 * f * t)
            val w = largeurPinceau(t, i, epaisseur) / 2f
            dehors.add(PointF(cx + (cos(a) * (rayon + w)).toFloat(), cy + (sin(a) * (rayon + w)).toFloat()))
            dedans.add(PointF(cx + (cos(a) * (rayon - w)).toFloat(), cy + (sin(a) * (rayon - w)).toFloat()))
        }
        p.moveTo(dehors[0].x, dehors[0].y)
        for (q in dehors.drop(1)) p.lineTo(q.x, q.y)
        for (q in dedans.reversed()) p.lineTo(q.x, q.y)
        p.close()
        return p
    }

    /** Courbe 30 jours : la serie de tes pesees, le rythme prevu en tirets, et ton dernier point */
    fun courbe(
        serie: List<PointKg>, ligne: List<PointKg>, auj: LocalDate, w: Int, h: Int, densite: Float,
        style: StyleW = StyleW.A, sombre: Boolean = false,
    ): Courbe {
        if (w < 8 || h < 8 || (serie.isEmpty() && ligne.isEmpty())) return Courbe(null, null, null)
        val debut = auj.minusDays(29)
        val tous = (serie + ligne).filter { !it.jour.isBefore(debut) && !it.jour.isAfter(auj) }
        if (tous.isEmpty()) return Courbe(null, null, null)
        var min = tous.minOf { it.kg }
        var max = tous.maxOf { it.kg }
        if (max - min < 1.0) {
            val milieu = (max + min) / 2
            min = milieu - 0.5
            max = milieu + 0.5
        }
        val marge = (max - min) * 0.12
        min -= marge
        max += marge
        val bord = 6f * densite
        val largeur = w - 2 * bord
        val hauteur = h - 2 * bord
        fun x(j: LocalDate): Float = bord + largeur * (ChronoUnit.DAYS.between(debut, j).toFloat() / 29f)
        fun y(kg: Double): Float = bord + hauteur * ((max - kg) / (max - min)).toFloat()

        val dans = { p: PointKg -> !p.jour.isBefore(debut) && !p.jour.isAfter(auj) }

        // rythme prevu en tirets (touches de pinceau sec pour le rouleau)
        val lignePts = ligne.filter(dans)
        val bLigne: Bitmap? = if (lignePts.size >= 2) {
            vide(w, h).also { b ->
                val c = Canvas(b)
                val p = if (style == StyleW.B) {
                    trait(2.2f * densite).apply { pathEffect = DashPathEffect(floatArrayOf(2.5f * densite, 5f * densite), 0f) }
                } else {
                    trait(1.4f * densite).apply { pathEffect = DashPathEffect(floatArrayOf(3f * densite, 4f * densite), 0f) }
                }
                val path = Path()
                lignePts.forEachIndexed { i, pt -> if (i == 0) path.moveTo(x(pt.jour), y(pt.kg)) else path.lineTo(x(pt.jour), y(pt.kg)) }
                c.drawPath(path, p)
            }
        } else null

        // ta courbe : pinceau (B), trait doux avec halo la nuit (A, C)
        val seriePts = serie.filter(dans)
        val bCourbe: Bitmap? = if (seriePts.size >= 2) {
            vide(w, h).also { b ->
                val c = Canvas(b)
                if (style == StyleW.B) {
                    val pts = seriePts.map { PointF(x(it.jour), y(it.kg)) }
                    c.drawPath(pinceau(pts, 4.8f * densite, 3f * densite), plein())
                } else {
                    val path = Path()
                    var px = 0f
                    var py = 0f
                    seriePts.forEachIndexed { i, pt ->
                        val cx = x(pt.jour)
                        val cy = y(pt.kg)
                        if (i == 0) {
                            path.moveTo(cx, cy)
                        } else {
                            val mx = (px + cx) / 2f
                            path.cubicTo(mx, py, mx, cy, cx, cy)
                        }
                        px = cx
                        py = cy
                    }
                    if (sombre) c.drawPath(path, lueur(5f * densite, 3.5f * densite))
                    c.drawPath(path, trait(2.3f * densite))
                }
            }
        } else null

        // le dernier point (calque teinte a part)
        val bPoint: Bitmap? = seriePts.lastOrNull()?.let { dernier ->
            vide(w, h).also { b ->
                val c = Canvas(b)
                c.drawCircle(x(dernier.jour), y(dernier.kg), (if (style == StyleW.B) 5f else 4.2f) * densite, plein())
            }
        }
        return Courbe(bLigne, bCourbe, bPoint)
    }

    /** Anneau de l'eau : la piste et l'arc vers l'objectif (null si rien encore) */
    fun anneau(taille: Int, epaisseur: Float, fraction: Float, style: StyleW = StyleW.A, sombre: Boolean = false): Pair<Bitmap, Bitmap?> {
        val t = taille.coerceAtLeast(8)
        val marge = epaisseur * (if (style == StyleW.B) 0.8f else 0.5f) + (if (sombre && style == StyleW.A) epaisseur * 0.6f else 0f)
        val rect = RectF(marge, marge, t - marge, t - marge)
        val piste = vide(t, t).also { b ->
            val c = Canvas(b)
            when (style) {
                StyleW.B -> c.drawOval(rect, trait(maxOf(1f, epaisseur * 0.35f)))
                StyleW.C -> {
                    c.drawOval(rect, trait(epaisseur))
                    val i = epaisseur * 1.4f
                    c.drawOval(RectF(rect.left + i, rect.top + i, rect.right - i, rect.bottom - i), trait(maxOf(1f, epaisseur * 0.12f)))
                }
                StyleW.A -> c.drawOval(rect, trait(epaisseur))
            }
        }
        val f = fraction.coerceIn(0f, 1f)
        val arc = if (f > 0f) vide(t, t).also { b ->
            val c = Canvas(b)
            if (style == StyleW.B) {
                c.drawPath(arcPinceau(t / 2f, t / 2f, rect.width() / 2f, f, epaisseur * 1.3f), plein())
            } else {
                if (sombre && style == StyleW.A) c.drawArc(rect, -90f, 360f * f, false, lueur(epaisseur * 1.2f, epaisseur * 0.6f))
                c.drawArc(rect, -90f, 360f * f, false, trait(epaisseur))
            }
        } else null
        return Pair(piste, arc)
    }

    /**
     * Petit torii : le corps vermillon (couleur fixe) et le linteau du haut en calque blanc teinte
     * (noir sur fond clair, vermillon sombre sur fond sombre).
     */
    fun torii(w: Int, h: Int): Pair<Bitmap, Bitmap> {
        val rouge = vide(w, h)
        val haut = vide(w, h)
        val s = minOf(w / 24f, h / 20f)
        val ox = (w - 24f * s) / 2f
        val oy = (h - 20f * s) / 2f
        fun px(v: Float) = ox + v * s
        fun py(v: Float) = oy + v * s

        val kasagi = Path().apply {
            moveTo(px(0.4f), py(1.6f))
            quadTo(px(12f), py(3.4f), px(23.6f), py(1.6f))
            lineTo(px(23f), py(4.4f))
            quadTo(px(12f), py(5.6f), px(1f), py(4.4f))
            close()
        }
        Canvas(haut).drawPath(kasagi, plein())

        val vermillon = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFE0452B.toInt(); style = Paint.Style.FILL }
        val c = Canvas(rouge)
        c.drawRect(px(2.6f), py(5.2f), px(21.4f), py(6.6f), vermillon) // shimaki
        c.drawRect(px(11.2f), py(6.6f), px(12.8f), py(8.6f), vermillon) // gakuzuka
        c.drawRect(px(2.8f), py(8.6f), px(21.2f), py(10.2f), vermillon) // nuki
        val gauche = Path().apply {
            moveTo(px(5.4f), py(5.2f)); lineTo(px(7.4f), py(5.2f)); lineTo(px(7.0f), py(19.8f)); lineTo(px(4.6f), py(19.8f)); close()
        }
        val droite = Path().apply {
            moveTo(px(16.6f), py(5.2f)); lineTo(px(18.6f), py(5.2f)); lineTo(px(19.4f), py(19.8f)); lineTo(px(17.0f), py(19.8f)); close()
        }
        c.drawPath(gauche, vermillon)
        c.drawPath(droite, vermillon)
        return Pair(rouge, haut)
    }

    /** Bandeau de la scene : recadre au centre, coins du haut arrondis (ou tous les coins : fenetre du style B) */
    fun banniere(src: Bitmap, w: Int, h: Int, rayon: Float, tousLesCoins: Boolean = false): Bitmap {
        val out = vide(w, h)
        val c = Canvas(out)
        val bas = if (tousLesCoins) rayon else 0f
        val forme = Path().apply {
            addRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), floatArrayOf(rayon, rayon, rayon, rayon, bas, bas, bas, bas), Path.Direction.CW)
        }
        c.clipPath(forme)
        c.drawBitmap(src, zone(src, w, h), Rect(0, 0, w, h), Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG))
        return out
    }

    /** Fond plein du style A : ta scene recadree au centre, les quatre coins arrondis (utile avant Android 12) */
    fun recadre(src: Bitmap, w: Int, h: Int, rayon: Float): Bitmap = banniere(src, w, h, rayon, tousLesCoins = true)

    private fun zone(src: Bitmap, w: Int, h: Int): Rect {
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
