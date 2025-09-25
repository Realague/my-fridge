# Service Architecture Guidelines

This document outlines the standardized patterns for API services in the frontend application.

## Service Pattern Overview

All services follow a unified pattern that provides:
- **Consistent error handling**
- **Proper authentication** with automatic token refresh
- **Support for both React components and stores**
- **No manual initialization required**

## Standard Service Structure

```typescript
import { makeAuthenticatedApiCall } from '@/utils/apiAuth';

// Types and interfaces here...

// Non-hook API service for use in stores and non-React contexts
const createApiService = () => {
  const makeApiCall = async (url: string, options: { 
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; 
    body?: any; 
    headers?: Record<string, string>; 
  } = {}) => {
    const response = await makeAuthenticatedApiCall(url, options, {
      showToast: false // Let individual services handle their own error messaging
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response;
  };

  return {
    get: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'GET', headers }),
    post: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'POST', body, headers }),
    put: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'PUT', body, headers }),
    delete: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'DELETE', headers }),
  };
};

const apiService = createApiService();

// Service methods using apiService...
```

## Key Principles

### 1. No Double JSON Handling
❌ **Wrong:**
```typescript
const response = await makeApiCall(url, {
  method: 'POST',
  body: JSON.stringify(data), // Don't do this!
});
```

✅ **Correct:**
```typescript
const response = await apiService.post(url, data); // Let makeAuthenticatedApiCall handle JSON
```

### 2. Consistent Error Handling
- All services check `response.ok` and throw meaningful errors
- Services don't directly show toasts (let components handle UI feedback)
- Network errors are caught gracefully

### 3. Direct API Service Usage
❌ **Wrong:** Dependency injection patterns
```typescript
let apiInstance: ReturnType<typeof useApiWithAuth> | null = null;
export const initializeService = (api) => { apiInstance = api; };
```

✅ **Correct:** Direct service creation
```typescript
const apiService = createApiService();
```

### 4. Response Handling Pattern
All service methods follow this pattern:

```typescript
const someMethod = async (params): Promise<ReturnType> => {
  const response = await apiService.get('/api/endpoint');
  const result: ApiResponse<ReturnType> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Operation failed');
  }
  
  return result.data!;
};
```

## Service Types

### Standard Services
- `itemService.ts` - Item management
- `storedItemService.ts` - Stored items in storage areas
- `storageAreaService.ts` - Storage area management  
- `mealPlanService.ts` - Meal planning

### Hook-Only Services
Some services like `recipeService.ts` only provide React hooks:

```typescript
export const useRecipeService = () => {
  const { makeApiCall } = useApiWithAuth();
  // Direct hook usage for React components only
};
```

## Store Architecture

### Standardized Store Pattern
All Zustand stores follow the same API service pattern as services:

```typescript
// In stores like recipeStore.ts, householdStore.ts, shoppingStore.ts
const createApiService = () => {
  const makeApiCall = async (url: string, options: { 
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; 
    body?: any; 
    headers?: Record<string, string>; 
  } = {}) => {
    const response = await makeAuthenticatedApiCall(url, options, {
      showToast: false // Let stores handle their own error messaging
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response;
  };

  return {
    get: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'GET', headers }),
    post: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'POST', body, headers }),
    put: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'PUT', body, headers }),
    delete: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'DELETE', headers }),
  };
};

const apiService = createApiService();
```

### Store Usage Pattern
```typescript
// In store actions
const response = await apiService.get('/api/endpoint');
const responseData = await response.json();
const result = responseData.data || responseData;
```

## Migration from Old Patterns

### From Broken JSON Handling
Replace double JSON parsing/stringifying with direct body passing.

### From Dependency Injection
Remove `initialize*` functions and use direct service creation.

### From Inconsistent Error Handling
Standardize on checking `response.ok` and `result.success`.

## Best Practices

1. **Use TypeScript interfaces** for all request/response types
2. **Provide meaningful error messages** for different failure scenarios
3. **Keep services focused** - one service per domain area
4. **Export service objects** for direct usage in stores
5. **Export hooks** for React component usage
6. **Don't mix concerns** - services handle API calls, components handle UI

## Examples

### ✅ Good Service Usage in Store
```typescript
import { itemService } from '@/services/itemService';

// In store action
const items = await itemService.searchItems({ search: 'milk' });
```

### ✅ Good Hook Usage in Component
```typescript
import { useItemService } from '@/services/itemService';

const MyComponent = () => {
  const itemService = useItemService();
  // Use service methods...
};
```

This standardized approach eliminates runtime errors, reduces boilerplate, and ensures consistent behavior across all API interactions.
