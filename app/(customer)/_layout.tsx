import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Crear QueryClient específico para el customer layout
const customerQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function CustomerLayout() {
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <QueryClientProvider client={customerQueryClient}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: tintColor,
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            backgroundColor: backgroundColor,
            borderTopColor: '#e0e0e0',
          },
          headerStyle: {
            backgroundColor: backgroundColor,
          },
          headerTintColor: tintColor,
        }}
      >
        <Tabs.Screen
          name="catalog"
          options={{
            title: 'Catálogo',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            title: 'Servicios',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="construct-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favoritos',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Carrito',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Pedidos',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />

        {/* --- Rutas Ocultas --- */}
        {/* Estas pantallas no aparecerán en la barra de pestañas */}
        <Tabs.Screen
          name="checkout"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="wompi-checkout"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="product/[id]"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="product/write-review"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="order-confirmation/[id]"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          // Esta ruta maneja todas las sub-rutas de shipping-addresses
          name="shipping-addresses"
          options={{ href: null, headerShown: false }}
        />
      </Tabs>
    </QueryClientProvider>
  );
}
