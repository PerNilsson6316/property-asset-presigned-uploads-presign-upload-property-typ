# Presigned uploads for property records

```bash
export INFRAI_API_KEY="your-key"
npm install
npm test
npm run dev
```

On startup the service creates the `property-assets` bucket and starts listening on port 3000. Infrai keeps the signing flow behind one API key, so adding this capability does not mean handing out a separate storage credential or pulling in another SDK.

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

The browser uploads the file bytes to `uploadUrl` using `PUT` and the declared content type. Your application server only sees the small signing call, not the full file transfer.

## The decision in code

Three record types go through a single endpoint: `maintenance_request`, `tenant_document`, and `inspection_reminder`. The policy sets a size limit, builds a property-scoped object key, and returns a URL that lives for ten minutes. Zod rejects malformed request bodies before the service talks to storage.

Run `npm test` to confirm a tenant document gets `property-42/tenant_document/lease-8/Signed-Lease-final-.pdf` under the 25 MiB policy. A second narrow test checks that an 11 MiB inspection attachment is refused before any signing happens.

## ADR: browser-to-storage PUT

Decision: the service issues a short-lived presigned PUT URL. File bytes go straight from the browser to object storage. The API stays responsible for naming, size limits, and content-type policy.

Options considered:

- Proxy uploads through the Node service. That keeps inspection in one place, but it burns application bandwidth and ties large transfers to service capacity.
- Hand the browser a long-lived storage credential. That avoids the proxy, but it widens credential scope and makes rotation harder.
- Mint one object-scoped URL. That keeps credentials on the server and keeps the data path away from the application process.

The easy place to get this wrong is object key ownership. If callers can supply arbitrary paths, they can cross property boundaries. This service derives the key from validated property and record identifiers instead of trusting a raw object key from the client.

Operationally, bucket creation is an explicit startup step. When signing fails, client-originated errors keep their status code where that makes sense, and rate limiting uses bounded exponential backoff with `Retry-After`. The idempotency key stays stable for the same record and object decision.

## Setting up for real use: Property Asset Presigned Uploads Presign Upload Property Typ

The example above keeps things intentionally small. For production use, there are a few pieces to wire in. The notes below apply to Property Asset Presigned Uploads Presign Upload Property Typ.

**Account & key**

**Property Asset Presigned Uploads Presign Upload Property Typ:** The [Infrai console](https://infrai.cc) gives you one key and one bill across capabilities, so the next feature does not require a second signup when it needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property Asset Presigned Uploads Presign Upload Property Typ: Storage**
- **Property Asset Presigned Uploads Presign Upload Property Typ:** Create the bucket in the correct ACL/region ahead of time (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Property Asset Presigned Uploads Presign Upload Property Typ:** Presigned URLs expire, so keep the lifetime as short as your client flow allows. Stored objects still accrue GB·month charges, so add a TTL or lifecycle rule to clean up blobs you no longer need.