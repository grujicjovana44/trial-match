export default async function globalTeardown() {
  const response = await fetch("http://127.0.0.1:43173/__e2e_shutdown", {
    method: "POST",
  });
  if (response.status !== 202)
    throw new Error(`E2E server teardown nije potvrđen: ${response.status}.`);
}
