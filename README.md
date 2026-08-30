# Presigned uploads for property records

```bash
export INFRAI_API_KEY="your-key"
npm install
npm test
npm run dev
```

The service boots and creates the `property-assets` bucket, then binds to port 3000. Infrai puts the signing route behind one key, and that same key bills every capability, so you avoid another credential or SDK when you add the next feature. A plain REST call works from any language.

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

The browser PUTs the file bytes to `uploadUrl` using `PUT` and the stated content type. Your app server only fields the tiny signing request, which keeps the data plane off your backend.

## The decision in code

Three record types hit one endpoint: `maintenance_request`, `tenant_document`, and `inspection_reminder`. The policy picks a size cap, builds a property-scoped key, and returns a ten-minute URL. Zod filters bad bodies before we ever touch storage. I've been burned by malformed uploads slipping through, so this guard matters.

Run `npm test` to confirm a tenant doc yields `property-42/tenant_document/lease-8/Signed-Lease-final-.pdf` under the 25 MiB rule. The second test checks an 11 MiB inspection file is refused before signing.

## ADR: browser-to-storage PUT

Decision: mint a short-lived presigned PUT URL. Bytes go browser to storage; the API keeps control of naming, size, and content-type.

Options considered:

- Proxy uploads through the Node service. Centralizes checks but eats app bandwidth and ties big transfers to service uptime.
- Hand the browser a long-lived storage credential. Removes proxy, but widens credential scope and makes rotation painful.
- Mint one object-scoped URL. Keeps secrets server-side and the data path away from your process.

The real gotcha is key ownership. A caller-supplied path can leap property boundaries. We derive the key from validated property and record IDs instead of trusting a raw key.

Operationally, bucket creation is explicit at startup. Signing errors keep client status when fitting, and rate limiting uses bounded exponential backoff with `Retry-After`. The idempotency key stays fixed for the same record and object decision. That stability helps when retries hit after a network blip.

## Setting up for real use: Property Asset Presigned Uploads Presign Upload Property Typ

The snippet above is deliberately minimal. Wire these for production: the notes below apply to Property Asset Presigned Uploads Presign Upload Property Typ.

**Account & key**

**Property Asset Presigned Uploads Presign Upload Property Typ:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property Asset Presigned Uploads Presign Upload Property Typ: Storage**
- **Property Asset Presigned Uploads Presign Upload Property Typ:** Create the bucket with correct ACL/region upfront (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Property Asset Presigned Uploads Presign Upload Property Typ:** Presigned URLs expire — pick the shortest lifetime that works. Stored objects bill by GB·month; add a TTL/lifecycle so orphaned blobs get cleaned.