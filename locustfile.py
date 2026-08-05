# locustfile.py
import uuid
from locust import HttpUser, task, between, events


class FlashSaleLoadTest(HttpUser):
    wait_time = between(0.2, 1.0)

    @task(3)
    def test_get_products_catalog(self):
        """Benchmark high-scale product catalog reads."""
        with self.client.get(
            "/api/v1/products", 
            name="/api/v1/products [GET]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed with Status Code {response.status_code}: {response.text}")

    @task(2)
    def test_guest_checkout_reservation(self):
        """Benchmark high-concurrency guest flash sale order reservation."""
        idempotency_key = f"locust-guest-{str(uuid.uuid4())}"
        payload = {
            "email": f"loadtest_{uuid.uuid4().hex[:8]}@example.com",
            "items": [
                {"product_id": "prod_phone_01", "quantity": 1}
            ]
        }
        headers = {
            "Idempotency-Key": idempotency_key,
            "Content-Type": "application/json"
        }
        with self.client.post(
            "/api/v1/orders/guest-checkout",
            json=payload,
            headers=headers,
            name="/api/v1/orders/guest-checkout [POST]",
            catch_response=True
        ) as response:
            if response.status_code in [200, 202]:
                response.success()
            elif response.status_code == 400 and "Insufficient inventory" in response.text:
                # Expected when inventory cap is reached during peak flash sale
                response.success()
            else:
                response.failure(f"Guest checkout failed with status {response.status_code}: {response.text}")


# Event Listeners (Locust 2.x+ Syntax)
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n=======================================================")
    print("🚀 STARTING LOAD TEST: Flash Sale Read & Reservation Throughput")
    print("=======================================================\n")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("\n=======================================================")
    print("🏁 LOAD TEST COMPLETE")
    print("=======================================================\n")