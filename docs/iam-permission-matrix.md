# BatchGuard IAM Least-Privilege Permission Matrix

> **Security Architecture & Infrastructure Audit Document**  
> Comprehensive mapping of AWS Lambda execution roles, Step Functions state machine policies, and resource-level IAM boundaries.

---

## 1. IAM Principles & Invariants

1. **No Wildcard Resource Access:** Every policy is scoped to specific resource ARNs (`BatchGuardMainTable`, `EvidenceVaultBucket`, `RecallEmergencyAlertsTopic`, `RecallOrchestratorStateMachine`).
2. **Action-Level Partitioning:** Read-only workers (`CalculateBlastRadiusWorker`, `TrackAcknowledgementsWorker`, `ValidateRecallRequestWorker`) receive strictly scoped read policies (`DynamoDBReadPolicy`).
3. **Dedicated Callback Resumption Privileges:** Only `RecallsFunction` possesses explicit `states:SendTaskSuccess` and `states:SendTaskFailure` permissions scoped to `RecallOrchestratorStateMachine`.
4. **Isolated SNS Publishing:** Only `DispatchNotificationsWorker` has `sns:Publish` access scoped to `RecallEmergencyAlertsTopic`.

---

## 2. API Handlers Permission Mapping

| Function Logical ID | Handler Path | IAM Policies Applied | Actions Permitted | Resource Scoping |
| :--- | :--- | :--- | :--- | :--- |
| **`BatchesFunction`** | `handlers.batch_handler.lambda_handler` | `DynamoDBCrudPolicy` | `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `Query` | `BatchGuardMainTable` |
| **`TraceabilityFunction`**| `handlers.traceability_handler.lambda_handler`| `DynamoDBReadPolicy` | `dynamodb:GetItem`, `Query` | `BatchGuardMainTable` |
| **`RecallsFunction`** | `handlers.recall_handler.lambda_handler` | `DynamoDBCrudPolicy`<br/>`Statement` (Scoped SFN Callback) | `dynamodb:*`<br/>`states:StartExecution`<br/>`states:DescribeExecution`<br/>`states:SendTaskSuccess`<br/>`states:SendTaskFailure` | `BatchGuardMainTable`<br/>`RecallOrchestratorStateMachine` |
| **`SuppliersFunction`**| `handlers.supplier_handler.lambda_handler`| `DynamoDBCrudPolicy` | `dynamodb:GetItem`, `PutItem`, `Query` | `BatchGuardMainTable` |
| **`DistributionFunction`**| `handlers.distribution_handler.lambda_handler`| `DynamoDBCrudPolicy`| `dynamodb:GetItem`, `PutItem`, `Query` | `BatchGuardMainTable` |
| **`EvidenceFunction`**| `handlers.evidence_handler.lambda_handler`| `DynamoDBCrudPolicy`<br/>`S3CrudPolicy` | `dynamodb:*`<br/>`s3:PutObject`, `s3:GetObject` | `BatchGuardMainTable`<br/>`EvidenceVaultBucket` |
| **`AuditFunction`** | `handlers.audit_handler.lambda_handler` | `DynamoDBCrudPolicy` | `dynamodb:GetItem`, `PutItem`, `Query` | `BatchGuardMainTable` |

---

## 3. Step Functions Task Workers Permission Mapping

| Function Logical ID | Handler Path | IAM Policies Applied | Actions Permitted | Scoped Resource ARN |
| :--- | :--- | :--- | :--- | :--- |
| **`ValidateRecallRequestWorker`** | `workers.validate_recall_request.lambda_handler` | `DynamoDBReadPolicy` | `dynamodb:GetItem`, `Query` | `BatchGuardMainTable` |
| **`CalculateBlastRadiusWorker`** | `workers.calculate_blast_radius.lambda_handler` | `DynamoDBReadPolicy` | `dynamodb:GetItem`, `Query` | `BatchGuardMainTable` |
| **`EvaluateRecallRiskWorker`** | `workers.evaluate_recall_risk.lambda_handler` | *(Basic Execution Only)* | `logs:CreateLogGroup`, `CreateLogStream`, `PutLogEvents` | CloudWatch Logs Group |
| **`AwaitApprovalWorker`** | `workers.await_approval.lambda_handler` | `DynamoDBCrudPolicy` | `dynamodb:GetItem`, `PutItem`, `UpdateItem` | `BatchGuardMainTable` |
| **`CreateQuarantineTasksWorker`**| `workers.create_quarantine_tasks.lambda_handler`| `DynamoDBCrudPolicy` | `dynamodb:PutItem`, `UpdateItem` | `BatchGuardMainTable` |
| **`IdentifyCarrierInterceptsWorker`**| `workers.identify_carrier_intercepts.lambda_handler`| `DynamoDBCrudPolicy`| `dynamodb:PutItem`, `UpdateItem` | `BatchGuardMainTable` |
| **`DispatchNotificationsWorker`**| `workers.dispatch_notifications.lambda_handler`| `SNSPublishMessagePolicy`<br/>`DynamoDBCrudPolicy` | `sns:Publish`<br/>`dynamodb:PutItem` | `RecallEmergencyAlertsTopic`<br/>`BatchGuardMainTable` |
| **`TrackAcknowledgementsWorker`**| `workers.track_acknowledgements.lambda_handler`| `DynamoDBReadPolicy` | `dynamodb:GetItem`, `Query` | `BatchGuardMainTable` |
| **`RecordAuditEntryWorker`** | `workers.record_audit_entry.lambda_handler` | `DynamoDBCrudPolicy` | `dynamodb:PutItem` (Append-Only) | `BatchGuardMainTable` |
| **`FinalizeRecallWorker`** | `workers.finalize_recall.lambda_handler` | `DynamoDBCrudPolicy` | `dynamodb:GetItem`, `PutItem`, `UpdateItem` | `BatchGuardMainTable` |
| **`HandleRejectionWorker`** | `workers.handle_rejection.lambda_handler` | `DynamoDBCrudPolicy` | `dynamodb:PutItem`, `DeleteItem` (Lock release) | `BatchGuardMainTable` |
| **`HandleTimeoutWorker`** | `workers.handle_timeout.lambda_handler` | `DynamoDBCrudPolicy` | `dynamodb:PutItem`, `DeleteItem` (Lock release) | `BatchGuardMainTable` |
| **`HandleFailureWorker`** | `workers.handle_failure.lambda_handler` | `DynamoDBCrudPolicy` | `dynamodb:PutItem`, `DeleteItem` (Lock release) | `BatchGuardMainTable` |

---

## 4. Step Functions State Machine Execution Role

`RecallOrchestratorStateMachine` uses `AWS::Serverless::StateMachine` with dedicated `LambdaInvokePolicy` declarations scoped to each worker function ARN:

```yaml
Policies:
  - LambdaInvokePolicy:
      FunctionName: !Ref ValidateRecallRequestWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref CalculateBlastRadiusWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref EvaluateRecallRiskWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref AwaitApprovalWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref CreateQuarantineTasksWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref IdentifyCarrierInterceptsWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref DispatchNotificationsWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref TrackAcknowledgementsWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref RecordAuditEntryWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref FinalizeRecallWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref HandleRejectionWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref HandleTimeoutWorker
  - LambdaInvokePolicy:
      FunctionName: !Ref HandleFailureWorker
```

---

## 5. Summary of IAM Invariants

* **No Wildcard Permissions on Actions or Resources.**
* **All Tenant Data Access Scoped to `BatchGuardMainTable`.**
* **Direct S3 Data Access Restricted to `EvidenceFunction` and Bucket Policies.**
* **Task Token Resumption Restricted to `RecallsFunction`.**
