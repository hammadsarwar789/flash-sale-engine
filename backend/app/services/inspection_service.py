import logging
from app.core.extensions import db
from app.models.return_request import ReturnRequest
from app.models.financials import LedgerEntry
from app.services.inventory_service import InventoryService

logger = logging.getLogger(__name__)


class InspectionService:
    """Service handling warehouse quality control inspections, inventory restocking, and financial refund reversals."""

    @staticmethod
    def process_warehouse_inspection(return_id: str, inspection_passed: bool, inspector_notes: str = None) -> dict:
        """
        Processes a warehouse inspection for a returned parcel.
        Dual settlement paths:
        - PATH A (RETURN): Restocks inventory (SQL & Redis), inserts balancing REFUND ledger entry, cancels pending escrow.
        - PATH B (EXCHANGE): Confirms replacement inventory deduction and dispatches exchange item.
        - PATH C (REJECTED_QC): Rejects QC and records inspector notes.
        """
        return_req = db.session.query(ReturnRequest).filter_by(id=return_id).first()
        if not return_req:
            raise ValueError(f"Return request '{return_id}' not found.")

        if return_req.status != "ARRIVED_AT_WAREHOUSE":
            raise ValueError(f"Item not ready for warehouse inspection (Current status: '{return_req.status}').")

        # 1. Quality Control Rejection
        if not inspection_passed:
            return_req.status = "REJECTED_QC"
            return_req.inspector_notes = inspector_notes or "Quality control failed during warehouse inspection."
            db.session.commit()
            logger.info(f"[INSPECTION-QC] Return ID '{return_id}' rejected by QC inspector.")
            return {"status": "REJECTED", "reason": return_req.inspector_notes}

        return_req.status = "INSPECTION_PASSED"
        return_req.inspector_notes = inspector_notes or "Passed warehouse QC inspection."

        # 2. PATH A: Full Return -> Trigger Ledger Reversal & Stock Restock
        if return_req.type == "RETURN":
            # 1. Restock SQL and Redis Inventory
            InventoryService.restock(product_id=return_req.product_id, quantity=1)

            # 2. Calculate refund amount from sub-order or master order
            refund_amount = return_req.sub_order.subtotal if return_req.sub_order else return_req.order.total_amount

            # 3. Financial Reversal Entry (Double-Entry Bookkeeping)
            ledger_reversal = LedgerEntry(
                seller_id=return_req.seller_id,
                sub_order_id=return_req.sub_order_id,
                entry_type="REFUND",
                amount=-(refund_amount),
                status="COMPLETED"
            )
            db.session.add(ledger_reversal)

            # 4. Reconcile/Cancel pending escrow hold entries
            if return_req.sub_order_id:
                escrow_entries = db.session.query(LedgerEntry).filter_by(
                    sub_order_id=return_req.sub_order_id,
                    entry_type="ESCROW_HOLD",
                    status="HELD"
                ).all()
                for entry in escrow_entries:
                    entry.status = "CANCELLED_DUE_TO_RETURN"

            return_req.status = "REFUNDED"
            logger.info(f"[INSPECTION-RETURN] Return ID '{return_id}' processed. Inventory restocked & refund ledger entry created.")

        # 3. PATH B: Exchange -> Fulfill Pending Exchange Order
        elif return_req.type == "EXCHANGE":
            if return_req.exchange_product_id:
                InventoryService.confirm_stock_deduction(product_id=return_req.exchange_product_id, quantity=1)
            return_req.status = "EXCHANGE_DISPATCHED"
            logger.info(f"[INSPECTION-EXCHANGE] Return ID '{return_id}' replacement item dispatched.")

        db.session.commit()
        return {"status": "SUCCESS", "next_action": return_req.status}

    @staticmethod
    def enforce_vendor_inspection_sla() -> dict:
        """
        Auto-approves returns stuck at 'ARRIVED_AT_WAREHOUSE' past SLA threshold (48 hours).
        Executes stock restock, double-entry refund ledger reversal, and cancels pending escrow holds.
        """
        from datetime import datetime, timezone, timedelta
        sla_cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
        overdue_returns = db.session.query(ReturnRequest).filter(
            ReturnRequest.status == "ARRIVED_AT_WAREHOUSE",
            ReturnRequest.updated_at <= sla_cutoff
        ).all()

        approved_count = 0
        for req in overdue_returns:
            InspectionService.process_warehouse_inspection(
                return_id=req.id,
                inspection_passed=True,
                inspector_notes="SYSTEM_AUTO_APPROVAL_VENDOR_SLA_BREACH"
            )
            approved_count += 1

        logger.info(f"[VENDOR-SLA-ENGINE] Auto-approved {approved_count} overdue warehouse inspection returns.")
        return {"status": "sla_enforced", "approved_count": approved_count}


inspection_service = InspectionService()
