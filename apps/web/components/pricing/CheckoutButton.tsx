'use client';

import { useState } from 'react';
import { getStripe } from '../../lib/stripe';

interface Props {
  priceId: string;
  userId: string; // The active user's ID
  buttonText?: string;
}

export function CheckoutButton({ priceId, userId, buttonText = 'Upgrade to Pro' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      // Direct call to auth-service /billing/checkout
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/billing/checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ priceId, userId }),
        }
      );
      
      const { sessionId, error } = await res.json();
      
      if (error) {
        console.error('Checkout error:', error);
        setLoading(false);
        return;
      }
      
      const stripe = await getStripe();
      if (stripe && sessionId) {
        // Handle physical redirection locally
        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
        if (stripeError) {
          console.error(stripeError.message);
        }
      }
    } catch (err) {
      console.error('Failed to initiate checkout:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? 'Processing...' : buttonText}
    </button>
  );
}
