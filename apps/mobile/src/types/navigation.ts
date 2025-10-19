/**
 * Navigation types for React Native app
 */

export type RootTabParamList = {
  Home: undefined;
  Shop: undefined;
  Cart: undefined;
  Favorites: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Product: { productId: number };
  Checkout: undefined;
  Login: undefined;
  Register: undefined;
};
