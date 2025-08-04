import type { Meta, StoryObj } from '@storybook/react'
import { Artifact } from './Artifact'

const meta = {
  component: Artifact,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#0a0a0a', // Approximate dark background color
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          height: '100vh',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Artifact>

export default meta
type Story = StoryObj<typeof meta>

const sampleMarkdown = `# Requirements Document

This document outlines system requirements and their associated data manipulation language (DML) operations.

---

## 📋 Business Requirements

The system should provide a comprehensive user management platform that allows administrators to manage user accounts, roles, and permissions efficiently while maintaining security and audit trails.

## 🔧 Functional Requirements

### 1. User Management

The system must provide functionality to create, read, update, and delete user accounts with appropriate role-based access control.

**Use Cases:**

#### 1. Create New User

Administrators should be able to create new user accounts with basic information and assign initial roles.

**Related DML Operations:**

\`\`\`sql
INSERT INTO users (username, email, created_at)
VALUES ('john_doe', 'john@example.com', NOW());
\`\`\`

#### 2. Update User Information

Users should be able to update their profile information including email, password, and display name.

\`\`\`sql
UPDATE users 
SET email = 'newemail@example.com', 
    updated_at = NOW()
WHERE user_id = 123;
\`\`\`

### 2. Role Management

The system must support flexible role creation and assignment with granular permissions.

**Use Cases:**

#### 1. Assign Role to User

Administrators can assign one or more roles to users based on their responsibilities.

\`\`\`sql
INSERT INTO user_roles (user_id, role_id, assigned_at)
VALUES (123, 456, NOW());
\`\`\`

## 📊 Non-Functional Requirements

### 1. Performance

The system should handle up to 10,000 concurrent users with response times under 200ms for standard operations.

### 2. Security

All user data must be encrypted at rest and in transit, with multi-factor authentication available for sensitive operations.

### 3. Scalability

The architecture should support horizontal scaling to accommodate growing user base without significant refactoring.
`

export const Minimal: Story = {
  name: 'Minimal Display',
  args: {
    doc: `# Simple Document

Just a simple document with minimal content to test edge cases.

## Single Section

This document has very little content.`,
  },
}

export const WithRequirements: Story = {
  name: 'Requirements Only (No Use Cases)',
  args: {
    doc: sampleMarkdown,
  },
}

export const FullExample: Story = {
  name: 'Full Example (Requirements, Use Cases, Execution Results)',
  args: {
    doc: `# 📦 Inventory Management System

The system should track inventory levels and generate alerts when stock falls below minimum thresholds.

---

## 📋 Business Requirements

The inventory management system must provide real-time tracking of stock levels across multiple warehouses, automated reordering capabilities, and comprehensive reporting features to optimize supply chain operations.

## 🔧 Functional Requirements

### 1. Inventory Tracking

Monitor real-time inventory levels across all warehouses with automatic synchronization and alerts.

**Use Cases:**

#### 1. Update Stock Levels

When products are received or shipped, the system should update inventory counts in real-time.

**Related DML Operations:**

1. **UPDATE - Decrease Stock for Shipment**

\`\`\`sql
UPDATE inventory 
SET quantity = quantity - 50,
    last_modified = CURRENT_TIMESTAMP
WHERE product_id = 'PROD-001' 
  AND warehouse_id = 'WH-EAST';
\`\`\`

**Execution History:**
- 12/28/2024, 10:30:45 AM: ✅ Success - Updated 1 row(s) in 23ms
- 12/28/2024, 09:15:22 AM: ✅ Success - Updated 1 row(s) in 18ms
- 12/27/2024, 03:45:10 PM: ❌ Failed - Lock timeout exceeded after 5000ms

2. **INSERT - Record Transaction**

\`\`\`sql
INSERT INTO inventory_transactions 
(transaction_id, product_id, quantity_change, transaction_type, created_at)
VALUES 
('TXN-' || gen_random_uuid(), 'PROD-001', -50, 'SHIPMENT', CURRENT_TIMESTAMP);
\`\`\`

**Execution History:**
- 12/28/2024, 10:30:46 AM: ✅ Success - Inserted 1 row(s) in 15ms
- 12/28/2024, 09:15:23 AM: ✅ Success - Inserted 1 row(s) in 12ms

#### 2. Check Low Stock Items

System should automatically identify items below minimum threshold and trigger reorder alerts.

**Related DML Operations:**

\`\`\`sql
SELECT p.product_id, p.product_name, i.quantity, i.minimum_threshold
FROM inventory i
JOIN products p ON i.product_id = p.product_id
WHERE i.quantity < i.minimum_threshold
ORDER BY (i.quantity::float / i.minimum_threshold) ASC;
\`\`\`

### 2. Automated Reordering

System must generate purchase orders automatically when stock falls below configured thresholds.

**Use Cases:**

#### 1. Generate Purchase Order

When inventory reaches minimum threshold, create a purchase order for the optimal reorder quantity.

**Related DML Operations:**

\`\`\`sql
INSERT INTO purchase_orders (order_id, supplier_id, product_id, quantity, status, created_at)
SELECT 
  'PO-' || gen_random_uuid(),
  p.preferred_supplier_id,
  p.product_id,
  p.reorder_quantity,
  'PENDING',
  CURRENT_TIMESTAMP
FROM products p
JOIN inventory i ON p.product_id = i.product_id
WHERE i.quantity < i.minimum_threshold
  AND NOT EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.product_id = p.product_id
      AND po.status IN ('PENDING', 'APPROVED')
  );
\`\`\`

## 📊 Non-Functional Requirements

### 1. Performance

- Response time for inventory queries must be under 100ms for 95% of requests
- System should handle 1,000 concurrent inventory updates per second
- Database indexes optimized for frequent read operations

### 2. Reliability

- 99.9% uptime for inventory tracking services
- Automatic failover to secondary warehouse systems
- Data consistency maintained across distributed warehouses

### 3. Scalability

- Support for up to 100,000 SKUs per warehouse
- Horizontal scaling capability for peak seasons
- Efficient archival of historical transaction data
`,
  },
}
