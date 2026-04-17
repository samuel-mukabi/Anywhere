import TextType from "@/components/TextType";
import CurvedLoop from "@/components/CurvedLoop";

const Hero = () => {
    const anywherePhrases = [
        "Where can $400 take you this weekend?",
        "Find the sun in the middle of November.",
        "Dusk in Lisbon. Street food in Hanoi.",
        "Escape to the Balkans for under $350.",
        "The world is waiting.",
        "Finally, a trip everyone can afford.",
        "Boutique stays in Bali, split four ways.",
        "No more 'who owes who'. Just 'where to next?'",
        "Seeking: Tropical vibes under $500.",
        "Seeking: Hidden gems in Eastern Europe.",
        "Seeking: A romantic weekend that fits the bill.",
        "Welcome to Anywhere.",
        "Find your vibe. Set your budget. Go.",
        "Your next adventure is just a slider away."
    ];

    return (
        // Added a dark dusk background (#1a1a2e to #16213e vibe) and centered the content
        <section className="flex-1 flex-center text-center px-4">
            <div className="absolute top-70 w-full flex flex-col items-center text-4xl md:text-6xl font-semibold max-w-4xl">
                <CurvedLoop
                    marqueeText="Anywhere ✦ Anywhere ✦ Anywhere ✦ Anywhere ✦ Anywhere ✦"
                    speed={2}
                    curveAmount={-400}
                    direction="right"
                    interactive
                    className="custom-text-style"
                />

                <TextType
                    texts={anywherePhrases}
                    typingSpeed={75}
                    pauseDuration={2000} // Increased to 2 seconds so users can read the destination
                    showCursor={true}
                    cursorCharacter="▎"
                    deletingSpeed={50}
                    variableSpeedEnabled={true}
                    variableSpeedMin={90}
                    variableSpeedMax={195}
                    cursorBlinkDuration={0.5} text={undefined} variableSpeed={undefined}
                    onSentenceComplete={undefined}/>
            </div>
            <p className="absolute bottom-80 text-2xl py-20">
                Travel is broken, we are fixing the search.
            </p>
        </section>
    );
};

export default Hero;