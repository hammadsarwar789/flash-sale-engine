from datetime import datetime, timezone, timedelta
import logging
from app.core.extensions import db
from app.models.financials import LedgerEntry

logger = logging.getLogger(__name__)


def release_matured_escrow() -> int:
    """
    Scans for ESCROW_HOLD ledger entries whose return window has passed (available_at <= now),
    and releases funds into ESCROW_RELEASE entries available for payout withdrawal.
    """
    now = datetime.now(timezone.utc)
    matured_entries = (
        db.session.query(LedgerEntry)
        .filter(
            LedgerEntry.entry_type == "ESCROW_HOLD",
            LedgerEntry.status == "HELD",
            LedgerEntry.available_at <= now,
        )
        .all()
    )

    released_count = 0
    for hold in matured_entries:
        hold.status = "RELEASED"

        release_entry = LedgerEntry(
            sub_order_id=hold.sub_order_id,
            seller_id=hold.seller_id,
            entry_type="ESCROW_RELEASE",
            amount=hold.amount,
            status="RELEASED",
            available_at=now,
        )
        db.session.add(release_entry)
        released_count += 1

    if released_count > 0:
        db.session.commit()
        logger.info(f"Released {released_count} matured escrow holds into seller balances.")

    return released_count


def set_sub_order_delivery_escrow(sub_order_id: str, return_window_days: int = 7):
    """
    When a sub-order is marked DELIVERED, sets available_at on its ESCROW_HOLD ledger entry
    to (delivered_at + return_window_days).
    """
    hold = db.session.query(LedgerEntry).filter_by(sub_order_id=sub_order_id, entry_type="ESCROW_HOLD").first()
    if hold:
        hold.available_at = datetime.now(timezone.utc) + timedelta(days=return_window_days)
        db.session.commit()
        logger.info(f"Set escrow available_at for sub-order '{sub_order_id}' to {hold.available_at}.")
