import uuid
from locust import HttpUser, task, between, events


class FlashSaleLoadTest(HttpUser):
    wait_time = between(0.2, 1.0)
    product_id = None

    def on_start(self):
        """Fetch a valid product ID from the live catalog before starting load tasks."""
        try:
            response = self.client.get("/api/v1/products")
            if response.status_code == 200:
                data = response.json()
                # Grab the first available product ID from pagination list
                items = data.get("items", []) or data.get("products", []) or data
                if isinstance(items, list) and len(items) > 0:
                    self.product_id = items[0].get("id")
        except Exception as e:
            print(f"[SETUP ERROR] Failed to fetch product catalog: {e}")

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
        target_product = self.product_id or "3c0106a6-43b0-4846-817f-0d1c5864843f"
        
        idempotency_key = f"locust-guest-{str(uuid.uuid4())}"
        payload = {
            "email": f"loadtest_{uuid.uuid4().hex[:8]}@example.com",
            "items": [
                {"product_id": target_product, "quantity": 1}
            ]
        }
        headers = {
            "X-Idempotency-Key": idempotency_key,
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
            if response.status_code in [200, 201, 202]:
                response.success()
            elif response.status_code == 400 and ("Insufficient inventory" in response.text or "no longer active or available" in response.text):
                # Expected when flash sale inventory cap is reached under peak concurrency
                response.success()
            elif response.status_code == 429:
                # Expected when request volume triggers API rate limits during stress benchmarks
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