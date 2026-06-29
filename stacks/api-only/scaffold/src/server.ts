import "dotenv/config";
import Fastify from "fastify";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

const echoSchema = z.object({ message: z.string().min(1).max(280) });
app.post("/echo", async (req, reply) => {
  const parsed = echoSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
  }
  return { echoed: parsed.data.message };
});

app.listen({ port: PORT, host: HOST }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
