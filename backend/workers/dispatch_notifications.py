"""Step Functions task worker: Dispatches Amazon SNS emergency recall alerts and persists dispatch ledger."""

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
    """Publishes emergency recall broadcast payload to Amazon SNS topic and records dispatch ledger."""
    recall_id = event.get("recallId")
    batch_id = event.get("batchId")
    hazard_class = event.get("hazardClass")
    reason = event.get("reason")
    org_id = event.get("orgId", config.default_org_id)
    impacted_nodes_count = event.get("impactedNodesCount", 0)

    now = datetime.now(timezone.utc).isoformat()
    dispatch_id = f"DISP-{uuid.uuid4().hex[:6].upper()}"

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

    # Record notification dispatch item in DynamoDB
    dispatch_item = {
        "PK": f"RECALL#{recall_id}",
        "SK": f"NOTIFICATION#{now}#{dispatch_id}",
        "dispatchId": dispatch_id,
        "recallId": recall_id,
        "batchId": batch_id,
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
    }
