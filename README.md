# Random graphs at scale - clean v19

Clean editable project for the talk.

## Present
Open `index.html` directly in a modern browser. It is self-contained and works offline.

## Edit
- Slide content: `src/slides/*.html`
- Slide behaviour/animations: `src/slides/*.js`
- Styles: `src/styles/`
- Shared components: `src/components/`
- Models/simulations: `src/models/`
- Metadata, links, paper reference: `src/presentation.json`

After editing, rebuild:

```bash
python generate.py
```

Check that `index.html` is up to date:

```bash
python generate.py --check
```

The included formula caches allow normal rebuilds using Python only. If you add a brand-new LaTeX formula, install Node dependencies once with `npm install`; the build then uses `scripts/render_math.cjs`.

## GitHub Pages
Upload the contents of this folder to the repository root and publish the main branch from `/`.

This clean package intentionally omits old reviews, QA files, regression tests, archived experiments, static PDF/PPTX exports, duplicate generated HTML files, and obsolete version metadata.
