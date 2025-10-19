/**
 * Shop Screen - Mobile App
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function ShopScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sklep</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Filtry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.productList}>
        {/* Product list will be implemented with API integration */}
        <View style={styles.productCard}>
          <Text style={styles.productName}>Przykładowy produkt 1</Text>
          <Text style={styles.productPrice}>99,00 zł</Text>
        </View>
        <View style={styles.productCard}>
          <Text style={styles.productName}>Przykładowy produkt 2</Text>
          <Text style={styles.productPrice}>149,00 zł</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  productList: {
    padding: 20,
  },
  productCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
});
