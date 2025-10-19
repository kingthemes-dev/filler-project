/**
 * Home Screen - Mobile App
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>FILLER</Text>
        <Text style={styles.heroSubtitle}>Kosmetyki premium</Text>
        <TouchableOpacity style={styles.ctaButton}>
          <Text style={styles.ctaText}>Zobacz produkty</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Najnowsze produkty</Text>
        <View style={styles.productGrid}>
          {/* Product cards will be implemented */}
          <View style={styles.productCard}>
            <Text style={styles.productName}>Przykładowy produkt</Text>
            <Text style={styles.productPrice}>99,00 zł</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategorie</Text>
        <View style={styles.categoryGrid}>
          <TouchableOpacity style={styles.categoryCard}>
            <Ionicons name="sparkles" size={24} color="#000" />
            <Text style={styles.categoryName}>Kremy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryCard}>
            <Ionicons name="water" size={24} color="#000" />
            <Text style={styles.categoryName}>Serum</Text>
          </TouchableOpacity>
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
  hero: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginTop: 8,
  },
});
