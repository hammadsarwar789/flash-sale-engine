import concurrent.futures
import pytest
from app.core.extensions import redis_client, db
from app.services.inventory_service import InventoryService


def test_concurrency_zero_overselling(app, test_product):
    """
    Simulate 20 concurrent threads trying to reserve stock of 1 item each.
    Guarantees exactly initial_stock succeed and remaining fail with zero stock overselling.
    """
    try:
        redis_client.ping()
    except Exception:
        pytest.skip("Local Redis server is not running; skipping live Redis concurrency test.")

    with app.app_context():
        initial_stock = test_product.available_stock
        stock_key = f"product:{test_product.id}:stock"
        hold_key = f"product:{test_product.id}:hold"

        # Warm up Redis stock cache from DB product record
        InventoryService.warmup_product_stock(test_product.id)

        results = []

        def worker_reserve():
            with app.app_context():
                success, msg, rem = InventoryService.reserve_stock(test_product.id, quantity=1)
                return success

        # Execute 20 concurrent threads simultaneously
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(worker_reserve) for _ in range(20)]
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())

        successful_reservations = sum(1 for r in results if r is True)
        failed_reservations = sum(1 for r in results if r is False)

        # Assert concurrency bounds match exact initial stock
        assert successful_reservations == initial_stock
        assert failed_reservations == 20 - initial_stock

        final_stock = int(redis_client.get(stock_key))
        final_hold = int(redis_client.get(hold_key))

        assert final_stock == 0
        assert final_hold == initial_stock
