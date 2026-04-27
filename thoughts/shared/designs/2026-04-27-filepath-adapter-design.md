---
date: 2026-04-27
topic: "Filepath Adapter Design"
status: validated
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
6. **Two modes only**: Direct (POST body) or ExternalAPI - no LocalConfigAdapter needed
7. **Multi-API support**: Support multiple external API endpoints
8. **Cache layer**: 24-hour TTL to reduce repeated API calls
9. **Health status**: Each adapter exposes availability status

---

## Approach

**Adapter pattern** with priority-based resolution chain and multi-API support:

```
POST body (userid, data_type?, report_id?, filepath?, api_name?)
    │
    ▼
FilepathResolver (orchestrator)
    │
    ├── 1. DirectAdapter (priority=100): filepath in body? → return directly
    │
    ├── 2. ExternalAPIAdapter (priority=10): 
    │   │   Check cache → if cached & valid → return cached filepath
    │   │   else → POST to configured API → cache result → return filepath
    │   │
    └── All failed → error response
```

**Why this approach**:
- Follows existing `ExportPlugin` pattern in codebase
- **Two modes only**: Direct (POST body) or ExternalAPI
- **Multi-API support**: Named API configurations for different data sources
- **Cache layer**: 24-hour TTL to reduce repeated API calls
- **Health status**: Each adapter exposes availability status
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
| `ExternalAPIAdapter`   | POST call to external API with cache              | `scripts/cli/lib/filepath/adapters/external-api.ts` |
| `FilepathCache`        | 24-hour TTL cache for API responses               | `scripts/cli/lib/filepath/cache.ts`     |
| `APIConfigRegistry`    | Named API endpoint configurations                  | `scripts/cli/lib/filepath/api-config.ts` |
| `AdapterHealthMonitor` | Health status exposure for adapters               | `scripts/cli/lib/filepath/health.ts`    |

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
| `api_name`   | `string`               | No       | Specific API to use (multi-API)      |
| `extra`      | `Record<string, any>`  | No       | Extension field for future use       |

---

### 2. FilepathResult Interface

Output structure:

| Field       | Type                   | Presence  | Purpose                    |
| ----------- | ---------------------- | --------- | -------------------------- |
| `filepath`  | `string`               | Success   | Resolved absolute path     |
| `adapter`   | `string`               | Success   | Which adapter resolved it  |
| `error`     | `string`               | Failure   | Error message              |
| `source`    | `'body' | 'api' | 'cache'` | Success   | Origin of filepath         |
| `cached`    | `boolean`              | Success   | Whether result came from cache |

---

### 3. FilepathAdapter Interface

Contract for all adapters:

| Method                      | Return              | Purpose                              |
| --------------------------- | ------------------- | ------------------------------------ |
| `resolveFilepath(query)`    | `Promise<FilepathResult>` | Attempt to resolve filepath    |
| `getName()`                 | `string`            | Adapter identifier                   |
| `isAvailable()`             | `Promise<boolean>`  | Check if adapter can work            |
| `getPriority()`             | `number`            | Resolution order (higher = earlier)  |
| `getHealthStatus()`         | `Promise<AdapterHealth>` | Get health status for monitoring |

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
1. Check cache for existing filepath (key: `userid:data_type:report_id`)
2. If cached & valid → return cached filepath
3. If not cached → POST to configured API endpoint
4. Parse response `{ filepath, status }`
5. Cache result with 24h TTL
6. Return filepath or error

**Cache key format**: `userid:data_type:report_id`

---

### 6. Multi-API Support (APIConfigRegistry)

**Purpose**: Support multiple external API endpoints for different data sources

**Configuration structure** (environment variable `FILEPATH_API_CONFIGS`):

```json
{
  "apis": {
    "primary": {
      "url": "https://api.example.com/filepath",
      "token": "token-xxx",
      "timeout": 5000
    },
    "backup": {
      "url": "https://backup-api.example.com/filepath",
      "token": "token-yyy",
      "timeout": 10000
    }
  },
  "default": "primary"
}
```

**Selection logic**:
- If `query.api_name` specified → use that API
- If not specified → use `FILEPATH_API_DEFAULT`
- Fallback chain: primary → backup → error

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

### 7. FilepathCache

**Purpose**: Reduce repeated API calls with 24-hour TTL cache

**Behavior**:
| Condition              | Action                                |
| ---------------------- | ------------------------------------- |
| Cache hit & valid      | Return cached filepath immediately    |
| Cache hit & expired    | Call API, update cache, return result |
| Cache miss             | Call API, cache result, return result |

**Cache entry structure**:
| Field        | Type     | Purpose                    |
| ------------ | -------- | -------------------------- |
| `key`        | string   | `userid:data_type:report_id` |
| `filepath`   | string   | Cached filepath value      |
| `timestamp`  | number   | Cache entry timestamp      |
| `ttl`        | number   | Time-to-live (24h default) |

---

### 8. AdapterHealthMonitor

**Purpose**: Expose adapter availability status for monitoring

**Health check endpoints**:

| Endpoint                  | Purpose                              |
| ------------------------- | ------------------------------------ |
| `/api/filepath/health`    | Overall resolver health status       |
| `/api/filepath/health/:adapter` | Individual adapter status       |

**Health response structure**:
```json
{
  "adapter": "external_api",
  "status": "available",
  "lastCheck": "2026-04-27T10:00:00Z",
  "latency": 50,
  "errorRate": 0.01
}
```

**Status values**:
| Status      | Meaning                              |
| ----------- | ------------------------------------ |
| `available` | Adapter is working                   |
| `degraded`  | Adapter working but slow/errors      |
| `unavailable` | Adapter not responding             |

---

### 9. FilepathResolver

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

---

## Data Flow

### Sequence Diagram

```
Client Request (POST /api/export)
    │
    │ Body: { userid: "x", data_type: "mbti", api_name: "primary" }
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
    │   ├── Check cache (key: "x:mbti:")
    │   │   Cache miss → continue
    │   │
    │   │ POST https://api.example.com/filepath
    │   │ Body: { userid: "x", data_type: "mbti" }
    │   │
    │   ▼
    │   Response: { filepath: "/app/data/input/x_mbti.json", status: "ok" }
    │   │
    │   ├── Cache result (TTL: 24h)
    │   │
    │   ▼
    │   return { filepath: "...", adapter: "external_api", source: "api", cached: false }
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
| Cache hit (valid)                 | ExternalAPI     | Returns cached filepath (no API call) |
| Cache hit (expired)               | ExternalAPI     | Calls API, updates cache          |
| API timeout                       | ExternalAPI     | Error result, resolver continues  |
| API returns error status          | ExternalAPI     | Error result with message         |
| Multi-API selection               | ExternalAPI     | Uses specified api_name           |
| No adapters configured            | Resolver        | Error: no adapters available      |
| All adapters fail                 | Resolver        | Aggregate error message           |

### Integration Tests

| Test Case                         | Endpoint        | Mock                     |
| --------------------------------- | --------------- | ------------------------ |
| POST body filepath                | `/api/export`   | None (use body filepath) |
| External API filepath resolution  | `/api/export`   | Mock external API        |
| External API failure              | `/api/export`   | Mock timeout/error       |
| Cache behavior                    | `/api/export`   | Mock API, verify cache   |

---


## Configuration Management (c12)

### Why c12?

Using [unjs/c12](https://github.com/unjs/c12) for smart configuration loading:

**Benefits**:
- Multiple config file formats support (`.ts`, `.json`, `.yaml`, `.toml`)
- Config inheritance via `extends`
- Environment-specific configuration (`$development`, `$production`)
- `.env` file support with interpolation
- No hardcoded environment variables

### Configuration Files

| File                    | Format   | Purpose                        |
| ----------------------- | -------- | ------------------------------ |
| `filepath.config.ts`      | TypeScript | Main config file              |
| `.filepathrc`             | JSON      | Alternative config            |
| `.filepathrc.json`        | JSON      | RC file format                |
| `filepath.config.dev.ts`  | TypeScript | Development overrides         |
| `filepath.config.prod.ts` | TypeScript | Production overrides          |

### Configuration Structure

**filepath.config.ts**:
```typescript
import type { FilepathConfig } from './filepath/types';

export default <FilepathConfig>{
  // Enabled adapters (order determines priority)
  adapters: ['direct', 'external_api'],

  // External API configurations
  apis: {
    primary: {
      url: 'https://api.example.com/filepath',
      token: 'token-xxx',
      timeout: 5000,
    },
    backup: {
      url: 'https://backup-api.example.com/filepath',
      token: 'token-yyy',
      timeout: 10000,
    },
  },

  // Default API to use
  defaultApi: 'primary',

  // Cache settings
  cache: {
    enabled: true,
    ttl: 86400, // 24 hours in seconds
  },

  // Health monitoring
  healthCheck: {
    enabled: true,
    interval: 60000, // Check every minute
  },

  // Environment-specific overrides
  $development: {
    cache: {
      enabled: false, // Disable cache in dev
    },
  },

  $production: {
    healthCheck: {
      interval: 30000, // More frequent checks in prod
    },
  },
};
```

### Loading Configuration

**scripts/cli/lib/filepath/config-loader.ts**:
```typescript
import { loadConfig } from 'c12';
import type { FilepathConfig } from './types';

export async function loadFilepathConfig(): Promise<FilepathConfig> {
  const { config } = await loadConfig<FilepathConfig>({
    name: 'filepath',
    configFile: 'filepath.config',
    rcFile: '.filepathrc',
    globalRc: true, // Load from home directory too
    dotenv: true, // Support .env file
  });

  return config;
}
```

### Config Inheritance (extends)

**filepath.config.ts**:
```typescript
export default {
  extends: './base-config', // or 'gh:org/repo' for remote
  apis: {
    // Override primary API
    primary: {
      url: 'https://custom-api.example.com/filepath',
    },
  },
};
```

### Environment Variables via .env

**.env**:
```
FILEPATH_API_TOKEN=secret-token-xxx
FILEPATH_DEFAULT_API=primary
```

**filepath.config.ts** (using env interpolation):
```typescript
export default {
  apis: {
    primary: {
      url: 'https://api.example.com/filepath',
      token: process.env.FILEPATH_API_TOKEN!,
    },
  },
  defaultApi: process.env.FILEPATH_DEFAULT_API || 'primary',
};
```

### Configuration Types

**scripts/cli/lib/filepath/types.ts**:
```typescript
export interface FilepathConfig {
  adapters: string[];
  apis: Record<string, APIConfig>;
  defaultApi: string;
  cache: CacheConfig;
  healthCheck: HealthCheckConfig;

  // Environment overrides
  $development?: Partial<FilepathConfig>;
  $production?: Partial<FilepathConfig>;
  $test?: Partial<FilepathConfig>;
}

export interface APIConfig {
  url: string;
  token?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize?: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
}
```

### Config Directory Support

c12 supports `.config/` directory:
```
.config/filepath/
├── config.ts        # Main config
├── config.dev.ts    # Dev overrides
├── config.prod.ts   # Prod overrides
└── apis.json        # API configs only
```

### Dependency

Add to package.json:
```json
{
  "dependencies": {
    "c12": "^4.0.0"
  }
}
```

---

## Integration Points

### Handler Modification Points

Files to modify:

| File                          | Change                                        |
| ----------------------------- | --------------------------------------------- |
| `preview-handler.ts`          | Replace direct filepath use with resolver     |
| `export-handler.ts`           | Replace direct filepath use with resolver     |
| `report-handler.ts`           | Replace direct filepath use with resolver     |
| `types.ts`                    | Add `data_type`, `report_id`, `api_name` to request types |

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
  api_name?: string;      // New: specific API selection
}
```

---

## Implementation Phases

### Phase 0: Configuration Setup (c12)
- Install c12 dependency (`bun add c12`)
- Create `filepath.config.ts` type definitions
- Implement `loadFilepathConfig()` in `config-loader.ts`
- Create default config file template
- Add `.env` support documentation

### Phase 1: Core Infrastructure
- Define interfaces (`FilepathQuery`, `FilepathResult`, `FilepathAdapter`, `FilepathConfig`)
- Implement `FilepathResolver` with adapter chain
- Implement `DirectAdapter`

### Phase 2: Multi-API Support
- Implement `APIConfigRegistry` for named API configs
- Implement `ExternalAPIAdapter` with POST method
- Load API configurations from c12 config

### Phase 3: Cache Layer
- Implement `FilepathCache` with configurable TTL (default 24h)
- Add cache key generation logic
- Add cache invalidation on TTL expiry
- Support cache disable in development mode ($development override)

### Phase 4: Handler Integration
- Update request types in `types.ts`
- Modify handlers to use resolver
- Add `api_name` field for specific API selection

### Phase 5: Health Monitoring
- Implement `AdapterHealthMonitor`
- Add health check endpoints
- Add latency and error rate tracking
- Support configurable health check interval
---

## References

### Existing Patterns in Codebase

- `ExportPlugin` interface pattern (`scripts/cli/lib/types.ts:69-72`)
- Plugin array usage (`scripts/cli/commands/export.ts:12`)
- `browserManager` singleton pattern (`scripts/cli/lib/browser-manager.ts`)
- `resolveContainerPath()` function (`scripts/cli/lib/file-utils.ts:285-305`)