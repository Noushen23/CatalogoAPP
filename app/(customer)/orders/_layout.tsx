import { Stack } from 'expo-router';

export default function OrdersLayout() {
  // Este layout simplemente agrupa las rutas de pedidos bajo una Stack.
  return <Stack screenOptions={{ headerShown: false }} />;
}