import time
import logging
from app import create_app
from app.services.outbox_service import OutboxService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("outbox_publisher_daemon")


def run_publisher_daemon(poll_interval: float = 1.0):
    """Outbox Relay Daemon process polling and pushing outbox events to RabbitMQ."""
    app = create_app()
    logger.info("Starting Transactional Outbox Publisher Relay Daemon...")

    with app.app_context():
        while True:
            try:
                processed_count = OutboxService.process_outbox_batch(batch_size=50)
                if processed_count > 0:
                    logger.info(f"Published {processed_count} outbox events to RabbitMQ exchange.")
            except Exception as e:
                logger.error(f"Error in outbox publisher relay loop: {e}")

            time.sleep(poll_interval)


if __name__ == "__main__":
    run_publisher_daemon()
