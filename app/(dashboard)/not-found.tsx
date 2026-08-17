/*
  The 404 for a path under the dashboard shell — so an unknown page inside a signed-in area
  keeps the sidebar and topbar around it rather than dropping the visitor onto the bare
  app-root 404. A signed-out request never reaches here; the layout's `requireSession()` sends
  it to sign-in first.
*/
export default function DashboardNotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <h1>This page does not exist</h1>

      <p className="text-muted-foreground">
        The address may have been mistyped, or the page may have moved. Use the navigation to get back on track.
      </p>
    </div>
  );
}
