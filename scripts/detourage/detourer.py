#!/usr/bin/env python3
"""Detourage des avatars YOROI (fond blanc -> transparent).

Hybride :
 1. fond exterieur = zones quasi blanches connectees au bord (flood fill, le trait noir arrete le remplissage)
 2. trous fermes (entre bras et corps, entre jambes) = zones quasi blanches non connectees au bord,
    rendues transparentes SEULEMENT si le modele IS-Net (rembg isnet-anime, specialise personnages dessines) les juge "fond"
    -> les vetements blancs (gi, kimono, queues de renard) sont conserves
 3. nettoyage des bords : alpha recalcule sur une bande de 3 px a partir de la "blancheur",
    puis decontamination de la couleur (suppression du halo blanc)
Le canevas d'origine est conserve (memes dimensions).

Usage : detourer.py ENTREE SORTIE [--exclude MOTIF ...]
  ENTREE/SORTIE : fichier .png, ou dossier (traitement recursif, arborescence reproduite,
  le sous-dossier themes/ est ignore).
"""
import sys, os, fnmatch, argparse
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.environ.get("DETOURER_MODEL", os.path.join(HERE, "models", "isnet-anime.onnx"))

BG_LOOSE = 225      # min(R,G,B) >= 225 : quasi blanc (equivalent fuzz ~12 %)
HOLE_MAX_FG = 0.35  # trou ferme rendu transparent si probabilite "personnage" moyenne < 0.35
SEED_FG = 0.5     # graine du fond exterieur
GROW = 10         # px de croissance vers le trait
GROW_FG = 0.97
PURE_MIN = 0.5     # part de pixels >= 253 pour un trou 'blanc papier'
PURE_MAX_FG = 0.98
BAND = 3            # largeur de la bande de nettoyage des bords (px)

_sess = None
def ai_mask(img):
    global _sess
    import onnxruntime as ort
    if _sess is None:
        so = ort.SessionOptions()
        so.log_severity_level = 3
        _sess = ort.InferenceSession(MODEL, so, providers=["CPUExecutionProvider"])
    x = np.asarray(img.convert("RGB").resize((1024, 1024), Image.LANCZOS), dtype=np.float32) / 255.0
    x = x / max(float(x.max()), 1e-6)
    x = x - np.array([0.485, 0.456, 0.406], np.float32)
    x = x.transpose(2, 0, 1)[None]
    out = _sess.run(None, {_sess.get_inputs()[0].name: x})[0][0, 0]
    out = (out - out.min()) / max(out.max() - out.min(), 1e-6)
    m = Image.fromarray((out * 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)
    return np.asarray(m, dtype=np.float32) / 255.0


def process(src, dst):
    img = Image.open(src).convert("RGB")
    rgb = np.asarray(img, dtype=np.float32)
    minc = rgb.min(axis=2)
    loose = minc >= BG_LOOSE

    fg = ai_mask(img)  # probabilite "personnage" (IS-Net)

    # 1. fond exterieur : flood fill depuis le bord, borne par le modele (empeche la fuite
    #    dans un vetement blanc dont le trait noir est ouvert)
    def from_border(m):
        lab, n = ndi.label(m)
        ids = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        keep = np.zeros(n + 1, bool); keep[ids[ids > 0]] = True
        return keep[lab]
    bg = from_border(loose & (fg < SEED_FG))
    # croissance geodesique jusqu'au trait (bord du masque IA un peu flou)
    bg = ndi.binary_dilation(bg, iterations=GROW, mask=loose & (fg < GROW_FG))

    # 2. trous fermes / zones blanches restantes : videes si le modele dit "fond"
    lab, n = ndi.label(loose & ~bg)
    idx = np.arange(n + 1)
    means = np.asarray(ndi.mean(fg, lab, index=idx))
    sizes = np.asarray(ndi.sum(np.ones_like(fg), lab, index=idx))
    pure = np.asarray(ndi.mean((minc >= 253).astype(np.float32), lab, index=idx))
    # trou de fond : le modele dit "fond", OU blanc pur uniforme (pas d'ombrage comme sur un
    # vetement blanc) que le modele ne classe pas franchement "personnage" (dossard = 0.99+)
    clear = (idx > 0) & (sizes >= 30) & ((means < HOLE_MAX_FG) | ((pure >= PURE_MIN) & (means < PURE_MAX_FG)))
    holes_cleared = int(clear.sum()); holes_kept = int(n - holes_cleared)
    bg |= clear[lab]

    alpha = np.where(bg, 0.0, 1.0)
    # bande de bord : alpha depuis la blancheur, puis decontamination
    band = ndi.binary_dilation(bg, iterations=BAND) & ~bg
    # couleur de reference = pixel opaque le plus proche (en general le trait noir)
    interior = ~bg & ~band
    _, (iy, ix) = ndi.distance_transform_edt(~interior, return_indices=True)
    by, bx = np.nonzero(band)
    F = rgb[iy[by, bx], ix[by, bx]]            # (k,3)
    P = rgb[by, bx]
    c = np.argmax(255.0 - F, axis=1)
    k = np.arange(len(c))
    den = 255.0 - F[k, c]
    a = np.where(den > 30, (255.0 - P[k, c]) / np.maximum(den, 1e-3), 1.0)
    a = np.clip(a, 0.0, 1.0)
    a[a < 0.06] = 0.0
    alpha[by, bx] = a
    out = rgb.copy()
    ab = a[:, None]
    col = (P - (1.0 - ab) * 255.0) / np.maximum(ab, 1e-3)
    col = np.where(ab > 0.25, col, F)          # trop transparent : on reprend la couleur du trait
    out[by, bx] = np.clip(col, 0, 255)
    out[alpha == 0] = 0

    rgba = np.dstack([out, alpha * 255.0]).round().astype(np.uint8)
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(dst, optimize=False, compress_level=6)
    return holes_cleared, holes_kept


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--exclude", nargs="*", default=[], help="motifs (chemins relatifs) a ignorer, ex: 'sports/fitness/*_f_*'")
    args = p.parse_args()
    if os.path.isfile(args.src):
        jobs = [(args.src, args.dst if not os.path.isdir(args.dst) else os.path.join(args.dst, os.path.basename(args.src)))]
    else:
        jobs = []
        for root, dirs, files in os.walk(args.src):
            dirs[:] = sorted(d for d in dirs if d != "themes")
            for f in sorted(files):
                if not f.lower().endswith(".png"):
                    continue
                rel = os.path.relpath(os.path.join(root, f), args.src)
                if any(fnmatch.fnmatch(rel, pat) for pat in args.exclude):
                    continue
                jobs.append((os.path.join(root, f), os.path.join(args.dst, rel)))
    skip = os.environ.get("DETOURER_REPRISE") == "1"
    for i, (s, d) in enumerate(jobs, 1):
        if skip and os.path.exists(d) and os.path.getmtime(d) >= os.path.getmtime(s):
            continue
        c, k = process(s, d)
        print(f"[{i}/{len(jobs)}] {d}  (trous vides: {c}, zones blanches internes gardees: {k})", flush=True)


if __name__ == "__main__":
    main()
