# BatchGuard DynamoDB Data Architecture & Schema

## 1. Design Philosophy

BatchGuard uses a **Single-Table Design** pattern on Amazon DynamoDB. By organizing all entities into a single table with composite primary keys (`PK` and `SK`) and two Global Secondary Indexes (`GSI1` and `GSI2`), the system fulfills high-throughput access patterns with zero table joins and deterministic latency (<10ms).

Table Name: `BatchGuard-Main-{Environment}`
Billing Mode: `PAY_PER_REQUEST` (On-Demand)

---

## 2. Table Primary & Secondary Key Structure

| Key Component | Attribute Name | Data Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Partition Key** | `PK` | String | Primary entity routing / partition isolation |
| **Sort Key** | `SK` | String | Hierarchical sorting and 1:N relationship modeling |
| **GSI1 Partition** | `GSI1PK` | String | Inverted index for cross-entity querying |
| **GSI1 Sort** | `GSI1SK` | String | Range query and temporal sorting |
| **GSI2 Partition** | `GSI2PK` | String | Status, categorization, or secondary lookup |
| **GSI2 Sort** | `GSI2SK` | String | Timestamp or status sequencing |

---

## 3. Entity Data Models

### 3.1 Organization (`ORG`)
Represents a food manufacturing or logistics enterprise tenant.
* **PK:** `ORG#<orgId>`
* **SK:** `METADATA`
* **GSI1PK:** `TYPE#ORG` | **GSI1SK:** `<name>`
* **Attributes:**
  * `orgId`: String (UUID)
  * `name`: String (e.g. "Apex Nutrition Global")
  * `fdaRegistrationNumber`: String
  * `headquarters`: String
  * `contactEmail`: String
  * `status`: String (`ACTIVE`, `SUSPENDED`)
  * `createdAt`: ISO 8601 Timestamp

### 3.2 Supplier (`SUPPLIER`)
Verified agricultural producers, ingredient farms, or processing plants.
* **PK:** `ORG#<orgId>`
* **SK:** `SUPPLIER#<supplierId>`
* **GSI1PK:** `TYPE#SUPPLIER` | **GSI1SK:** `<status>#<name>`
* **Attributes:**
  * `supplierId`: String (UUID or code, e.g. `SUP-882`)
  * `name`: String (e.g. "Salinas Valley Organics")
  * `tier`: String (`TIER_1`, `TIER_2`)
  * `facilityCode`: String (GS1 GLN)
  * `certifications`: List of Strings (`["USDA Organic", "GLOBALG.A.P.", "SQF Level 3"]`)
  * `auditScore`: Number (e.g. 98.4)
  * `status`: String (`VERIFIED`, `AUDIT_PENDING`, `FLAGGED`)
  * `updatedAt`: ISO 8601 Timestamp

### 3.3 Product Catalog (`PRODUCT`)
Finished master SKUs produced by the manufacturer.
* **PK:** `ORG#<orgId>`
* **SK:** `PRODUCT#<gtin>`
* **GSI1PK:** `TYPE#PRODUCT` | **GSI1SK:** `<sku>`
* **Attributes:**
  * `gtin`: String (GS1 GTIN-14, e.g. `00850012345678`)
  * `sku`: String (e.g. `SPN-16-ORG`)
  * `title`: String (e.g. "Organic Baby Spinach 16oz")
  * `category`: String ("Produce / Packaged Greens")
  * `temperatureSpec`: Object (`{"minCelsius": 1.0, "maxCelsius": 4.0}`)
  * `shelfLifeDays`: Number (e.g. 14)

### 3.4 Production Batch (`BATCH`)
A discrete production run or lot of a finished product.
* **PK:** `ORG#<orgId>`
* **SK:** `BATCH#<batchId>`
* **GSI1PK:** `GTIN#<gtin>` | **GSI1SK:** `BATCH#<createdAt>`
* **GSI2PK:** `STATUS#<status>` | **GSI2SK:** `<createdAt>`
* **Attributes:**
  * `batchId`: String (e.g. `BG-2024-8891-ORG`)
  * `lotNumber`: String (e.g. `L-8891-A`)
  * `gtin`: String
  * `productName`: String
  * `harvestDate`: String (ISO date)
  * `productionDate`: String (ISO date)
  * `expirationDate`: String (ISO date)
  * `initialQuantity`: Number (cases/units)
  * `currentQuantity`: Number
  * `unitOfMeasure`: String (`CASES`, `LBS`, `PALLETS`)
  * `supplierId`: String
  * `supplierName`: String
  * `facilityGln`: String
  * `status`: String (`RELEASED`, `IN_TRANSIT`, `HOLD`, `RECALLED`, `DESTROYED`)
  * `coldChainOptimal`: Boolean
  * `currentTempCelsius`: Number (e.g. 3.2)
  * `blockchainTxHash`: String (Cryptographic integrity hash)
  * `createdAt`: ISO 8601 Timestamp

### 3.5 Upstream Lineage Event (`LINEAGE`)
Raw materials and ingredients contributing to a finished batch.
* **PK:** `BATCH#<batchId>`
* **SK:** `INGREDIENT#<rawLotId>`
* **Attributes:**
  * `rawLotId`: String (e.g. `RAW-SPN-092`)
  * `ingredientName`: String (e.g. "Raw Baby Spinach Leaves")
  * `supplierId`: String
  * `farmLocation`: String ("Field 4B, Salinas, CA")
  * `harvestTimestamp`: ISO 8601 Timestamp
  * `testingReportId`: String (reference to Evidence Vault S3)
  * `pesticideResidueTest`: String (`PASS`, `FAIL`)
  * `microbialScreen`: String (`CLEAR`, `DETECTED`)

### 3.6 Downstream Distribution Node (`NODE`)
Physical facilities handling goods (DCs, cross-docks, retailers).
* **PK:** `ORG#<orgId>`
* **SK:** `NODE#<nodeId>`
* **GSI1PK:** `TYPE#NODE` | **GSI1SK:** `<nodeType>#<name>`
* **Attributes:**
  * `nodeId`: String (e.g. `NODE-DC-01`)
  * `name`: String (e.g. "Northeast Logistics Hub 01")
  * `nodeType`: String (`PRIMARY_DC`, `TRANSIT_FLEET`, `RETAIL_STORE`, `CROSS_DOCK`)
  * `gln`: String (GS1 Global Location Number)
  * `location`: String ("Newark, NJ")
  * `coordinates`: Object (`{"lat": 40.7357, "lng": -74.1724}`)
  * `contactEmail`: String
  * `contactPhone`: String

### 3.7 Downstream Distribution Record (`DISTRIBUTION`)
Links a batch to physical inventory resting at or transit to a node.
* **PK:** `BATCH#<batchId>`
* **SK:** `DIST#<nodeId>`
* **GSI1PK:** `NODE#<nodeId>` | **GSI1SK:** `BATCH#<batchId>`
* **Attributes:**
  * `batchId`: String
  * `nodeId`: String
  * `nodeName`: String
  * `nodeType`: String
  * `location`: String
  * `allocatedUnits`: Number (e.g. 2800)
  * `shippedUnits`: Number (units consigned/dispatched)
  * `receivedUnits`: Number (units confirmed on dock)
  * `soldUnits`: Number (units registered sold at POS)
  * `remainingUnits`: Number (units currently physically on-site)
  * `quarantinedUnits`: Number (units isolated under quarantine lock)
  * `palletIds`: List of Strings (`["PLT-41", "PLT-42", "PLT-43"]`)
  * `shipmentTrackingNumber`: String
  * `status`: String (`IN_STORAGE`, `IN_TRANSIT`, `DELIVERED`, `QUARANTINED`, `DESTROYED`)
  * `lastReportedTempCelsius`: Number
  * `dispatchedAt`: ISO 8601 Timestamp

### 3.8 Recall Incident (`RECALL`)
A logged safety event and coordinated containment operation.
* **PK:** `ORG#<orgId>`
* **SK:** `RECALL#<recallId>`
* **GSI1PK:** `BATCH#<batchId>` | **GSI1SK:** `RECALL#<createdAt>`
* **GSI2PK:** `STATUS#<status>` | **GSI2SK:** `HAZARD#<hazardClass>`
* **Attributes:**
  * `recallId`: String (e.g. `REC-2024-082`)
  * `batchId`: String
  * `lotNumber`: String
  * `gtin`: String
  * `productName`: String
  * `hazardClass`: String (`CLASS_I_CRITICAL`, `CLASS_II`, `CLASS_III`)
  * `reason`: String (e.g. "Listeria Monocytogenes Detection in Lot 902-A")
  * `severity`: String (`CRITICAL`, `HIGH`, `MEDIUM`)
  * `totalUnitsAtRisk`: Number (e.g. 18450)
  * `totalUnitsIsolated`: Number (e.g. 16500)
  * `isolationPercentage`: Number (e.g. 89.4)
  * `impactedNodesCount`: Number (e.g. 48)
  * `status`: String (`INITIATED`, `CONTAINMENT_IN_PROGRESS`, `CONTAINED`, `CLOSED`)
  * `initiatedBy`: String (user email / ID)
  * `auth2FAToken`: String (verified token hash)
  * `stepFunctionsExecutionArn`: String
  * `containmentWindowHours`: Number
  * `createdAt`: ISO 8601 Timestamp
  * `updatedAt`: ISO 8601 Timestamp

### 3.9 Recall Acknowledgement (`ACKNOWLEDGEMENT`)
Tracks facility-level containment sign-offs.
* **PK:** `RECALL#<recallId>`
* **SK:** `ACK#<nodeId>`
* **GSI1PK:** `NODE#<nodeId>` | **GSI1SK:** `STATUS#<status>`
* **Attributes:**
  * `recallId`: String
  * `nodeId`: String
  * `nodeName`: String
  * `unitsAllocated`: Number
  * `unitsQuarantined`: Number
  * `posScanBlockApplied`: Boolean
  * `physicalHoldVerified`: Boolean
  * `status`: String (`PENDING`, `ACKNOWLEDGED`, `HOLD_VERIFIED`, `DISPOSED`)
  * `acknowledgedBy`: String (facility manager name)
  * `acknowledgedAt`: ISO 8601 Timestamp
  * `disposalCertificateUrl`: String (S3 URL optional)

### 3.10 Active Recall Mutex Lock (`ACTIVE_RECALL`)
Serializes concurrent recall requests on the same batch via conditional write.
* **PK:** `ORG#<orgId>`
* **SK:** `ACTIVE_RECALL#<batchId>`
* **Attributes:**
  * `recallId`: String
  * `batchId`: String
  * `status`: String
  * `lockedAt`: ISO 8601 Timestamp

### 3.11 Facility Quarantine Task (`QUARANTINE_TASK`)
Discrete execution directives issued to individual distribution facilities.
* **PK:** `RECALL#<recallId>`
* **SK:** `TASK#QUARANTINE#<nodeId>`
* **GSI1PK:** `NODE#<nodeId>` | **GSI1SK:** `TASK#<taskId>`
* **Attributes:**
  * `taskId`: String
  * `recallId`: String
  * `batchId`: String
  * `nodeId`: String
  * `nodeName`: String
  * `nodeType`: String
  * `allocatedUnits`: Number
  * `carrierInterceptRequired`: Boolean
  * `quarantineStatus`: String (`PENDING`, `IN_PROGRESS`, `CONFIRMED`, `FAILED`)
  * `createdAt`: ISO 8601 Timestamp

### 3.12 Notification Dispatch Record (`NOTIFICATION`)
Audit proof of Amazon SNS broadcast alerts dispatched to facilities.
* **PK:** `RECALL#<recallId>`
* **SK:** `NOTIFICATION#<timestamp>#<dispatchId>`
* **Attributes:**
  * `dispatchId`: String
  * `recallId`: String
  * `topicArn`: String
  * `messageId`: String
  * `recipientsCount`: Number
  * `status`: String (`DISPATCHED`, `FAILED`)
  * `dispatchedAt`: ISO 8601 Timestamp

### 3.13 Evidence Vault Document (`EVIDENCE`)
Compliance reports, testing records, and audit logs.
* **PK:** `ORG#<orgId>`
* **SK:** `EVIDENCE#<evidenceId>`
* **GSI1PK:** `BATCH#<batchId>` | **GSI1SK:** `EVIDENCE#<createdAt>`
* **Attributes:**
  * `evidenceId`: String (UUID)
  * `batchId`: String
  * `documentType`: String (`COA`, `LAB_TEST`, `BILL_OF_LADING`, `DISPOSAL_ORDER`)
  * `fileName`: String
  * `s3Key`: String
  * `fileSizeBytes`: Number
  * `mimeType`: String (`application/pdf`, etc.)
  * `checksumSha256`: String
  * `uploadedBy`: String
  * `createdAt`: ISO 8601 Timestamp

### 3.11 Audit Log (`AUDIT`)
Append-only log of critical system operations.
* **PK:** `ORG#<orgId>`
* **SK:** `AUDIT#<timestamp>#<eventId>`
* **GSI1PK:** `USER#<userId>` | **GSI1SK:** `AUDIT#<timestamp>`
* **Attributes:**
  * `eventId`: String (UUID)
  * `action`: String (`BATCH_CREATED`, `RECALL_INITIATED`, `QUARANTINE_LOCKED`, `EVIDENCE_UPLOADED`)
  * `entityId`: String (e.g. `BG-2024-8891-ORG`)
  * `userId`: String
  * `userEmail`: String
  * `ipAddress`: String
  * `userAgent`: String
  * `details`: Map
  * `timestamp`: ISO 8601 Timestamp

---

## 4. Primary Access Patterns

| Access Pattern | Method | Key Condition |
| :--- | :--- | :--- |
| **Get Batch Profile** | `GetItem` | `PK = ORG#<orgId>`, `SK = BATCH#<batchId>` |
| **List Organization Batches** | `Query` | `PK = ORG#<orgId>`, `SK begins_with BATCH#` |
| **Find Batches by GTIN** | `Query GSI1` | `GSI1PK = GTIN#<gtin>`, `GSI1SK begins_with BATCH#` |
| **Get Upstream Batch Lineage** | `Query` | `PK = BATCH#<batchId>`, `SK begins_with INGREDIENT#` |
| **Get Downstream Distribution Blast Radius** | `Query` | `PK = BATCH#<batchId>`, `SK begins_with DIST#` |
| **Get Active Recalls** | `Query GSI2` | `GSI2PK = STATUS#INITIATED` |
| **Get Recall Acknowledgements** | `Query` | `PK = RECALL#<recallId>`, `SK begins_with ACK#` |
| **Get Batch Evidence Documents** | `Query GSI1` | `GSI1PK = BATCH#<batchId>`, `GSI1SK begins_with EVIDENCE#` |
| **Get Organization Audit Trail** | `Query` | `PK = ORG#<orgId>`, `SK begins_with AUDIT#` (scanIndexForward=False) |


---

## 5. Tenant Isolation, Concurrency & Cryptographic Invariants

### 5.1 Multi-Tenant Partitioning
Every tenant interaction is bounded by the primary partition key `ORG#<orgId>`.
* Inverted index lookups (e.g. `GSI1PK = BATCH#<batchId>`) filter strictly on caller `PK == ORG#<orgId>`.
* Under no circumstances may client-supplied identifiers override the partition key extracted from verified JWT claims (`requestContext.authorizer.claims`).

### 5.2 Conditional Writes & Concurrency Controls
* **Item Insertion:** Uses `ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)"` to prevent silent overwrites from concurrent calls.
* **Idempotency Protection:** Critical operations (recall initiation) verify `IDEMP#<idempotencyToken>` with a 24-hour TTL before executing workflow side effects.
* **Recall Duplication Guard:** Checks whether `GSI1PK = BATCH#<batchId>` has an existing record with status `INITIATED` or `CONTAINMENT_IN_PROGRESS`.

### 5.3 Audit Integrity Classification
1. **Application Append-Only:** DynamoDB write policies enforce conditional puts preventing in-place mutations.
2. **Hash-Based Tamper Evidence:** Records contain a deterministic SHA-256 checksum of canonical JSON attributes. Any subsequent row modification breaks hash validation.
3. **Enterprise Non-Repudiation (WORM):** True regulatory immutability is implemented via DynamoDB Streams streaming into an Amazon S3 bucket configured with **S3 Object Lock (Compliance Mode)**.
