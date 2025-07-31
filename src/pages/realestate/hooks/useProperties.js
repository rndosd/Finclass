import { useState, useEffect } from 'react';
import { propertyService } from '../services/propertyService';

export const useProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await propertyService.getAllProperties();
      setProperties(data);
    } catch (err) {
      setError(err.message);
      console.error('부동산 데이터 로딩 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const refreshProperties = () => {
    fetchProperties();
  };

  const purchaseProperty = async (propertyId, buyerId, price) => {
    try {
      const result = await propertyService.purchaseProperty(propertyId, buyerId, price);
      if (result.success) {
        await fetchProperties(); // 데이터 새로고침
      }
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const rentProperty = async (propertyId, tenantId, rentAmount) => {
    try {
      const result = await propertyService.rentProperty(propertyId, tenantId, rentAmount);
      if (result.success) {
        await fetchProperties(); // 데이터 새로고침
      }
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  return {
    properties,
    loading,
    error,
    refreshProperties,
    purchaseProperty,
    rentProperty
  };
};

export const usePropertyOwnership = (userId) => {
  const { properties } = useProperties();
  
  const ownedProperties = properties.filter(property => property.owner === userId);
  const totalValue = ownedProperties.reduce((sum, property) => sum + property.price, 0);
  
  return {
    ownedProperties,
    totalValue,
    propertyCount: ownedProperties.length
  };
};
