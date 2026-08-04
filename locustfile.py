# locustfile.py
from locust import HttpUser, task, between, events

class FlashSaleLoadTest(HttpUser):
    wait_time = between(0.5, 1.5)

    @task(1)
    def test_get_products_catalog(self):
        with self.client.get(
            "/api/v1/products", 
            name="/api/v1/products [GET]",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Failed with Status Code {response.status_code}: {response.text}")


# Event Listeners (Locust 2.x+ Syntax)
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n=======================================================")
    print("🚀 STARTING LOAD TEST: Product Read Throughput Capacity")
    print("=======================================================\n")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("\n=======================================================")
    print("🏁 LOAD TEST COMPLETE")
    print("=======================================================\n")