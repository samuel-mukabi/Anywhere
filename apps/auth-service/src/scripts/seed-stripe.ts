import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY in .env');
    process.exit(1);
  }

  console.log('Seeding Stripe Products...');

  // 1. Create "Anywhere Pro" Product
  const product = await stripe.products.create({
    name: 'Anywhere Pro',
    description: 'Unlock advanced climate insights, offline maps, and group planning.',
  });

  console.log(`✅ Created Product: ${product.id}`);

  // 2. Create Monthly Price ($9/mo)
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 900, // 9.00 USD
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: 'pro_monthly',
  });
  console.log(`✅ Created Monthly Price: ${monthlyPrice.id} ($9/mo)`);

  // 3. Create Annual Price ($79/yr)
  const annualPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 7900, // 79.00 USD
    currency: 'usd',
    recurring: { interval: 'year' },
    lookup_key: 'pro_annual',
  });
  console.log(`✅ Created Annual Price: ${annualPrice.id} ($79/yr)`);

  console.log('\nSeed Complete! Copy these Price IDs to your frontend or .env variables:');
  console.log(`NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID=${annualPrice.id}`);
}

main().catch(console.error);
