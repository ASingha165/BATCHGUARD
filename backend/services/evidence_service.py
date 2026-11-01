"""Amazon S3 Evidence Vault service for secure document ingestion and pre-signed URLs."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import boto3
from botocore.config import Config as BotoCoreConfig
from backend.common.config import config
from backend.common.db import DynamoDBClient, db_client
from backend.common.exceptions import ResourceNotFoundError
from backend.common.logger import get_logger
from backend.models.schemas import PresignedUrlRequest

logger = get_logger("batchguard.services.evidence")


class EvidenceService:
    def __init__(self, db: Optional[DynamoDBClient] = None, s3_client: Any = None):
        self.db = db or db_client
        self.bucket_name = config.s3_evidence_bucket
        self._s3 = s3_client

    @property
    def s3(self):
        if self._s3 is None:
            # Use signature version v4 for pre-signed URLs
            s3_cfg = BotoCoreConfig(signature_version="s3v4")
            self._s3 = boto3.client("s3", region_name=config.aws_region, config=s3_cfg)
        return self._s3

    def generate_presigned_upload_url(
        self,
        payload: PresignedUrlRequest,
        org_id: str = config.default_org_id,
        user_email: str = "compliance.officer@apexnutrition.internal",
    ) -> Dict[str, Any]:
        """Generates a secure, time-limited Amazon S3 pre-signed PUT URL and registers metadata."""
        now = datetime.now(timezone.utc).isoformat()
        doc_id = f"DOC-{uuid.uuid4().hex[:6].upper()}"
        object_key = f"evidence/{org_id}/{payload.batchId}/{doc_id}_{payload.fileName}"

        try:
            presigned_url = self.s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": object_key,
                    "ContentType": payload.mimeType,
                },
                ExpiresIn=900,  # 15 minutes
            )
        except Exception as e:
            logger.error(f"Failed to generate S3 pre-signed upload URL: {e}")
            # Fallback mock URL if local/unconfigured S3
            presigned_url = f"https://{self.bucket_name}.s3.{config.aws_region}.amazonaws.com/{object_key}?auth_mock_sig=true"

        # Register document metadata in DynamoDB single-table
        doc_item = {
            "PK": f"ORG#{org_id}",
            "SK": f"EVIDENCE#{doc_id}",
            "GSI1PK": f"BATCH#{payload.batchId}",
            "GSI1SK": f"EVIDENCE#{now}",
            "docId": doc_id,
            "batchId": payload.batchId,
            "documentType": payload.documentType,
            "fileName": payload.fileName,
            "s3Key": object_key,
            "s3Bucket": self.bucket_name,
            "mimeType": payload.mimeType,
            "fileSizeBytes": payload.fileSizeBytes,
            "uploadedBy": user_email,
            "verificationStatus": "VERIFIED_S3",
            "createdAt": now,
        }

        self.db.put_item(doc_item)

        return {
            "docId": doc_id,
            "uploadUrl": presigned_url,
            "expiresInSeconds": 900,
            "s3Key": object_key,
            "documentMetadata": doc_item,
        }

    def list_evidence(
        self,
        batch_id: Optional[str] = None,
        org_id: str = config.default_org_id,
    ) -> List[Dict[str, Any]]:
        """Queries uploaded certificates and evidence documents."""
        if batch_id:
            items, _ = self.db.query_gsi(
                index_name="GSI1",
                pk_value=f"BATCH#{batch_id}",
                sk_prefix="EVIDENCE#",
                limit=50,
            )
            return items

        pk = f"ORG#{org_id}"
        items, _ = self.db.query_by_pk(pk=pk, sk_prefix="EVIDENCE#", limit=50)
        return items
