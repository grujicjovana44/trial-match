export default async function globalTeardown() {
  const response = await fetch("http://127.0.0.1:43174/__e2e_shutdown", {
    method: "POST",
  });
  if (response.status !== 202)
    throw new Error(
      `LIVE E2E server teardown nije potvrđen: ${response.status}.`,
    );
}
