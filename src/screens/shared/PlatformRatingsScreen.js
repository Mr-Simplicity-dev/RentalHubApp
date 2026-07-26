import React, { useCallback, useEffect, useRef, useState } from 'react';
import {ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { ratingService } from '../../services/ratingService';
import { getErrorMessage, pickList } from '../../utils/http';
import Button from '../../components/common/Button';
import { colors, radius, shadows, typography } from '../../theme';

import AppText from '../../components/common/AppText';
const CONTEXT_LABELS = {
  property_secured: 'Property Secured',
  property_listed: 'Property Listed',
  property_rented: 'Property Rented',
  legal_support: 'Legal Support',
  fumigation_cleaning: 'Fumigation & Cleaning',
  transportation: 'Transportation',
  virtual_tour: 'Virtual Tour',
  dispute_support: 'Dispute Support',
  admin_support: 'Admin Support',
  platform: 'Platform',
};

const DISPLAY_NAME_OPTIONS = [
  { value: 'first_name', label: 'First Name Only' },
  { value: 'initials', label: 'Initials Only' },
  { value: 'role_location', label: 'Role & Location' },
];

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

const StarDisplay = ({ stars, size = 14 }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Icon
        key={i}
        name={i <= stars ? 'star' : 'star-outline'}
        size={size}
        color={i <= stars ? '#FFC928' : colors.border}
      />
    ))}
  </View>
);

const StarPicker = ({ value, onChange, size = 32 }) => (
  <View style={styles.starPickerRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
        accessibilityRole="button"
        activeOpacity={0.7}
        style={styles.starPickerButton}
        onPress={() => onChange(star)}
      >
        <Icon
          name={star <= value ? 'star' : 'star-outline'}
          size={size}
          color={star <= value ? '#FFC928' : colors.border}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const RatingModal = ({ visible, opportunity, onClose, onSubmit }) => {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [displayNameMode, setDisplayNameMode] = useState('first_name');
  const [submitting, setSubmitting] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setStars(0);
      setComment('');
      setDisplayNameMode('first_name');
    }
  }, [visible, opportunity?.opportunity_id]);

  const selectedLabel =
    DISPLAY_NAME_OPTIONS.find((o) => o.value === displayNameMode)?.label || 'First Name Only';

  const handleSubmit = async () => {
    if (!stars) {
      Toast.show({ type: 'info', text1: 'Please select a star rating' });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        stars,
        comment,
        rating_context: opportunity.rating_context,
        source_type: opportunity.source_type,
        source_ref: opportunity.source_ref,
        display_name_mode: displayNameMode,
      });
      Toast.show({ type: 'success', text1: 'Rating submitted', text2: 'Thank you for your feedback!' });
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Submission failed',
        text2: getErrorMessage(error, 'Could not submit rating'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!opportunity) return null;

  const contextLabel = CONTEXT_LABELS[opportunity.rating_context] || opportunity.rating_context;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <AppText style={styles.modalTitle}>Rate Your Experience</AppText>
          <TouchableOpacity accessibilityLabel="Close" style={styles.modalCloseBtn} onPress={onClose}>
            <Icon name="close" size={24} color={colors.navy} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          <View style={styles.modalContextBadge}>
            <Icon name="ribbon-outline" size={14} color={colors.blue} />
            <AppText style={styles.modalContextText}>{contextLabel}</AppText>
          </View>
          <AppText style={styles.modalSource}>{opportunity.source_title || opportunity.detail}</AppText>

          <View style={styles.modalSection}>
            <AppText style={styles.modalLabel}>Your Rating</AppText>
            <StarPicker value={stars} onChange={setStars} />
          </View>

          <View style={styles.modalSection}>
            <AppText style={styles.modalLabel}>Comment (optional)</AppText>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Share details about your experience..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={800}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.modalSection}>
            <AppText style={styles.modalLabel}>Public Display Name</AppText>
            <TouchableOpacity
              style={styles.pickerButton}
              activeOpacity={0.7}
              onPress={() => setPickerVisible(!pickerVisible)}
            >
              <AppText style={styles.pickerButtonText}>{selectedLabel}</AppText>
              <Icon name={pickerVisible ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </TouchableOpacity>
            {pickerVisible && (
              <View style={styles.pickerDropdown}>
                {DISPLAY_NAME_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      displayNameMode === option.value && styles.pickerOptionActive,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setDisplayNameMode(option.value);
                      setPickerVisible(false);
                    }}
                  >
                    <AppText 
                      style={[
                        styles.pickerOptionText,
                        displayNameMode === option.value && styles.pickerOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </AppText>
                    {displayNameMode === option.value && (
                      <Icon name="checkmark" size={16} color={colors.blue} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.privacyNote}>
            <Icon name="lock-closed-outline" size={13} color={colors.muted} />
            <AppText style={styles.privacyNoteText}>
              Your rating will be reviewed before going public. Your identity stays protected.
            </AppText>
          </View>
        </View>

        <View style={styles.modalFooter}>
          <Button title="Cancel" variant="outline" onPress={onClose} style={styles.modalFooterBtn} />
          <Button
            title={submitting ? 'Submitting...' : 'Submit Rating'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.modalFooterBtn}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const OpportunityCard = ({ item, onPress }) => {
  const contextLabel = CONTEXT_LABELS[item.rating_context] || item.rating_context;

  return (
    <TouchableOpacity style={styles.oppCard} activeOpacity={0.7} onPress={() => onPress(item)}>
      <View style={styles.oppIconWrap}>
        <Icon name="ribbon-outline" size={20} color={colors.blue} />
      </View>
      <View style={styles.oppContent}>
        <AppText style={styles.oppContext}>{contextLabel}</AppText>
        <AppText style={styles.oppTitle} numberOfLines={2}>
          {item.title || item.source_title}
        </AppText>
        {item.location_label ? (
          <AppText style={styles.oppLocation}>{item.location_label}</AppText>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
};

const PublicRatingCard = ({ item }) => (
  <View style={styles.publicCard}>
    <View style={styles.publicCardTop}>
      <View style={styles.publicAvatar}>
        {item.image_url ? (
          <></>
        ) : (
          <AppText style={styles.publicAvatarText}>{item.initials || '?'}</AppText>
        )}
      </View>
      <View style={styles.publicCardMeta}>
        <AppText style={styles.publicName}>{item.display_name}</AppText>
        <View style={styles.publicVerifiedRow}>
          <Icon name="checkmark-circle" size={13} color={colors.success} />
          <AppText style={styles.publicVerifiedText}>Verified</AppText>
        </View>
      </View>
      <AppText style={styles.publicTime}>{timeAgo(item.created_at)}</AppText>
    </View>
    <StarDisplay stars={item.stars} />
    {item.comment ? (
      <AppText style={styles.publicComment} numberOfLines={3}>
        {item.comment}
      </AppText>
    ) : null}
    {item.context_label ? (
      <AppText style={styles.publicContext}>{item.context_label}</AppText>
    ) : null}
  </View>
);

const TABS = [
  { key: 'opportunities', label: 'Rate Now', icon: 'star-outline' },
  { key: 'feed', label: 'Recent Ratings', icon: 'chatbubbles-outline' },
];

const PlatformRatingsScreen = () => {
  const [activeTab, setActiveTab] = useState('opportunities');
  const [opportunities, setOpportunities] = useState([]);
  const [oppLoading, setOppLoading] = useState(true);
  const [oppRefreshing, setOppRefreshing] = useState(false);

  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);

  const feedPageRef = useRef(1);

  const loadOpportunities = useCallback(async (isRefresh = false) => {
    if (isRefresh) setOppRefreshing(true);
    else setOppLoading(true);
    try {
      const res = await ratingService.getRatingOpportunities();
      setOpportunities(pickList(res, ['data']));
    } catch {
      setOpportunities([]);
    } finally {
      setOppLoading(false);
      setOppRefreshing(false);
    }
  }, []);

  const loadFeed = useCallback(async (page = 1, isRefresh = false) => {
    if (isRefresh) setFeedRefreshing(true);
    else if (page === 1) setFeedLoading(true);
    else setFeedLoadingMore(true);
    try {
      const res = await ratingService.getPublicRatings({ page, limit: 10 });
      const items = pickList(res, ['data']);
      setFeedPageRef(page);
      setFeedPage(page);
      if (page === 1) {
        setFeed(items);
      } else {
        setFeed((prev) => [...prev, ...items]);
      }
      setFeedHasMore(items.length >= 10);
    } catch {
      if (page === 1) setFeed([]);
    } finally {
      setFeedLoading(false);
      setFeedRefreshing(false);
      setFeedLoadingMore(false);
    }
  }, []);

  const setFeedPageRef = (page) => {
    feedPageRef.current = page;
  };

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  useEffect(() => {
    if (activeTab === 'feed' && feed.length === 0 && !feedLoading) {
      loadFeed(1);
    }
  }, [activeTab]);

  const handleOpenRating = (item) => {
    setSelectedOpp(item);
    setModalVisible(true);
  };

  const handleSubmitRating = async (payload) => {
    await ratingService.submitRating(payload);
    setOpportunities((prev) => prev.filter((o) => o.opportunity_id !== payload.source_ref + ':' + payload.rating_context));
    loadOpportunities(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOpp(null);
  };

  const handleEndReached = () => {
    if (!feedLoadingMore && feedHasMore && !feedLoading) {
      loadFeed(feedPageRef.current + 1);
    }
  };

  const renderOpportunityItem = ({ item }) => (
    <OpportunityCard item={item} onPress={handleOpenRating} />
  );

  const renderFeedItem = ({ item }) => <PublicRatingCard item={item} />;

  const renderFeedFooter = () => {
    if (!feedLoadingMore) return null;
    return (
      <View style={styles.feedFooter}>
        <ActivityIndicator color={colors.blue} size="small" />
      </View>
    );
  };

  const renderEmptyFeed = () => {
    if (feedLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon name="chatbubbles-outline" size={48} color={colors.border} />
        <AppText style={styles.emptyTitle}>No ratings yet</AppText>
        <AppText style={styles.emptySubtitle}>Public ratings will appear here once submitted and approved.</AppText>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon name={tab.icon} size={18} color={isActive ? colors.blue : colors.muted} />
              <AppText style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</AppText>
              {tab.key === 'opportunities' && opportunities.length > 0 && (
                <View style={styles.tabBadge}>
                  <AppText style={styles.tabBadgeText}>{opportunities.length}</AppText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'opportunities' && (
        <>
          {oppLoading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator color={colors.blue} size="large" />
            </View>
          ) : (
            <FlatList
              data={opportunities}
              keyExtractor={(item) => item.opportunity_id}
              renderItem={renderOpportunityItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={oppRefreshing}
                  onRefresh={() => loadOpportunities(true)}
                  tintColor={colors.blue}
                  colors={[colors.blue]}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Icon name="checkmark-done-circle-outline" size={48} color={colors.success} />
                  <AppText style={styles.emptyTitle}>All caught up!</AppText>
                  <AppText style={styles.emptySubtitle}>
                    No pending rating opportunities right now. We'll prompt you after your next service.
                  </AppText>
                </View>
              }
            />
          )}
        </>
      )}

      {activeTab === 'feed' && (
        <>
          {feedLoading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator color={colors.blue} size="large" />
            </View>
          ) : (
            <FlatList
              data={feed}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderFeedItem}
              contentContainerStyle={styles.listContent}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.4}
              ListFooterComponent={renderFeedFooter}
              ListEmptyComponent={renderEmptyFeed}
              refreshControl={
                <RefreshControl
                  refreshing={feedRefreshing}
                  onRefresh={() => loadFeed(1, true)}
                  tintColor={colors.blue}
                  colors={[colors.blue]}
                />
              }
            />
          )}
        </>
      )}

      <RatingModal
        visible={modalVisible}
        opportunity={selectedOpp}
        onClose={handleCloseModal}
        onSubmit={handleSubmitRating}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.white,
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  tabItemActive: {
    borderBottomColor: colors.blue,
    borderBottomWidth: 2,
  },
  tabLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  tabLabelActive: {
    color: colors.blue,
    fontFamily: typography.semibold,
  },
  tabBadge: {
    backgroundColor: colors.blue,
    borderRadius: 10,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: typography.bold,
    textAlign: 'center',
  },
  loadingCenter: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  oppCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    ...shadows.soft,
  },
  oppIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.sm,
    height: 42,
    justifyContent: 'center',
    marginRight: 12,
    width: 42,
  },
  oppContent: {
    flex: 1,
  },
  oppContext: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  oppTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 16,
    marginTop: 3,
  },
  oppLocation: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 3,
  },
  publicCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
    ...shadows.soft,
  },
  publicCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  publicAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 20,
    height: 36,
    justifyContent: 'center',
    marginRight: 10,
    width: 36,
  },
  publicAvatarText: {
    color: colors.blue,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  publicCardMeta: {
    flex: 1,
  },
  publicName: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  publicVerifiedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    marginTop: 1,
  },
  publicVerifiedText: {
    color: colors.success,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  publicTime: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
  },
  publicComment: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  publicContext: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 18,
    marginTop: 14,
  },
  emptySubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 260,
  },
  feedFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalSafe: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 18,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  modalContextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceBlue,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modalContextText: {
    color: colors.blue,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  modalSource: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    marginTop: 10,
  },
  modalSection: {
    marginTop: 22,
  },
  modalLabel: {
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 14,
    marginBottom: 10,
  },
  starPickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  starPickerButton: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 14,
    minHeight: 90,
    padding: 12,
  },
  pickerButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerButtonText: {
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  pickerDropdown: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  pickerOption: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerOptionActive: {
    backgroundColor: colors.surfaceBlue,
  },
  pickerOptionText: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  pickerOptionTextActive: {
    color: colors.blue,
    fontFamily: typography.semibold,
  },
  privacyNote: {
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    padding: 12,
  },
  privacyNoteText: {
    color: colors.muted,
    fontFamily: typography.regular,
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
  },
  modalFooter: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalFooterBtn: {
    flex: 1,
  },
});

export default PlatformRatingsScreen;
