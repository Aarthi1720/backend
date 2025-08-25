import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16", // or latest supported version
});

// Refund helper
export const refundPayment = async (paymentIntentId) => {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
  });
};

// You can export more helpers as needed
export default stripe;
