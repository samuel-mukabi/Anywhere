/**
 * useFontLoader — Loads custom brand fonts at app startup.
 *
 * Astoria  → serif display face used in headings & wordmark
 * Cera Pro → humanist sans-serif used for UI / body copy
 *
 * ⚠️  Font files must be placed at:
 *   apps/mobile/assets/fonts/Astoria.otf
 *   apps/mobile/assets/fonts/CeraPro-Regular.otf
 *   apps/mobile/assets/fonts/CeraPro-Medium.otf
 *   apps/mobile/assets/fonts/CeraPro-Bold.otf
 *
 * Until the files are added, the hook resolves immediately and
 * the app falls back to the system/Georgia serif stack.
 */

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Keep the native splash visible until fonts are ready
SplashScreen.preventAutoHideAsync();

// Load fonts via Metro requires
const fontMap: Record<string, number> = {};

try { fontMap['Astoria']         = require('../../assets/fonts/astoria/AstoriaRoman.ttf'); } catch {}
try { fontMap['CeraPro-Regular'] = require('../../assets/fonts/cera/Cera-Regular.ttf');    } catch {}
try { fontMap['CeraPro-Medium']  = require('../../assets/fonts/cera/Cera-Medium.ttf');     } catch {}
try { fontMap['CeraPro-Bold']    = require('../../assets/fonts/cera/Cera-Bold.ttf');       } catch {}

export function useFontLoader() {
  const hasFonts = Object.keys(fontMap).length > 0;

  // If no font files present yet, skip straight to loaded
  const [fontsLoaded, fontError] = useFonts(hasFonts ? fontMap : {});

  useEffect(() => {
    if (!hasFonts || fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [hasFonts, fontsLoaded, fontError]);

  return {
    fontsLoaded: !hasFonts || fontsLoaded,
    fontError,
  };
}
