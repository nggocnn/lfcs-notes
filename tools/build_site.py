#!/usr/bin/env python3
"""Build the offline study web app (web/ + markdown) into _site/.

Usage: python3 tools/build_site.py [--out _site]
Needs the `markdown` package (pip install markdown).
"""

import argparse
import hashlib
import json
import re
import shutil
import struct
import sys
import zlib
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
REPO_URL = "https://github.com/nggocnn/lfcs-notes/blob/main/"

DOMAINS = {
    "01": {"name": "Essential Commands", "short": "Essential", "weight": 20, "color": "#eda100"},
    "02": {"name": "Operations Deployment", "short": "Operations", "weight": 25, "color": "#2a78d6"},
    "03": {"name": "Users and Groups", "short": "Users", "weight": 10, "color": "#e87ba4"},
    "04": {"name": "Networking", "short": "Networking", "weight": 25, "color": "#eb6834"},
    "05": {"name": "Storage", "short": "Storage", "weight": 20, "color": "#1baf7a"},
}
COVERAGE_DOMAIN = {
    "Ops": "02", "Operations": "02", "Networking": "04", "Storage": "05",
    "Essential": "01", "Users": "03",
}
NOTE_FILES = {p.stem[:2]: p for p in sorted(ROOT.glob("[0-9][0-9]-*.md"))}


def slugify(text):
    """GitHub-style heading anchor."""
    text = re.sub(r"<[^>]+>", "", text).strip().lower()
    text = re.sub(r"[^\w\- ]", "", text)
    return text.replace(" ", "-")


def rewrite_link(href, src):
    """Map relative markdown links to in-app routes or GitHub URLs."""
    if re.match(r"^[a-z]+:", href) or href.startswith("#"):
        return href
    path, _, frag = href.partition("#")
    target = (src.parent / path).resolve()
    try:
        rel = target.relative_to(ROOT).as_posix()
    except ValueError:
        return href
    m = re.fullmatch(r"(\d\d)-[\w-]+\.md", rel)
    if m:
        return f"#/notes/{m.group(1)}" + (f"/{frag}" if frag else "")
    m = re.fullmatch(r"labs/(\d\d)-[\w-]+\.md", rel)
    if m and frag:
        lab = re.match(r"lab-(\d)(\d+)", frag)
        if lab:
            return f"#/card/Lab {lab.group(1)}.{lab.group(2)}"
    return REPO_URL + rel + (f"#{frag}" if frag else "")


def render(md_text, src):
    html = markdown.markdown(md_text, extensions=["fenced_code", "tables"])

    def fix(m):
        return f'{m.group(1)}"{rewrite_link(m.group(2), src)}"'

    html = re.sub(r'(<a href=)"([^"]+)"', fix, html)
    # external links open outside the app
    html = re.sub(r'<a href="(https?://[^"]+)"', r'<a target="_blank" rel="noopener" href="\1"', html)
    return html


DETAILS = re.compile(r"<details><summary>[^<]*</summary>\s*(.*?)\s*</details>", re.S)


def split_details(chunk):
    """Return (front, back) where back is the first <details> body."""
    m = DETAILS.search(chunk)
    if not m:
        return chunk.strip(), ""
    return (chunk[: m.start()] + chunk[m.end():]).strip(), m.group(1).strip()


def parse_quizzes(cards):
    counts = {}
    for path in sorted((ROOT / "quizzes").glob("[0-9][0-9]-*.md")):
        dom = path.stem[:2]
        text = path.read_text()
        parts = re.split(r"^\*\*Q(\d+)\.\*\*\s*", text, flags=re.M)
        n = 0
        for i in range(1, len(parts), 2):
            num, body = parts[i], parts[i + 1]
            front, back = split_details(body)
            cards.append({
                "id": f"Q{dom}-{int(num)}", "type": "quiz", "domain": dom,
                "title": f"Quiz {dom} · Q{num}",
                "front": render(front, path), "back": render(back, path),
            })
            n += 1
        expected = text.count("<details>")
        if n != expected:
            sys.exit(f"{path}: parsed {n} questions but found {expected} <details> blocks")
        counts[path.relative_to(ROOT).as_posix()] = n
    return counts


def parse_labs(cards):
    counts = {}
    for path in sorted((ROOT / "labs").glob("[0-9][0-9]-*.md")):
        if path.stem.startswith("00"):
            continue
        dom = path.stem[:2]
        text = path.read_text()
        parts = re.split(r"^## (Lab (\d+\.\d+): .*)$", text, flags=re.M)
        n = 0
        for i in range(1, len(parts), 3):
            heading, num, body = parts[i], parts[i + 1], parts[i + 2]
            front, back = split_details(body)
            cards.append({
                "id": f"Lab {num}", "type": "lab", "domain": dom,
                "title": heading,
                "front": render(front, path), "back": render(back, path),
            })
            n += 1
        if n != text.count("<details>"):
            sys.exit(f"{path}: parsed {n} labs but found {text.count('<details>')} <details> blocks")
        counts[path.relative_to(ROOT).as_posix()] = n
    return counts


def mock_domains():
    """Map 'M1-10' -> domain code using the coverage table in PLAN.md."""
    result = {}
    for line in (ROOT / "PLAN.md").read_text().splitlines():
        cols = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cols) == 6 and cols[0] in COVERAGE_DOMAIN:
            for tok in re.findall(r"M(\d)-(\d+)", cols[5]):
                result.setdefault(f"M{tok[0]}-{tok[1]}", COVERAGE_DOMAIN[cols[0]])
    return result


def mix_domains(text):
    """Tasks are laid out in the order of the 'Domain mix:' line, e.g.
    'Essential Commands 4, Operations Deployment 5, ...' -> {1: '01', ..., 5: '02', ...}."""
    m = re.search(r"^Domain mix:(.+)$", text, re.M)
    if not m:
        return {}
    by_name = {d["name"]: code for code, d in DOMAINS.items()}
    result, num = {}, 1
    for name, count in re.findall(r"([A-Za-z ]+?)\s+(\d+)", m.group(1)):
        code = by_name.get(name.strip())
        if not code:
            return {}
        for _ in range(int(count)):
            result[num] = code
            num += 1
    return result


def split_tasks(text):
    parts = re.split(r"^\*\*Task (\d+)\*\*", text, flags=re.M)
    return {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}


def parse_mocks(cards):
    doms = mock_domains()
    counts = {}
    for path in sorted((ROOT / "mock").glob("mock-[0-9].md")):
        n_mock = path.stem.split("-")[1]
        sol_path = path.with_name(f"mock-{n_mock}-solutions.md")
        mock_text = path.read_text()
        mix = mix_domains(mock_text)
        tasks = split_tasks(mock_text)
        sols = split_tasks(sol_path.read_text())
        for num, body in sorted(tasks.items()):
            body = re.split(r"^---\s*$", body, flags=re.M)[0]
            host = re.match(r"\s*\(([^)]+)\)\.?", body)
            task_text = body[host.end():] if host else body
            sol = sols.get(num, "").lstrip(": ")
            sol = re.split(r"^---\s*$", sol, flags=re.M)[0]
            dom = mix.get(num) or doms.get(f"M{n_mock}-{num}")
            front = (f"Host: `{host.group(1)}`.\n\n" if host else "") + task_text.strip()
            cards.append({
                "id": f"M{n_mock}-T{num}", "type": "mock", "domain": dom,
                "title": f"Mock {n_mock} · Task {num}",
                "front": render(front, path), "back": render(sol.strip(), sol_path),
            })
        if len(tasks) != len(sols):
            sys.exit(f"{path}: {len(tasks)} tasks but {len(sols)} solutions")
        counts[path.relative_to(ROOT).as_posix()] = len(tasks)
    return counts


def parse_notes():
    notes = []
    for code, path in NOTE_FILES.items():
        text = path.read_text()
        title = re.search(r"^# (.+)$", text, re.M).group(1)
        body = re.sub(r"^# .+\n", "", text, count=1, flags=re.M)
        parts = re.split(r"^## (.+)$", body, flags=re.M)
        sections = [{"id": slugify(parts[i]), "title": parts[i].strip(),
                     "html": render(parts[i + 1], path)} for i in range(1, len(parts), 2)]
        notes.append({"code": code, "title": title, "intro": render(parts[0], path),
                      "sections": sections})
    return notes


def parse_plan():
    """Schedule, coverage table and status line from PLAN.md, for the Map view."""
    path = ROOT / "PLAN.md"
    text = path.read_text()
    status = re.search(r"^\*\*(Paused[^*]*)\*\*", text, re.M)
    by_name = {d["name"].lower(): code for code, d in DOMAINS.items()}

    schedule = []
    sched = text.split("## Schedule", 1)[1].split("\n## ", 1)[0]
    for m in re.finditer(r"^### Week (\d+): ([^\n]+)\n(.*?)(?=^### |\Z)", sched, re.M | re.S):
        title = m.group(2).strip()
        doms = [code for name, code in by_name.items() if name in title.lower()] or list(DOMAINS)
        items = []
        for line in re.findall(r"^- \[( |x)\] (.+)$", m.group(3), re.M):
            html = render(line[1], path).strip()
            items.append({"done": line[0] == "x", "html": re.sub(r"^<p>|</p>$", "", html)})
        schedule.append({"week": int(m.group(1)), "title": title[0].upper() + title[1:],
                         "domains": sorted(doms, key=lambda c: -DOMAINS[c]["weight"]), "items": items})

    coverage = []
    for line in text.split("## Coverage", 1)[1].split("\n## ", 1)[0].splitlines():
        cols = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cols) == 6 and cols[0] in COVERAGE_DOMAIN:
            coverage.append({"domain": COVERAGE_DOMAIN[cols[0]], "comp": cols[1], "notes": cols[2],
                             "quiz": cols[3], "labs": cols[4],
                             "mocks": "" if "labs only" in cols[5] else cols[5]})
    if not schedule or not coverage:
        sys.exit("PLAN.md: could not parse the schedule or the coverage table")
    return {"status": status.group(1).strip() if status else "", "schedule": schedule, "coverage": coverage}


# ---------- PNG icon (no image libraries needed) ----------

def make_icon(size):
    bg, fg, accent = (17, 24, 39), (229, 231, 235), (52, 211, 153)
    s = size / 512
    radius = 96 * s

    def dist_seg(px, py, ax, ay, bx, by):
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        return ((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2) ** 0.5

    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            cx, cy = x + 0.5, y + 0.5
            # rounded square mask (opaque background, rounded corners transparent)
            qx, qy = max(radius - cx, 0, cx - (size - radius)), max(radius - cy, 0, cy - (size - radius))
            inside = (qx * qx + qy * qy) ** 0.5 <= radius
            color, alpha = bg, 255 if inside else 0
            if inside:
                w = 30 * s
                d = min(dist_seg(cx, cy, 130 * s, 170 * s, 230 * s, 256 * s),
                        dist_seg(cx, cy, 230 * s, 256 * s, 130 * s, 342 * s))
                if d <= w:
                    color = accent
                elif 270 * s <= cx <= 390 * s and 312 * s <= cy <= 352 * s:
                    color = fg
            row += bytes(color) + bytes([alpha])
        rows.append(bytes(row))

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "_site"))
    out = Path(ap.parse_args().out)

    cards = []
    counts = {}
    counts.update(parse_quizzes(cards))
    counts.update(parse_labs(cards))
    counts.update(parse_mocks(cards))
    ids = [c["id"] for c in cards]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        sys.exit(f"duplicate card ids: {sorted(dupes)}")

    data = {"domains": DOMAINS, "cards": cards, "notes": parse_notes(), "plan": parse_plan(),
            "repo": REPO_URL}
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))

    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "web", out)
    (out / "data.json").write_text(payload)
    for size in (180, 192, 512):
        (out / f"icon-{size}.png").write_bytes(make_icon(size))

    h = hashlib.sha256(payload.encode())
    for f in sorted((ROOT / "web").iterdir()):
        h.update(f.read_bytes())
    version = h.hexdigest()[:12]
    for name in ("sw.js", "index.html"):
        p = out / name
        p.write_text(p.read_text().replace("__BUILD__", version))

    for name, n in counts.items():
        print(f"{n:4d}  {name}")
    print(f"{len(data['plan']['coverage']):4d}  competencies, {len(data['plan']['schedule'])} weeks (PLAN.md)")
    print(f"{len(cards):4d}  cards total, {len(data['notes'])} notes files, build {version} -> {out}")


if __name__ == "__main__":
    main()
