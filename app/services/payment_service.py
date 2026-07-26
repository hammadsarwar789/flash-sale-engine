import logging
import os
import uuid
from typing import Tuple, Dict, Any, Optional
from datetime import datetime, timezone
from app.core.extensions import db
from app.models.order import Order, OrderStatus

logger = logging.getLogger(__name__)


class PaymentService:
    """
    Payment Gateway Service supporting Stripe PaymentIntents 
    with automatic sandbox/mock fallback when API keys are not present.
    """

    @classmethod
    def create_payment_intent(
        cls,
        order_id: str,
        user_id: Optional[str] = None,
        currency: str = "usd",
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Creates a Stripe PaymentIntent for a pending order.
        """
        query = db.session.query(Order).filter_by(id=order_id)
        if user_id:
            query = query.filter_by(user_id=user_id)

        order = query.first()
        if not order:
            return False, f"Order '{order_id}' not found", {}

        if order.status != OrderStatus.PENDING:
            return False, f"Order status is '{order.status.value}', cannot create payment intent", {}

        if datetime.now(timezone.utc) > order.expires_at.replace(tzinfo=timezone.utc):
            return False, "Order reservation has expired", {}

        from app.core.extensions import redis_client
        import json

        # Idempotency check: return cached PaymentIntent if one already exists for this order
        cache_key = f"order:{order_id}:payment_intent"
        try:
            cached_intent = redis_client.get(cache_key)
            if cached_intent:
                logger.info(f"Returning cached PaymentIntent for order {order_id}")
                return True, "PaymentIntent retrieved from cache (Idempotent)", json.loads(cached_intent)
        except Exception as e:
            logger.warning(f"Redis PaymentIntent lookup error: {e}")

        amount_cents = int(round(float(order.total_amount) * 100))
        stripe_key = os.getenv("STRIPE_SECRET_KEY")

        if stripe_key:
            try:
                import stripe
                stripe.api_key = stripe_key
                intent = stripe.PaymentIntent.create(
                    amount=amount_cents,
                    currency=currency.lower(),
                    metadata={
                        "order_id": order.id,
                        "user_id": str(order.user_id) if order.user_id else "guest",
                    },
                    description=f"Flash Sale Engine Order #{order.id}",
                )
                logger.info(f"Created live Stripe PaymentIntent {intent.id} for order {order.id}")
                res_data = {
                    "payment_intent_id": intent.id,
                    "client_secret": intent.client_secret,
                    "amount": float(order.total_amount),
                    "currency": currency.lower(),
                    "status": intent.status,
                    "mode": "live",
                }
                try:
                    redis_client.set(cache_key, json.dumps(res_data), ex=86400)
                except Exception:
                    pass
                return True, "PaymentIntent created successfully", res_data
            except Exception as e:
                logger.error(f"Stripe API error when creating PaymentIntent: {e}")
                return False, f"Stripe gateway error: {str(e)}", {}
        else:
            # Sandbox / Development Mode
            mock_id = f"pi_mock_{str(uuid.uuid4()).replace('-', '')[:16]}"
            mock_secret = f"{mock_id}_secret_{str(uuid.uuid4()).replace('-', '')[:16]}"
            logger.info(f"Created Sandbox PaymentIntent {mock_id} for order {order.id}")

            res_data = {
                "payment_intent_id": mock_id,
                "client_secret": mock_secret,
                "amount": float(order.total_amount),
                "currency": currency.lower(),
                "status": "requires_payment_method",
                "mode": "sandbox",
                "message": "Set STRIPE_SECRET_KEY environment variable for live Stripe transactions.",
            }
            try:
                redis_client.set(cache_key, json.dumps(res_data), ex=86400)
            except Exception:
                pass
            return True, "Sandbox PaymentIntent created successfully", res_data

    @classmethod
    def issue_refund(
        cls,
        order_id: str,
        amount: Optional[float] = None,
        reason: Optional[str] = None,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Issues a Stripe Refund for a paid order.
        """
        order = db.session.query(Order).filter_by(id=order_id).first()
        if not order:
            return False, f"Order '{order_id}' not found", {}

        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        refund_amount = amount if amount is not None else float(order.total_amount)
        amount_cents = int(round(refund_amount * 100))

        if stripe_key:
            try:
                import stripe
                stripe.api_key = stripe_key
                refund = stripe.Refund.create(
                    amount=amount_cents,
                    reason="requested_by_customer",
                    metadata={"order_id": order.id, "reason": reason or "Admin refund"},
                )
                logger.info(f"Issued live Stripe refund {refund.id} for order {order.id}")
                return True, "Refund processed via Stripe", {
                    "refund_id": refund.id,
                    "amount": refund_amount,
                    "status": refund.status,
                    "mode": "live",
                }
            except Exception as e:
                logger.error(f"Stripe API error issuing refund: {e}")
                return False, f"Stripe refund error: {str(e)}", {}
        else:
            mock_refund_id = f"re_mock_{str(uuid.uuid4()).replace('-', '')[:16]}"
            logger.info(f"Created Sandbox refund {mock_refund_id} for order {order.id}")
            return True, "Sandbox refund issued successfully", {
                "refund_id": mock_refund_id,
                "amount": refund_amount,
                "status": "succeeded",
                "mode": "sandbox",
                "message": "Stripe refund issued (Sandbox mode - set STRIPE_SECRET_KEY for live Stripe refunds).",
            }
