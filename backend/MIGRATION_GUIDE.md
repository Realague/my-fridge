# Migration System Guide

## 🚀 **Overview**

This project uses a sophisticated, production-ready migration system that adapts to different environments and provides multiple safety mechanisms.

## 🏗️ **Architecture**

### **Components:**

1. **`MigrationManager`** - Core migration execution engine
2. **`MigrationStrategy`** - Environment-specific behavior patterns
3. **`MigrationRunner`** (legacy) - CLI-based approach (deprecated)

### **Key Improvements Over Standard Patterns:**

✅ **Native Sequelize APIs** (no shell commands)  
✅ **Transaction safety** (atomic migrations)  
✅ **Environment-aware strategies**  
✅ **Migration validation**  
✅ **Dry-run capabilities**  
✅ **Production safety guards**  
✅ **Rollback to specific points**  

## 📋 **Migration Strategies by Environment**

### **Development Strategy**
- ✅ Auto-runs migrations on startup
- ✅ Immediate feedback and error reporting
- ✅ Fast iteration cycle

### **Staging Strategy**  
- ✅ Always performs dry-run first
- ⚠️ Requires manual approval (`APPROVE_MIGRATIONS=true`)
- ✅ Full validation before execution

### **Production Strategy**
- 🚨 **NEVER** auto-executes migrations
- 🚨 Requires explicit confirmation
- 🚨 Multiple safety checks
- 📊 Only reports pending migrations

### **Manual Strategy**
- 📋 Never auto-executes
- 📊 Only reports status
- 👤 Full manual control

## 🛠️ **Usage Patterns**

### **1. Environment-Based Auto-Execution**

```bash
# Development (auto-runs migrations)
npm run dev

# Staging (dry-run + approval required)
APPROVE_MIGRATIONS=true npm run dev

# Production (only reports, doesn't execute)
NODE_ENV=production npm start

# Manual mode (never auto-executes)
npm run dev:manual
```

### **2. Manual Migration Commands**

```bash
# Smart migration (environment-aware)
npm run migrate:smart

# Force production migration (dangerous!)
npm run migrate:production

# Validate all migrations
npm run migrate:validate

# Legacy CLI commands (still available)
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:undo
```

### **3. API Endpoints**

```bash
# Get migration status
GET /api/migrations/status

# Run migrations (environment-aware)
POST /api/migrations/smart-run

# Get pending migrations
GET /api/migrations/pending

# Validate migrations
GET /api/migrations/validate

# Rollback last migration
POST /api/migrations/rollback

# Rollback to specific migration
POST /api/migrations/rollback-to
Content-Type: application/json
{"migration": "20241201000001-create-users-table.js"}

# Production migration (requires confirmation)
POST /api/migrations/run-production
Content-Type: application/json
{"confirm": "I understand the risks"}
```

## ⚙️ **Configuration**

### **Environment Variables**

```env
# Migration behavior
AUTO_MIGRATE=true                    # Enable auto-migration
NODE_ENV=development                 # Environment strategy
APPROVE_MIGRATIONS=true              # Staging approval
FORCE_PRODUCTION_MIGRATION=true      # Production override (dangerous!)

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=my_fridge_db
DB_USER=postgres
DB_PASSWORD=postgres
```

## 🚨 **Production Safety**

### **Built-in Safety Mechanisms:**

1. **No Auto-Execution** - Production never auto-runs migrations
2. **Explicit Confirmation** - Requires `"I understand the risks"`
3. **Environment Validation** - Checks `NODE_ENV=production`
4. **Transaction Wrapping** - Each migration is atomic
5. **Validation Gates** - Pre-flight checks before execution

### **Production Migration Process:**

```bash
# 1. Validate migrations first
npm run migrate:validate

# 2. Check what will run (dry-run)
NODE_ENV=production npm run migrate:smart

# 3. Execute with explicit override
npm run migrate:production

# OR via API
curl -X POST http://localhost:3000/api/migrations/run-production \
  -H "Content-Type: application/json" \
  -d '{"confirm": "I understand the risks"}'
```

## 📝 **Creating Migrations**

### **Using Sequelize CLI (recommended):**

```bash
# Create new migration
npm run db:migration:create add-products-table

# Edit the generated file
# backend/src/migrations/YYYYMMDDHHMMSS-add-products-table.js
```

### **Migration File Structure:**

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create table
    await queryInterface.createTable('products', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('products', ['name']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('products');
  }
};
```

## 🔄 **Rollback Strategies**

### **Available Rollback Options:**

```bash
# Rollback last migration
POST /api/migrations/rollback

# Rollback to specific migration
POST /api/migrations/rollback-to
{"migration": "20241201000001-create-users-table.js"}

# CLI rollback
npm run db:migrate:undo
npm run db:migrate:undo:all
```

## 🧪 **Testing Migrations**

### **Validation:**

```bash
# Validate all migrations
npm run migrate:validate

# Check pending migrations
curl http://localhost:3000/api/migrations/pending
```

### **Dry Run:**

```bash
# Environment-based dry run
NODE_ENV=staging npm run migrate:smart

# API dry run (staging environment)
POST /api/migrations/smart-run
```

## 🆚 **Comparison: Old vs New Pattern**

| Feature | Old Pattern | New Pattern |
|---------|-------------|-------------|
| **Execution** | Shell commands | Native Sequelize APIs |
| **Safety** | Basic | Multi-layered |
| **Transactions** | ❌ No | ✅ Yes |
| **Environment Awareness** | ❌ No | ✅ Yes |
| **Validation** | ❌ Basic | ✅ Comprehensive |
| **Production Safety** | ⚠️ Risky | ✅ Multiple guards |
| **Rollback** | ❌ Limited | ✅ Flexible |
| **Error Recovery** | ❌ Poor | ✅ Robust |

## 🎯 **Best Practices**

### **DO:**
✅ Always test migrations in development first  
✅ Write reversible migrations (good `down` methods)  
✅ Use transactions for complex migrations  
✅ Validate before deploying to production  
✅ Keep migrations small and focused  
✅ Use descriptive migration names  

### **DON'T:**
❌ Auto-run migrations in production  
❌ Skip migration validation  
❌ Write destructive migrations without backups  
❌ Modify existing migration files  
❌ Use production data in development migrations  
❌ Rush production migrations  

## 🚨 **Emergency Procedures**

### **If Migration Fails in Production:**

1. **Check logs** for specific error
2. **Rollback** to last known good state
3. **Fix migration** in development
4. **Validate fix** in staging
5. **Re-deploy** with corrected migration

```bash
# Emergency rollback
POST /api/migrations/rollback

# Check what executed
GET /api/migrations/status

# Fix and re-run
npm run migrate:validate
npm run migrate:production
```

This migration system provides enterprise-grade safety and flexibility while maintaining ease of use in development! 🚀 