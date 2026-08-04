# shared/

Contains TypeScript type definitions that describe the Redis Pub/Sub
message contracts between the **Node.js backend** and the **Python AI
service**.

## Files

| File | Purpose |
| --- | --- |
| `types.ts` | Interfaces for `PdfProcessRequest`, `PdfProcessResponse`, `QuestionRequest`, `QuestionResponse`, etc. |

These types serve as living documentation of the Pub/Sub protocol. The
backend imports them directly; the Python side uses them as a reference
for the `dict` payloads it publishes/consumes.
