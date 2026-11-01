# BatchGuard REST API Specification

Version: `v1`
Protocol: `HTTPS`
Ingress: `Amazon API Gateway`
Content-Type: `application/json`

---

## 1. Global Conventions

### Response Envelope Format

#### Success (200, 201)
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "requestId": "c6b7979d-26e7-4b7b-99f5-7d5267f897b6",
    "timestamp": "2026-11-01T21:40:00Z"
  }
}
```

#### Error (400, 401, 403, 404, 409, 500)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Batch with ID BG-2024-8891-ORG does not exist.",
    "details": []
  },
  "meta": {
    "requestId": "c6b7979d-26e7-4b7b-99f5-7d5267f897b6",
    "timestamp": "2026-11-01T21:40:00Z"
  }
}
```

---

## 2. API Endpoints

### 2.1 Overview & Dashboard

#### `GET /v1/overview/summary`
Retrieves aggregated statistics for the Operational Overview dashboard.
* **Query Parameters:**
  * `orgId` (optional, defaults to tenant context)
* **Response `data`:**
  ```json
  {
    "totalBatches": 148920,
    "activeLifecycleBatches": 42180,
    "activeSuppliers": 1248,
    "monitoredDistributionNodes": 4821,
    "activeRecallsCount": 2,
    "complianceLedgerStatus": "FSMA_204_SYNCED",
    "lastAuditTimestamp": "2026-11-01T21:30:00Z"
  }
  ```

---

### 2.2 Batches & Lineage

#### `GET /v1/batches`
Lists registered batches with pagination and status filters.
* **Query Parameters:**
  * `status` (optional: `ALL`, `RELEASED`, `IN_TRANSIT`, `HOLD`, `RECALLED`)
  * `gtin` (optional)
  * `limit` (default: 20)
  * `nextToken` (pagination cursor)
* **Response `data`:**
  ```json
  {
    "batches": [
      {
        "batchId": "BG-2024-8891-ORG",
        "lotNumber": "L-8891-A",
        "gtin": "00850012345678",
        "productName": "Organic Baby Spinach 16oz",
        "initialQuantity": 14400,
        "currentQuantity": 14400,
        "unitOfMeasure": "CASES",
        "supplierName": "Salinas Valley Organics",
        "harvestDate": "2024-10-12",
        "productionDate": "2024-10-14",
        "expirationDate": "2024-10-28",
        "status": "IN_TRANSIT",
        "coldChainOptimal": true,
        "currentTempCelsius": 3.2,
        "blockchainTxHash": "0x8f7d92a14e9c71a3",
        "createdAt": "2024-10-14T08:00:00Z"
      }
    ],
    "nextToken": null
  }
  ```

#### `POST /v1/batches`
Registers a new production batch into the system.
* **Request Body:**
  ```json
  {
    "lotNumber": "L-902-B",
    "gtin": "00850012345678",
    "productName": "Organic Baby Spinach 16oz",
    "initialQuantity": 10000,
    "unitOfMeasure": "CASES",
    "supplierId": "SUP-882",
    "facilityGln": "0850012340019",
    "harvestDate": "2024-10-15",
    "productionDate": "2024-10-16",
    "expirationDate": "2024-10-30",
    "ingredients": [
      {
        "rawLotId": "RAW-SPN-101",
        "name": "Organic Spinach Leaves",
        "supplierId": "SUP-882",
        "harvestDate": "2024-10-15"
      }
    ]
  }
  ```

#### `GET /v1/batches/{batchId}`
Retrieves complete batch profile, GTIN metadata, and status.

#### `GET /v1/batches/{batchId}/lineage`
Retrieves upstream ingredient lineage and downstream distribution mapping for genealogy visualization.
* **Response `data`:**
  ```json
  {
    "batchId": "BG-2024-8891-ORG",
    "upstream": [
      {
        "rawLotId": "RAW-SPN-092",
        "ingredient": "Raw Baby Spinach Leaves",
        "supplier": "Salinas Valley Organics",
        "farmLocation": "Field 4B, Salinas, CA",
        "harvestTimestamp": "2024-10-12T06:30:00Z",
        "tests": { "microbial": "CLEAR", "pesticide": "PASS" }
      }
    ],
    "downstream": [
      {
        "nodeId": "NODE-DC-01",
        "nodeName": "Northeast Logistics Hub 01",
        "nodeType": "PRIMARY_DC",
        "location": "Newark, NJ",
        "allocatedUnits": 2800,
        "status": "IN_STORAGE"
      },
      {
        "nodeId": "NODE-CARRIER-204",
        "nodeName": "ColdRoute Fleet Carrier #204",
        "nodeType": "TRANSIT_FLEET",
        "location": "En route I-87",
        "allocatedUnits": 1400,
        "status": "IN_TRANSIT"
      },
      {
        "nodeId": "NODE-RETAIL-CLUSTER-WF",
        "nodeName": "WholeFoods Mid-Atlantic (42 stores)",
        "nodeType": "RETAIL_STORE",
        "location": "NY / NJ / CT",
        "allocatedUnits": 2000,
        "status": "DELIVERED"
      }
    ]
  }
  ```

#### `GET /v1/batches/{batchId}/traceability`
Retrieves the comprehensive multi-tier graph including recursive upstream ingredients, deduplicated downstream distribution nodes, 6-dimension KDE completeness score, and real-time inventory risk metrics.
* **Query Parameters:**
  * `limit` (optional, default 50)
  * `nextToken` (optional pagination token for large distribution topologies)
* **Response `data`:**
  ```json
  {
    "batchId": "BG-2024-8891-ORG",
    "upstreamNodes": [
      {
        "nodeId": "NODE-ING-LOT-SPN-01",
        "lotId": "LOT-SPN-01",
        "ingredientName": "Fresh Organic Baby Spinach",
        "supplierId": "SUP-882",
        "supplierName": "Salinas Valley Organics",
        "facilityGln": "0850012999011",
        "farmLocation": "Salinas, CA",
        "harvestTimestamp": "2024-10-12T06:30:00Z",
        "quantityUsed": 4800.0,
        "depth": 1,
        "parentLotIds": [],
        "cycleDetected": false,
        "verified": true,
        "tests": { "microbial": "CLEAR", "pesticide": "PASS", "heavyMetals": "PASS" }
      }
    ],
    "downstreamNodes": [
      {
        "nodeId": "DC-CHICAGO-01",
        "nodeName": "Chicago Distribution Center",
        "nodeType": "PRIMARY_DC",
        "gln": "0850012340019",
        "location": "Chicago, IL",
        "shippedUnits": 3400,
        "receivedUnits": 3400,
        "soldUnits": 0,
        "remainingUnits": 3400,
        "quarantinedUnits": 0,
        "status": "IN_STORAGE"
      }
    ],
    "completeness": {
      "overallScore": 94.5,
      "classification": "HIGH",
      "originHarvestScore": 100.0,
      "supplierVerificationScore": 100.0,
      "labEvidenceScore": 100.0,
      "chainOfCustodyScore": 95.0,
      "downstreamDeliveryScore": 90.0,
      "posInventoryScore": 85.0,
      "missingKdeFields": []
    },
    "impactMetrics": {
      "totalUnitsAtRisk": 6200,
      "knownRemainingUnits": 5400,
      "confirmedSoldUnits": 600,
      "unconfirmedUnits": 200,
      "impactedFacilityCount": 3,
      "carrierInterceptsRequired": 1,
      "criticalityLevel": "HIGH"
    },
    "warnings": [],
    "nextToken": null
  }
  ```

---

### 2.3 One-Click Recall Operations (Signature Feature)

#### `POST /v1/recalls/assess-blast-radius`
Pre-flight query for the Recall Wizard (Step 3). Evaluates affected units and impacted downstream facilities before committing to a recall.
* **Request Body:**
  ```json
  {
    "batchId": "BG-2024-8891-ORG"
  }
  ```
* **Response `data`:**
  ```json
  {
    "batchId": "BG-2024-8891-ORG",
    "totalUnitsAtRisk": 6200,
    "impactedNodes": [
      {
        "nodeId": "NODE-DC-01",
        "nodeName": "Northeast Logistics Hub 01",
        "nodeType": "PRIMARY_DC",
        "location": "Newark, NJ",
        "lotAllocation": "2,800 units",
        "preCommandAction": "Auto-quarantine pallet racks 41-48"
      },
      {
        "nodeId": "NODE-CARRIER-204",
        "nodeName": "ColdRoute Fleet Carrier #204",
        "nodeType": "TRANSIT_FLEET",
        "location": "En route I-87",
        "lotAllocation": "1,400 units",
        "preCommandAction": "Re-route to Secure Depot C"
      },
      {
        "nodeId": "NODE-RETAIL-CLUSTER-WF",
        "nodeName": "WholeFoods Mid-Atlantic (42 stores)",
        "nodeType": "RETAIL_STORE",
        "location": "NY / NJ / CT",
        "lotAllocation": "2,000 units",
        "preCommandAction": "POS register scan-block lock"
      }
    ],
    "complianceChecklist": [
      "Notify State Food Safety Authorities within 4 hours",
      "Broadcast downstream wholesale embargo command",
      "Lock serial number barcode matrix at checkout POS",
      "Generate immutable signed cryptographic audit record"
    ]
  }
  ```

#### `POST /v1/recalls/initiate`
Executes targeted recall protocol across the supply chain. Triggers AWS Step Functions orchestrator.
* **Request Body:**
  ```json
  {
    "batchId": "BG-2024-8891-ORG",
    "hazardClass": "CLASS_I_CRITICAL",
    "reason": "Listeria Monocytogenes Detection in Lot 902-A",
    "confirmationPhrase": "CONFIRM-RECALL-BG-2024-8891-ORG",
    "auth2FAToken": "882910",
    "idempotencyToken": "req-idem-98124a"
  }
  ```
* **Response `data`:**
  ```json
  {
    "recallId": "REC-2024-082",
    "batchId": "BG-2024-8891-ORG",
    "status": "INITIATED",
    "stepFunctionsExecutionArn": "arn:aws:states:us-east-1:123456789012:execution:BatchGuardRecallOrchestrator:rec-2024-082",
    "totalUnitsAtRisk": 6200,
    "impactedNodesCount": 48,
    "initiatedAt": "2026-11-01T21:42:00Z"
  }
  ```

#### `GET /v1/recalls`
Lists active and past product recalls with containment metrics.

#### `GET /v1/recalls/{recallId}`
Fetches active containment metrics, containment percentage, and live audit ledger.

#### `POST /v1/recalls/{recallId}/acknowledge`
Allows an authorized facility manager or automated WMS hook to record unit quarantine.
* **Request Body:**
  ```json
  {
    "nodeId": "NODE-DC-01",
    "unitsQuarantined": 2800,
    "posScanBlockApplied": true,
    "physicalHoldVerified": true,
    "acknowledgedBy": "Marcus Rivera (DC Operations Mgr)"
  }
  ```

---

### 2.4 Evidence Vault (S3 Pre-signed Ingestion)

#### `POST /v1/evidence/upload-url`
Requests a pre-signed S3 URL for secure document upload.
* **Request Body:**
  ```json
  {
    "batchId": "BG-2024-8891-ORG",
    "documentType": "LAB_TEST",
    "fileName": "Microbial_Screen_Lot_902A.pdf",
    "fileSizeBytes": 245000,
    "mimeType": "application/pdf"
  }
  ```
* **Response `data`:**
  ```json
  {
    "evidenceId": "EVD-88192-A",
    "uploadUrl": "https://batchguard-evidence-vault-dev-us-east-1.s3.amazonaws.com/batches/BG-2024-8891-ORG/EVD-88192-A.pdf?AWSAccessKeyId=...",
    "expiresInSeconds": 900
  }
  ```

---

### 2.5 Audit Trail

#### `GET /v1/audit/logs`
Queries the chronological event history.
* **Query Parameters:**
  * `batchId` (optional)
  * `recallId` (optional)
  * `limit` (default: 50)

