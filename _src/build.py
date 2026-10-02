"""Build the power-amplifier teaching pages from shell.html + <page>.part.html.

Usage: python build.py
  - ../AMP-<STEM>_互動教學.html : single-file pages (everything inline, usable as a Claude Artifact)
  - ../_site/                   : static site for Vercel — index.html + one page per topic,
                                  sharing assets/series.css and assets/common.js
"""
import re
from pathlib import Path

SRC = Path(__file__).parent
OUT = SRC.parent
SITE = OUT / "_site"
SERIES = [  # (key, number, nav name, zh, single-file stem, site file)
    ("angle", "01", "CONDUCTION ANGLE", "導通角與效率", "01-ANGLE", "conduction-angle.html"),
    ("linear", "02", "LINEAR STAGE", "A／B／AB 輸出級", "02-LINEAR", "linear-stage.html"),
    ("thermal", "03", "THERMAL", "熱設計與熱奔潰", "03-THERMAL", "thermal.html"),
    ("classd", "04", "CLASS-D", "開關放大原理", "04-CLASSD", "class-d.html"),
    ("filter", "05", "OUTPUT FILTER", "輸出濾波器設計", "05-FILTER", "output-filter.html"),
    ("layout", "06", "LAYOUT · EMI", "PCB 佈線與 EMI", "06-LAYOUT", "layout-emi.html"),
    ("rf", "07", "RF PA", "射頻功率放大器", "07-RF", "rf-pa.html"),
]
SOON = [  # planned pages, shown greyed out in the nav
]
EXTERNAL = [
    ("https://dcdc-topology-series.vercel.app/", "↗ DC-DC", "拓撲系列"),
]


def parse_part(text):
    parts = re.split(r"^<!--#([A-Z0-9_]+)-->\s*$", text, flags=re.M)
    return {parts[i]: parts[i + 1].strip("\n") for i in range(1, len(parts), 2)}


def nav(current, site):
    items = ['<span class="lab">系列 Series</span>']
    home = "<b>HOME</b>系列首頁"
    if site:
        items.append(f'<span class="cur" aria-current="page">{home}</span>' if current == "home"
                     else f'<a href="./">{home}</a>')
    pages = [(no, key, name, zh, stem, f) for key, no, name, zh, stem, f in SERIES]
    pages += [(no, None, name, zh, None, None) for no, name, zh in SOON]
    for no, key, name, zh, stem, site_file in sorted(pages, key=lambda p: p[0]):
        inner = f"<b>{no} {name}</b>{zh}"
        if key is None:
            items.append(f'<span class="soon" title="規劃中 Planned">{inner}</span>')
        elif key == current:
            items.append(f'<span class="cur" aria-current="page">{inner}</span>')
        elif site:
            items.append(f'<a href="{site_file}">{inner}</a>')
        else:
            items.append(f'<a href="AMP-{stem}_互動教學.html">{inner}</a>')
    for url, b, zh in EXTERNAL:
        items.append(f'<a href="{url}" target="_blank" rel="noopener"><b>{b}</b>{zh}</a>')
    return "".join(items)


def squeeze(text):
    return "\n".join(line.strip() for line in text.splitlines() if line.strip()) + "\n"


def fill(template, fields):
    return re.sub(r"\{\{([A-Z0-9_]+)\}\}", lambda m: fields.get(m.group(1), ""), template)


def to_site(page):
    """Swap the inline shared CSS / helper script for assets/* and wrap in a full document."""
    head, body = page.split('<div class="wrap">', 1)
    head = re.sub(r"<style>.*?</style>", '<link rel="stylesheet" href="assets/series.css">', head, count=1, flags=re.S)
    head = re.sub(r"<style>\s*</style>", "", head)
    first = re.search(r"<script>.*?</script>", body, flags=re.S)
    body = body[:first.start()] + '<script src="assets/common.js"></script>' + body[first.end():]
    return ('<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + '</head>\n<body>\n<div class="wrap">' + body + "</body>\n</html>\n")


def main():
    shell = (SRC / "shell.html").read_text(encoding="utf-8-sig")
    css = (SRC / "series.css").read_text(encoding="utf-8-sig") + (SRC / "amp.css").read_text(encoding="utf-8-sig")
    common = (SRC / "common.js").read_text(encoding="utf-8-sig")
    (SITE / "assets").mkdir(parents=True, exist_ok=True)
    reset = "html{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}\n"
    (SITE / "assets" / "series.css").write_text(squeeze(reset + css), encoding="utf-8")
    (SITE / "assets" / "common.js").write_text(squeeze(common), encoding="utf-8")

    pages = [(k, no, stem, f) for k, no, _, _, stem, f in SERIES] + [("home", "", "00-HOME", "index.html")]
    for key, no, stem, site_file in pages:
        part = SRC / ("index.part.html" if key == "home" else f"{key}.part.html")
        if not part.exists():
            print("skip", part.name)
            continue
        fields = parse_part(part.read_text(encoding="utf-8-sig"))
        fields.update(CSS=css, COMMON=common,
                      EYEBROW="Power Amplifier Series" + (f" · {no}" if no else ""))
        fields["NAV"] = nav(key, site=False)
        single = fill(shell, fields)
        left = re.findall(r"\{\{[A-Z0-9_]+\}\}", single.replace(common, "").replace(css, ""))
        if left:
            raise SystemExit(f"{part.name}: unfilled {left}")
        (OUT / f"AMP-{stem}_互動教學.html").write_text(single, encoding="utf-8")
        fields["NAV"] = nav(key, site=True)
        (SITE / site_file).write_text(squeeze(to_site(fill(shell, fields))), encoding="utf-8")
        print("wrote", f"AMP-{stem}_互動教學.html", "and _site/" + site_file)
    for f in sorted(SITE.rglob("*")):
        if f.is_file():
            print(f"  {f.relative_to(SITE).as_posix():24s} {f.stat().st_size:>7,d} bytes")


if __name__ == "__main__":
    main()
