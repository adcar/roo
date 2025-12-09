'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

export function useAvailableEquipment() {
  const [availableEquipment, setAvailableEquipment] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    async function fetchAvailableEquipment() {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user-settings');
        if (response.ok) {
          const data = await response.json();
          setAvailableEquipment(data.availableEquipment || null);
        }
      } catch (error) {
        console.error('Error fetching available equipment:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAvailableEquipment();
  }, [session]);

  return { availableEquipment, loading };
}



