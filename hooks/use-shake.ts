
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const SHAKE_THRESHOLD = 25;
const SHAKE_TIMEOUT = 1000;

export const useShake = (onShake: () => void) => {
  const [isListening, setIsListening] = useState(false);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const handleShake = useCallback(onShake, [onShake]);

  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  // Auto-start on native (uses CMMotionManager - permission persists permanently)
  // Auto-start on platforms that don't require permission (Android, Firefox, etc.)
  useEffect(() => {
    if (isNative) {
      // Native: use Capacitor Motion plugin - no per-session permission needed
      let cleanup: (() => void) | undefined;

      const startNativeMotion = async () => {
        try {
          const { Motion } = await import('@capacitor/motion');
          let lastShakeTime = 0;

          const listener = await Motion.addListener('accel', (event) => {
            const { x, y, z } = event.acceleration;
            const magnitude = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
            const now = Date.now();

            if (magnitude > SHAKE_THRESHOLD && now - lastShakeTime > SHAKE_TIMEOUT) {
              lastShakeTime = now;
              handleShake();
            }
          });

          cleanup = () => listener.remove();
          setPermission('granted');
          setIsListening(true);
        } catch (error) {
          console.error('Failed to start native motion:', error);
          setPermission('denied');
        }
      };

      startNativeMotion();

      return () => {
        cleanup?.();
      };
    }

    // Web: check if permission is needed
    if (typeof DeviceMotionEvent === 'undefined') {
      setPermission('denied');
      return;
    }

    if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
      // No permission required (Android, Firefox, etc.) - auto-start
      setPermission('granted');
      setIsListening(true);
    }
    // iOS web/WKWebView without native: stay as 'prompt', wait for user gesture
  }, [isNative, handleShake]);

  // Web: listen for device motion events
  useEffect(() => {
    if (isNative || !isListening || permission !== 'granted') return;

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
  }, [isNative, isListening, permission, handleShake]);

  // Manual start (only needed for iOS web, not native)
  const startListening = useCallback(async () => {
    if (isNative) return; // Native auto-starts
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
  }, [isNative, isListening, permission]);

  return { startListening, permission, isListening };
};
