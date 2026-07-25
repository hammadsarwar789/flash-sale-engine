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
    def _get_keys(product_id: str) -> Tuple[str, str]:
        return f"product:{product_id}:stock", f"product:{product_id}:hold"

    @classmethod
    def reserve_stock(cls, product_id: str, quantity: int) -> Tuple[bool, str, int]:
        """
        Atomically decrement stock in Redis via Lua script.
        If Redis is offline or encounters protocol errors, fallback to PostgreSQL DB stock validation.
        """
        stock_key, hold_key = cls._get_keys(product_id)

        try:
            script = redis_client.register_script(LUA_RESERVE_STOCK)
            result = script(keys=[stock_key, hold_key], args=[quantity])

            if result == -2:
                # Key not found in Redis, perform auto-warmup from DB
                success = cls.warmup_product_stock(product_id)
                if not success:
                    # Redis warmup failed/offline, perform DB stock check fallback
                    return cls._db_reserve_fallback(product_id, quantity)

                result = script(keys=[stock_key, hold_key], args=[quantity])

            if result == -1:
                return False, "Insufficient inventory available", 0

            return True, "Inventory successfully reserved", int(result)

        except Exception as e:
            logger.warning(f"Redis Lua reservation bypassed for product {product_id} ({e}). Using DB fallback...")
            return cls._db_reserve_fallback(product_id, quantity)

    @classmethod
    def _db_reserve_fallback(cls, product_id: str, quantity: int) -> Tuple[bool, str, int]:
        """Fallback stock check against PostgreSQL Product table."""
        product = db.session.query(Product).filter_by(id=product_id, is_active=True).first()
        if not product:
            return False, "Product does not exist or is inactive", 0

        if product.available_stock < quantity:
            return False, "Insufficient inventory available", 0

        return True, "Inventory successfully reserved (PostgreSQL Direct Mode)", product.available_stock - quantity

    @classmethod
    def release_stock(cls, product_id: str, quantity: int) -> bool:
        """Atomically release held stock back to available stock in Redis."""
        stock_key, hold_key = cls._get_keys(product_id)
        try:
            script = redis_client.register_script(LUA_RELEASE_STOCK)
            script(keys=[stock_key, hold_key], args=[quantity])
            return True
        except Exception as e:
            logger.warning(f"Redis stock release bypassed for product {product_id}: {e}")
            return False

    @classmethod
    def reserve_multi_stock(cls, items: list) -> Tuple[bool, str]:
        """
        Atomically reserve stock for multiple products in Redis via Lua script.
        items: list of (product_id, quantity) tuples.
        """
        if not items:
            return False, "No items provided"

        keys = []
        args = []
        for pid, qty in items:
            s_key, h_key = cls._get_keys(pid)
            keys.extend([s_key, h_key])
            args.append(qty)

        try:
            script = redis_client.register_script(LUA_RESERVE_MULTI_STOCK)
            result = script(keys=keys, args=args)

            if result == -2:
                # Key missing, warmup stock for all products in items
                for pid, _ in items:
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
        for pid, qty in items:
            product = db.session.query(Product).filter_by(id=pid, is_active=True).first()
            if not product:
                return False, f"Product {pid} does not exist or is inactive"
            if product.available_stock < qty:
                return False, f"Insufficient inventory for product {product.name or pid}"
        return True, "Inventory successfully reserved (PostgreSQL Direct Mode)"

    @classmethod
    def release_multi_stock(cls, items: list) -> bool:
        """Atomically release held stock for multiple products in Redis."""
        if not items:
            return True

        keys = []
        args = []
        for pid, qty in items:
            s_key, h_key = cls._get_keys(pid)
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
        """Warm up Redis stock cache from PostgreSQL Product record."""
        try:
            product = db.session.query(Product).filter_by(id=product_id, is_active=True).first()
            if not product:
                return False

            stock_key, hold_key = cls._get_keys(product_id)
            redis_client.set(stock_key, product.available_stock)
            if not redis_client.exists(hold_key):
                redis_client.set(hold_key, 0)

            logger.info(f"Warmed up stock for product {product_id}: {product.available_stock}")
            return True
        except Exception as e:
            logger.warning(f"Skipped Redis stock warmup for product {product_id}: {e}")
            return False

    @classmethod
    def reconcile_product_stock(cls, product_id: str) -> dict:
        """Synchronize DB and Redis stock levels."""
        product = db.session.query(Product).filter_by(id=product_id).first()
        if not product:
            return {"error": "Product not found"}

        try:
            stock_key, hold_key = cls._get_keys(product_id)
            redis_stock = redis_client.get(stock_key)
            redis_hold = redis_client.get(hold_key)

            redis_client.set(stock_key, product.available_stock)

            return {
                "product_id": product_id,
                "db_available_stock": product.available_stock,
                "db_total_stock": product.total_stock,
                "previous_redis_stock": int(redis_stock) if redis_stock is not None else None,
                "current_redis_stock": product.available_stock,
                "current_redis_hold": int(redis_hold) if redis_hold is not None else 0,
            }
        except Exception as e:
            return {
                "product_id": product_id,
                "db_available_stock": product.available_stock,
                "db_total_stock": product.total_stock,
                "redis_status": f"Redis offline: {str(e)}",
            }
