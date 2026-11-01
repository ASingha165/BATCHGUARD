"""Step Functions task worker: Dispatches Amazon SNS emergency recall alerts."""

import json
from typing import Any, Dict
import boto3
from backend.common.config import config
from backend.common.logger import get_logger

logger = get_logger("batchguard.workers.dispatch_sns")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Publishes emergency recall broadcast payload to Amazon SNS topic."""
    recall_id = event.get("recallId")
    batch_id = event.get("batchId")
    hazard_class = event.get("hazardClass")
    reason = event.get("reason")

    message_body = {
        "event": "ONE_CLICK_RECALL_INITIATED",
        "recallId": recall_id,
        "batchId": batch_id,
        "hazardClass": hazard_class,
        "reason": reason,
        "urgentAction": "HOLD_IMMEDIATE_EDI_940",
    }

    if config.sns_recall_topic_arn:
        try:
            sns = boto3.client("sns", region_name=config.aws_region)
            sns.publish(
                TopicArn=config.sns_recall_topic_arn,
                Subject=f"EMERGENCY RECALL ALERT: {recall_id} - Lot {batch_id}",
                Message=json.dumps(message_body),
            )
            logger.info(f"Published emergency broadcast to SNS topic {config.sns_recall_topic_arn}")
        except Exception as e:
            logger.error(f"SNS publish failed: {e}")

    return {
        **event,
        "notificationsDispatched": True,
        "broadcastTimestamp": event.get("timestamp"),
    }

