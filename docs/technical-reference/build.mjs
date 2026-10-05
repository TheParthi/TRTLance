// Builds TrustLance-Technical-Reference.pdf from the chapter files in this folder.
//
//   cd docs/technical-reference
//   npm i --no-save marked puppeteer-core     # one-time, not a project dependency
//   CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node build.mjs
//
// Chapters are the NN-*.md files, rendered in name order. Raw HTML (tables,
// inline SVG diagrams, callouts) is allowed inside the Markdown.
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(process.env.DEPS_DIR ? join(process.env.DEPS_DIR, 'x.js') : import.meta.url)
const { marked } = require('marked')
const puppeteer = require('puppeteer-core')

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = join(here, 'TrustLance-Technical-Reference.pdf')
const meta = JSON.parse(readFileSync(join(here, 'meta.json'), 'utf8'))

// ---------------------------------------------------------------------------
// Markdown → HTML with numbered, anchored headings
// ---------------------------------------------------------------------------
const files = readdirSync(here).filter((f) => /^\d\d-.*\.md$/.test(f)).sort()
const toc = []
let chapter = 0
let section = 0
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const renderer = new marked.Renderer()
renderer.heading = function ({ tokens, depth }) {
  const text = this.parser.parseInline(tokens)
  const plain = text.replace(/<[^>]+>/g, '')
  if (depth === 1) {
    chapter += 1
    section = 0
    const id = `ch-${chapter}`
    toc.push({ level: 1, id, num: String(chapter), text: plain })
    return `<h1 id="${id}"><span class="num">${chapter}</span>${text}</h1>`
  }
  if (depth === 2) {
    section += 1
    const num = `${chapter}.${section}`
    const id = `s-${num.replace('.', '-')}-${slug(plain).slice(0, 40)}`
    toc.push({ level: 2, id, num, text: plain })
    return `<h2 id="${id}"><span class="num">${num}</span>${text}</h2>`
  }
  return `<h${depth}>${text}</h${depth}>`
}
marked.use({ renderer, gfm: true })

const body = files.map((f) => `<section class="chapter">${marked.parse(readFileSync(join(here, f), 'utf8'))}</section>`).join('\n')
const css = readFileSync(join(here, 'style.css'), 'utf8')

function tocHtml(pages = {}) {
  return toc
    .map(
      (t) =>
        `<div class="toc-${t.level}"><a href="#${t.id}"><span class="toc-num">${t.num}</span><span class="toc-text">${t.text}</span><span class="toc-dots"></span><span class="toc-page">${pages[t.id] ?? ''}</span></a></div>`,
    )
    .join('\n')
}

function page(pages) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${meta.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
<section class="cover">
  <div class="cover-band"></div>
  <div class="cover-kicker">${meta.kicker}</div>
  <div class="cover-title">${meta.title}</div>
  <div class="cover-sub">${meta.subtitle}</div>
  <table class="cover-meta">${meta.rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
  <div class="cover-note">${meta.note}</div>
</section>
<section class="toc"><h1 class="toc-title">Contents</h1>${tocHtml(pages)}</section>
${body}
</body></html>`
}

// ---------------------------------------------------------------------------
// Two passes: render, find which page each heading landed on, render again
// with page numbers in the contents. Headings carry their number, so the
// search ignores the contents pages themselves.
// ---------------------------------------------------------------------------
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const tmp = mkdtempSync(join(tmpdir(), 'tl-doc-'))

async function render(html, file) {
  const p = await browser.newPage()
  const htmlFile = join(tmp, 'doc.html')
  writeFileSync(htmlFile, html)
  await p.goto(`file://${htmlFile}`, { waitUntil: 'networkidle0' })
  await p.pdf({
    path: file,
    format: 'A4',
    printBackground: true,
    outline: true,
    displayHeaderFooter: true,
    margin: { top: '18mm', bottom: '18mm', left: '17mm', right: '17mm' },
    headerTemplate: `<div style="width:100%;font:7.5px Helvetica,Arial,sans-serif;color:#8a90a0;padding:0 17mm;display:flex;justify-content:space-between"><span>${meta.title} — ${meta.subtitle}</span><span>${meta.version}</span></div>`,
    footerTemplate: `<div style="width:100%;font:7.5px Helvetica,Arial,sans-serif;color:#8a90a0;padding:0 17mm;display:flex;justify-content:space-between"><span>${meta.footer}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  })
  await p.close()
}

const pass1 = join(tmp, 'pass1.pdf')
await render(page(), pass1)
const pageCount = Number(execFileSync('pdfinfo', [pass1]).toString().match(/Pages:\s+(\d+)/)[1])
const pageText = []
for (let i = 1; i <= pageCount; i++) {
  pageText[i] = execFileSync('pdftotext', ['-f', String(i), '-l', String(i), '-layout', pass1, '-']).toString()
}
const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()
const firstContentPage = pageText.findIndex((t, i) => i > 1 && t && !/contents/i.test(t.split('\n').slice(0, 6).join(' ')))
const pages = {}
for (const t of toc) {
  const needle = norm(`${t.num} ${t.text}`).slice(0, 48)
  for (let i = Math.max(firstContentPage, 2); i <= pageCount; i++) {
    if (norm(pageText[i]).includes(needle)) {
      pages[t.id] = i
      break
    }
  }
}
await render(page(pages), OUT)
await browser.close()
const missing = toc.filter((t) => !pages[t.id]).map((t) => `${t.num} ${t.text}`)
console.log(`✓ ${OUT}\n  ${pageCount} pages, ${toc.filter((t) => t.level === 1).length} chapters, ${toc.length} headings${missing.length ? `\n  page not found for: ${missing.join('; ')}` : ''}`)
