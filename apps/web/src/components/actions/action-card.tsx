/**
 * ActionDef — type definition for the action catalog consumed by
 * lib/action-handlers.ts and lib/ori-data.ts.
 *
 * Path X (per 5C-postskin spec): moved from the deleted
 * components/ui/action-card location to components/actions/. This is the
 * type only — the ActionCard UI component itself is out of scope for this
 * port and will be rebuilt in a future iteration if/when the reference's
 * action surface is needed.
 */
export interface ActionDef {
  id: string
  title: string
  contract: string
  fields: string[]
}
