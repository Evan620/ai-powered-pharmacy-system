'use client';
import { useEffect } from 'react';

/**
 * Component to handle hydration mismatches caused by browser extensions
 * that inject attributes like bis_skin_checked (Bitdefender TrafficLight)
 */
export function HydrationFix() {
  useEffect(() => {
    // Remove extension-injected attributes that cause hydration warnings
    const removeExtensionAttributes = () => {
      const elements = document.querySelectorAll('[bis_skin_checked]');
      elements.forEach(element => {
        element.removeAttribute('bis_skin_checked');
      });
    };

    // Run immediately and after a short delay to catch late injections
    removeExtensionAttributes();
    const timeout = setTimeout(removeExtensionAttributes, 100);

    return () => clearTimeout(timeout);
  }, []);

  return null;
}