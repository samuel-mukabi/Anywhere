import { DestinationRanker, SearchParams, FlightOffer } from './DestinationRanker';
import { Destination } from '@repo/workers/src/models/Destination';
import { emitSearchRanked } from './lib/kafka';

jest.mock('@repo/workers/src/models/Destination', () => ({
    Destination: {
        find: jest.fn()
    }
}));

jest.mock('./lib/kafka', () => ({
    emitSearchRanked: jest.fn().mockResolvedValue(undefined)
}));

describe('DestinationRanker', () => {
    let ranker: DestinationRanker;

    const mockDestinations = [
       { iso: 'DPS', name: 'Bali', safetyScore: 85, climateMatrix: { '7': { 'Tropical': 90 } }, avgCosts: { dailyLiving: 40 } },
       { iso: 'PAR', name: 'Paris', safetyScore: 70, climateMatrix: { '7': { 'Tropical': 30 } }, avgCosts: { dailyLiving: 150 } },
       { iso: 'NYC', name: 'New York', safetyScore: 60, climateMatrix: { '7': { 'Tropical': 20 } }, avgCosts: { dailyLiving: 200 } }
    ];

    const mockOffers: FlightOffer[] = [
       { destinationIso: 'DPS', totalAmount: 800, currency: 'USD' },
       { destinationIso: 'PAR', totalAmount: 500, currency: 'USD' },
       { destinationIso: 'NYC', totalAmount: 100, currency: 'USD' }
    ];

    beforeEach(() => {
        ranker = new DestinationRanker();
        jest.clearAllMocks();
    });

    it('over-budget destinations natively excluded dynamically cleanly', async () => {
        (Destination.find as jest.Mock).mockReturnValue({
             lean: () => Promise.resolve(mockDestinations)
        });

        const params: SearchParams = {
            flightOffers: mockOffers,
            budget: 1500, // With TripCostCalculator accommodation included, only DPS stays under budget.
            vibes: ['Tropical'],
            travelMonth: 7,
            nights: 7,
            userTier: 'pro'
        };

        const results = await ranker.rank(params);
        expect(results.length).toBe(1);
        expect(results.find(r => r.destination.iso === 'PAR')).toBeUndefined();
        expect(results.find(r => r.destination.iso === 'NYC')).toBeUndefined();
    });

    it('results sorted gracefully accurately by rankScore seamlessly', async () => {
        (Destination.find as jest.Mock).mockReturnValue({
            lean: () => Promise.resolve(mockDestinations)
        });

        const params: SearchParams = {
            flightOffers: mockOffers,
            budget: 5000, 
            vibes: ['Tropical'],
            travelMonth: 7,
            nights: 7,
            userTier: 'free' // Bypasses explicit tier limits naturally
        };

        const results = await ranker.rank(params);
        expect(results).toHaveLength(3);
        // Bali should be first because rankScore (Safety 85, Climate 90) > completely crushes the rest
        expect(results[0].destination.iso).toBe('DPS');
        expect(results[0].rankScore).toBeGreaterThan(results[1].rankScore);
    });

    it('whyItFits array dynamically populated effectively securely appropriately', async () => {
        (Destination.find as jest.Mock).mockReturnValue({
            lean: () => Promise.resolve([mockDestinations[0]])
        });

        const params: SearchParams = {
            flightOffers: [mockOffers[0]],
            budget: 2000, 
            vibes: ['Tropical'],
            travelMonth: 7,
            nights: 7,
            userTier: 'pro'
        };

        const results = await ranker.rank(params);
        const why = results[0].whyItFits;
        
        expect(why.some(s => s.includes('Under budget by'))).toBe(true);
        expect(why.some(s => s.includes('Safety score 85/100'))).toBe(true);
        expect(why.some(s => s.includes('Perfect climate for Tropical'))).toBe(true);
    });

    it('emits search.ranked analytics payload', async () => {
        (Destination.find as jest.Mock).mockReturnValue({
            lean: () => Promise.resolve([mockDestinations[0]])
        });

        const params: SearchParams = {
            flightOffers: [mockOffers[0]],
            budget: 2000,
            vibes: ['Tropical'],
            travelMonth: 7,
            nights: 7,
            userTier: 'pro',
            searchId: 'search_123'
        };

        await ranker.rank(params);
        expect(emitSearchRanked).toHaveBeenCalledWith(expect.objectContaining({
            searchId: 'search_123',
            topDestination: 'Bali',
            resultCount: 1
        }));
    });
});
