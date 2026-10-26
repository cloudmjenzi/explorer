/** Applies pending database migrations once when the server boots. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.RUN_MIGRATIONS === "false") return;
  const { runMigrations } = await import("./db/migrate");
  await runMigrations();
  console.log("[startup] database migrations up to date");
}
