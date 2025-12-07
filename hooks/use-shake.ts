
"use client";

import { useState, useEffect, useCallback } from 'react';

const SHAKE_THRESHOLD = 25;
const SHAKE_TIMEOUT = 1000;

export const useShake = (onShake: () => void) => {
  const [isListening, setIsListening] = useState(false);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const handleShake = useCallback(onShake, [onShake]);

  useEffect(() => {
    if (!isListening || permission !== 'granted') return;

    let lastShakeTime = 0;
    const handleMotion = (event: DeviceMotionEvent) => {
      const { acceleration } = event;
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
    // Prevent multiple requests
    if (isListening) return;

    // Acess device motion API in browsers
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
        console.error("Permission request for DeviceMotionEvent failed", error);
      }
    } else {
      // For browsers that don't require explicit permission
      setPermission('granted');
      setIsListening(true);
    }
  }, [isListening]);

  return { startListening, permission, isListening };
};
