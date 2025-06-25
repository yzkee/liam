---
"@liam-hq/db-structure": patch
"@liam-hq/erd-core": patch
"@liam-hq/e2e": patch
---

🐛 Fix ONE_TO_ONE relationship cardinality detection when using UNIQUE constraints

Fixed a bug where ONE_TO_ONE relationships were incorrectly displayed as ONE_TO_MANY when defined via UNIQUE constraints instead of column-level unique properties. The issue occurred because the relationship detection logic only checked the column's `unique` property but not the table's UNIQUE constraints collection.

**What was fixed:**
- `constraintsToRelationships` utility now correctly checks both column-level unique properties and table UNIQUE constraints
- Cardinality detection now properly identifies ONE_TO_ONE relationships defined via unique indexes (common in Rails schemas)
- E2E tests updated to expect correct `zeroOrOneLeft` cardinality instead of incorrect `zeroOrManyLeft`

**Root cause:**
The schemarb parser correctly parsed UNIQUE constraints into the constraints collection, but the relationship handling logic (`handleOneToOneRelationships`) only checked the column's `unique` property, missing constraints defined via unique indexes.

**Impact:**
This ensures accurate ERD visualization where foreign key relationships with unique constraints are properly displayed as ONE_TO_ONE instead of ONE_TO_MANY relationships.