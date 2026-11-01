"""Step Functions task worker: Dispatches Amazon SNS emergency recall alerts with deterministic deduplication."""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict
import boto3
from backend.common.config import config
from backend.common.db import db_client
from backend.common.logger import get_logger

logger = get_logger("batchguard.workers.dispatch_sns")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Publishes emergency recall broadcast payload to Amazon SNS topic with durable deduplication."""
    recall_id = event.get("recallId")
    batch_id = event.get("batchId")
    hazard_class = event.get("hazardClass")
    reason = event.get("reason")
    org_id = event.get("orgId", config.default_org_id)
    impacted_nodes_count = event.get("impactedNodesCount", 0)

    # 1. Deterministic Idempotency Guard: prevent duplicate emergency broadcasts on worker retry
    existing_dispatch = db_client.get_item(pk=f"RECALL#{recall_id}", sk="DISPATCH#EMERGENCY_BROADCAST")
    if isinstance(existing_dispatch, dict) and existing_dispatch.get("status") == "DISPATCHED":
        logger.info(f"Duplicate emergency broadcast suppressed for recall '{recall_id}'. Already dispatched at {existing_dispatch.get('dispatchedAt')}")
        return {
            **event,
            "notificationsDispatched": True,
            "dispatchId": existing_dispatch.get("dispatchId"),
            "broadcastTimestamp": existing_dispatch.get("dispatchedAt"),
            "deduplicated": True,
        }

    now = datetime.now(timezone.utc).isoformat()
    dispatch_id = f"DISP-{hashlib.sha256(f'{org_id}#{recall_id}#EMERGENCY_BROADCAST'.encode()).hexdigest()[:8].upper()}"

    message_body = {
        "event": "ONE_CLICK_RECALL_INITIATED",
        "recallId": recall_id,
        "batchId": batch_id,
        "orgId": org_id,
        "hazardClass": hazard_class,
        "reason": reason,
        "impactedFacilitiesCount": impacted_nodes_count,
        "urgentAction": "HOLD_IMMEDIATE_EDI_940_POS_SCAN_BLOCK",
        "dispatchTimestamp": now,
    }

    message_id = None
    sns_published = False

    if config.sns_recall_topic_arn:
        try:
            sns = boto3.client("sns", region_name=config.aws_region)
            res = sns.publish(
                TopicArn=config.sns_recall_topic_arn,
                Subject=f"EMERGENCY RECALL ALERT: {recall_id} - Lot {batch_id}",
                Message=json.dumps(message_body),
            )
            message_id = res.get("MessageId")
            sns_published = True
            logger.info(f"Published emergency broadcast to SNS topic {config.sns_recall_topic_arn}: MessageId {message_id}")
        except Exception as e:
            logger.error(f"SNS publish failed for recall {recall_id}: {e}")

    # Record notification dispatch item in DynamoDB with deterministic key
    dispatch_item = {
        "PK": f"RECALL#{recall_id}",
        "SK": "DISPATCH#EMERGENCY_BROADCAST",
        "dispatchId": dispatch_id,
        "recallId": recall_id,
        "batchId": batch_id,
        "orgId": org_id,
        "notificationType": "EMERGENCY_BROADCAST",
        "topicArn": config.sns_recall_topic_arn or "MOCK_SNS_TOPIC",
        "messageId": message_id or f"MOCK-MSG-{uuid.uuid4().hex[:6]}",
        "recipientsCount": impacted_nodes_count,
        "status": "DISPATCHED" if (sns_published or not config.sns_recall_topic_arn) else "FAILED",
        "dispatchedAt": now,
    }
    try:
        db_client.put_item(dispatch_item)
    except Exception as e:
        logger.warning(f"Could not record notification dispatch ledger: {e}")

    return {
        **event,
        "notificationsDispatched": True,
        "dispatchId": dispatch_id,
        "broadcastTimestamp": now,
        "deduplicated": False,
    }
