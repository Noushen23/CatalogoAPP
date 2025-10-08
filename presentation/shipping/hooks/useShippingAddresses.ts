import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shippingAddressesApi, ShippingAddress, CreateShippingAddressRequest, UpdateShippingAddressRequest } from '@/core/api/shippingAddressesApi';

// Query key para direcciones de envío
const SHIPPING_ADDRESSES_KEY = ['shipping-addresses'];

/**
 * Hook para obtener todas las direcciones de envío del usuario
 */
export const useShippingAddresses = () => {
  return useQuery({
    queryKey: SHIPPING_ADDRESSES_KEY,
    queryFn: async () => {
      const response = await shippingAddressesApi.getUserAddresses();
      return response.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

/**
 * Hook para obtener una dirección específica
 */
export const useShippingAddress = (addressId: string) => {
  return useQuery({
    queryKey: [...SHIPPING_ADDRESSES_KEY, addressId],
    queryFn: async () => {
      const response = await shippingAddressesApi.getUserAddress(addressId);
      return response.data;
    },
    enabled: !!addressId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook para obtener la dirección principal
 */
export const usePrimaryShippingAddress = () => {
  return useQuery({
    queryKey: [...SHIPPING_ADDRESSES_KEY, 'primary'],
    queryFn: async () => {
      const response = await shippingAddressesApi.getPrimaryAddress();
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook para crear una nueva dirección
 */
export const useCreateShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateShippingAddressRequest) => {
      const response = await shippingAddressesApi.createAddress(data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidar la cache de direcciones para refrescar la lista
      queryClient.invalidateQueries({ queryKey: SHIPPING_ADDRESSES_KEY });
    },
  });
};

/**
 * Hook para actualizar una dirección existente
 */
export const useUpdateShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ addressId, data }: { addressId: string; data: UpdateShippingAddressRequest }) => {
      const response = await shippingAddressesApi.updateAddress(addressId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidar la cache de direcciones
      queryClient.invalidateQueries({ queryKey: SHIPPING_ADDRESSES_KEY });
      queryClient.invalidateQueries({ queryKey: [...SHIPPING_ADDRESSES_KEY, variables.addressId] });
    },
  });
};

/**
 * Hook para eliminar una dirección
 */
export const useDeleteShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addressId: string) => {
      await shippingAddressesApi.deleteAddress(addressId);
    },
    onSuccess: () => {
      // Invalidar la cache de direcciones para refrescar la lista
      queryClient.invalidateQueries({ queryKey: SHIPPING_ADDRESSES_KEY });
    },
  });
};

/**
 * Hook para establecer una dirección como principal
 */
export const useSetPrimaryShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addressId: string) => {
      const response = await shippingAddressesApi.setPrimaryAddress(addressId);
      return response.data;
    },
    onSuccess: () => {
      // Invalidar la cache de direcciones para refrescar la lista
      queryClient.invalidateQueries({ queryKey: SHIPPING_ADDRESSES_KEY });
    },
  });
};
