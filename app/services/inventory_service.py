import logging
from typing import Tuple
from app.core.extensions import redis_client, db
from app.models.product import Product

logger = logging.getLogger(__name__)

# Lua script to atomically check and reserve stock
LUA_RESERVE_STOCK = """
local stock_key = KEYS[1]
local hold_key = KEYS[2]
local req_qty = tonumber(ARGV[1])

local current_stock = tonumber(redis.call('GET', stock_key) or '-1')

if current_stock == -1 then
    return -2  -- Stock key not in Redis
end

if current_stock < req_qty then
    return -1  -- Insufficient stock
end

redis.call('DECRBY', stock_key, req_qty)
redis.call('INCRBY', hold_key, req_qty)
return current_stock - req_qty
"""

# Lua script to atomically release held stock back to available pool
LUA_RELEASE_STOCK = """
local stock_key = KEYS[1]
local hold_key = KEYS[2]
local req_qty = tonumber(ARGV[1])

redis.call('INCRBY', stock_key, req_qty)
local current_hold = tonumber(redis.call('GET', hold_key) or '0')
if current_hold >= req_qty then
    redis.call('DECRBY', hold_key, req_qty)
else
    redis.call('SET', hold_key, 0)
end
return 1
"""

LUA_RESERVE_MULTI_STOCK = """
local num_items = #ARGV
for i = 1, num_items do
    local stock_key = KEYS[(i - 1) * 2 + 1]
    local req_qty = tonumber(ARGV[i])
    local current_stock = tonumber(redis.call('GET', stock_key) or '-1')
    if current_stock == -1 then
        return -2
    end
    if current_stock < req_qty then
        return -1
    end
end

for i = 1, num_items do
    local stock_key = KEYS[(i - 1) * 2 + 1]
    local hold_key = KEYS[(i - 1) * 2 + 2]
    local req_qty = tonumber(ARGV[i])
    redis.call('DECRBY', stock_key, req_qty)
    redis.call('INCRBY', hold_key, req_qty)
end
return 1
"""

LUA_RELEASE_MULTI_STOCK = """
local num_items = #ARGV
for i = 1, num_items do
    local stock_key = KEYS[(i - 1) * 2 + 1]
    local hold_key = KEYS[(i - 1) * 2 + 2]
    local req_qty = tonumber(ARGV[i])
    redis.call('INCRBY', stock_key, req_qty)
    local current_hold = tonumber(redis.call('GET', hold_key) or '0')
    if current_hold >= req_qty then
        redis.call('DECRBY', hold_key, req_qty)
    else
        redis.call('SET', hold_key, 0)
    end
end
return 1
"""


class InventoryService:
    """Atomic Redis Inventory Reservation & Stock Management Service with DB Fallback."""

    @staticmethod
    def _get_keys(product_id: str, variant_id: str = None) -> Tuple[str, str]:
        if variant_id:
            return f"variant:{variant_id}:stock", f"variant:{variant_id}:hold"
        return f"product:{product_id}:stock", f"product:{product_id}:hold"

    @classmethod
    def reserve_stock(cls, product_id: str, quantity: int, variant_id: str = None) -> Tuple[bool, str, int]:
        """
        Atomically decrement stock in Redis via Lua script.
        If variant_id is provided, keys off variant stock pool.
        """
        stock_key, hold_key = cls._get_keys(product_id, variant_id)

        try:
            script = redis_client.register_script(LUA_RESERVE_STOCK)
            result = script(keys=[stock_key, hold_key], args=[quantity])

            if result == -2:
                # Key not found in Redis, perform auto-warmup from DB
                success = cls.warmup_product_stock(product_id)
                if not success:
                    return cls._db_reserve_fallback(product_id, quantity, variant_id)

                result = script(keys=[stock_key, hold_key], args=[quantity])

            if result == -1:
                return False, "Insufficient inventory available", 0

            return True, "Inventory successfully reserved", int(result)

        except Exception as e:
            logger.warning(f"Redis Lua reservation bypassed for product {product_id} variant {variant_id} ({e}). Using DB fallback...")
            return cls._db_reserve_fallback(product_id, quantity, variant_id)

    @classmethod
    def _db_reserve_fallback(cls, product_id: str, quantity: int, variant_id: str = None) -> Tuple[bool, str, int]:
        """Fallback stock check against PostgreSQL Product / ProductVariant table."""
        from app.models.product_variant import ProductVariant
        if variant_id:
            variant = db.session.query(ProductVariant).filter_by(id=variant_id, product_id=product_id).first()
            if not variant:
                return False, "Product variant does not exist", 0
            if variant.available_stock < quantity:
                return False, f"Insufficient inventory for variant '{variant.name}'", 0
            return True, "Inventory successfully reserved (PostgreSQL Direct Mode)", variant.available_stock - quantity

        product = db.session.query(Product).filter_by(id=product_id, is_active=True).first()
        if not product:
            return False, "Product does not exist or is inactive", 0

        if product.available_stock < quantity:
            return False, "Insufficient inventory available", 0

        return True, "Inventory successfully reserved (PostgreSQL Direct Mode)", product.available_stock - quantity

    @classmethod
    def release_stock(cls, product_id: str, quantity: int, variant_id: str = None) -> bool:
        """Atomically release held stock back to available stock in Redis."""
        stock_key, hold_key = cls._get_keys(product_id, variant_id)
        try:
            script = redis_client.register_script(LUA_RELEASE_STOCK)
            script(keys=[stock_key, hold_key], args=[quantity])
            return True
        except Exception as e:
            logger.warning(f"Redis stock release bypassed for product {product_id} variant {variant_id}: {e}")
            return False

    @classmethod
    def reserve_multi_stock(cls, items: list) -> Tuple[bool, str]:
        """
        Atomically reserve stock for multiple items/variants in Redis via Lua script.
        items: list of (product_id, quantity) or (product_id, variant_id, quantity) tuples.
        """
        if not items:
            return False, "No items provided"

        keys = []
        args = []
        for item in items:
            if len(item) == 3:
                pid, vid, qty = item[0], item[1], item[2]
            else:
                pid, vid, qty = item[0], None, item[1]
            s_key, h_key = cls._get_keys(pid, vid)
            keys.extend([s_key, h_key])
            args.append(qty)

        try:
            script = redis_client.register_script(LUA_RESERVE_MULTI_STOCK)
            result = script(keys=keys, args=args)

            if result == -2:
                # Key missing, warmup stock for all products in items
                for item in items:
                    pid = item[0]
                    cls.warmup_product_stock(pid)
                result = script(keys=keys, args=args)

            if result == -1:
                return False, "Insufficient inventory available for one or more items"

            return True, "Inventory successfully reserved for all items"

        except Exception as e:
            logger.warning(f"Redis Lua multi reservation bypassed ({e}). Using DB fallback...")
            return cls._db_reserve_multi_fallback(items)

    @classmethod
    def _db_reserve_multi_fallback(cls, items: list) -> Tuple[bool, str]:
        from app.models.product_variant import ProductVariant
        for item in items:
            if len(item) == 3:
                pid, vid, qty = item[0], item[1], item[2]
            else:
                pid, vid, qty = item[0], None, item[1]

            if vid:
                variant = db.session.query(ProductVariant).filter_by(id=vid, product_id=pid).first()
                if not variant or variant.available_stock < qty:
                    return False, f"Insufficient inventory for variant {vid}"
            else:
                product = db.session.query(Product).filter_by(id=pid, is_active=True).first()
                if not product or product.available_stock < qty:
                    return False, f"Insufficient inventory for product {pid}"

        return True, "Inventory successfully reserved (PostgreSQL Direct Mode)"

    @classmethod
    def release_multi_stock(cls, items: list) -> bool:
        """Atomically release held stock for multiple items/variants in Redis."""
        if not items:
            return True

        keys = []
        args = []
        for item in items:
            if len(item) == 3:
                pid, vid, qty = item[0], item[1], item[2]
            else:
                pid, vid, qty = item[0], None, item[1]

            s_key, h_key = cls._get_keys(pid, vid)
            keys.extend([s_key, h_key])
            args.append(qty)

        try:
            script = redis_client.register_script(LUA_RELEASE_MULTI_STOCK)
            script(keys=keys, args=args)
            return True
        except Exception as e:
            logger.warning(f"Redis multi stock release bypassed: {e}")
            return False

    @classmethod
    def warmup_product_stock(cls, product_id: str) -> bool:
        """Warm up Redis stock cache for PostgreSQL Product record and its variants."""
        try:
            product = db.session.query(Product).filter_by(id=product_id, is_active=True).first()
            if not product:
                return False

            stock_key, hold_key = cls._get_keys(product_id)
            redis_client.set(stock_key, product.available_stock)
            if not redis_client.exists(hold_key):
                redis_client.set(hold_key, 0)

            for variant in product.variants:
                v_s_key, v_h_key = cls._get_keys(product_id, variant.id)
                redis_client.set(v_s_key, variant.available_stock)
                if not redis_client.exists(v_h_key):
                    redis_client.set(v_h_key, 0)

            logger.info(f"Warmed up stock for product {product_id} and {len(product.variants)} variants")
            return True
        except Exception as e:
            logger.warning(f"Skipped Redis stock warmup for product {product_id}: {e}")
            return False

    @classmethod
    def reconcile_product_stock(cls, product_id: str) -> dict:
        """Synchronize DB and Redis stock levels for product and its variants."""
        product = db.session.query(Product).filter_by(id=product_id).first()
        if not product:
            return {"error": "Product not found"}

        try:
            stock_key, hold_key = cls._get_keys(product_id)
            redis_stock = redis_client.get(stock_key)
            redis_hold = redis_client.get(hold_key)

            redis_client.set(stock_key, product.available_stock)

            variant_reconciliations = []
            for variant in product.variants:
                v_s_key, v_h_key = cls._get_keys(product_id, variant.id)
                v_stock = redis_client.get(v_s_key)
                redis_client.set(v_s_key, variant.available_stock)
                variant_reconciliations.append({
                    "variant_id": variant.id,
                    "variant_sku": variant.sku,
                    "db_available_stock": variant.available_stock,
                    "previous_redis_stock": int(v_stock) if v_stock is not None else None,
                    "current_redis_stock": variant.available_stock,
                })

            return {
                "product_id": product_id,
                "db_available_stock": product.available_stock,
                "db_total_stock": product.total_stock,
                "previous_redis_stock": int(redis_stock) if redis_stock is not None else None,
                "current_redis_stock": product.available_stock,
                "current_redis_hold": int(redis_hold) if redis_hold is not None else 0,
                "variants": variant_reconciliations,
            }
        except Exception as e:
            return {
                "product_id": product_id,
                "db_available_stock": product.available_stock,
                "db_total_stock": product.total_stock,
                "redis_status": f"Redis offline: {str(e)}",
            }
