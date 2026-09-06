// Markdown → HTML renderer (no external deps, matches original logic)

// ── Встроенная подсветка синтаксиса ──
const HL = {
  // Сначала экранируем HTML, затем расставляем span-теги
  _esc(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  },

  // общие токены — вызывается на уже экранированном тексте
  _tokens(code) {
    return code
      // строки (шаблонные, двойные, одинарные) — ищем с учётом &quot; и &apos; после escaping
      .replace(/(`)([^`\n]*?)(`)/g, '<span class="hl-str">$1$2$3</span>')
      .replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '<span class="hl-str">$1</span>')
      .replace(/(&#39;(?:[^&]|&(?!#39;))*?&#39;)/g, '<span class="hl-str">$1</span>')
      // числа
      .replace(/\b(\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="hl-num">$1</span>')
      // однострочные комментарии //
      .replace(/(\/\/[^\n]*)/g, '<span class="hl-cmt">$1</span>')
      // блочные комментарии /* */
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-cmt">$1</span>')
  },

  _base(code) {
    return this._tokens(this._esc(code))
  },

  java(code) {
    const escaped = this._esc(code)
    const kw = /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|true|false|record|sealed|permits|yield)\b/g
    const type = /\b(String|Integer|Long|Double|Float|Boolean|Object|List|Map|Set|Optional|Stream|Collection|Iterable|Comparable|Void|Byte|Short|Character|Number|Class|Enum|Exception|RuntimeException|Error|Thread|Runnable)\b/g
    const ann = /(@\w+)/g
    return this._tokens(escaped)
      .replace(kw, '<span class="hl-kw">$1</span>')
      .replace(type, '<span class="hl-type">$1</span>')
      .replace(ann, '<span class="hl-ann">$1</span>')
  },

  javascript(code) { return this.js(code) },
  typescript(code) { return this.ts(code) },

  js(code) {
    const escaped = this._esc(code)
    const kw = /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield|async|await|true|false|from|as)\b/g
    const builtin = /\b(console|document|window|process|require|module|exports|Promise|Array|Object|Math|JSON|Date|Error|Map|Set|Symbol|fetch|setTimeout|setInterval|clearTimeout|clearInterval)\b/g
    return this._tokens(escaped)
      .replace(kw, '<span class="hl-kw">$1</span>')
      .replace(builtin, '<span class="hl-builtin">$1</span>')
  },

  ts(code) {
    const escaped = this._esc(code)
    const kw = /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|interface|let|namespace|new|null|of|return|static|super|switch|this|throw|try|type|typeof|undefined|var|void|while|with|yield|async|await|true|false|from|as|abstract|declare|enum|implements|keyof|readonly|infer|never|unknown|any)\b/g
    const type = /\b(string|number|boolean|object|symbol|bigint|void|null|undefined|never|unknown|any)\b/g
    return this._tokens(escaped)
      .replace(kw, '<span class="hl-kw">$1</span>')
      .replace(type, '<span class="hl-type">$1</span>')
  },

  python(code) {
    const escaped = this._esc(code)
    const kw = /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/g
    const builtin = /\b(print|len|range|enumerate|zip|map|filter|sorted|list|dict|set|tuple|str|int|float|bool|type|isinstance|hasattr|getattr|setattr|open|super|property|staticmethod|classmethod|abs|sum|min|max|any|all|next|iter)\b/g
    const deco = /(@\w+)/g
    // тройные кавычки (уже экранированы → &quot;&quot;&quot;)
    const triDouble = /(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;)/g
    const triSingle = /(&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;)/g
    // комментарии # (только не внутри строк)
    const hashCmt = /(#[^\n]*)/g
    return this._tokens(escaped)
      .replace(triDouble, '<span class="hl-str">$1</span>')
      .replace(triSingle, '<span class="hl-str">$1</span>')
      .replace(hashCmt, '<span class="hl-cmt">$1</span>')
      .replace(kw, '<span class="hl-kw">$1</span>')
      .replace(builtin, '<span class="hl-builtin">$1</span>')
      .replace(deco, '<span class="hl-ann">$1</span>')
  },

  sql(code) {
    const escaped = this._esc(code)
    const kw = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|AS|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|VIEW|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|DEFAULT|CHECK|CONSTRAINT|DISTINCT|ALL|UNION|INTERSECT|EXCEPT|WITH|CASE|WHEN|THEN|ELSE|END|EXISTS|ANY|SOME|COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|CONVERT|TRUNCATE|BEGIN|COMMIT|ROLLBACK|TRANSACTION)\b/gi
    return this._tokens(escaped)
      .replace(kw, '<span class="hl-kw">$&</span>')
  },

  bash(code) { return this.sh(code) },
  shell(code) { return this.sh(code) },
  sh(code) {
    const escaped = this._esc(code)
    const kw = /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|in|return|exit|echo|export|local|readonly|shift|source|unset|eval|exec|set|trap|cd|ls|mkdir|rm|cp|mv|cat|grep|awk|sed|find|chmod|chown|sudo)\b/g
    const vars = /(\$\{?[\w@#?$!*-]+\}?)/g
    const flag = /((?<=\s)--?[\w-]+)/g
    return this._tokens(escaped)
      .replace(kw, '<span class="hl-kw">$1</span>')
      .replace(vars, '<span class="hl-var">$1</span>')
      .replace(flag, '<span class="hl-attr">$1</span>')
  },

  css(code) {
    const escaped = this._esc(code)
    const atRule = /(@[\w-]+)/g
    return escaped
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-cmt">$1</span>')
      .replace(atRule, '<span class="hl-kw">$1</span>')
      .replace(/([.#:[\w-]+(?:\s*[,&gt;+~]\s*[\w.#:[\]"=-]+)*)\s*(?=\{)/g, '<span class="hl-type">$1</span>')
      .replace(/([\w-]+)\s*(?=:(?!:))/g, '<span class="hl-attr">$1</span>')
      .replace(/:\s*([^;{}\n<]+)/g, ': <span class="hl-str">$1</span>')
  },

  html(code) { return this.xml(code) },
  xml(code) {
    const escaped = this._esc(code)
    return escaped
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-cmt">$1</span>')
      .replace(/(&lt;\/?)([\w:-]+)/g, '$1<span class="hl-type">$2</span>')
      .replace(/([\w:-]+)(?==)/g, '<span class="hl-attr">$1</span>')
      .replace(/(&quot;[^&]*?&quot;)/g, '<span class="hl-str">$1</span>')
  },

  json(code) {
    const escaped = this._esc(code)
    return escaped
      .replace(/(&quot;[^&]*?&quot;)\s*(?=:)/g, '<span class="hl-attr">$1</span>')
      .replace(/(?<=:)\s*(&quot;[^&]*?&quot;)/g, ' <span class="hl-str">$1</span>').replace(/\b(true|false|null)\b/g, '<span class="hl-kw">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-num">$1</span>')
  },

  go(code) {
    const escaped = this._esc(code)
    const kw = /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var|true|false|nil|iota)\b/g
    const type = /\b(bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr|any)\b/g
    return this._tokens(escaped)
      .replace(kw, '<span class="hl-kw">$1</span>')
      .replace(type, '<span class="hl-type">$1</span>')
  },

  kotlin(code) {
    const escaped = this._esc(code)
    const kw = /\b(abstract|actual|annotation|as|break|by|catch|class|companion|const|constructor|continue|crossinline|data|do|dynamic|else|enum|expect|external|final|finally|for|fun|get|if|import|in|infix|init|inline|inner|interface|internal|is|it|lateinit|noinline|null|object|open|operator|out|override|package|private|protected|public|reified|return|sealed|set|super|suspend|tailrec|this|throw|true|false|try|typealias|typeof|val|var|vararg|when|where|while)\b/g
    const type = /\b(String|Int|Long|Double|Float|Boolean|Byte|Short|Char|Unit|Any|Nothing|List|Map|Set|Pair|Triple|Array|Sequence|Flow|Deferred|Job)\b/g
    const ann = /(@\w+)/g
    return this._tokens(escaped)
      .replace(kw, '<span class="hl-kw">$1</span>')
      .replace(type, '<span class="hl-type">$1</span>')
      .replace(ann, '<span class="hl-ann">$1</span>')
  },

  highlight(lang, rawCode) {
    const fn = this[lang.toLowerCase()]
    if (fn && typeof fn === 'function') return fn.call(this, rawCode)
    return this._base(rawCode)
  }
}

const CALLOUTS = {
  note: { icon: '💡', cls: 'md-note' },
  tip: { icon: '✨', cls: 'md-tip' },
  warning: { icon: '⚠️', cls: 'md-warn' },
  abstract: { icon: '🔗', cls: 'md-abstract' },
  info: { icon: 'ℹ️', cls: 'md-info' },
  danger: { icon: '🔥', cls: 'md-danger' },
  success: { icon: '✅', cls: 'md-success' },
  question: { icon: '❓', cls: 'md-question' },
}

function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inlineMarkdown(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="md-wikilink">$1</span>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}

export function mdHtml(raw) {
  if (!raw) return ''
  const lines = raw.split('\n')
  const chunks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // ── Fenced code block ──
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'text'
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])  // сырые строки — highlighter сам экранирует
        i++
      }
      i++ // skip closing ```
      const rawCode = codeLines.join('\n')
      const highlighted = HL.highlight(lang, rawCode)
      chunks.push(
        `<div class="md-code-wrap"><span class="md-lang">${escHtml(lang)}</span>` +
        `<button class="md-copy-btn" type="button" aria-label="Скопировать код" title="Скопировать код">` +
        `<svg class="copy-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>` +
        `<span class="copy-text">Копировать</span>` +
        `</button>` +
        `<pre><code class="language-${escHtml(lang)}">${highlighted}</code></pre></div>`
      )
      continue
    }

    // ── Obsidian callout: > [!type] title ──
    if (/^>\s*\[!(\w+)\]/.test(line)) {
      const m = line.match(/^>\s*\[!(\w+)\]\s*(.*)/)
      const type = m[1].toLowerCase()
      const title = m[2] || ''
      const cfg = CALLOUTS[type] || { icon: '📌', cls: 'md-note' }
      const bodyLines = []
      i++
      while (i < lines.length && lines[i].startsWith('>')) {
        bodyLines.push(inlineMarkdown(escHtml(lines[i].slice(1).trim())))
        i++
      }
      chunks.push(
        `<div class="${cfg.cls}">` +
        `<div class="md-callout-title">${cfg.icon} ${escHtml(title)}</div>` +
        `<div class="md-callout-body">${bodyLines.join('<br/>')}</div></div>`
      )
      continue
    }

    // ── Blockquote ──
    if (line.startsWith('>')) {
      const qLines = []
      while (i < lines.length && lines[i].startsWith('>')) {
        qLines.push(inlineMarkdown(escHtml(lines[i].slice(1).trim())))
        i++
      }
      chunks.push(`<blockquote>${qLines.join('<br/>')}</blockquote>`)
      continue
    }

    // ── Horizontal rule ──
    if (/^---+$/.test(line.trim())) {
      chunks.push('<hr class="md-hr"/>')
      i++
      continue
    }

    // ── Headings ──
    const hm = line.match(/^(#{1,6})\s+(.+)/)
    if (hm) {
      const level = hm[1].length
      chunks.push(`<h${level} class="md-h${level}">${inlineMarkdown(escHtml(hm[2]))}</h${level}>`)
      i++
      continue
    }

    // ── Table ──
    if (line.includes('|') && lines[i + 1] && /^\|[-| :]+\|/.test(lines[i + 1])) {
      const rows = []
      const headers = line.split('|').filter(Boolean).map(c => c.trim())
      rows.push(`<tr>${headers.map(h => `<th>${inlineMarkdown(escHtml(h))}</th>`).join('')}</tr>`)
      i += 2 // skip header + separator
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i].split('|').filter(Boolean).map(c => c.trim())
        rows.push(`<tr>${cells.map(c => `<td>${inlineMarkdown(escHtml(c))}</td>`).join('')}</tr>`)
        i++
      }
      chunks.push(`<div class="md-table-wrap"><table class="md-table">${rows.join('')}</table></div>`)
      continue
    }

    // ── Unordered list ──
    if (/^(\s*)[*\-+]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^(\s*)[*\-+]\s/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(escHtml(lines[i].replace(/^(\s*)[*\-+]\s/, '')))}</li>`)
        i++
      }
      chunks.push(`<ul class="md-ul">${items.join('')}</ul>`)
      continue
    }

    // ── Ordered list ──
    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(escHtml(lines[i].replace(/^\d+\.\s/, '')))}</li>`)
        i++
      }
      chunks.push(`<ol class="md-ol">${items.join('')}</ol>`)
      continue
    }

    // ── Tags line (Obsidian) ──
    if (/^\*\*Теги:\*\*/.test(line) || /^>\s*\*\*Теги:\*\*/.test(line)) {
      const raw2 = line.replace(/^>\s*/, '').replace(/\*\*Теги:\*\*\s*/, '')
      const tags = raw2.match(/#\w[\wА-яа-яёЁ-]*/g) || []
      if (tags.length) {
        chunks.push(
          `<div class="md-tags">${tags.map(t =>
            `<span class="md-tag">${t}</span>`
          ).join('')}</div>`
        )
        i++
        continue
      }
    }

    // ── Empty line → paragraph break ──
    if (line.trim() === '') {
      i++
      continue
    }

    // ── Paragraph ──
    const paraLines = []
    while (i < lines.length && lines[i].trim() !== '' &&
      !lines[i].startsWith('#') && !lines[i].startsWith('>') &&
      !lines[i].startsWith('```') && !/^---+$/.test(lines[i].trim()) &&
      !/^(\s*)[*\-+]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].includes('|')) {
      paraLines.push(inlineMarkdown(escHtml(lines[i])))
      i++
    }
    if (paraLines.length) {
      chunks.push(`<p class="md-p">${paraLines.join(' ')}</p>`)
    }
  }

  return chunks.join('\n')
}
