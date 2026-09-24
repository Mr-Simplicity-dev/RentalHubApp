import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, typography } from '../../theme';
import { useTourTarget } from '../tour/TourTarget';
import AppText from '../common/AppText';

const WorkspaceCard = ({ item, groupTitle }) => {
  const tourTargetProps = useTourTarget(item.tourTarget, {
    label: item.label,
    onAction: item.onPress,
    padding: 6,
    radius: 12,
  });

  return (
    <TouchableOpacity
      {...tourTargetProps}
      accessibilityRole="button"
      accessibilityLabel={`${groupTitle}: ${item.label}`}
      activeOpacity={0.85}
      onPress={item.onPress}
      style={styles.card}
    >
      <Icon name={item.icon} size={20} color={colors.blue} />
      <AppText style={styles.cardLabel} numberOfLines={2}>
        {item.label}
      </AppText>
    </TouchableOpacity>
  );
};

// Shared shortcut board used by every admin dashboard: workspaces grouped by the
// job they belong to, one tappable card each. Keeps the overviews consistent.
const WorkspaceBoard = ({ groups = [] }) => (
  <View>
    {groups.map((group) => (
      <View key={group.title} style={styles.group}>
        <View style={styles.groupHeader}>
          {group.icon ? <Icon name={group.icon} size={16} color={colors.blue} /> : null}
          <AppText style={styles.groupTitle}>{group.title}</AppText>
        </View>
        <View style={styles.grid}>
          {group.items.map((item) => (
            <WorkspaceCard key={`${group.title}-${item.label}`} item={item} groupTitle={group.title} />
          ))}
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  group: {
    marginBottom: 14,
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
  },
  groupTitle: {
    color: '#0f172a',
    fontFamily: typography.bold,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 78,
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: '31.5%',
  },
  cardLabel: {
    color: '#334155',
    fontFamily: typography.medium,
    fontSize: 11,
    textAlign: 'center',
  },
});

export default WorkspaceBoard;
