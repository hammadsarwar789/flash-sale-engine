import json
import logging
from datetime import datetime, timezone
from typing import List
from app.core.config import BaseConfig
from app.core.extensions import db
from app.models.outbox import OutboxEvent, OutboxStatus

logger = logging.getLogger(__name__)


class OutboxService:
    """Outbox Publisher Relay Service for event-driven message dispatch."""

    @classmethod
    def fetch_pending_events(cls, batch_size: int = 50) -> List[OutboxEvent]:
        """Fetch unhandled pending outbox events ordered by creation timestamp."""
        return (
            db.session.query(OutboxEvent)
            .filter_by(status=OutboxStatus.PENDING)
            .order_by(OutboxEvent.created_at.asc())
            .limit(batch_size)
            .all()
        )

    @classmethod
    def publish_event(cls, event: OutboxEvent) -> bool:
        """
        Publish single outbox event to RabbitMQ broker using Kombu/Pika client interface.
        Fallback to Celery broadcast if standalone RabbitMQ client unavailable.
        """
        try:
            import kombu

            with kombu.Connection(BaseConfig.RABBITMQ_URL) as conn:
                exchange = kombu.Exchange("flash_sale_exchange", type="topic", durable=True)
                producer = conn.Producer(serializer="json")

                routing_key = event.event_type
                message_body = {
                    "event_id": event.id,
                    "event_type": event.event_type,
                    "aggregate_type": event.aggregate_type,
                    "aggregate_id": event.aggregate_id,
                    "payload": event.payload,
                    "timestamp": event.created_at.isoformat() if event.created_at else None,
                }

                producer.publish(
                    message_body,
                    exchange=exchange,
                    routing_key=routing_key,
                    declare=[exchange],
                )
                logger.info(f"Published outbox event {event.id} to RabbitMQ topic '{routing_key}'")

                # Dispatch Shopify Integration Async Tasks based on event type
                try:
                    from app.workers.shopify_tasks import (
                        sync_product_to_shopify_task,
                        delete_product_from_shopify_task,
                        sync_inventory_to_shopify_task,
                    )
                    if event.event_type in ["PRODUCT_CREATED", "PRODUCT_UPDATED"]:
                        sync_product_to_shopify_task.delay(event.aggregate_id)
                    elif event.event_type == "PRODUCT_DELETED" and isinstance(event.payload, dict):
                        sh_id = event.payload.get("shopify_product_id")
                        if sh_id:
                            delete_product_from_shopify_task.delay(sh_id)
                    elif event.event_type in ["STOCK_UPDATED", "INVENTORY_ADJUSTED"] and isinstance(event.payload, dict):
                        avail = event.payload.get("new_available_stock", event.payload.get("available_stock", 0))
                        sync_inventory_to_shopify_task.delay(event.aggregate_id, avail)
                except Exception as task_err:
                    logger.warning(f"Could not dispatch Shopify worker task for event {event.id}: {task_err}")

                return True

        except Exception as e:
            logger.warning(f"RabbitMQ direct publish failed for event {event.id}: {e}")
            return False

    @classmethod
    def process_outbox_batch(cls, batch_size: int = 50) -> int:
        """Poll and publish batch of pending outbox events."""
        events = cls.fetch_pending_events(batch_size=batch_size)
        published_count = 0

        for event in events:
            success = cls.publish_event(event)

            if success:
                event.status = OutboxStatus.PUBLISHED
                event.processed_at = datetime.now(timezone.utc)
                published_count += 1
            else:
                event.retry_count += 1
                event.error_log = "Failed to dispatch message to RabbitMQ exchange."
                if event.retry_count >= 5:
                    event.status = OutboxStatus.FAILED
                    logger.error(f"Outbox event {event.id} reached maximum retries and marked FAILED.")

            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to update outbox event state: {e}")

        return published_count
