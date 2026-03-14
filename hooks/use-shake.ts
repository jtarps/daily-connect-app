
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

const SHAKE_THRESHOLD = 25;
const SHAKE_TIMEOUT = 1000;

export const useShake = (onShake: () => void) => {
  const [isListening, setIsListening] = useState(false);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const cleanupRef = useRef<(() => void) | undefined>();

  const handleShake = useCallback(onShake, [onShake]);

  // Check initial permission state
  useEffect(() => {
    if (typeof DeviceMotionEvent === 'undefined') {
      setPermission('denied');
      return;
    }

    if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
      // No permission required (Android, Firefox, etc.) - auto-start
      setPermission('granted');
      setIsListening(true);
    }
    // iOS (both Safari and Capacitor WKWebView): requires user gesture to request permission
    // Stay as 'prompt', wait for startListening() call from a button tap
  }, []);

  // Listen for device motion events when permitted
  useEffect(() => {
    if (!isListening || permission !== 'granted') return;

    let lastShakeTime = 0;
    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.acceleration || event.accelerationIncludingGravity;
      if (!acceleration) return;

      const { x, y, z } = acceleration;
      const magnitude = Math.sqrt((x ?? 0) ** 2 + (y ?? 0) ** 2 + (z ?? 0) ** 2);
      const now = Date.now();

      if (magnitude > SHAKE_THRESHOLD && now - lastShakeTime > SHAKE_TIMEOUT) {
        lastShakeTime = now;
        handleShake();
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isListening, permission, handleShake]);

  // Manual start (required on iOS - must be called from a user gesture like a tap)
  const startListening = useCallback(async () => {
    if (isListening && permission === 'granted') return;

    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermission('granted');
          setIsListening(true);
        } else {
          setPermission('denied');
          setIsListening(false);
        }
      } catch (error) {
        setPermission('denied');
        setIsListening(false);
      }
    } else {
      setPermission('granted');
      setIsListening(true);
    }
  }, [isListening, permission]);

  return { startListening, permission, isListening };
};
