import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Animated, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Mapbox from '@rnmapbox/maps';
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import AnimatedReanimated from 'react-native-reanimated';
import Constants from 'expo-constants';
import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';
import { DestinationResult } from '@/features/search/search-store';
import { getPalette, detectTimeOfDay } from '@/features/map/map-palette';
import { useMapStore } from '@/features/map/map-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sanitizeLayerStyle, sanitizeLayerProps } from '@/services/mapbox-style';


// Initialize Mapbox tokens early
Mapbox.setAccessToken(Constants.expoConfig?.extra?.mapboxToken || '');

// Stricter Ref type for ShapeSource which missing setNativeProps in current RNMapbox types
interface ShapeSourceRef extends Mapbox.ShapeSource {
  setNativeProps: (props: { shape?: string | GeoJSON.FeatureCollection | null }) => void;
}

const GHOST_COORDS = [
  [-9.1393, 38.7223],  // Lisbon
  [139.6917, 35.6895], // Tokyo
  [2.3522, 48.8566],   // Paris
  [-74.0060, 40.7128], // NY
  [100.5018, 13.7563], // Bangkok
];

function GhostPins() {
  const opacities = GHOST_COORDS.map(() => useSharedValue(0));

  useEffect(() => {
    opacities.forEach((opacity, i) => {
      setTimeout(() => {
        opacity.value = withRepeat(
          withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }, i * 200);
    });
  });

  return (
    <>
      {GHOST_COORDS.map((coord, i) => {
        const animatedStyle = useAnimatedStyle(() => ({
          opacity: opacities[i].value,
        }));

        return (
          <Mapbox.PointAnnotation key={`ghost-${i}`} id={`ghost-${i}`} coordinate={coord}>
            <AnimatedReanimated.View style={[styles.ghostPinMarker, animatedStyle]} />
          </Mapbox.PointAnnotation>
        );
      })}
    </>
  );
}

interface AnywhereMapProps {
  status: 'idle' | 'pending' | 'ready' | 'failed';
  results: DestinationResult[];
}

interface PulsingLayerProps {
  activePalette: any;
}

function PulsingLayer({ activePalette }: PulsingLayerProps) {
  const [pulseRadius, setPulseRadius] = useState(8);

  useEffect(() => {
    let growing = true;
    const interval = setInterval(() => {
      setPulseRadius((prev) => {
        if (prev >= 16) growing = false;
        if (prev <= 8) growing = true;
        return growing ? prev + 0.4 : prev - 0.4;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <Mapbox.CircleLayer
      {...sanitizeLayerProps({
        id: "pin-pulse",
        style: sanitizeLayerStyle({
          circleColor: activePalette.accent || '#C4713A',
          circleRadius: pulseRadius,
          circleOpacity: 0.4,
          circleStrokeWidth: 0,
        })
      })}
    />
  );
}


export function AnywhereMap({ status, results }: AnywhereMapProps) {
  const insets = useSafeAreaInsets();
  const mapStyleObj = Constants.expoConfig?.extra?.mapboxStyleUrl || Mapbox.StyleURL.Dark;

  // Track the reactive map palette
  const [activePalette, setActivePalette] = useState(() => getPalette());
  const cameraRef = useRef<Mapbox.Camera>(null);
  const shapeSourceRef = useRef<ShapeSourceRef>(null);

  const setSelected = useMapStore((s) => s.setSelected);

  // Map state
  const [isGlobe, setIsGlobe] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(1.5);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Initial Feature collection stub
  const initialFeatureCollection: GeoJSON.FeatureCollection = useMemo(() => ({
    type: 'FeatureCollection',
    features: []
  }), []);

  useEffect(() => {
    // Attempt proactive permission request for GPS
    (async () => {
      await Location.requestForegroundPermissionsAsync();
    })();

    // Synchronization loop: Sync map colors to real-world clock time every 5 mins
    const intervalId = setInterval(() => {
      setActivePalette(getPalette());
    }, 5 * 60 * 1000); // 300,000 ms

    return () => clearInterval(intervalId);
  }, []);

  // Method to fit bounds over all loaded search features
  // Derived Feature collection from results
  const geojson: GeoJSON.FeatureCollection = useMemo(() => {
    const features = results
      .filter(r => {
        const lon = Number(r.longitude);
        const lat = Number(r.latitude);
        return r.longitude != null && r.latitude != null && Number.isFinite(lon) && Number.isFinite(lat);
      })
      .map((r, i) => ({
        type: 'Feature' as const,
        id: r.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(r.longitude), Number(r.latitude)],
        },
        properties: {
          id: r.id,
          city: r.city,
          priceLabel: `$${r.flightPrice || r.totalCost}`,
          rank: i + 1,
        },
      }));
    
    console.log(`[AnywhereMap] Results: ${results.length}, Filtered Features: ${features.length}`);
    return {
      type: 'FeatureCollection',
      features
    };
  }, [results]);

  const executeFitBounds = () => {
    if (results.length > 0) {
      const lats = results.map(r => r.latitude).filter((val): val is number => val != null && Number.isFinite(Number(val)));
      const lons = results.map(r => r.longitude).filter((val): val is number => val != null && Number.isFinite(Number(val)));

      if (lats.length > 0 && lons.length > 0) {
        const ne: [number, number] = [Math.max(...lons), Math.max(...lats)];
        const sw: [number, number] = [Math.min(...lons), Math.min(...lats)];
        console.log(`[AnywhereMap] Fitting camera to bounds: SW(${sw}), NE(${ne})`);
        cameraRef.current?.fitBounds(ne, sw, [80, 80, 80, 80], 1000);
      }
    }
  };

  useEffect(() => {
    console.log(`[AnywhereMap] Status: ${status}, Results: ${results.length}, StyleLoaded: ${styleLoaded}`);
    if (status === 'ready' && results.length > 0 && styleLoaded) {
      executeFitBounds();
    }
  }, [status, results.length, styleLoaded]);

  const handlePinPress = (event: any) => {
    const feature = event.features[0];
    if (feature && feature.properties?.id) {
      // Prevent underlying map click processing
      const id = feature.properties.id;
      const coords = (feature.geometry as GeoJSON.Point).coordinates;

      setSelected(id);

      // Trigger map panning
      cameraRef.current?.flyTo(coords, 1200);
    }
  };

  const handleMapPress = () => {
    setSelected(null);
    if (results.length > 0 && status === 'ready') {
      executeFitBounds();
    } else {
      cameraRef.current?.setCamera({ centerCoordinate: [20, 15], zoomLevel: 1.5, animationDuration: 1000 });
    }
  };

  const handleLocateMe = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      await Location.requestForegroundPermissionsAsync();
    }
    try {
      const position = await Location.getCurrentPositionAsync({});
      cameraRef.current?.flyTo([position.coords.longitude, position.coords.latitude], 500);
      cameraRef.current?.zoomTo(5, 500);
    } catch (err) {
      console.log("Location not granted or unreachable.");
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const nextZoom = direction === 'in' ? currentZoom + 1 : currentZoom - 1;
    setCurrentZoom(nextZoom);
    cameraRef.current?.zoomTo(nextZoom, 300);
  };

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL={mapStyleObj as string}
        projection={isGlobe ? 'globe' : 'mercator'}
        zoomEnabled
        scrollEnabled
        pitchEnabled
        logoEnabled={false}
        attributionEnabled={false}
        onPress={handleMapPress}
        onDidFinishLoadingStyle={() => setStyleLoaded(true)}
        onCameraChanged={(e) => setCurrentZoom(e.properties.zoom)}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [20, 15],
            zoomLevel: 1.5,
          }}
          animationMode='none'
        />

        {/* ─── Sky & Atmosphere Overlay ────────────────────────────────────── */}
        {isGlobe && styleLoaded && (
          <Mapbox.Atmosphere
            key="map-atmosphere"
            {...sanitizeLayerProps({
              style: sanitizeLayerStyle({
                color: activePalette.fogColor,
                highColor: activePalette.skyColor,
                horizonBlend: 0.04,
                spaceColor: '#000000',
                starIntensity: activePalette.label === 'Night' ? 0.6 : 0.15,
              })
            })}
          />
        )}


        {/* Feature Overlays */}
        {status === 'pending' && <GhostPins key="map-ghost-pins" />}

        {/* Interactive ShapeSource Engine */}
        {styleLoaded && (
          <Mapbox.ShapeSource
            key={`source-${results.length}-${status}`}
            ref={shapeSourceRef}
            id="destinations"
            shape={geojson}
            onPress={handlePinPress}
          >
            <PulsingLayer activePalette={activePalette} />

            <Mapbox.CircleLayer
              {...sanitizeLayerProps({
                id: "pin-core",
                style: sanitizeLayerStyle({
                  circleColor: '#C4713A',
                  circleRadius: 7,
                  circleStrokeColor: '#EEEBD9',
                  circleStrokeWidth: 2,
                  circleOpacity: 1,
                })
              })}
            />

            <Mapbox.SymbolLayer
              {...sanitizeLayerProps({
                id: "pin-price",
                minZoomLevel: 3,
                style: sanitizeLayerStyle({
                  textField: ['get', 'priceLabel'],
                  textColor: '#EEEBD9',
                  textHaloColor: 'rgba(13,30,39,0.9)',
                  textHaloWidth: 1.5,
                  textAnchor: 'left',
                  textOffset: [1.2, 0],
                  textSize: 11,
                })
              })}
            />
          </Mapbox.ShapeSource>
        )}

      </Mapbox.MapView>


      {/* ─── Floating Controls Overlay ────────────────────────────────────── */}
      <View style={[styles.controlsContainer, { top: insets.top + spacing.md }]}>
        <TouchableOpacity style={styles.controlButton} onPress={handleLocateMe} activeOpacity={0.8}>
          <Feather name="navigation" size={20} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity style={[styles.controlButton, styles.controlButtonTop]} onPress={() => handleZoom('in')} activeOpacity={0.8}>
          <Feather name="plus" size={20} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, styles.controlButtonBottom]} onPress={() => handleZoom('out')} activeOpacity={0.8}>
          <Feather name="minus" size={20} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.controlButton} onPress={() => setIsGlobe(!isGlobe)} activeOpacity={0.8}>
          <Feather name={isGlobe ? 'globe' : 'map'} size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ghostPinMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.parchment,
    shadowColor: Colors.parchment,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
  controlsContainer: {
    position: 'absolute',
    right: spacing.md,
    alignItems: 'center',
    zIndex: 10,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(28, 43, 54, 0.8)', // Matching midnight tone
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  controlButtonTop: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  controlButtonBottom: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  spacer: {
    height: spacing.sm,
  },
});
