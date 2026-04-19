# ADR 007: Cloudflare R2 for Object Storage

**Date:** 2026-04-19  
**Status:** Accepted  

## Context
As the Anywhere platform scales, we require an object storage system for:
1. **Destination Hero Images & Geography Data**: High-quality static media representing catalog destinations.
2. **User-Uploaded Content**: Avatars, gallery pictures, and profile content.
3. **PDF Trip Exports**: Generated itineraries downloaded by users.
4. **Map Tile Caches**: Static rasterizations mapped alongside Mapbox caching strategies.

Databases (PostgreSQL and MongoDB) are completely anti-patterns for storing these unstructured blob payloads. A dedicated object utility needs to run completely independently but tightly coupled to the Edge.

## Decision
We have decided to strictly use **Cloudflare R2** alongside our structured databases. 

1. **Why Cloudflare R2 over AWS S3?**
   - **Zero Egress Fees**: Massive savings as egress is completely unmetered (unlike S3 which penalizes CDN pass-through rapidly).
   - **Native Edge CDN Integration**: R2 is built to serve payloads through the Cloudflare Network natively, without needing a secondary proxy or CloudFront mapping.
2. **Usage alongside Databases**: 
   - PostgreSQL / MongoDB will store the **URLs** or object keys only.
   - Files themselves live completely outside the Database ecosystem, preventing extreme cost blooms or memory constraints.

## Consequences
- Requires using AWS S3-compatible SDKs (e.g., `aws-sdk-client-s3`) pointed explicitly to Cloudflare endpoint URLs.
- Egress bounds strictly vanish as an infrastructure planning variable.
- Eliminates the need to maintain an intricate CloudFront + S3 routing table.
