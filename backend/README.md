# BatchGuard Serverless Backend (Python 3.12)

## Overview

The BatchGuard backend is an event-driven, decoupled AWS serverless architecture built with Python 3.12. It provides REST API compute behind Amazon API Gateway, stateful workflow orchestration via AWS Step Functions, single-table persistence on Amazon DynamoDB, and emergency fan-out messaging via Amazon SNS.

---

## Directory Structure

```
backend/
├── handlers/              # API Gateway entrypoint Lambda functions
│   ├── batch_handler.py   # /v1/batches and /v1/batches/{id}/lineage
│   ├── recall_handler.py  # /v1/recalls/* (assess, initiate, acknowledge)
│   └── overview_handler.py# /v1/overview/summary
├── workers/               # Step Functions task worker Lambdas
│   ├── calculate_blast_radius.py
│   ├── dispatch_notifications.py
│   ├── lock_pos_inventory.py
│   └── record_audit_entry.py
├── common/                # Shared utilities
│   ├── config.py          # Environment configuration
│   ├── db.py              # DynamoDB single-table client & deserializer
│   ├── exceptions.py      # Structured domain exceptions
│   ├── logger.py          # CloudWatch JSON logger
│   └── response.py        # API Gateway standardized response envelope
├── models/                # Request & response Pydantic models
│   └── schemas.py
├── services/              # Pure business logic services
│   ├── batch_service.py
│   └── recall_service.py
├── tests/                 # Pytest test suite
│   ├── conftest.py
│   ├── test_response.py
│   ├── test_schemas.py
│   └── test_recall_service.py
└── requirements.txt
```

---

## Local Testing with Pytest

Run all unit tests:
```bash
pytest backend/tests/ -v
```

