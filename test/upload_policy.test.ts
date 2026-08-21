import assert from "node:assert/strict";
import test from "node:test";
import { decideUpload, uploadRequestSchema } from "../src/upload_policy";

test("tenant documents receive an isolated key and the document size policy", () => {
  const input = uploadRequestSchema.parse({
    assetType: "tenant_document",
    propertyId: "property-42",
    recordId: "lease-8",
    fileName: "Signed Lease (final).pdf",
    contentType: "application/pdf",
    sizeBytes: 4_000_000,
  });

  assert.deepEqual(decideUpload(input), {
    key: "property-42/tenant_document/lease-8/Signed-Lease-final-.pdf",
    maxBytes: 25 * 1024 * 1024,
    expiresSeconds: 600,
  });
});

test("an oversized inspection attachment is rejected before signing", () => {
  const input = uploadRequestSchema.parse({
    assetType: "inspection_reminder",
    propertyId: "property-42",
    recordId: "inspection-9",
    fileName: "walkthrough.mp4",
    contentType: "video/mp4",
    sizeBytes: 11 * 1024 * 1024,
  });

  assert.throws(() => decideUpload(input), RangeError);
});
