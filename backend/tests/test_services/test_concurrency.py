import concurrent.futures
import pytest
from app.core.extensions import redis_client, db
from app.models.product import Product
from app.services.inventory_service import InventoryService


def test_concurrency_zero_overselling(app, test_product):
    """
    Simulate 20 concurrent threads trying to reserve stock of 1 item each
    on a product with available_stock = 5.
    Guarantees exactly 5 succeed and 15 fail with zero stock overselling.
    """
    try:
        redis_client.ping()
    except Exception:
        pytest.skip("Local Redis server is not running; skipping live Redis concurrency test.")

    with app.app_context():
        # 1. Direct DB update and session commit
        product = db.session.get(Product, test_product.id) or test_product
        product.available_stock = 5
        db.session.add(product)
        db.session.commit()

        # 2. Flush and set exact keys in Redis
        stock_key = f"product:{test_product.id}:stock"
        hold_key = f"product:{test_product.id}:hold"

        redis_client.set(stock_key, 5)
        redis_client.set(hold_key, 0)

        # 3. If InventoryService uses variant keys, update variant stock if present
        if hasattr(product, "variants") and product.variants:
            for variant in product.variants:
                variant.available_stock = 5
                redis_client.set(f"variant:{variant.id}:stock", 5)
                redis_client.set(f"variant:{variant.id}:hold", 0)
            db.session.commit()

        results = []

        def worker_reserve():
            with app.app_context():
                success, msg, rem = InventoryService.reserve_stock(test_product.id, quantity=1)
                return success

        # 4. Execute 20 concurrent threads simultaneously
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(worker_reserve) for _ in range(20)]
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())

        successful_reservations = sum(1 for r in results if r is True)
        failed_reservations = sum(1 for r in results if r is False)

        # 5. Assert concurrency bounds
        assert successful_reservations == 5
        assert failed_reservations == 15

        final_stock = int(redis_client.get(stock_key))
        final_hold = int(redis_client.get(hold_key))

        assert final_stock == 0
        assert final_hold == 5
