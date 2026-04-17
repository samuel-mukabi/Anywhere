import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore — Set Your Budget',
  description: 'Enter your budget and see which destinations light up on the map in real time.',
};

export default function ExplorePage() {
  return (
    <div className="flex flex-col h-full p-6 gap-6">

      {/* Page header */}
      <header className="flex flex-col gap-1">
        <p className="text-[0.65rem] font-cera font-semibold uppercase tracking-widest text-nearblack-600">
          Budget Explorer
        </p>
        <h1 className="font-astoria text-2xl font-light text-nearblack leading-snug">
          Where can you go?
        </h1>
      </header>

      {/* Budget slider — TODO: wire to BudgetSlider component */}
      <section aria-labelledby="budget-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label id="budget-heading" className="text-xs font-cera font-medium uppercase tracking-wide text-nearblack-600">
            Your budget
          </label>
          <span className="text-xl font-cera font-bold text-nearblack tabular-nums">
            $500
          </span>
        </div>
        <input
          id="budget-slider"
          type="range"
          min={100}
          max={5000}
          step={50}
          defaultValue={500}
          className="w-full accent-terracotta h-1.5 rounded-pill bg-parchment-400 appearance-none cursor-pointer"
          aria-label="Budget amount in USD"
        />
        <div className="flex justify-between text-[0.65rem] font-cera text-nearblack-600">
          <span>$100</span>
          <span>$5,000</span>
        </div>
      </section>

      {/* Filter chips — TODO: wire to FilterBar component */}
      <section aria-label="Destination filters" className="flex flex-wrap gap-2">
        {['Any climate', 'Europe', 'Asia', 'Beach', 'Mountains', 'City break'].map((tag) => (
          <button
            key={tag}
            type="button"
            className="px-3 py-1.5 rounded-pill text-xs font-cera font-medium bg-parchment-200 border border-parchment-400 text-nearblack-700 hover:border-terracotta hover:text-terracotta hover:bg-terracotta-100 transition-colors duration-150"
          >
            {tag}
          </button>
        ))}
      </section>

      {/* Results list — TODO: replace with DestinationCard list */}
      <section aria-label="Destination results" className="flex-1 flex flex-col gap-3">
        <p className="text-xs font-cera font-medium uppercase tracking-wide text-nearblack-600">
          5 destinations match
        </p>
        {[
          { city: 'Lisbon', country: 'Portugal', cost: '$487', climate: 'Warm & sunny' },
          { city: 'Tbilisi', country: 'Georgia', cost: '$341', climate: 'Mild & dry'  },
          { city: 'Bangkok', country: 'Thailand', cost: '$392', climate: 'Tropical'   },
          { city: 'Sarajevo', country: 'Bosnia',  cost: '$298', climate: 'Continental'},
          { city: 'Bali', country: 'Indonesia',   cost: '$445', climate: 'Tropical'   },
        ].map(({ city, country, cost, climate }) => (
          <div
            key={city}
            className="card-base hover:shadow-card-hover cursor-pointer transition-shadow duration-200 flex items-center justify-between"
          >
            <div>
              <p className="font-cera font-semibold text-nearblack">{city}</p>
              <p className="text-xs font-cera text-nearblack-600">{country} · {climate}</p>
            </div>
            <p className="font-cera font-bold text-xl text-affordable tabular-nums">{cost}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
