import logging
from typing import Tuple, Dict, Any
from app.core.extensions import db
from app.models.outlet_inventory import OutletInventory
from app.models.tenant import Outlet

logger = logging.getLogger(__name__)


class MultiOutletService:
    """Multi-Outlet Inventory Management and Inter-Outlet Stock Transfer Service."""

    @classmethod
    def get_outlet_inventory(cls, outlet_id: str):
        """Fetch stock inventory for a specific store/outlet."""
        return db.session.query(OutletInventory).filter_by(outlet_id=outlet_id).all()

    @classmethod
    def adjust_stock(cls, outlet_id: str, product_sku: str, quantity_delta: int, reorder_level: int = None) -> Tuple[bool, str, Dict[str, Any]]:
        """Adjust available stock count for an outlet."""
        inv = db.session.query(OutletInventory).filter_by(outlet_id=outlet_id, product_sku=product_sku).first()

        if not inv:
            inv = OutletInventory(
                outlet_id=outlet_id,
                product_sku=product_sku,
                quantity_available=max(0, quantity_delta),
                reorder_level=reorder_level or 10,
            )
            db.session.add(inv)
        else:
            new_qty = inv.quantity_available + quantity_delta
            if new_qty < 0:
                return False, f"Insufficient inventory available for SKU '{product_sku}'. Current: {inv.quantity_available}, Requested Delta: {quantity_delta}", {}
            inv.quantity_available = new_qty
            if reorder_level is not None:
                inv.reorder_level = reorder_level

        db.session.commit()
        return True, "Stock adjusted successfully.", inv.to_dict()

    @classmethod
    def transfer_stock(cls, source_outlet_id: str, target_outlet_id: str, product_sku: str, quantity: int) -> Tuple[bool, str, Dict[str, Any]]:
        """Atomic stock transfer between source and target outlets."""
        if quantity <= 0:
            return False, "Transfer quantity must be greater than zero.", {}

        if source_outlet_id == target_outlet_id:
            return False, "Source and target outlets cannot be identical.", {}

        # 1. Check source outlet stock
        source_inv = db.session.query(OutletInventory).filter_by(outlet_id=source_outlet_id, product_sku=product_sku).first()
        if not source_inv or source_inv.quantity_available < quantity:
            avail = source_inv.quantity_available if source_inv else 0
            return False, f"Source Outlet '{source_outlet_id}' has insufficient stock for SKU '{product_sku}'. Available: {avail}, Requested: {quantity}", {}

        # 2. Find or create target outlet stock record
        target_inv = db.session.query(OutletInventory).filter_by(outlet_id=target_outlet_id, product_sku=product_sku).first()
        if not target_inv:
            target_inv = OutletInventory(
                outlet_id=target_outlet_id,
                product_sku=product_sku,
                quantity_available=0,
            )
            db.session.add(target_inv)

        # 3. Perform atomic transfer
        source_inv.quantity_available -= quantity
        target_inv.quantity_available += quantity

        db.session.commit()
        return True, f"Successfully transferred {quantity} units of SKU '{product_sku}' from '{source_outlet_id}' to '{target_outlet_id}'.", {
            "source_inventory": source_inv.to_dict(),
            "target_inventory": target_inv.to_dict(),
        }
