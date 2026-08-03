import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import { Dimensions } from 'react-native';

const TourScrollContext = createContext(null);

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export const useTourScrollController = ({
  animated = true,
  bottomClearance = 300,
  topClearance = 112,
} = {}) => {
  const scrollRef = useRef(null);
  const scrollOffsetRef = useRef(0);

  const onScroll = useCallback((event) => {
    scrollOffsetRef.current = Number(event?.nativeEvent?.contentOffset?.y || 0);
  }, []);

  const reveal = useCallback(async ({ node } = {}) => {
    const scrollView = scrollRef.current;
    if (!node || !scrollView || typeof node.measureInWindow !== 'function') {
      return;
    }

    const measurement = await new Promise((resolve) => {
      requestAnimationFrame(() => {
        node.measureInWindow((x, y, width, height) => {
          resolve({ x, y, width, height });
        });
      });
    });

    if (
      !Number.isFinite(measurement?.y) ||
      !Number.isFinite(measurement?.height)
    ) {
      return;
    }

    const windowHeight = Dimensions.get('window').height;
    const targetBottom = measurement.y + measurement.height;
    const visibleBottom = windowHeight - bottomClearance;
    const alreadyClear =
      measurement.y >= topClearance && targetBottom <= visibleBottom;

    if (alreadyClear) {
      return;
    }

    const desiredY = Math.max(
      0,
      scrollOffsetRef.current + measurement.y - topClearance
    );

    scrollView.scrollTo?.({
      animated,
      y: desiredY,
    });

    scrollOffsetRef.current = desiredY;
    await wait(animated ? 360 : 40);
  }, [animated, bottomClearance, topClearance]);

  return useMemo(() => ({
    onScroll,
    reveal,
    scrollRef,
  }), [onScroll, reveal]);
};

export const TourScrollProvider = ({ children, controller }) => (
  <TourScrollContext.Provider value={controller || null}>
    {children}
  </TourScrollContext.Provider>
);

export const useTourScrollReveal = () => useContext(TourScrollContext)?.reveal;

export default TourScrollContext;
