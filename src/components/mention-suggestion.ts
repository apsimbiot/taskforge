import { ReactRenderer } from "@tiptap/react"
import SuggestionList from "./mention-suggestion-list"
import { PluginKey } from "@tiptap/pm/state"

export default (mentions: { id: string; name: string; email: string }[]) => {
  return {
    pluginKey: new PluginKey("mention"),
    items: ({ query }: { query: string }) => {
      if (!query) return mentions.slice(0, 10)
      const lowerQuery = query.toLowerCase()
      return mentions
        .filter(
          (m) =>
            m.name.toLowerCase().includes(lowerQuery) ||
            m.email.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 10)
    },
    render: () => {
      let component: ReactRenderer | null = null

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(SuggestionList, {
            props,
            editor: props.editor,
          })
        },
        onUpdate: (props: any) => {
          if (component) {
            (component as any).props = props
          }
        },
        onExit: () => {
          component?.destroy()
          component = null
        },
        onKeyDown: (props: any) => {
          if (props.event.key === "Escape") {
            component?.destroy()
            return true
          }
          return false
        },
      }
    },
  }
}
