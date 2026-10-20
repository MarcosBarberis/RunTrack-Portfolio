"""Genera los recursos visuales ficticios de RunTrack (logo, galería y videos).

Todo es arte generado: no hay fotos ni datos de personas reales.
Uso: python3 make_media.py <carpeta public/media>
"""
import math
import os
import random
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1]
F = "/usr/share/fonts/opentype/inter/"
GREEN, PINK, YELLOW = (34, 197, 94), (236, 72, 153), (250, 204, 21)
BG, PANEL, GRID, TEXT, MUTED = (2, 6, 23), (15, 23, 42), (30, 41, 59), (241, 245, 249), (148, 163, 184)


def font(name, size):
    return ImageFont.truetype(F + name, size)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_color(t):
    # verde -> rosa -> amarillo
    return lerp(GREEN, PINK, t * 2) if t < 0.5 else lerp(PINK, YELLOW, (t - 0.5) * 2)


# ---------------------------------------------------------------- logo
def draw_mark(d, x, y, h):
    """Tres carriles inclinados: el isotipo de RunTrack."""
    w = h * 0.22
    gap = h * 0.12
    for i, c in enumerate((GREEN, PINK, YELLOW)):
        ox = x + i * (w + gap)
        d.polygon([(ox + h * 0.35, y), (ox + h * 0.35 + w, y), (ox + w, y + h), (ox, y + h)], fill=c)
    return x + 3 * (w + gap) + h * 0.35


def logo_wide(path, scale=1.0):
    W, H = int(820 * scale), int(240 * scale)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    end = draw_mark(d, 20 * scale, 40 * scale, 160 * scale)
    f = font("InterDisplay-BlackItalic.otf", int(120 * scale))
    d.text((end + 20 * scale, 38 * scale), "Run", font=f, fill=TEXT)
    run_w = d.textlength("Run", font=f)
    d.text((end + 20 * scale + run_w, 38 * scale), "Track", font=f, fill=GREEN)
    im = im.crop(im.getbbox())
    im.save(path)


def logo_square(path, size=500):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size * 0.22, fill=BG)
    h = size * 0.5
    total = 3 * (h * 0.22 + h * 0.12) + h * 0.35
    draw_mark(d, (size - total) / 2, (size - h) / 2, h)
    im.save(path)


def favicon_svg(path):
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="14" fill="#020617"/>
<polygon points="20,16 27,16 18,48 11,48" fill="#22c55e"/>
<polygon points="31,16 38,16 29,48 22,48" fill="#ec4899"/>
<polygon points="42,16 49,16 40,48 33,48" fill="#facc15"/>
</svg>
"""
    with open(path, "w") as fh:
        fh.write(svg)


# ---------------------------------------------------------------- rutas
def route_points(seed, n=220):
    rnd = random.Random(seed)
    kind = seed % 3
    pts = []
    if kind == 0:  # circuito cerrado
        a, b = rnd.uniform(0.28, 0.36), rnd.uniform(0.2, 0.3)
        for i in range(n):
            t = 2 * math.pi * i / (n - 1)
            r = 1 + 0.12 * math.sin(3 * t + seed) + 0.06 * math.sin(7 * t)
            pts.append((0.5 + a * r * math.cos(t), 0.5 + b * r * math.sin(t)))
    elif kind == 1:  # ida y vuelta por costanera
        for i in range(n):
            t = i / (n - 1)
            u = t * 2 if t < 0.5 else 2 - t * 2
            off = 0.015 if t < 0.5 else -0.015
            x = 0.15 + 0.7 * u
            y = 0.5 + 0.18 * math.sin(u * 5 + seed) + off
            pts.append((x, y))
    else:  # recorrido urbano en cuadrícula
        x, y = 0.25, 0.7
        pts.append((x, y))
        for _ in range(14):
            if rnd.random() < 0.5:
                x = min(0.82, max(0.18, x + rnd.choice([-1, 1]) * rnd.uniform(0.06, 0.16)))
            else:
                y = min(0.8, max(0.2, y + rnd.choice([-1, 1]) * rnd.uniform(0.06, 0.14)))
            pts.append((x, y))
        # densificar
        dense = []
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            for k in range(16):
                dense.append((x1 + (x2 - x1) * k / 16, y1 + (y2 - y1) * k / 16))
        pts = dense
    return pts


def draw_map(d, box, seed):
    x0, y0, x1, y1 = box
    rnd = random.Random(seed * 7)
    d.rectangle(box, fill=PANEL)
    # manzanas / calles
    step = 70
    for gx in range(x0, x1, step):
        d.line([(gx, y0), (gx, y1)], fill=GRID, width=2)
    for gy in range(y0, y1, step):
        d.line([(x0, gy), (x1, gy)], fill=GRID, width=2)
    # parques y agua
    for _ in range(3):
        cx, cy = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        r = rnd.uniform(60, 140)
        d.ellipse([cx - r, cy - r * 0.7, cx + r, cy + r * 0.7], fill=(20, 45, 38))
    wy = rnd.uniform(y0 + 100, y1 - 100)
    d.line([(x0, wy), (x1, wy + rnd.uniform(-80, 80))], fill=(23, 37, 84), width=38)


def draw_route(im, box, pts, progress=1.0, width=10):
    x0, y0, x1, y1 = box
    W, H = x1 - x0, y1 - y0
    count = max(2, int(len(pts) * progress))
    sel = pts[:count]
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    xy = [(x0 + p[0] * W, y0 + p[1] * H) for p in sel]
    for i in range(len(xy) - 1):
        c = gradient_color(i / max(1, len(pts) - 1))
        gd.line([xy[i], xy[i + 1]], fill=c + (255,), width=width * 3)
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    im.alpha_composite(glow)
    d = ImageDraw.Draw(im)
    for i in range(len(xy) - 1):
        c = gradient_color(i / max(1, len(pts) - 1))
        d.line([xy[i], xy[i + 1]], fill=c, width=width)
    sx, sy = xy[0]
    d.ellipse([sx - 14, sy - 14, sx + 14, sy + 14], fill=TEXT, outline=GREEN, width=6)
    ex, ey = xy[-1]
    d.ellipse([ex - 16, ey - 16, ex + 16, ey + 16], fill=YELLOW, outline=BG, width=5)


GALLERY = [
    ("runners/runner-1.jpg", "Fondo suave", "Parque Sarmiento", 12.4, "5:38"),
    ("runners/runner-2.jpg", "Pasadas 6 x 400 m", "Pista municipal", 7.2, "4:51"),
    ("events/event-1.jpg", "Carrera 10K", "Circuito costanera", 10.0, "5:02"),
    ("events/event-2.jpg", "Fartlek 30'", "Costanera", 8.6, "5:20"),
    ("events/event-3.jpg", "Cuestas", "Cerro de la Cruz", 6.1, "6:12"),
    ("runners/runner-3.jpg", "Técnica de carrera", "Pista municipal", 5.0, "6:40"),
    ("runners/runner-4.jpg", "Cambios de ritmo", "Barrio Jardín", 9.3, "5:11"),
    ("runners/runner-5.jpg", "Rodaje libre", "Parque de las Tejas", 11.0, "5:45"),
    ("events/event-4.jpg", "Media maratón", "Recorrido urbano", 21.1, "5:09"),
]


def card(path, title, place, km, pace, seed, size=(1200, 1500)):
    W, H = size
    im = Image.new("RGBA", size, BG + (255,))
    d = ImageDraw.Draw(im)
    box = (0, 0, W, int(H * 0.72))
    draw_map(d, box, seed)
    draw_route(im, box, route_points(seed), 1.0, width=12)
    d = ImageDraw.Draw(im)
    # degradé inferior
    for i in range(160):
        a = int(255 * i / 160)
        d.line([(0, box[3] - 160 + i), (W, box[3] - 160 + i)], fill=BG + (a,))
    pad = 70
    y = box[3] + 10
    d.text((pad, y), title, font=font("InterDisplay-BlackItalic.otf", 84), fill=TEXT)
    d.text((pad, y + 105), place.upper(), font=font("Inter-SemiBold.otf", 34), fill=MUTED)
    mins = km * (int(pace.split(":")[0]) + int(pace.split(":")[1]) / 60)
    stats = [(f"{km:.1f}".replace(".", ","), "km"), (pace, "min/km"), (f"{int(mins // 60)}:{int(mins % 60):02d}", "h:mm")]
    sx = pad
    for value, unit in stats:
        d.text((sx, y + 175), value, font=font("Inter-Bold.otf", 64), fill=GREEN if unit == "km" else TEXT)
        d.text((sx, y + 250), unit, font=font("Inter-SemiBold.otf", 30), fill=MUTED)
        sx += 330
    # isotipo
    draw_mark(d, W - 170, 60, 70)
    im.convert("RGB").save(os.path.join(OUT, path), quality=86)


def video(path, title, seed, seconds=6, fps=24, size=(720, 1280)):
    W, H = size
    tmp = tempfile.mkdtemp()
    pts = route_points(seed, 260)
    box = (0, 160, W, H - 260)
    frames = seconds * fps
    base = Image.new("RGBA", size, BG + (255,))
    bd = ImageDraw.Draw(base)
    draw_map(bd, box, seed)
    for f in range(frames):
        t = min(1.0, f / (frames * 0.8))
        ease = 1 - (1 - t) ** 3
        im = base.copy()
        draw_route(im, box, pts, max(0.02, ease), width=9)
        d = ImageDraw.Draw(im)
        d.text((40, 50), title, font=font("InterDisplay-BlackItalic.otf", 60), fill=TEXT)
        km = 10.0 * ease
        d.text((40, H - 220), f"{km:.2f}".replace(".", ","), font=font("Inter-Bold.otf", 110), fill=GREEN)
        d.text((40, H - 90), "KM · MODO DEMO", font=font("Inter-SemiBold.otf", 34), fill=MUTED)
        draw_mark(d, W - 150, H - 200, 70)
        im.convert("RGB").save(f"{tmp}/f{f:04d}.png")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", f"{tmp}/f%04d.png",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "28", "-movflags", "+faststart", os.path.join(OUT, path)],
        check=True,
    )


if __name__ == "__main__":
    logo_wide(os.path.join(OUT, "brand/logo.png"))
    logo_square(os.path.join(OUT, "brand/logo2.png"))
    favicon_svg(os.path.join(OUT, "..", "favicon.svg"))
    for i, (p, title, place, km, pace) in enumerate(GALLERY):
        card(p, title, place, km, pace, seed=i * 11 + 3)
    video("videos/highlight.mp4", "Fondo del domingo", 3)
    video("videos/highlight2.mp4", "Circuito costanera", 4)
    video("videos/highlight3.mp4", "Recorrido urbano", 5)
    print("ok")
