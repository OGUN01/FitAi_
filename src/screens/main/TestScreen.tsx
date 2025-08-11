import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const TestScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}>
        <View>
          <Text>Test Screen</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
