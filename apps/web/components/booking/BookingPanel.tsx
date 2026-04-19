'use client';

import { useState, useEffect } from 'react';
import { useCountdown } from '../../hooks/useCountdown';

// Type mapped directly from our backend BookingOffer interface loosely
interface OfferPanelProps {
  offerId: string;
  baselinePrice: number;
  initialExpiresAt: string;
  userBudget: number;
}

export function BookingPanel({ offerId, baselinePrice, initialExpiresAt, userBudget }: OfferPanelProps) {
  const [currentPrice, setCurrentPrice] = useState(baselinePrice);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [priceChanged, setPriceChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Zod mirror states (Normally you'd use react-hook-form here, keeping simple for demo)
  const [passenger, setPassenger] = useState({
    id: 'pax-1',
    title: 'mr',
    given_name: '',
    family_name: '',
    born_on: '',
    email: '',
    phone_number: '',
    gender: 'm'
  });

  const { formatted, isWarning, isExpired } = useCountdown(expiresAt);

  // Poll backend specifically for Duffel Pricing drifts
  useEffect(() => {
    async function verifyPrice() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/booking/confirm-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offerId, baselinePrice })
        });
        
        const data = await res.json();
        
        if (data.priceChanged) {
          setCurrentPrice(data.currentPrice);
          setExpiresAt(data.expiresAt);
          setPriceChanged(true);
        }
      } catch (e) {
        console.error('Failed fetching price verification:', e);
      }
    }
    
    // Only verify once initially when panel mounts naturally simulating exactly before filling forms
    verifyPrice();
  }, [offerId, baselinePrice]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return alert('Session expired please seek another destination.');
    
    setLoading(true);

    try {
       // 1. Log metrics transparently locally
       await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/affiliate/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-mock-123',
            destination: 'DPS',
            provider: 'duffel',
            offerPrice: currentPrice
          })
       });

       // 2. Transact Booking Native Payload
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/booking/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerId,
            passengers: [passenger], // Duffel expects an array globally
            userId: 'user-mock-123',
            destination: 'DPS',
            origin: 'NYC',
            departureDate: '2027-01-01'
          })
       });

       const data = await res.json();

       if (res.status === 422 && data.error === 'offer_no_longer_available') {
           alert(`Offer Expired natively inside Duffel! New Estimated Base Price generated: $${data.fallbackPriceEstimate}`);
       } else if (data.success) {
           alert(`Booking succeeded! Order ID: ${data.orderId}`);
       }
    } catch(err) {
       console.error("Order Failure", err);
    } finally {
       setLoading(false);
    }
  };

  const withinBudget = currentPrice <= userBudget;

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-card border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Complete Booking</h2>

      {/* Countdown Timer */}
      <div className={`p-3 mb-4 rounded flex items-center justify-between ${isExpired ? 'bg-red-100 text-red-800' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-muted/50'}`}>
        <span className="font-medium text-sm">Price Lock Expires In:</span>
        <span className={`font-mono text-lg ${isWarning && !isExpired ? 'animate-pulse' : ''}`}>
          {isExpired ? '0:00 - EXPIRED' : formatted}
        </span>
      </div>

      {/* Alert Block */}
      {priceChanged && (
        <div className={`p-4 mb-6 rounded-md border ${withinBudget ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-sm font-semibold mb-1">
            ⚠️ Price updated to ${currentPrice}
          </p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${withinBudget ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {withinBudget ? 'Still within your budget.' : 'Consider another destination!'}
          </span>
        </div>
      )}

      {/* Booking Form Native */}
      <form onSubmit={handleCheckout} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-xs text-muted-foreground mb-1">Given Name</label>
             <input required type="text" className="w-full border p-2 rounded text-sm" value={passenger.given_name} onChange={e => setPassenger({...passenger, given_name: e.target.value})} />
           </div>
           <div>
             <label className="block text-xs text-muted-foreground mb-1">Family Name</label>
             <input required type="text" className="w-full border p-2 rounded text-sm" value={passenger.family_name} onChange={e => setPassenger({...passenger, family_name: e.target.value})} />
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-xs text-muted-foreground mb-1">Date of Birth</label>
             <input required type="date" className="w-full border p-2 rounded text-sm" value={passenger.born_on} onChange={e => setPassenger({...passenger, born_on: e.target.value})} />
           </div>
           <div>
             <label className="block text-xs text-muted-foreground mb-1">Gender</label>
             <select className="w-full border p-2 rounded text-sm" value={passenger.gender} onChange={e => setPassenger({...passenger, gender: e.target.value})}>
               <option value="m">Male</option>
               <option value="f">Female</option>
             </select>
           </div>
        </div>

        <div>
            <label className="block text-xs text-muted-foreground mb-1">Email</label>
            <input required type="email" className="w-full border p-2 rounded text-sm" value={passenger.email} onChange={e => setPassenger({...passenger, email: e.target.value})} />
        </div>
        
        <div>
            <label className="block text-xs text-muted-foreground mb-1">Phone Number (E164)</label>
            <input required type="tel" className="w-full border p-2 rounded text-sm" placeholder="+1234567890" value={passenger.phone_number} onChange={e => setPassenger({...passenger, phone_number: e.target.value})} />
        </div>

        <button 
          type="submit" 
          disabled={loading || isExpired}
          className="w-full h-10 mt-6 bg-primary text-primary-foreground font-medium rounded text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Processing Transaction...' : `Confirm & Pay $${currentPrice}`}
        </button>
      </form>
    </div>
  );
}
