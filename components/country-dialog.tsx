import { Camera, PermissionStatus as CameraPermissionStatus } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useCountryDetection } from '@/hooks/use-country';

/**
 * Shows a native iOS alert and immediately re-opens it after dismissal so the user cannot close it.
 * No custom UI is rendered.
 */
function CountryDialog() {
  const [cameraStatus, setCameraStatus] = useState<CameraPermissionStatus | 'checking'>('checking');
  const hasShownOnce = useRef(false);

  const {
    country,
    regionCountry,
    locationCountry,
    ipCountry,
    ipCountryFallback,
    locationPermissionStatus,
    error,
  } = useCountryDetection();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (mounted) setCameraStatus(status);
      } catch {
        if (mounted) setCameraStatus('denied');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const message = useMemo(() => {
    const lines: string[] = [];
    lines.push(
  'This application is under Apple’s review process. Access to certain features may be limited until the review is completed. You will be informed once approval is granted.'
    );
    if (country) lines.push(`Detected region/country: ${country}.`);
    else if (regionCountry || locationCountry || ipCountry || ipCountryFallback) {
      const parts = [
        locationCountry ? `Location: ${locationCountry}` : null,
        regionCountry ? `Device region: ${regionCountry}` : null,
        ipCountry ? `IP: ${ipCountry}` : null,
        !ipCountry && ipCountryFallback ? `IP (fallback): ${ipCountryFallback}` : null,
      ].filter(Boolean);
      if (parts.length) lines.push(parts.join(' • '));
    }
    lines.push(
      `Location permission: ${
        locationPermissionStatus ? locationPermissionStatus : 'unknown'
      }. Camera permission: ${cameraStatus}.`
    );
    if (error) lines.push(error);
    return lines.join('\n');
  }, [
    cameraStatus,
    country,
    error,
    ipCountry,
    ipCountryFallback,
    locationCountry,
    locationPermissionStatus,
    regionCountry,
  ]);

  useEffect(() => {
    const hasInfo =
      country ||
      regionCountry ||
      locationCountry ||
      ipCountry ||
      ipCountryFallback ||
      error ||
      cameraStatus !== 'checking';

    if (!hasInfo) return;

    const showAlert = () => {
      Alert.alert('Security Risk Detected', message, [
        {
          text: 'OK',
          onPress: () => setTimeout(showAlert, 0),
        },
      ]);
    };

    if (!hasShownOnce.current) {
      hasShownOnce.current = true;
      showAlert();
    }
  }, [
    cameraStatus,
    country,
    error,
    ipCountry,
    ipCountryFallback,
    locationCountry,
    locationPermissionStatus,
    message,
    regionCountry,
  ]);

  return null;
}

export default CountryDialog;
