# Lavans Service App Data Model

## Overview
This data model describes the data structures for the Lavans Service App, a React application for service employees to register inspections of mats and wipers.

## Main Entities

### 1. Inspection
```typescript
interface Inspection {
  id: number;                    // Auto-increment primary key
  relation_number: string;       // Customer relation number
  customer_name: string;         // Customer name
  contact_person: string;        // Contact person name
  contact_email: string;         // Contact person email
  inspector: string;             // Inspector name
  date: string;                  // Inspection date (YYYY-MM-DD)
  time: string;                  // Inspection time (HH:mm)
  created_at: Date;              // Creation timestamp
  updated_at: Date;              // Last update timestamp
  general_values: object;        // JSON object for general fields
}
```

### 2. Mat
```typescript
interface Mat {
  id: number;                    // Auto-increment primary key
  inspection_id: number;         // Foreign key to Inspection
  product_number: string;        // Unique product number (00M001, L001, etc.)
  mat_type: string;              // Mat type (Standard mat 60x90, Logo mat Lavans, etc.)
  department: string;            // Department where mat is located
  location: string;              // Specific location
  quantity: number;              // Number of mats
  present: boolean;              // Whether mat is present
  clean_undamaged: boolean;      // Whether mat is clean and undamaged
  dirt_level_label: string;      // Clean, Lightly dirty, Heavily dirty
  barcode: string;               // Barcode for age calculation
  remarks: string;               // Free text remarks
  age_days?: number;             // Calculated age in days
  representativeness_score?: number; // Representativeness score (0-100)
  mat_category: 'standard' | 'logo'; // Mat category
}
```

### 3. Wiper
```typescript
interface Wiper {
  id: number;                    // Auto-increment primary key
  inspection_id: number;         // Foreign key to Inspection
  article: string;               // Wiper type (Quick wiper 50 cm, etc.)
  counted_quantity: number;      // Number of counted wipers
  used_quantity: number;         // Number of used wipers
  remarks?: string;              // Free text remarks
  dirt_percentage?: number;      // Dirt percentage (for upsell calculation)
}
```

### 4. Accessories
```typescript
interface Accessories {
  id: number;                    // Auto-increment primary key
  inspection_id: number;         // Foreign key to Inspection
  article: string;               // Accessory type (Grid collection tray 50 cm, etc.)
  replace: boolean;              // Whether accessory needs replacement
  quantity: number;              // Number of accessories
  remarks?: string;              // Free text remarks
}
```

### 5. Contact Person
```typescript
interface ContactPerson {
  id: number;                    // Auto-increment primary key
  inspection_id: number;         // Foreign key to Inspection
  first_name: string;            // First name
  middle_name?: string;          // Middle name (van, de, etc.)
  last_name: string;             // Last name
  email: string;                 // Email address
  phone: string;                 // Phone number
  customer_portal: string;       // Customer portal username
  still_employed: boolean;       // Whether person is still employed
  route_contact: boolean;        // Whether person is route contact
}
```

### 6. Competitors
```typescript
interface MatCompetitors {
  id: number;                    // Auto-increment primary key
  inspection_id: number;         // Foreign key to Inspection
  other_mat_present: string;     // Yes/No
  other_mat_competitor: string;  // Competitor name
  competitor_quantity: number;   // Number of competitors
  purchase_quantity: number;     // Number of purchased mats
}

interface WiperCompetitors {
  id: number;                    // Auto-increment primary key
  inspection_id: number;         // Foreign key to Inspection
  wiper_competitor: string;      // Yes/No
  wiper_competitor_name: string; // Competitor name
  wiper_competitor_explanation: string; // Explanation
  other_matters: string;         // Other matters
}
```

### 7. To-Do Items
```typescript
interface TodoItem {
  id: number;                    // Auto-increment primary key
  inspection_id: number;         // Foreign key to Inspection
  text: string;                  // To-do description
  done: boolean;                 // Whether to-do is completed
  category: 'service' | 'customer_service'; // To-do category
  created_at: Date;              // Creation timestamp
  completed_at?: Date;           // Completion timestamp
}
```

## Relationships

```
Inspection (1) ←→ (N) Mat
Inspection (1) ←→ (N) Wiper  
Inspection (1) ←→ (N) Accessories
Inspection (1) ←→ (N) ContactPerson
Inspection (1) ←→ (1) MatCompetitors
Inspection (1) ←→ (1) WiperCompetitors
Inspection (1) ←→ (N) TodoItem
```

## Business Logic

### Age Calculation
```typescript
function calculateAge(barcode: string): string {
  // Barcode format: YYMMDDD (year, month, day)
  // Example: 0300522 = 2003, 05, 22
  if (!barcode || barcode.length < 7) return '-';
  
  const year = parseInt(barcode.slice(0, 2)) + 2000;
  const month = parseInt(barcode.slice(2, 4));
  const day = parseInt(barcode.slice(4, 6));
  
  const productionDate = new Date(year, month - 1, day);
  const today = new Date();
  const ageDays = Math.floor((today - productionDate) / (1000 * 60 * 60 * 24));
  
  return `${Math.floor(ageDays / 365)} years`;
}
```

### Smart To-Do Generation
```typescript
function generateSmartTodos(inspection: Inspection): TodoItem[] {
  const todos: TodoItem[] = [];
  
  // Mat checks
  inspection.mats.forEach(mat => {
    if (!mat.present) {
      todos.push({
        text: `Check why mat '${mat.mat_type}' is not present.`,
        category: 'service'
      });
    }
    
    if (mat.dirt_level_label === 'Heavily dirty') {
      todos.push({
        text: `Replace or clean mat '${mat.mat_type}' (heavily dirty).`,
        category: 'service'
      });
    }
    
    // Logo mat age check
    if (mat.mat_category === 'logo' && mat.barcode) {
      const age = calculateAge(mat.barcode);
      if (age.includes('3') || age.includes('4')) {
        todos.push({
          text: `Logo mat older than 3 years: plan new logo mat.`,
          category: 'customer_service'
        });
      }
    }
  });
  
  return todos;
}
```

## Database Schema (SQL)

```sql
-- Inspections table
CREATE TABLE inspections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  relation_number VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  inspector VARCHAR(255),
  date DATE NOT NULL,
  time TIME NOT NULL,
  general_values JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Mats table
CREATE TABLE mats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inspection_id INT NOT NULL,
  product_number VARCHAR(20) NOT NULL,
  mat_type VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  location VARCHAR(100),
  quantity INT DEFAULT 1,
  present BOOLEAN DEFAULT TRUE,
  clean_undamaged BOOLEAN DEFAULT TRUE,
  dirt_level_label ENUM('Clean', 'Lightly dirty', 'Heavily dirty') DEFAULT 'Clean',
  barcode VARCHAR(50),
  remarks TEXT,
  age_days INT,
  representativeness_score INT,
  mat_category ENUM('standard', 'logo') DEFAULT 'standard',
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Wipers table
CREATE TABLE wipers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inspection_id INT NOT NULL,
  article VARCHAR(255) NOT NULL,
  counted_quantity INT DEFAULT 0,
  used_quantity INT DEFAULT 0,
  remarks TEXT,
  dirt_percentage DECIMAL(5,2),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Accessories table
CREATE TABLE accessories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inspection_id INT NOT NULL,
  article VARCHAR(255) NOT NULL,
  replace BOOLEAN DEFAULT FALSE,
  quantity INT DEFAULT 0,
  remarks TEXT,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Contact persons table
CREATE TABLE contact_persons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inspection_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(50),
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  customer_portal VARCHAR(100),
  still_employed BOOLEAN DEFAULT TRUE,
  route_contact BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Competitors tables
CREATE TABLE mat_competitors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inspection_id INT NOT NULL,
  other_mat_present ENUM('Yes', 'No') DEFAULT 'No',
  other_mat_competitor VARCHAR(255),
  competitor_quantity INT DEFAULT 0,
  purchase_quantity INT DEFAULT 0,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

CREATE TABLE wiper_competitors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inspection_id INT NOT NULL,
  wiper_competitor ENUM('Yes', 'No') DEFAULT 'No',
  wiper_competitor_name VARCHAR(255),
  wiper_competitor_explanation TEXT,
  other_matters TEXT,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- To-do items table
CREATE TABLE todo_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inspection_id INT NOT NULL,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  category ENUM('service', 'customer_service') DEFAULT 'service',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);
```

## Performance Indexes

```sql
-- Indexes for fast queries
CREATE INDEX idx_inspections_relation_number ON inspections(relation_number);
CREATE INDEX idx_inspections_date ON inspections(date);
CREATE INDEX idx_mats_inspection_id ON mats(inspection_id);
CREATE INDEX idx_mats_product_number ON mats(product_number);
CREATE INDEX idx_mats_barcode ON mats(barcode);
CREATE INDEX idx_wipers_inspection_id ON wipers(inspection_id);
CREATE INDEX idx_todo_items_inspection_id ON todo_items(inspection_id);
CREATE INDEX idx_todo_items_category ON todo_items(category);
```

## Data Validation

```typescript
// Validation rules
const validationRules = {
  relation_number: {
    required: true,
    pattern: /^[A-Z0-9]{3,10}$/
  },
  email: {
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  barcode: {
    required: false,
    pattern: /^\d{7,}$/
  },
  age_days: {
    min: 0,
    max: 3650 // 10 years
  }
};
```

## Export/Import Format

```typescript
interface ExportData {
  inspection: Inspection;
  mats: Mat[];
  wipers: Wiper[];
  accessories: Accessories[];
  contactPersons: ContactPerson[];
  matCompetitors: MatCompetitors;
  wiperCompetitors: WiperCompetitors;
  todoItems: TodoItem[];
}
```

This data model is fully compatible with the current React application and can be used for database implementation or API development. 