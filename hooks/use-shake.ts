
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const SHAKE_THRESHOLD = 25;
const SHAKE_TIMEOUT = 1000;

export const useShake = (onShake: () => void) => {
  const [isListening, setIsListening] = useState(false);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const handleShake = useCallback(onShake, [onShake]);

  // Check initial permission state on mount
  useEffect(() => {
    // For browsers that don't require permission (Firefox, Chrome on Android, etc.)
    // Auto-start if DeviceMotionEvent is available and doesn't need permission
    if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
      if (typeof DeviceMotionEvent !== 'undefined') {
        // No permission required - start listening automatically
        setPermission('granted');
        setIsListening(true);
      } else {
        setPermission('denied');
      }
    }
    // For iOS/Safari/WKWebView, we need to request permission from user gesture
    // So we start as 'prompt' and wait for user to click the button
  }, []);

  useEffect(() => {
    if (!isListening || permission !== 'granted') return;

    let lastShakeTime = 0;
    const handleMotion = (event: DeviceMotionEvent) => {
      // Try acceleration first, fall back to accelerationIncludingGravity (Firefox uses this)
      const acceleration = event.acceleration || event.accelerationIncludingGravity;
      if (!acceleration) return;
      
      const { x, y, z } = acceleration;
      const magnitude = Math.sqrt((x ?? 0)**2 + (y ?? 0)**2 + (z ?? 0)**2);
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

  const startListening = useCallback(async () => {
    // If already listening and granted, don't do anything
    if (isListening && permission === 'granted') {
      return;
    }

    // Access device motion API in browsers
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      // iOS 13+ requires explicit permission (Safari and WKWebView)
      // Note: If permission was previously denied, this will throw an error
      // If permission was already granted, it returns 'granted' without showing popup
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        console.log("Permission state:", permissionState);
        if (permissionState === 'granted') {
          setPermission('granted');
          setIsListening(true);
        } else {
          setPermission('denied');
          setIsListening(false);
        }
      } catch (error) {
        // If permission was previously denied, requestPermission() throws an error
        // This means the user denied it before and we can't request again
        setPermission('denied');
        setIsListening(false);
        console.error("Permission request failed (was previously denied):", error);
        console.warn("To reset: Clear site data in browser settings or reinstall the app");
      }
    } else {
      // For browsers that don't require explicit permission (Firefox, Android, etc.)
      // Just start listening directly - Firefox should work without permission
      console.log("No permission required, starting motion listener");
      setPermission('granted');
      setIsListening(true);
    }
  }, [isListening, permission]);

  return { startListening, permission, isListening };
};
