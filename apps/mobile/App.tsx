/**
 * Headless WooCommerce Mobile App
 * React Native + Expo + TypeScript
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ShopScreen from './src/screens/ShopScreen';
import CartScreen from './src/screens/CartScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import AccountScreen from './src/screens/AccountScreen';

// Types
import { RootTabParamList } from './src/types/navigation';

const Tab = createBottomTabNavigator<RootTabParamList>();
const queryClient = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: keyof typeof Ionicons.glyphMap;

                if (route.name === 'Home') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Shop') {
                  iconName = focused ? 'storefront' : 'storefront-outline';
                } else if (route.name === 'Cart') {
                  iconName = focused ? 'cart' : 'cart-outline';
                } else if (route.name === 'Favorites') {
                  iconName = focused ? 'heart' : 'heart-outline';
                } else if (route.name === 'Account') {
                  iconName = focused ? 'person' : 'person-outline';
                } else {
                  iconName = 'help-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#000000',
              tabBarInactiveTintColor: '#666666',
              tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopColor: '#e5e5e5',
                borderTopWidth: 1,
                paddingBottom: 5,
                paddingTop: 5,
                height: 60,
              },
              headerStyle: {
                backgroundColor: '#ffffff',
                borderBottomColor: '#e5e5e5',
                borderBottomWidth: 1,
              },
              headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18,
                color: '#000000',
              },
            })}
          >
            <Tab.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Strona główna' }}
            />
            <Tab.Screen 
              name="Shop" 
              component={ShopScreen}
              options={{ title: 'Sklep' }}
            />
            <Tab.Screen 
              name="Cart" 
              component={CartScreen}
              options={{ title: 'Koszyk' }}
            />
            <Tab.Screen 
              name="Favorites" 
              component={FavoritesScreen}
              options={{ title: 'Ulubione' }}
            />
            <Tab.Screen 
              name="Account" 
              component={AccountScreen}
              options={{ title: 'Moje konto' }}
            />
          </Tab.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}