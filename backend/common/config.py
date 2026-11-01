"""Centralized environment configuration for BatchGuard Lambda handlers."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    environment: str = os.environ.get("ENVIRONMENT", "development")
    aws_region: str = os.environ.get("AWS_REGION", "us-east-1")
    dynamodb_table_name: str = os.environ.get("DYNAMODB_TABLE_NAME", "BatchGuard-Main-dev")
    s3_evidence_bucket: str = os.environ.get("S3_EVIDENCE_BUCKET_NAME", "batchguard-evidence-vault-dev")
    sns_recall_topic_arn: str = os.environ.get("SNS_RECALL_TOPIC_ARN", "")
    step_functions_recall_arn: str = os.environ.get("STEP_FUNCTIONS_RECALL_ARN", "")
    default_org_id: str = os.environ.get("DEFAULT_ORG_ID", "ORG-APEX-GLOBAL")


config = Config()

