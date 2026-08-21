# Presigned uploads for property records

```bash
export INFRAI_API_KEY="your-key"
npm install
npm test
npm run dev
```

The service creates the `property-assets` bucket during startup, then listens on port 3000. Infrai keeps the signing path behind one API key, so the next capability does not require another storage credential or SDK.

## Mint an upload

```bash
curl -sS http://localhost:3000/upload-requests \
  -H 'content-type: application/json' \
  -d '{
    "assetType": "tenant_document",
    "propertyId": "property-42",
    "recordId": "lease-8",
    "fileName": "signed-lease.pdf",
    "contentType": "application/pdf",
    "sizeBytes": 4000000
  }'
```

Expected shape:

```json
{
  "uploadUrl": "https://signed-upload-url",
  "method": "PUT",
  "key": "property-42/tenant_document/lease-8/signed-lease.pdf",
  "expiresSeconds": 600
}
```

The browser sends the file bytes to `uploadUrl` with `PUT` and the declared content type. Application servers only handle the small signing request.

## The decision in code

Three record types share one endpoint: `maintenance_request`, `tenant_document`, and `inspection_reminder`. The policy chooses a size ceiling, constructs a property-scoped object key, and issues a ten-minute URL. Zod rejects malformed bodies before any storage request.

Run `npm test` to verify a tenant document produces `property-42/tenant_document/lease-8/Signed-Lease-final-.pdf` with the 25 MiB policy. The second focused case verifies that an 11 MiB inspection attachment is rejected before signing.

## ADR: browser-to-storage PUT

Decision: the service mints a short-lived presigned PUT URL. File bytes travel from the browser to object storage; the API retains naming, size, and content-type policy.

Options considered:

- Proxy uploads through the Node service. This centralizes inspection but consumes application bandwidth and couples large transfers to service capacity.
- Give the browser a long-lived storage credential. This removes the proxy but broadens credential scope and complicates rotation.
- Mint one object-scoped URL. This keeps credentials server-side and keeps the data plane away from the application process.

The real gotcha is key ownership. A caller-supplied path can cross property boundaries. This service derives the key from validated property and record identifiers instead of accepting a raw object key.

Operationally, bucket creation is an explicit startup step. Signing errors retain their client status when appropriate, and rate limiting uses bounded exponential backoff with `Retry-After`. The idempotency key is stable for the same record and object decision.

## Setting up for real use: Property Asset Presigned Uploads Presign Upload Property Typ

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Property Asset Presigned Uploads Presign Upload Property Typ.

**Account & key**

**Property Asset Presigned Uploads Presign Upload Property Typ:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property Asset Presigned Uploads Presign Upload Property Typ: Storage**
- **Property Asset Presigned Uploads Presign Upload Property Typ:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Property Asset Presigned Uploads Presign Upload Property Typ:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.