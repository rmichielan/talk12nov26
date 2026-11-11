"""Build the offline, self-contained presentation.

Run ``python generate.py`` to write the configured outputs, or ``python
generate.py --check`` to verify that the checked-in outputs are up to date.
"""
import argparse
import base64
import html
import json
import mimetypes
import re
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
CONTROLLER_TOKEN = "  /* @CONTROLLER_REGISTRY@ */"
LOGO_TOKEN = "__MSCA_PF_LOGO__"


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def safe_relative_path(value, description):
    require(isinstance(value, str) and value.strip(),
            f"{description} must be a non-empty relative path")
    path = Path(value)
    require(not path.is_absolute() and ".." not in path.parts,
            f"{description} must be a path inside the project: {value!r}")
    return path


def escaped(value, description):
    require(isinstance(value, str) and value.strip(),
            f"Missing or invalid {description}")
    return html.escape(value, quote=True)


def load_config():
    config = json.loads(read("src/presentation.json"))
    require(isinstance(config, dict), "src/presentation.json must contain an object")

    branding = {
        "title": escaped(config.get("title"), "presentation title"),
        "language": escaped(config.get("language"), "presentation language"),
        "logo_alt": escaped(config.get("logo_alt"), "logo description"),
    }

    logo_path = safe_relative_path(config.get("logo", ""), "Logo")
    logo_file = ROOT / logo_path
    require(logo_file.is_file(), f"Configured logo file does not exist: {logo_path}")
    media_type, _ = mimetypes.guess_type(logo_file.name)
    require(media_type is not None and media_type.startswith("image/"),
            f"Configured logo must be a supported image: {logo_path}")
    logo_data = base64.b64encode(logo_file.read_bytes()).decode("ascii")
    branding["logo_css"] = f'url("data:{media_type};base64,{logo_data}")'

    cover = config.get("cover")
    require(isinstance(cover, dict), "Presentation config needs a cover object")
    title_lines = cover.get("title_lines")
    require(isinstance(title_lines, list) and title_lines,
            "Cover title_lines must be a non-empty list")
    formatted_lines = []
    for line in title_lines:
        require(isinstance(line, dict), "Each cover title line must be an object")
        text = escaped(line.get("text"), "cover title line")
        if line.get("emphasis", False):
            text = f"<em>{text}</em>"
        formatted_lines.append(text)

    areas = cover.get("areas")
    require(isinstance(areas, list) and areas,
            "Cover areas must be a non-empty list")
    branding.update({
        "__COVER_EYEBROW__": escaped(cover.get("eyebrow"), "cover eyebrow"),
        "__COVER_INSTITUTION__": escaped(cover.get("institution"), "cover institution"),
        "__COVER_TITLE__": "<br>".join(formatted_lines),
        "__COVER_AREAS__": ' <span class="kicker-separator">/</span> '.join(
            escaped(area, "cover area") for area in areas
        ),
        "__COVER_SPEAKER_FIRST__": escaped(cover.get("speaker_first"), "speaker first name"),
        "__COVER_SPEAKER_LAST__": escaped(cover.get("speaker_last"), "speaker last name"),
        "__COVER_SEMINAR__": escaped(cover.get("seminar"), "cover seminar"),
        "__COVER_DEPARTMENT__": escaped(cover.get("department"), "cover department"),
    })

    project = config.get("project")
    require(isinstance(project, dict), "Presentation config needs a project object")
    website = escaped(project.get("website"), "project website")
    require(website.startswith(("https://", "http://")),
            "Project website must use http:// or https://")
    branding.update({
        "__PROJECT_SUPERVISOR__": escaped(project.get("supervisor"), "project supervisor"),
        "__PROJECT_PERIOD__": escaped(project.get("period"), "project period"),
        "__PROJECT_HOST__": escaped(project.get("host"), "project host institute"),
        "__PROJECT_WEBSITE__": website,
        "__PROJECT_WEBSITE_LABEL__": escaped(
            project.get("website_label"), "project website label"
        ),
    })

    paper = config.get("paper")
    require(isinstance(paper, dict), "Presentation config needs a paper object")
    paper_url = escaped(paper.get("url"), "paper URL")
    require(paper_url.startswith("https://arxiv.org/abs/"), "Paper URL must point to an arXiv abstract")
    branding.update({
        "__PAPER_TITLE__": escaped(paper.get("title"), "paper title"),
        "__PAPER_AUTHORS__": escaped(paper.get("authors"), "paper authors"),
        "__PAPER_ID__": escaped(paper.get("arxiv_id"), "arXiv identifier"),
        "__PAPER_URL__": paper_url,
        "__PAPER_NOTE__": escaped(paper.get("note"), "paper version note"),
    })

    outputs = config.get("outputs")
    require(isinstance(outputs, list) and outputs,
            "Presentation outputs must be a non-empty list")
    output_paths = [safe_relative_path(output, "Output") for output in outputs]
    require(all(path.suffix.lower() == ".html" for path in output_paths),
            "Presentation outputs must be HTML files")
    require(len(set(output_paths)) == len(output_paths),
            "Presentation output paths must be unique")
    branding["outputs"] = output_paths
    return branding


def assemble_math(document):
    assets = json.loads(read("math_assets.json"))
    replacement = {
        '<span class="math">τ</span>':
            '<span class="math latex" data-tex="tau">' + assets["tau"]["svg"] + "</span>",
        '<span class="math">d</span>':
            '<span class="math latex" data-tex="d">' + assets["dimension"]["svg"] + "</span>",
        '<div class="formula" data-tex="N_{\\\\mathrm{hub}} \\\\sim n^{3(3-\\\\tau)/2}">'
        "N<sub>hub</sub> ∼ n<sup>3(3−τ)/2</sup></div>":
            '<div class="formula latex" data-tex="N_hub">' + assets["hub"]["svg"] + "</div>",
        '<div class="formula" data-tex="N_{\\\\mathrm{geom}} \\\\sim n">'
        "N<sub>geom</sub> ∼ n</div>":
            '<div class="formula latex" data-tex="N_geom">' + assets["geo"]["svg"] + "</div>",
    }
    for old, new in replacement.items():
        document = document.replace(old, new)
    return document


def assemble_irg_assets(document):
    """Render all new TeX once at build time; no network or fonts at runtime."""
    tex = list(dict.fromkeys(html.unescape(t) for t in re.findall(r'data-math="([^"]+)"', document)))
    cache_path = ROOT / "math_block_c.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    missing = [t for t in tex if t not in cache]
    if missing:
        result = subprocess.run(["node", str(ROOT / "scripts/render_math.cjs")], input=json.dumps(missing), text=True, capture_output=True, check=True)
        cache.update(json.loads(result.stdout))
        cache_path.write_text(json.dumps(cache), encoding="utf-8")
    def formula(match):
        raw = match.group(1)
        return match.group(0).replace("></span>", ">" + cache[html.unescape(raw)] + "</span>")
    document = re.sub(r'<span class="tex[^"]*" data-math="([^"]+)"></span>', formula, document)
    def asset(match):
        path = ROOT / match.group(1)
        kind = mimetypes.guess_type(path.name)[0]
        data = base64.b64encode(path.read_bytes()).decode()
        return 'src="data:' + kind + ';base64,' + data + '"'
    document = re.sub(r'data-asset="([^"]+)"', asset, document)
    document = document.replace("__WEBSITE_QR__", read("src/assets/website-qr.svg"))
    return document


def load_manifest():
    manifest = json.loads(read("src/slides/manifest.json"))
    require(isinstance(manifest, list) and manifest,
            "Slide manifest must be a non-empty list")
    ids, names, keys = [], [], []
    for slide in manifest:
        require(isinstance(slide, dict), "Every manifest entry must be an object")
        for field in ("id", "name", "key", "reveals", "controller"):
            require(field in slide, f"Manifest entry is missing {field!r}: {slide}")
        require(isinstance(slide["id"], int) and not isinstance(slide["id"], bool),
                f"Invalid slide id: {slide['id']!r}")
        require(
                isinstance(slide["reveals"], int)
                and not isinstance(slide["reveals"], bool)
                and slide["reveals"] >= 0,
                f"Invalid reveal count for slide {slide['id']}")
        for field in ("name", "key", "controller"):
            require(isinstance(slide[field], str) and slide[field],
                    f"Invalid {field} for slide {slide['id']}")
        require(
            re.fullmatch(r"\d{2}-[a-z0-9-]+", slide["name"]) is not None,
            f"Invalid slide source name: {slide['name']!r}",
        )
        require(
            re.fullmatch(r"[a-z0-9-]+", slide["key"]) is not None,
            f"Invalid slide key: {slide['key']!r}",
        )
        require(
            re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", slide["controller"]) is not None,
            f"Invalid controller identifier: {slide['controller']!r}",
        )
        ids.append(slide["id"])
        names.append(slide["name"])
        keys.append(slide["key"])
        for suffix in ("html", "js"):
            path = SRC / "slides" / f"{slide['name']}.{suffix}"
            require(path.is_file(), f"Slide {slide['id']} source is missing: {path}")

    require(ids == list(range(1, len(manifest) + 1)),
            "Slide IDs must be unique and contiguous, starting at 1")
    for values, label in ((names, "names"), (keys, "keys")):
        require(len(values) == len(set(values)), f"Manifest slide {label} must be unique")
    return manifest


def build_document():
    config = load_config()
    manifest = load_manifest()
    source_order = (
        ["src/core/viewport.js", "src/core/runtime.js", "src/core/animation-utils.js",
         "src/components/network-renderer.js", "src/components/network-continuity.js",
         "src/components/research-wheel.js", "src/components/irg-visuals.js", "src/components/alias-construction.js"]
        + [f"src/slides/{slide['name']}.js" for slide in manifest]
        + ["src/core/vertical-details.js", "src/core/presentation.js"]
    )
    registry = (
        "  const SLIDES="
        + json.dumps(
            [{"id": slide["id"], "key": slide["key"], "reveals": slide["reveals"]}
             for slide in manifest],
            separators=(",", ":"),
        )
        + ";\n  const slideCount=SLIDES.length;\n  const slideMeta=id=>SLIDES[id-1];\n"
    )
    controllers = (
        "  const sceneControllers={"
        + ",".join(
            json.dumps(slide["key"]) + ":" + slide["controller"]
            for slide in manifest
        )
        + "};"
    )

    css = "\n".join(read(path) for path in (
        "src/styles/cover.css", "src/styles/theme.css",
        "src/styles/layout.css", "src/styles/controls.css", "src/styles/paine.css",
        "src/styles/research-wheel.css", "src/styles/irg.css", "src/styles/alias.css",
    ))
    require(css.count(LOGO_TOKEN) == 1,
            f"Expected exactly one {LOGO_TOKEN} token in the styles")
    css = css.replace(LOGO_TOKEN, config["logo_css"])

    modules = "\n".join(read(path) for path in source_order)
    require(modules.count(CONTROLLER_TOKEN) == 1,
            f"Expected exactly one controller registry token: {CONTROLLER_TOKEN}")
    js = registry + "\n" + modules.replace(CONTROLLER_TOKEN, controllers)

    document = (
        '<!doctype html><html lang="__LANGUAGE__"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        "<title>__DECK_TITLE__</title><style>"
        + css
        + '</style></head><body><div id="deck-viewport"><div id="deck-frame">'
        + read("src/slides/00-cover.html").strip()
        + read("src/components/split-overlay.html").strip()
        + "\n".join(read(f"src/slides/{slide['name']}.html").strip()
                    for slide in manifest[1:])
        + read("src/slides/extra-alias.html") + read("src/slides/extra-ebus.html")
        + "</main></div></div>"
        + read("src/components/controls.html")
        + "<script>" + read("src/components/weight-palette.js") + "</script>"
        + "<script>" + read("src/models/cover-network.js") + "</script>"
        + "<script>" + read("src/models/graph-model.js") + "</script>"
        + "<script>" + read("src/models/irg-sampling.js") + "</script>"
        + "<script>(()=>{'use strict';\n" + js + "\n})();</script></body></html>"
    )

    replacements = {
        "__LANGUAGE__": config["language"],
        "__DECK_TITLE__": config["title"],
        "__LOGO_ALT__": config["logo_alt"],
        **{key: value for key, value in config.items() if key.startswith("__")},
    }
    for token, value in replacements.items():
        document = document.replace(token, value)
    document = document.replace("rmichielan.github.io/site/paine</a>", "rmichielan.github.io/<wbr>site/paine</a>")
    document = assemble_math(document)
    document = assemble_irg_assets(document)
    unresolved = re.findall(r"__[A-Z][A-Z0-9_]*__", document)
    require(not unresolved, f"Unresolved template placeholders: {sorted(set(unresolved))}")
    return document, source_order, config["outputs"]


def main():
    parser = argparse.ArgumentParser(description="Build or verify the offline presentation")
    parser.add_argument(
        "--check", action="store_true",
        help="verify generated files are current and byte-identical without writing",
    )
    args = parser.parse_args()

    try:
        document, source_order, outputs = build_document()
        expected = document.encode("utf-8")
        if args.check:
            missing = [str(path) for path in outputs if not (ROOT / path).is_file()]
            stale = [
                str(path) for path in outputs
                if (ROOT / path).is_file() and (ROOT / path).read_bytes() != expected
            ]
            if missing or stale:
                if missing:
                    print("Missing generated files: " + ", ".join(missing), file=sys.stderr)
                if stale:
                    print("Generated files are stale: " + ", ".join(stale), file=sys.stderr)
                return 1
            print(f"Verified {len(outputs)} current, identical outputs.")
            return 0

        for path in outputs:
            target = ROOT / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(expected)
        print(
            f"Built {len(expected):,} bytes, {len(source_order)} runtime modules, "
            f"{len(outputs)} identical outputs."
        )
        return 0
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
