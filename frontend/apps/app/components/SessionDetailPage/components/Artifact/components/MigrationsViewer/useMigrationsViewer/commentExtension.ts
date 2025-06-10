import { StateEffect, StateField } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view'
import type { ReviewComment } from './types'

// Widget that displays comments as DOM elements
class CommentWidget extends WidgetType {
  constructor(readonly comment: ReviewComment) {
    super()
  }

  toDOM() {
    const wrap = document.createElement('div')
    wrap.className = `cm-comment-widget severity-${this.comment.severity.toLowerCase()}`
    wrap.textContent = this.comment.message
    return wrap
  }

  ignoreEvent() {
    return false
  }
}

export const setCommentsEffect = StateEffect.define<ReviewComment[]>()

export const commentStateField = () => {
  return StateField.define<DecorationSet>({
    create() {
      return Decoration.none
    },
    update(decorations, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setCommentsEffect)) {
          const comments = effect.value
          if (comments.length === 0) {
            return Decoration.none
          }

          const newDecorations = comments.flatMap((comment) => {
            if (comment.toLine > tr.state.doc.lines) {
              return []
            }
            const lineDecorations = []
            for (let i = comment.fromLine; i <= comment.toLine; i++) {
              if (i > tr.state.doc.lines) continue
              const line = tr.state.doc.line(i)
              lineDecorations.push(
                Decoration.line({
                  attributes: {
                    class: `cm-highlighted-line severity-bg-${comment.severity.toLowerCase()}`,
                  },
                }).range(line.from),
              )
            }
            const widgetLine = tr.state.doc.line(comment.toLine)
            const widgetDecoration = Decoration.widget({
              widget: new CommentWidget(comment),
              side: 1,
            }).range(widgetLine.to)

            return [...lineDecorations, widgetDecoration]
          })

          return Decoration.set(newDecorations, true)
        }
      }

      if (tr.docChanged) {
        return decorations.map(tr.changes)
      }

      return decorations
    },
    provide(field) {
      return EditorView.decorations.from(field)
    },
  })
}
