# Nexus API

## Endpoints

- GraphQL: `POST /graphql`
- Metrics webhook: `POST /webhooks/metrics`
- Health check: `GET /healthz`

Requests and responses use JSON. GraphQL requests use a JSON object containing
a `query` string and, when needed, a `variables` object.

## Pagination

Every GraphQL list returns a connection containing `items` and `pageInfo`.
Pagination defaults to offset `0` and limit `20`. The server clamps limits to a
maximum of `50` and a minimum of `1`; negative offsets become `0`.

## Public error codes

GraphQL errors return the code in `errors[].extensions.code`. REST errors return
it in `error.code`.

| Code | Meaning |
|---|---|
| `BAD_USER_INPUT` | Input failed transport or business validation. |
| `NOT_FOUND` | A requested entity does not exist. |
| `CONFLICT` | The request conflicts with existing state or cumulative metrics. |
| `INVALID_TRANSITION` | A lifecycle status change is not allowed. |
| `GRAPHQL_PARSE_FAILED` | The GraphQL document could not be parsed. |
| `GRAPHQL_VALIDATION_FAILED` | The document does not match the schema. |
| `INTERNAL_SERVER_ERROR` | An unexpected failure occurred; internal details are hidden. |

## Example query

```graphql
query CreatorRoster {
  creators(page: { offset: 0, limit: 20 }, filter: { status: ACTIVE }) {
    items {
      id
      handle
      displayName
      followerCount
    }
    pageInfo {
      offset
      limit
      totalCount
      hasNextPage
    }
  }
}
```

## Example mutation

```graphql
mutation CreateCreator {
  createCreator(input: {
    handle: "sample_creator"
    displayName: "Sample Creator"
    primaryPlatform: TIKTOK
    followerCount: 10000
    engagementRate: 0.05
    ratePerPost: 50000
  }) {
    id
    handle
    status
  }
}
```

## Metrics webhook

The webhook accepts a cumulative metrics snapshot for a deliverable whose
status is `POSTED`. Every metric must be a non-negative integer and cannot be
lower than the corresponding value in the latest snapshot.

```json
{
  "deliverableId": "40000000-0000-4000-8000-000000000001",
  "capturedAt": "2026-01-20T00:00:00.000Z",
  "views": 100,
  "likes": 20,
  "comments": 5,
  "shares": 3,
  "watchTimeSeconds": 500
}
```

A successful request returns HTTP `201` with `{ "data": snapshot }`.
