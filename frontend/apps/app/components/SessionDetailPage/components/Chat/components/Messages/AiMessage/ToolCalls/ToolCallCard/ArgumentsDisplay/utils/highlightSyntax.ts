export const highlightSyntax = (text: string): string => {
  // エスケープ処理
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  let html = escapeHtml(text)

  // SQL キーワード
  const sqlKeywords = [
    'NOT NULL',
    'UNIQUE',
    'DEFAULT',
    'PRIMARY KEY',
    'FOREIGN KEY',
    'CREATE',
    'TABLE',
    'INDEX',
    'ON',
    'true',
    'false',
  ]
  
  // アクション
  const actions = [
    'Creating table',
    'Adding column',
    'Adding index',
    'Adding primary_key',
    'Adding foreign_key',
    'Adding unique',
    'Removing table',
    'Removing column',
    'Updating column',
  ]

  // アクション（Creating, Adding, Removing, Updating）
  actions.forEach(action => {
    const regex = new RegExp(`^(\\s*)(${action})`, 'gi')
    html = html.replace(regex, '$1<span class="syntax-action">$2</span>')
  })

  // テーブル名・カラム名・インデックス名（シングルクォートで囲まれた文字列）
  html = html.replace(/&#39;([^&#39;]+)&#39;/g, '<span class="syntax-identifier">&#39;$1&#39;</span>')

  // 型情報（括弧内の型）
  html = html.replace(/\(([^)]+)\)/g, (_, content) => {
    // SQLキーワードをハイライト
    let highlightedContent = content
    sqlKeywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b(${keyword})\\b`, 'gi')
      highlightedContent = highlightedContent.replace(keywordRegex, '<span class="syntax-keyword">$1</span>')
    })
    
    // 型名（uuid, varchar, timestamp など）
    const typeRegex = /\b(uuid|varchar|text|boolean|timestamp|integer|bigint|smallint|numeric|decimal|real|double precision|json|jsonb|array|date|time|interval)\b/gi
    highlightedContent = highlightedContent.replace(typeRegex, '<span class="syntax-type">$1</span>')
    
    // 数値
    highlightedContent = highlightedContent.replace(/\b(\d+)\b/g, '<span class="syntax-number">$1</span>')
    
    return `(<span class="syntax-parens">${highlightedContent}</span>)`
  })

  // 外部キー参照（矢印）
  html = html.replace(/-&gt;/g, '<span class="syntax-arrow">→</span>')
  
  // プロパティ名（コロンの前の文字列）
  html = html.replace(/^(\s*)(\w+):/gm, '$1<span class="syntax-property">$2</span>:')

  return html
}