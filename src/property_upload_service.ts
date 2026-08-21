import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { InfraiError, infrai } from "./infrai_storage";
import { decideUpload, uploadRequestSchema } from "./upload_policy";

const bucket = process.env.PROPERTY_ASSET_BUCKET ?? "property-assets";
const port = Number(process.env.PORT ?? 3000);

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: NodeJS.ReadableStream): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function main(): Promise<void> {
  // A stable bucket name makes startup creation safe to retry.
  await infrai.storage.bucket.create(bucket);

  createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/upload-requests") {
      json(response, 404, { error: "Route not found" });
      return;
    }

    try {
      const input = uploadRequestSchema.parse(await readJson(request));
      const decision = decideUpload(input);
      const signed = await infrai.storage.object.presign(bucket, decision.key, {
        op: "put",
        expires_seconds: decision.expiresSeconds,
        content_type: input.contentType,
        max_bytes: decision.maxBytes,
        idempotency_key: `${input.propertyId}:${input.assetType}:${input.recordId}:${decision.key}`,
      });
      json(response, 201, {
        uploadUrl: signed.url,
        method: "PUT",
        key: decision.key,
        expiresSeconds: decision.expiresSeconds,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        json(response, 400, { error: "Invalid upload request", issues: error.issues });
      } else if (error instanceof RangeError) {
        json(response, 413, { error: error.message });
      } else if (error instanceof InfraiError) {
        const status = error.status >= 400 && error.status < 500 ? error.status : 502;
        json(response, status, { error: error.message, code: error.code });
      } else {
        json(response, 502, { error: "Storage request did not complete" });
      }
    }
  }).listen(port, () => {
    console.log(`Property upload service listening on http://localhost:${port}`);
  });
}

void main();
