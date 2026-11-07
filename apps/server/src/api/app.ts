import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { parseConfig, type AppConfig } from "../config/index.js";
import {
  HttpError,
  TrialMatchService,
  type ServiceOptions,
} from "../service/trialmatch.js";
import { RunResponseSchema } from "../../../../packages/shared/src/index.js";

type AppOptions = {
  config?: AppConfig;
  service?: TrialMatchService;
  serviceOptions?: Partial<Omit<ServiceOptions, "config">>;
};

const errorEnvelope = (
  category: string,
  message: string,
  retryable = false,
) => ({
  status: "error" as const,
  error: { category, message, retryable },
});

export function createApp(options: AppOptions = {}): FastifyInstance {
  const config = options.config ?? parseConfig({ NODE_ENV: "test" });
  const service =
    options.service ??
    new TrialMatchService({ config, ...options.serviceOptions });
  const app = Fastify({
    logger: config.NODE_ENV !== "test",
    bodyLimit: config.MAX_INPUT_CHARS + 2048,
  });
  const rateLimits = new Map<string, { startedAt: number; count: number }>();

  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/")) return;
    const now = Date.now();
    const key = request.ip;
    let window = rateLimits.get(key);
    if (!window || now - window.startedAt >= config.RATE_LIMIT_WINDOW_MS) {
      window = { startedAt: now, count: 0 };
      rateLimits.set(key, window);
    }
    window.count += 1;
    if (rateLimits.size > 1000) {
      for (const [client, entry] of rateLimits) {
        if (now - entry.startedAt >= config.RATE_LIMIT_WINDOW_MS)
          rateLimits.delete(client);
      }
    }
    if (window.count > config.RATE_LIMIT_MAX) {
      return reply
        .code(429)
        .send(
          errorEnvelope(
            "rate_limit_exceeded",
            "Prekoračen je broj dozvoljenih zahteva. Pokušajte ponovo kasnije.",
          ),
        );
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError)
      return reply
        .code(error.statusCode)
        .send({ status: "error", error: error.info });
    if (error instanceof z.ZodError) {
      request.log.error(
        {
          issues: error.issues.map((issue) => ({
            code: issue.code,
            path: issue.path,
          })),
        },
        "Nevažeći interni odgovor.",
      );
      return reply
        .code(500)
        .send(
          errorEnvelope(
            "internal_contract_violation",
            "Odgovor nije prošao internu proveru ugovora.",
          ),
        );
    }
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "FST_ERR_CTP_INVALID_JSON_BODY"
    ) {
      return reply
        .code(400)
        .send(
          errorEnvelope("invalid_request", "Telo zahteva nije validan JSON."),
        );
    }
    if (
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode === 413
    ) {
      return reply
        .code(413)
        .send(
          errorEnvelope(
            "input_too_large",
            "Zahtev je veći od dozvoljene granice.",
          ),
        );
    }
    request.log.error({ err: error }, "Neočekivana serverska greška.");
    return reply
      .code(500)
      .send(
        errorEnvelope(
          "internal_error",
          "Došlo je do interne greške. Pokušajte ponovo.",
        ),
      );
  });

  app.get("/health", async () => ({ status: "ok", demoMode: true }));
  app.post("/api/runs", async (request, reply) => {
    const body = request.body as { profileText?: unknown } | undefined;
    if (
      typeof body?.profileText === "string" &&
      body.profileText.length > config.MAX_INPUT_CHARS
    ) {
      return reply
        .code(413)
        .send(
          errorEnvelope(
            "input_too_large",
            "Unos je duži od dozvoljene granice.",
          ),
        );
    }
    const response = RunResponseSchema.parse(await service.start(request.body));
    return reply.code(200).send(response);
  });
  app.post<{ Params: { runId: string } }>(
    "/api/runs/:runId/answer",
    async (request, reply) => {
      const response = RunResponseSchema.parse(
        await service.answer(request.params.runId, request.body),
      );
      return reply.code(200).send(response);
    },
  );
  app.post<{ Params: { runId: string } }>(
    "/api/runs/:runId/hypothesis",
    async (request, reply) => {
      const response = RunResponseSchema.parse(
        await service.hypothesis(request.params.runId, request.body),
      );
      return reply.code(200).send(response);
    },
  );
  return app;
}
