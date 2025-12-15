import { useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import * as Location from 'expo-location';

type CountryDetectionState = {
  country?: string;
  regionCountry?: string;
  ipCountry?: string;
  ipCountryFallback?: string;
  locationCountry?: string;
  source: 'location' | 'region' | 'ip' | 'mixed' | 'unknown';
  loading: boolean;
  error?: string;
  locationPermissionStatus?: Location.PermissionStatus;
};

/**
 * Detect the user's country using:
 * 1) Location with permission prompt, 2) device region, 3) two IP providers (ipapi, ipwho.is).
 */
export function useCountryDetection() {
  const [state, setState] = useState<CountryDetectionState>({
    loading: true,
    source: 'unknown',
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchIpCountry = async () => {
      let primary = '';
      let fallback = '';

      try {
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          primary = data?.country_name || data?.country || '';
        }
      } catch {
        if (controller.signal.aborted) return { primary, fallback };
      }

      if (!primary) {
        try {
          const response = await fetch('https://ipwho.is/', { signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            fallback = data?.country || data?.country_code || '';
          }
        } catch {
          if (controller.signal.aborted) return { primary, fallback };
        }
      }

      return { primary, fallback };
    };

    const fetchLocationCountry = async () => {
      let locationCountry = '';
      let locationPermissionStatus: Location.PermissionStatus | undefined;

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        locationPermissionStatus = permission.status;

        if (permission.status === 'granted') {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest,
          });
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          locationCountry = geo?.country || geo?.isoCountryCode || '';
        }
      } catch {
        // Ignore location errors; fall back to region/IP
      }

      return { locationCountry, locationPermissionStatus };
    };

    const detectCountry = async () => {
      const { locationCountry, locationPermissionStatus } = await fetchLocationCountry();

      const localeCountry =
        Localization.getLocales()?.[0]?.region ?? Localization.region ?? '';

      let country = locationCountry || localeCountry;
      let source: CountryDetectionState['source'] = locationCountry
        ? 'location'
        : localeCountry
          ? 'region'
          : 'unknown';

      const { primary: ipCountry, fallback: ipCountryFallback } = await fetchIpCountry();
      const bestIp = ipCountry || ipCountryFallback;

      if (!country && bestIp) {
        country = bestIp;
        source = 'ip';
      } else if (country && bestIp) {
        source = 'mixed';
      }

      if (!isMounted) return;

      setState({
        country: country || undefined,
        regionCountry: localeCountry || undefined,
        locationCountry: locationCountry || undefined,
        ipCountry: ipCountry || undefined,
        ipCountryFallback: ipCountryFallback || undefined,
        source,
        loading: false,
        locationPermissionStatus,
        error:
          country || ipCountry || ipCountryFallback
            ? undefined
            : 'کشور شما شناسایی نشد. لطفا اینترنت را بررسی کنید.',
      });
    };

    detectCountry();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return state;
}
