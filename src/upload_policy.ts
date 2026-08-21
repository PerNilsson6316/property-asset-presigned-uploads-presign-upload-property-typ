import { z } from "zod";

export const uploadRequestSchema = z.object({
  assetType: z.enum([
    "maintenance_request",
    "tenant_document",
    "inspection_reminder",
  ]),
  propertyId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  recordId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  fileName: z.string().min(1).max(160),
  contentType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

const limits = {
  maintenance_request: 15 * 1024 * 1024,
  tenant_document: 25 * 1024 * 1024,
  inspection_reminder: 10 * 1024 * 1024,
} satisfies Record<UploadRequest["assetType"], number>;

export function decideUpload(input: UploadRequest): {
  key: string;
  maxBytes: number;
  expiresSeconds: number;
} {
  const maxBytes = limits[input.assetType];
  if (input.sizeBytes > maxBytes) {
    throw new RangeError(`Asset exceeds the ${maxBytes}-byte policy`);
  }

  const safeName = input.fileName
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "upload";

  return {
    key: `${input.propertyId}/${input.assetType}/${input.recordId}/${safeName}`,
    maxBytes,
    expiresSeconds: 600,
  };
}
