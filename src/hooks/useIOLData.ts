import { useState, useEffect } from 'react';
import { iolLenses, getManufacturers } from '@/data/iolData';

export interface IOLOption {
  id: number;
  iol: string;
  manufacturer: string;
  is_toric: boolean;
}

export interface ManufacturerOption {
  manufacturer: string;
}

export const useIOLData = () => {
  const [iolData, setIOLData] = useState<IOLOption[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIOLData = () => {
    try {
      // Convert local data to the format expected by the component
      const formattedData: IOLOption[] = iolLenses.map((lens, index) => ({
        id: index + 1,
        iol: lens.iol,
        manufacturer: lens.manufacturer,
        is_toric: lens.toric
      }));

      // Get unique manufacturers
      const manufacturersList = getManufacturers();
      const uniqueManufacturers = manufacturersList.map(manufacturer => ({ manufacturer }));

      setIOLData(formattedData);
      setManufacturers(uniqueManufacturers);
    } catch (err: any) {
      console.error('Error loading IOL data:', err);
      setError(err.message || 'Failed to load IOL data');
    }
  };

  useEffect(() => {
    loadIOLData();
  }, []);

  const getIOLsByManufacturer = (manufacturer: string, isToric?: boolean): IOLOption[] => {
    let filtered = iolData.filter(iol => iol.manufacturer === manufacturer);

    if (isToric !== undefined) {
      filtered = filtered.filter(iol => iol.is_toric === isToric);
    }

    return filtered;
  };

  const getToricManufacturers = (): ManufacturerOption[] => {
    const toricIOLs = iolData.filter(iol => iol.is_toric === true);
    const uniqueManufacturers = [...new Set(toricIOLs.map(iol => iol.manufacturer))]
      .map(manufacturer => ({ manufacturer }))
      .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
    return uniqueManufacturers;
  };

  return {
    iolData,
    manufacturers,
    isLoading,
    error,
    getIOLsByManufacturer,
    getToricManufacturers,
    refetch: loadIOLData
  };
};