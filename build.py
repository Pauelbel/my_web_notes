#!/usr/bin/env python3
"""Сборка qa-notes: notes/<воркспейс>/<заметка>.md -> site/

Запуск:  python build.py
Нужно:   pip install markdown
"""
import html
import json
import math
import re
import shutil
from pathlib import Path

import markdown

ROOT = Path(__file__).parent
NOTES_DIR = ROOT / "notes"
TEMPLATES = ROOT / "templates"
OUT = ROOT / "site"

# ── настройки ──────────────────────────────────────────────
SITE = "qa-notes"
AUTHOR = "Павел Белов"
AVATAR = "ПБ"
SUBTITLE = "QA · чек-листы"
GITHUB = "https://github.com/Pauelbel"
INTRO = "Технология → зачем она → как бы я её тестировал"

STATUSES = {"done": "done", "draft": "draft", "todo": "todo"}
CHECKLIST = {"как тестировать", "чек-лист"}              # раздел-чек-лист
RISKS = {"где обычно ломается", "где ломается", "риски"}  # раздел-риски
SKIP = {"см. также", "связи"}                             # вместо него «Связанные заметки»
MONTHS = "янв фев мар апр мая июн июл авг сен окт ноя дек".split()
# ───────────────────────────────────────────────────────────

TEMPLATE = (TEMPLATES / "base.html").read_text(encoding="utf-8")
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.S)
WIKI = re.compile(r"\[\[([\w-]+)(?:\|([^\]]+))?\]\]")
CHECK_ITEM = re.compile(r"<li>\[( |x|X)\]\s*(.*?)</li>", re.S)


def esc(s):
    return html.escape(str(s), quote=True)


def fmt_date(iso):
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", iso or "")
    if not m:
        return iso or ""
    y, mo, d = m.groups()
    return f"{int(d)} {MONTHS[int(mo) - 1]} {y}"


# ── чтение заметок ─────────────────────────────────────────

def parse_note(path):
    text = path.read_text(encoding="utf-8")
    meta = {}
    m = FRONTMATTER.match(text)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        text = text[m.end():]
    status = meta.get("status", "draft")
    if status not in STATUSES:
        raise SystemExit(f"{path}: неизвестный status '{status}', можно: {', '.join(STATUSES)}")
    return {
        "slug": path.stem,
        "title": meta.get("title", path.stem),
        "ws": meta.get("category", path.parent.name if path.parent != NOTES_DIR else "misc"),
        "status": status,
        "summary": meta.get("summary", ""),
        "updated": meta.get("updated", ""),
        "body": text,
        "links": {m.group(1) for m in WIKI.finditer(text)},
    }


def load_notes():
    notes = {}
    for path in sorted(NOTES_DIR.rglob("*.md")):
        if path.name.startswith("_"):
            continue
        n = parse_note(path)
        if n["slug"] in notes:
            raise SystemExit(f"дубль slug '{n['slug']}': {path}")
        notes[n["slug"]] = n
    for n in notes.values():
        n["links"] &= notes.keys()
        n["links"].discard(n["slug"])
    for n in notes.values():
        back = {o["slug"] for o in notes.values() if n["slug"] in o["links"]}
        n["related"] = sorted(n["links"] | back, key=lambda s: notes[s]["title"].lower())
    return notes


# ── markdown ───────────────────────────────────────────────

def render_md(text, notes):
    def wiki(m):
        slug, label = m.group(1), m.group(2)
        note = notes.get(slug)
        label = label or (note["title"] if note else slug)
        if note:
            return f"[{label}]({slug}.html)"
        return f'<span class="broken" title="заметки пока нет">{esc(label)}</span>'

    return markdown.markdown(WIKI.sub(wiki, text), extensions=["fenced_code", "tables", "sane_lists"])


def split_sections(body):
    parts = re.split(r"^## +(.+?)\s*$", body, flags=re.M)
    return parts[0], [(parts[i].strip(), parts[i + 1]) for i in range(1, len(parts), 2)]


def slugify(s):
    s = re.sub(r"[^\w\s-]", "", s.lower()).strip()
    return re.sub(r"\s+", "-", s) or "section"


# ── куски разметки ─────────────────────────────────────────

def dot(status):
    return f'<span class="dot {status}"></span>'


def sidebar(notes, page, current=None):
    ws = {}
    for n in notes.values():
        ws.setdefault(n["ws"], []).append(n)

    def item(href, icon, label, active, count=None):
        on = " on" if active else ""
        cnt = f'<span class="cnt">{count}</span>' if count is not None else ""
        return f'<a class="it{on}" href="{href}"><i class="ti ti-{icon}"></i><span class="lbl">{esc(label)}</span>{cnt}</a>'

    groups = []
    for name in sorted(ws):
        items = sorted(ws[name], key=lambda n: n["title"].lower())
        is_cur = current is not None and current["ws"] == name
        rows = "".join(
            f'<a class="it{" on" if current and current["slug"] == n["slug"] else ""}" href="{n["slug"]}.html">'
            f'{dot(n["status"])}<span class="lbl">{esc(n["title"])}</span></a>'
            for n in items
        )
        groups.append(
            f'<div class="grp ws{"" if is_cur else " closed"}">'
            f'<button class="it grp-h" type="button"><i class="ti ti-folder"></i><span class="lbl">{esc(name)}</span>'
            f'<span class="n">· {len(items)}</span></button>'
            f'<div class="grp-b ws-notes">{rows}</div></div>'
        )

    about = (TEMPLATES.parent / "notes" / "_about.md").exists()
    return f"""  <aside class="sb" id="sb">
    <div class="sb-head">
      <div class="avatar">{esc(AVATAR)}</div>
      <div class="who"><div class="name">{esc(AUTHOR)}</div><div class="sub">{esc(SUBTITLE)}</div></div>
      <button class="icon-btn" id="sb-toggle" type="button" aria-label="Свернуть меню"><i class="ti ti-layout-sidebar-left-collapse"></i></button>
    </div>
    {item("index.html", "share", "Граф", page == "graph")}
    {item("all.html", "list", "Все заметки", page == "all", len(notes))}
    <div class="hr"></div>
    {"".join(groups)}
    <div class="sb-spacer"></div>
    <div class="hr"></div>
    {item("about.html", "user", "Обо мне", page == "about") if about else ""}
    <a class="it" href="{esc(GITHUB)}" target="_blank" rel="noopener"><i class="ti ti-brand-github"></i><span class="lbl">GitHub</span></a>
    <button class="it" type="button" data-action="theme"><i class="ti ti-contrast"></i><span class="lbl">Тема</span></button>
    <div class="it-row">
      <button class="it" type="button" data-action="cat"><i class="ti ti-cat"></i><span class="lbl">Котик</span></button>
      <button class="icon-btn feed" type="button" data-action="feed" title="Покормить котика" aria-label="Покормить котика"><i class="ti ti-fish"></i></button>
    </div>
  </aside>
  <div class="sb-resize" id="sb-resize" aria-hidden="true"></div>"""


def page(notes, *, title, description, page_kind, content, slug="", current=None, scripts=""):
    out = TEMPLATE
    for k, v in {
        "title": esc(title),
        "site": esc(SITE),
        "description": esc(description),
        "page": f"p-{page_kind}",
        "slug": esc(slug or page_kind),
        "sidebar": sidebar(notes, page_kind, current),
        "content": content,
        "scripts": scripts,
    }.items():
        out = out.replace("{{" + k + "}}", v)
    return out


# ── страницы ───────────────────────────────────────────────

def build_note(n, notes):
    intro, sections = split_sections(n["body"])
    blocks, toc, num = [], [], 0

    def head(title, aside=""):
        nonlocal num
        num += 1
        sid = slugify(title)
        toc.append((sid, title))
        return (f'<div class="sec-h" id="{sid}"><span class="num">{num:02d}</span>'
                f'<h2>{esc(title)}</h2>{aside}</div>')

    if intro.strip():
        blocks.append(f'<div class="sec">{render_md(intro, notes)}</div>')

    for title, text in sections:
        key = title.lower()
        if key in SKIP:
            continue
        body = render_md(text, notes)
        if key in CHECKLIST:
            body = CHECK_ITEM.sub(
                lambda m: (f'<li class="ck"><label><input type="checkbox"{" checked" if m.group(1).lower() == "x" else ""}>'
                           f'<span class="bx"></span><span class="tx">{m.group(2)}</span></label></li>'),
                body,
            )
            aside = ('<span class="aside"><span id="ck-count">0 / 0</span> · '
                     '<button class="ck-reset" id="ck-reset" type="button">сбросить</button></span>')
            blocks.append(head(title, aside) +
                          f'<div class="card checklist"><div class="ck-bar"><span id="ck-bar"></span></div>{body}</div>')
        elif key in RISKS:
            body = re.sub(r"<li>(.*?)</li>",
                          r'<li><i class="ti ti-alert-triangle"></i><span>\1</span></li>', body, flags=re.S)
            blocks.append(head(title) + f'<div class="card risks sec">{body}</div>')
        else:
            blocks.append(head(title) + f'<div class="sec">{body}</div>')

    words = len(re.findall(r"\w+", n["body"]))
    minutes = max(1, math.ceil(words / 180))
    meta = []
    if n["updated"]:
        meta.append(f'<span><i class="ti ti-calendar"></i>{fmt_date(n["updated"])}</span>')
    meta.append(f'<span><i class="ti ti-clock"></i>{minutes} мин</span>')

    related = ""
    if n["related"]:
        chips = "".join(
            f'<a class="chip" href="{s}.html">{dot(notes[s]["status"])}{esc(notes[s]["title"])}</a>'
            for s in n["related"]
        )
        related = f'<div class="related"><span>Связано:</span>{chips}</div>'

    toc_html = ""
    if len(toc) > 1:
        toc_html = ('<nav class="toc"><div class="toc-h">На странице</div>'
                    + "".join(f'<a href="#{sid}">{esc(t)}</a>' for sid, t in toc) + "</nav>")

    content = f"""<div class="page note">
  <article class="note-body">
    <div class="crumbs">notes / {esc(n["ws"])} / <b>{esc(n["slug"])}.md</b></div>
    <h1>{esc(n["title"])}<span class="pill {n["status"]}">{STATUSES[n["status"]]}</span></h1>
    <p class="lead">{esc(n["summary"])}</p>
    <div class="meta">{"".join(meta)}</div>
    {related}
    {"".join(blocks)}
  </article>
  {toc_html}
</div>"""
    return page(notes, title=n["title"], description=n["summary"], page_kind="note",
                content=content, slug=n["slug"], current=n)


def build_all(notes):
    rows = "".join(
        f'<a class="row" href="{n["slug"]}.html">{dot(n["status"])}'
        f'<span><span class="t">{esc(n["title"])}</span><br><span class="s">{esc(n["summary"])}</span></span>'
        f'<span class="w">{esc(n["ws"])}</span><span class="d">{esc(n["updated"])}</span></a>'
        for n in sorted(notes.values(), key=lambda n: n["updated"] or "0", reverse=True)
    )
    content = f"""<div class="page">
  <div class="crumbs">notes</div>
  <h1>Все заметки</h1>
  <p class="lead">{esc(INTRO)}. Всего: {len(notes)}.</p>
  <div class="card list">{rows}</div>
</div>"""
    return page(notes, title="Все заметки", description=INTRO, page_kind="all", content=content)


def build_graph(notes):
    pairs = sorted({tuple(sorted((a["slug"], b))) for a in notes.values() for b in a["links"]})
    data = {
        "nodes": [{"id": n["slug"], "title": n["title"], "status": n["status"], "ws": n["ws"],
                   "deg": len(n["related"])} for n in notes.values()],
        "links": [list(p) for p in pairs],
    }
    legend = "".join(f'<span>{dot(s)}{s}</span>' for s in STATUSES)
    content = f"""<div class="graph-page">
  <div class="graph-head">
    <div><h1>{esc(SITE)}</h1><p class="lead">{esc(INTRO)}</p></div>
    <div class="legend">{legend}</div>
  </div>
  <svg id="graph" aria-label="Граф связей между заметками"></svg>
  <div class="graph-tip" id="graph-tip">Тяни точки, колесо — масштаб, клик — открыть заметку</div>
  <div class="graph-tools">
    <button class="icon-btn" type="button" data-zoom="in" aria-label="Приблизить"><i class="ti ti-plus"></i></button>
    <button class="icon-btn" type="button" data-zoom="out" aria-label="Отдалить"><i class="ti ti-minus"></i></button>
    <button class="icon-btn" type="button" data-zoom="reset" aria-label="Сбросить вид"><i class="ti ti-focus-centered"></i></button>
  </div>
  <script type="application/json" id="graph-data">{json.dumps(data, ensure_ascii=False).replace("</", "<\\/")}</script>
</div>"""
    return page(notes, title="Граф", description=INTRO, page_kind="graph", content=content,
                scripts='<script src="graph.js"></script>')


def build_about(notes):
    path = NOTES_DIR / "_about.md"
    if not path.exists():
        return None
    text = FRONTMATTER.sub("", path.read_text(encoding="utf-8"))
    content = f"""<div class="page"><div class="note-body">
  <div class="crumbs">about</div>
  <h1>{esc(AUTHOR)}</h1>
  <p class="lead">{esc(SUBTITLE)}</p>
  <div class="sec" style="margin-top:28px">{render_md(text, notes)}</div>
</div></div>"""
    return page(notes, title="Обо мне", description=SUBTITLE, page_kind="about", content=content)


def main():
    notes = load_notes()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for f in ("style.css", "graph.js", "cat.js"):
        shutil.copy(TEMPLATES / f, OUT / f)

    (OUT / "index.html").write_text(build_graph(notes), encoding="utf-8")
    (OUT / "all.html").write_text(build_all(notes), encoding="utf-8")
    about = build_about(notes)
    if about:
        (OUT / "about.html").write_text(about, encoding="utf-8")
    for n in notes.values():
        (OUT / f'{n["slug"]}.html').write_text(build_note(n, notes), encoding="utf-8")

    print(f"собрано: {len(notes)} заметок → {OUT}")


if __name__ == "__main__":
    main()
