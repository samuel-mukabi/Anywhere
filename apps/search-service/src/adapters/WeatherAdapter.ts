export class WeatherAdapter {
  /**
   * Fetch Climate Score: 0 (Terrible) to 100 (Perfect)
   * This is computed by finding the historical mean temperature, precipitation, and cloud cover
   * across records spanning multi decades.
   */
  public async getClimateScore(cityCode: string, targetDate: string): Promise<number> {
    
    await new Promise(r => setTimeout(r, 50)); // Simulating DB/Remote fetch

    // Typically this extracts the targeted Month dynamically from the `targetDate`.
    const month = new Date(targetDate).getMonth(); 

    // A mock lookup simulating weather data extraction. 
    // Example: If going to Paris (PAR) in January (0), logic heavily drops climate scores compared to Summer (5).
    if (cityCode === 'PAR' && (month === 0 || month === 11)) {
       return 30; // Cold/Wet
    } else if (cityCode === 'DPS') {
       return 95; // Bali is permanently awesome
    }

    // Return a random positive weather score for the sake of compiling the search demo
    return Math.floor(Math.random() * (95 - 40 + 1) + 40);
  }
}
