import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

interface GenreChartProps {
  genres: { genre: string; count: number }[];
}

export function GenreChart({ genres }: GenreChartProps) {
  if (!genres || genres.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Chưa đủ dữ liệu thể loại 🎵</Text>
      </View>
    );
  }

  const total = genres.reduce((s, g) => s + g.count, 0);

  const chartData = genres.slice(0, 6).map((g, i) => ({
    name: g.genre.slice(0, 15),
    population: g.count,
    color: Colors.genreColors[i % Colors.genreColors.length],
    legendFontColor: Colors.textSecondary,
    legendFontSize: 11,
  }));

  return (
    <View style={styles.container}>
      <PieChart
        data={chartData}
        width={width - 32}
        height={200}
        chartConfig={{
          backgroundColor: Colors.surface,
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="10"
        center={[0, 0]}
        absolute={false}
      />

      {/* Legend chi tiết */}
      <View style={styles.legend}>
        {genres.slice(0, 8).map((g, i) => {
          const percent = Math.round((g.count / total) * 100);
          return (
            <View key={i} style={styles.legendItem}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: Colors.genreColors[i % Colors.genreColors.length] },
                ]}
              />
              <Text style={styles.genreName} numberOfLines={1}>
                {g.genre}
              </Text>
              <Text style={styles.percent}>{percent}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  legend: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  genreName: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  percent: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
});
