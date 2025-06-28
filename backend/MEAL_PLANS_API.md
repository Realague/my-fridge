# Meal Plans API

## Overview
The Meal Plans API allows users to schedule recipes for specific dates and meal types, and generate shopping lists based on planned meals.

## Endpoints

### Base URL: `/api/households/:householdId/meal-plans`

### 1. Create Meal Plan
- **POST** `/api/households/:householdId/meal-plans`
- **Description**: Create a new meal plan for a specific date and meal type
- **Authentication**: Required
- **Body**:
```json
{
  "recipeId": "uuid",
  "date": "2024-01-15",
  "mealType": "breakfast|lunch|dinner",
  "servings": 4,
  "notes": "Optional notes"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "householdId": "uuid",
    "recipeId": "uuid", 
    "userId": "uuid",
    "date": "2024-01-15",
    "mealType": "dinner",
    "servings": 4,
    "notes": "Family dinner",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "recipe": {
      "id": "uuid",
      "title": "Chicken Teriyaki",
      "description": "Delicious teriyaki chicken",
      "prepTime": 15,
      "cookTime": 25,
      "difficulty": "Medium",
      "tags": ["chicken", "asian"]
    }
  },
  "message": "Meal plan created successfully"
}
```

### 2. Get All Meal Plans
- **GET** `/api/households/:householdId/meal-plans`
- **Description**: Get all meal plans for a household with optional filters
- **Authentication**: Required
- **Query Parameters**:
  - `startDate` (optional): Filter by start date (YYYY-MM-DD)
  - `endDate` (optional): Filter by end date (YYYY-MM-DD)
  - `date` (optional): Filter by specific date (YYYY-MM-DD)
  - `mealType` (optional): Filter by meal type (breakfast|lunch|dinner)
  - `recipeId` (optional): Filter by recipe ID
  - `limit` (optional): Number of results (default: 100)
  - `offset` (optional): Pagination offset (default: 0)

### 3. Get Meal Plans by Date Range
- **GET** `/api/households/:householdId/meal-plans/date-range?startDate=2024-01-15&endDate=2024-01-21`
- **Description**: Get meal plans within a specific date range
- **Authentication**: Required

### 4. Get Meal Plans by Date
- **GET** `/api/households/:householdId/meal-plans/by-date?date=2024-01-15`
- **Description**: Get all meal plans for a specific date
- **Authentication**: Required

### 5. Get Specific Meal Plan
- **GET** `/api/households/:householdId/meal-plans/:id`
- **Description**: Get a specific meal plan by ID
- **Authentication**: Required

### 6. Update Meal Plan
- **PUT** `/api/households/:householdId/meal-plans/:id`
- **Description**: Update an existing meal plan
- **Authentication**: Required
- **Body**:
```json
{
  "recipeId": "uuid",
  "date": "2024-01-16",
  "mealType": "lunch",
  "servings": 6,
  "notes": "Updated notes"
}
```

### 7. Delete Meal Plan
- **DELETE** `/api/households/:householdId/meal-plans/:id`
- **Description**: Delete a meal plan
- **Authentication**: Required

### 8. Generate Shopping List
- **POST** `/api/households/:householdId/meal-plans/shopping-list`
- **Description**: Generate a shopping list based on meal plans in a date range
- **Authentication**: Required
- **Body**:
```json
{
  "startDate": "2024-01-15",
  "endDate": "2024-01-21"
}
```
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "itemId": "uuid",
      "itemName": "Chicken Breast",
      "totalQuantity": 2.5,
      "unit": "lb",
      "recipes": ["Chicken Teriyaki", "Grilled Chicken"]
    }
  ],
  "message": "Shopping list generated successfully"
}
```

### 9. Get Meal Plan Statistics
- **GET** `/api/households/:householdId/meal-plans/stats?startDate=2024-01-01&endDate=2024-01-31`
- **Description**: Get statistics about meal plans (meal type distribution)
- **Authentication**: Required

## Data Models

### MealPlan
```typescript
interface MealPlan {
  id: string;
  householdId: string;
  recipeId: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  mealType: 'breakfast' | 'lunch' | 'dinner';
  servings: number; // 1-20
  notes?: string; // max 500 characters
  createdAt: Date;
  updatedAt: Date;
}
```

## Business Rules

1. **Unique Constraint**: Only one meal plan per household, date, and meal type combination
2. **Servings Range**: Must be between 1 and 20
3. **Date Format**: Must be in YYYY-MM-DD format
4. **Recipe Validation**: Recipe must exist and belong to the household
5. **Notes Limit**: Maximum 500 characters

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "details": ["Date must be in YYYY-MM-DD format"]
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Meal plan not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "A meal plan already exists for dinner on 2024-01-15"
}
```

## Database Schema

### Table: `meal_plans`
- `id` (UUID, Primary Key)
- `householdId` (UUID, Foreign Key → households.id)
- `recipeId` (UUID, Foreign Key → recipes.id)
- `userId` (UUID, Foreign Key → users.id)
- `date` (DATE)
- `mealType` (ENUM: breakfast, lunch, dinner)
- `servings` (INTEGER, 1-20)
- `notes` (TEXT, max 500 chars)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

### Indexes
- `householdId`
- `recipeId`
- `userId`
- `date`
- `householdId, date`
- `householdId, date, mealType` (unique constraint)

## Shopping List Generation

The shopping list feature:
1. Aggregates all ingredients from meal plans in the specified date range
2. Multiplies ingredient quantities by the number of servings
3. Groups identical ingredients and sums their quantities
4. Returns a consolidated list with recipe references

## Usage Examples

### Plan a week of meals
```bash
# Plan breakfast for Monday
POST /api/households/123/meal-plans
{
  "recipeId": "recipe-1",
  "date": "2024-01-15",
  "mealType": "breakfast",
  "servings": 4
}

# Plan lunch for Monday
POST /api/households/123/meal-plans
{
  "recipeId": "recipe-2", 
  "date": "2024-01-15",
  "mealType": "lunch",
  "servings": 4
}

# Get week's meal plans
GET /api/households/123/meal-plans?startDate=2024-01-15&endDate=2024-01-21

# Generate shopping list for the week
POST /api/households/123/meal-plans/shopping-list
{
  "startDate": "2024-01-15",
  "endDate": "2024-01-21"
}
``` 