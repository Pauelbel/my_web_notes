#!/usr/bin/env python3
"""Сборка qa-notes: notes/<воркспейс>/<заметка>.md -> site/

Запуск:  python build.py
Нужно:   pip install markdown
"""
import hashlib
import html
import json
import math
import re
import shutil
from html.parser import HTMLParser
from pathlib import Path

import markdown

ROOT = Path(__file__).parent
NOTES_DIR = ROOT / "notes"
TEMPLATES = ROOT / "templates"
OUT = ROOT / "site"
INDEX = ROOT / "INDEX.md"  # каталог заметок для агента, пишется при каждой сборке
ABOUT = ROOT / "about.md"  # страница «Обо мне»: вне notes/, агент её не правит

# ── настройки ──────────────────────────────────────────────
SITE = "qa-notes"
AUTHOR = "Павел Белов"
AVATAR = "ПБ"
SUBTITLE = "QA · чек-листы"
GITHUB = "https://github.com/Pauelbel"
INTRO = "Граф"

STATUSES = {"done": "done", "draft": "draft", "todo": "todo"}
CHECKLIST = {"как тестировать", "чек-лист"}              # раздел-чек-лист
RISKS = {"где обычно ломается", "где ломается", "риски"}  # раздел-риски
SKIP = {"см. также", "связи"}                             # вместо него «Связанные заметки»
MONTHS = "янв фев мар апр мая июн июл авг сен окт ноя дек".split()
# ───────────────────────────────────────────────────────────

TEMPLATE = (TEMPLATES / "base.html").read_text(encoding="utf-8")
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.S)
WIKI = re.compile(r"\[\[([\w-]+)(?:\|([^\]]+))?\]\]")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
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

def section_title(folder):
    """Название раздела на сайте: title из <папка>/_section.md, иначе имя папки."""
    f = folder / "_section.md"
    if f.exists():
        m = FRONTMATTER.match(f.read_text(encoding="utf-8-sig").rstrip() + "\n")
        for line in (m.group(1).splitlines() if m else []):
            k, _, v = line.partition(":")
            if k.strip() == "title" and v.strip():
                return v.strip()
    return folder.name


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
    return {
        "path": path.relative_to(NOTES_DIR).as_posix(),
        "meta": meta,
        "slug": path.stem,
        "title": meta.get("title", path.stem),
        "ws": meta.get("category", section_title(path.parent) if path.parent != NOTES_DIR else "misc"),
        "status": status if status in STATUSES else "draft",
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
        n["broken"] = sorted(n["links"] - notes.keys())
        n["links"] &= notes.keys()
        n["links"].discard(n["slug"])
    for n in notes.values():
        back = {o["slug"] for o in notes.values() if n["slug"] in o["links"]}
        n["related"] = sorted(n["links"] | back, key=lambda s: notes[s]["title"].lower())
    return notes


def check(notes):
    """Предупреждения по заметкам: сборку не останавливают, агент читает их в выводе и правит."""
    warnings = []
    for n in notes.values():
        def warn(text):
            warnings.append(f"предупреждение: {n['path']}: {text}")
        for key in ("title", "summary"):
            if not n["meta"].get(key):
                warn(f"нет {key} во frontmatter")
        status = n["meta"].get("status", "draft")
        if status not in STATUSES:
            warn(f"неизвестный status '{status}', можно: {', '.join(STATUSES)} (собрано как draft)")
        if "/" not in n["path"]:
            warn("заметка вне раздела — спроси пользователя, в какой раздел notes/<раздел>/ её положить")
        if not SLUG.match(n["slug"]):
            warn("имя файла — латиницей через дефис (redis.md, rest-api.md); по-русски пишется title")
        for slug in n["broken"]:
            warn(f"[[{slug}]] — такой заметки нет")
    for folder in sorted({NOTES_DIR / Path(n["path"]).parent for n in notes.values()} - {NOTES_DIR}):
        if section_title(folder) == folder.name and folder.name.isascii():
            warnings.append(f"предупреждение: {folder.relative_to(NOTES_DIR).as_posix()}/: "
                            f"нет _section.md с русским title — на сайте раздел называется «{folder.name}»")
    return warnings


VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class TagCheck(HTMLParser):
    """Незакрытые и лишние теги на готовой странице: из-за них едет вёрстка."""

    def __init__(self):
        super().__init__()
        self.stack, self.errors = [], []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not any(t == tag for t, _ in self.stack):
            self.errors.append(f"строка {self.getpos()[0]}: лишний </{tag}>")
            return
        while self.stack:
            t, line = self.stack.pop()
            if t == tag:
                break
            self.errors.append(f"строка {line}: <{t}> не закрыт")


def check_page(name, text):
    """Проверка вёрстки страницы site/<name>: теги, каркас, неподставленные {{...}}."""
    checker = TagCheck()
    checker.feed(text)
    errors = checker.errors + [f"строка {line}: <{t}> не закрыт" for t, line in checker.stack]
    if "{{" in text:
        errors.append("остался неподставленный {{...}} из шаблона")
    for part in ('<main class="main">', '<aside class="sb"'):
        if part not in text:
            errors.append(f"нет {part} — сломан каркас страницы")
    return [f"предупреждение: site/{name}: вёрстка: {e}" for e in errors[:5]]


# ── markdown ───────────────────────────────────────────────

def render_md(text, notes):
    def wiki(m):
        slug, label = m.group(1), m.group(2)
        note = notes.get(slug)
        label = label or (note["title"] if note else slug)
        if note:
            return f"[{label}]({slug}.html)"
        return f'<span class="broken" title="заметки пока нет">{esc(label)}</span>'

    out = markdown.markdown(WIKI.sub(wiki, text), extensions=["fenced_code", "tables", "sane_lists"])
    return out.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")


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

    about = ABOUT.exists()
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
    if not ABOUT.exists():
        return None
    text = FRONTMATTER.sub("", ABOUT.read_text(encoding="utf-8"))
    content = f"""<div class="page"><div class="note-body">
  <div class="crumbs">about</div>
  <h1>{esc(AUTHOR)}</h1>
  <p class="lead">{esc(SUBTITLE)}</p>
  <div class="sec" style="margin-top:28px">{render_md(text, notes)}</div>
</div></div>"""
    return page(notes, title="Обо мне", description=SUBTITLE, page_kind="about", content=content)


def build_index(notes):
    """INDEX.md: разделы → заметки с title, summary и разделами — агент читает его первым."""
    groups = {}
    for n in notes.values():
        groups.setdefault(str(Path(n["path"]).parent), []).append(n)
    lines = ["# Каталог заметок", "", "Собирается `build.py` при каждой сборке — руками не править.",
             "Строка: `имя` — title: summary · разделы заметки.", ""]
    for folder in sorted(groups):
        lines.append(f"## {groups[folder][0]['ws']} ({'notes/' + folder + '/' if folder != '.' else 'notes/'})")
        for n in sorted(groups[folder], key=lambda n: n["slug"]):
            sections = [t for t, _ in split_sections(n["body"])[1] if t.lower() not in SKIP]
            lines.append(f"- `{n['slug']}` — {n['title']}: {n['summary'] or '(нет summary)'}"
                         f" · {', '.join(sections) or 'нет разделов'}")
        lines.append("")
    orphans = sorted(n["slug"] for n in notes.values() if not n["related"])
    lines += ["## Без связей", "", ", ".join(f"`{s}`" for s in orphans) or "нет", ""]
    return "\n".join(lines)


def main():
    notes = load_notes()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    assets = {}  # файл → файл?v=отпечаток: изменился файл — браузер не берёт старый из кеша
    for f in ("style.css", "graph.js", "cat.js"):
        shutil.copy(TEMPLATES / f, OUT / f)
        assets[f'"{f}"'] = f'"{f}?v={hashlib.md5((TEMPLATES / f).read_bytes()).hexdigest()[:8]}"'

    pages = {"index.html": build_graph(notes), "all.html": build_all(notes), "about.html": build_about(notes)}
    pages |= {f'{n["slug"]}.html': build_note(n, notes) for n in notes.values()}
    warnings = check(notes)
    for name, text in pages.items():
        if text:
            for old, new in assets.items():
                text = text.replace(old, new)
            (OUT / name).write_text(text, encoding="utf-8")
            warnings += check_page(name, text)

    for line in warnings:
        print(line)
    INDEX.write_text(build_index(notes), encoding="utf-8")
    print(f"собрано: {len(notes)} заметок → {OUT}, каталог → {INDEX.name}")
    print(f"предупреждений: {len(warnings)}")


if __name__ == "__main__":
    main()
