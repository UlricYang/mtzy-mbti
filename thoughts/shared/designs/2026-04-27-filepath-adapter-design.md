---
date: 2026-04-27
topic: "Filepath Adapter Design"
status: draft
---

# Filepath Adapter Design

## Problem Statement

Current API endpoints (`/api/preview`, `/api/export`, `/api/report`) receive filepath via POST body or static configuration. Business now requires **dynamic filepath resolution from external API** when filepath is not provided.

**Key requirement**: Same user has multiple data types - need `data_type` + `report_id` fields for distinction.

---

## Constraints

1. **POST body priority**: If filepath provided in body, use it directly (no external call)
2. **External API fallback**: When filepath missing, call external API (POST method, params in body)
3. **Distinction fields**: `data_type` and `report_id` both supported for identifying specific data
4. **Response format**: External API returns `{ filepath: string, status: 'ok' }`
5. **Error handling**: Clear error messages for all failure scenarios

---

## Approach

**Adapter pattern** with priority-based resolution chain:

```
POST body (userid, data_type?, report_id?, filepath?)
    │
    ▼
FilepathResolver (orchestrator)
    │
    ├── 1. DirectAdapter (priority=100): filepath in body? → return directly
    │
    ├── 2. LocalConfigAdapter (priority=50): static rules match? → return mapped path
    │
    ├── 3. ExternalAPIAdapter (priority=10): POST to external API → return response filepath
    │
    └── All failed → error response
```

**Why this approach**:
- Follows existing `ExportPlugin` pattern in codebase
- Priority chain allows flexible configuration
- Each adapter is isolated, testable, replaceable
- No breaking change to existing API contracts

---

## Architecture

### Component Overview

| Component              | Responsibility                                    | File Location                           |
| ---------------------- | ------------------------------------------------- | --------------------------------------- |
| `FilepathQuery`        | Input structure for resolution request            | `scripts/cli/lib/filepath/types.ts`     |
| `FilepathResult`       | Output structure with filepath or error           | `scripts/cli/lib/filepath/types.ts`     |
| `FilepathAdapter`      | Interface for all adapter implementations         | `scripts/cli/lib/filepath/types.ts`     |
| `FilepathResolver`     | Orchestrator managing adapter chain               | `scripts/cli/lib/filepath/resolver.ts`  |
| `DirectAdapter`        | Returns filepath from POST body                   | `scripts/cli/lib/filepath/adapters/direct.ts` |
| `ExternalAPIAdapter`   | POST call to external API                         | `scripts/cli/lib/filepath/adapters/external-api.ts` |
| `LocalConfigAdapter`   | Static rules from config                          | `scripts/cli/lib/filepath/adapters/local-config.ts` |

---

## Components

### 1. FilepathQuery Interface

Input structure for filepath resolution:

| Field        | Type                   | Required | Purpose                              |
| ------------ | ---------------------- | -------- | ------------------------------------ |
| `userid`     | `string`               | **Yes**  | User identifier                      |
| `data_type`  | `string`               | No       | Data type distinction (e.g., 'mbti') |
| `report_id`  | `string`               | No       | Specific report identifier           |
| `filepath`   | `string`               | No       | Direct filepath from POST body       |
| `extra`      | `Record<string, any>`  | No       | Extension field for future use       |

---

### 2. FilepathResult Interface

Output structure:

| Field       | Type                   | Presence  | Purpose                    |
| ----------- | ---------------------- | --------- | -------------------------- |
| `filepath`  | `string`               | Success   | Resolved absolute path     |
| `adapter`   | `string`               | Success   | Which adapter resolved it  |
| `error`     | `string`               | Failure   | Error message              |
| `source`    | `'body' | 'config' | 'api'` | Success   | Origin of filepath         |

---

### 3. FilepathAdapter Interface

Contract for all adapters:

| Method                      | Return              | Purpose                              |
| --------------------------- | ------------------- | ------------------------------------ |
| `resolveFilepath(query)`    | `Promise<FilepathResult>` | Attempt to resolve filepath    |
| `getName()`                 | `string`            | Adapter identifier                   |
| `isAvailable()`             | `Promise<boolean>`  | Check if adapter can work            |
| `getPriority()`             | `number`            | Resolution order (higher = earlier)  |

---

### 4. DirectAdapter

**Trigger**: `query.filepath` exists

**Logic**:
- If filepath provided in POST body → return immediately
- No external calls, no validation beyond non-empty check
- Highest priority (100) to short-circuit chain

---

### 5. ExternalAPIAdapter

**Trigger**: `query.filepath` missing, external API configured

**Logic**:
1. Build request body from query fields
2. POST to configured URL with timeout
3. Parse response `{ filepath, status }`
4. Return filepath or error

**Configuration** (environment variables):

| Variable                      | Default | Purpose                    |
| ----------------------------- | ------- | -------------------------- |
| `FILEPATH_EXTERNAL_API_URL`   | -       | External API endpoint      |
| `FILEPATH_EXTERNAL_API_TOKEN` | -       | Authorization header       |
| `FILEPATH_EXTERNAL_API_TIMEOUT` | 5000  | Request timeout (ms)       |

**POST Request Body**:
```json
{
  "userid": "20240001",
  "data_type": "mbti",
  "report_id": "report_001"
}
```

**Expected Response**:
```json
{
  "filepath": "/app/data/input/20240001_mbti.json",
  "status": "ok"
}
```

---

### 6. LocalConfigAdapter (Optional)

**Trigger**: `query.filepath` missing, local rules configured

**Logic**:
- Match query against static rules
- Return mapped filepath
- Useful for testing or simple deployments without external API

**Configuration** (JSON rules file):

```json
{
  "rules": [
    {
      "match": { "data_type": "mbti" },
      "filepath": "/app/data/input/{userid}_mbti.json"
    }
  ]
}
```

---

### 7. FilepathResolver

Orchestrator managing adapter chain:

**Behavior**:
1. Load enabled adapters from config
2. Sort by priority (descending)
3. Iterate: call `adapter.resolveFilepath(query)`
4. First successful result → return
5. All failed → aggregate errors and return

**Configuration**:

| Variable               | Default              | Purpose                      |
| ---------------------- | -------------------- | ---------------------------- |
| `FILEPATH_ADAPTERS`    | `direct,external_api` | Enabled adapters (comma-sep) |
| `FILEPATH_ADAPTER_DIR` | `./adapters`         | Adapter module directory     |

---

## Data Flow

### Sequence Diagram

```
Client Request (POST /api/export)
    │
    │ Body: { userid: "x", data_type: "mbti" }
    │
    ▼
Handler validates request
    │
    ▼
FilepathResolver.resolve(query)
    │
    ├── DirectAdapter.resolveFilepath(query)
    │   │ filepath missing → return { error: "no filepath in body" }
    │
    ├── ExternalAPIAdapter.resolveFilepath(query)
    │   │
    │   │ POST https://api.example.com/filepath
    │   │ Body: { userid: "x", data_type: "mbti" }
    │   │
    │   ▼
    │   Response: { filepath: "/app/data/input/x_mbti.json", status: "ok" }
    │   │
    │   ▼
    │   return { filepath: "...", adapter: "external_api", source: "api" }
    │
    ▼
Handler continues with resolved filepath
    │
    ▼
resolveContainerPath(filepath) → absolute path
    │
    ▼
Read JSON file → normalize → export
```

---

## Error Handling Strategy

### Error Categories

| Category          | Example                              | Response                         |
| ----------------- | ------------------------------------ | -------------------------------- |
| Validation        | Missing `userid`                     | `{ status: 'error', message: '...' }` |
| Adapter unavailable | External API URL not configured    | Skip adapter, continue chain     |
| External API failure | Timeout, connection error         | Log error, try next adapter      |
| External API error response | `{ status: 'error' }`       | Parse error message, propagate   |
| All adapters failed | No filepath found                  | `{ status: 'error', message: '...' }` |

### Retry Strategy

**No retry** at adapter level - resolver tries next adapter instead.

External API adapter logs failure but doesn't retry (follows existing error handling pattern in handlers).

---

## Testing Strategy

### Unit Tests

| Test Case                         | Adapter         | Expected Result                   |
| --------------------------------- | --------------- | --------------------------------- |
| filepath in body                  | DirectAdapter   | Returns filepath immediately      |
| filepath missing, API configured  | ExternalAPI     | POST call, returns API filepath   |
| API timeout                       | ExternalAPI     | Error result, resolver continues  |
| API returns error status          | ExternalAPI     | Error result with message         |
| No adapters configured            | Resolver        | Error: no adapters available      |
| All adapters fail                 | Resolver        | Aggregate error message           |

### Integration Tests

| Test Case                         | Endpoint        | Mock                     |
| --------------------------------- | --------------- | ------------------------ |
| POST body filepath                | `/api/export`   | None (use body filepath) |
| External API filepath resolution  | `/api/export`   | Mock external API        |
| External API failure              | `/api/export`   | Mock timeout/error       |

---

## Configuration Summary

### Environment Variables

| Variable                      | Required | Default              |
| ----------------------------- | -------- | -------------------- |
| `FILEPATH_ADAPTERS`           | No       | `direct,external_api` |
| `FILEPATH_EXTERNAL_API_URL`   | Conditional | - (required if external_api enabled) |
| `FILEPATH_EXTERNAL_API_TOKEN` | No       | -                    |
| `FILEPATH_EXTERNAL_API_TIMEOUT` | No     | `5000`               |
| `FILEPATH_LOCAL_CONFIG_PATH`  | No       | -                    |

### Adapter Priority Table

| Adapter            | Priority | Config Variable                  |
| ------------------ | -------- | -------------------------------- |
| `direct`           | 100      | Always available                 |
| `local_config`     | 50       | `FILEPATH_LOCAL_CONFIG_PATH`     |
| `external_api`     | 10       | `FILEPATH_EXTERNAL_API_URL`      |

---

## Integration Points

### Handler Modification Points

Files to modify:

| File                          | Change                                        |
| ----------------------------- | --------------------------------------------- |
| `preview-handler.ts`          | Replace direct filepath use with resolver     |
| `export-handler.ts`           | Replace direct filepath use with resolver     |
| `report-handler.ts`           | Replace direct filepath use with resolver     |
| `types.ts`                    | Add `data_type`, `report_id` to request types |

### Request Schema Update

Current:
```typescript
interface ExportRequest {
  userid: string;
  filepath: string;
}
```

Proposed:
```typescript
interface ExportRequest {
  userid: string;
  filepath?: string;      // Optional - resolver handles
  data_type?: string;     // New: data type distinction
  report_id?: string;     // New: specific report
}
```

---

## Open Questions

1. **LocalConfigAdapter priority**: Should it run before or after ExternalAPIAdapter?
   - **Recommendation**: Before (priority 50) - static rules faster than API calls

2. **Multiple external APIs**: Should we support multiple external API endpoints?
   - **Recommendation**: Start with single endpoint, add multi-API support if needed

3. **Adapter caching**: Should ExternalAPIAdapter cache responses?
   - **Recommendation**: No caching initially - let external API handle it

4. **Health check**: Should ExternalAPIAdapter expose health status?
   - **Recommendation**: Yes - `isAvailable()` should check API connectivity

---

## Implementation Phases

### Phase 1: Core Infrastructure
- Define interfaces (`FilepathQuery`, `FilepathResult`, `FilepathAdapter`)
- Implement `FilepathResolver` with adapter chain
- Implement `DirectAdapter`

### Phase 2: External API Integration
- Implement `ExternalAPIAdapter` with POST method
- Add environment configuration
- Error handling for timeout/connection failures

### Phase 3: Handler Integration
- Update request types in `types.ts`
- Modify handlers to use resolver
- Update API documentation

### Phase 4: Optional Enhancements
- Implement `LocalConfigAdapter`
- Add health check endpoint
- Performance monitoring

---

## References

### Existing Patterns in Codebase

- `ExportPlugin` interface pattern (`scripts/cli/lib/types.ts:69-72`)
- Plugin array usage (`scripts/cli/commands/export.ts:12`)
- `browserManager` singleton pattern (`scripts/cli/lib/browser-manager.ts`)
- `resolveContainerPath()` function (`scripts/cli/lib/file-utils.ts:285-305`)