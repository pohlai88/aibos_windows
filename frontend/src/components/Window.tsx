/** @jsxImportSource react */
import {
  ElementType,
  FC,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Rnd } from "react-rnd";
import type { Props as RndProps } from "react-rnd";
import type {
  DraggableEvent,
  DraggableData,
} from "https://esm.sh/react-draggable@4.4.5";
import { motion, AnimatePresence } from "framer-motion";
import { useUIState } from "../store/uiState.ts";
import { Tooltip } from "./Tooltip.tsx";
import { getColor, getGradient } from "../utils/themeHelpers.ts";
import { animation } from "../utils/designTokens.ts";
import { windowSnappingManager } from "../utils/windowSnapping.ts";
import { audioManager } from "../utils/audio.ts";
import { hapticManager } from "../utils/haptics.ts";
import {
  useDeviceInfo,
  getResponsiveWindowConfig,
} from "../utils/responsive.ts";
import { monitorManager } from "../services/monitorManager.ts";

type ResizeDirection =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "topRight"
  | "bottomRight"
  | "bottomLeft"
  | "topLeft";

interface WindowProps {
  id: string;
  component: ElementType;
  props?: Record<string, unknown>;
  zIndex?: number;
  onClose?: (id: string) => void;
  title?: string;
  initialSize?: { width: number; height: number };
  initialPosition?: { x: number; y: number };
  _resizable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  closable?: boolean;
  icon?: string;
}

// Safe workaround for JSX typing issue:
const SafeRnd = Rnd as unknown as FC<Partial<RndProps>>;

export const Window: FC<WindowProps> = ({
  id,
  component: Component,
  props,
  zIndex,
  onClose,
  title = "App",
  initialSize = { width: 600, height: 400 },
  initialPosition = { x: 100, y: 100 },
  _resizable = true,
  minimizable = true,
  maximizable = true,
  closable = true,
  icon = "📱",
}) => {
  const [monitor, setMonitor] = useState(() =>
    monitorManager.getMonitorForWindow(id, true)!
  );

  useEffect(() => {
    const m = monitorManager.getMonitorForWindow(id);
    if (m) {
      setMonitor(m);
    }
  }, [id]);

  const { colorMode, bringToFront } = useUIState();
  const deviceInfo = useDeviceInfo();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const [windowSize, setWindowSize] = useState(initialSize);
  const [windowPosition, setWindowPosition] = useState(initialPosition);

  const rndRef = useRef<Rnd | null>(null);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const windowConfig = useMemo(
    () => getResponsiveWindowConfig(deviceInfo),
    [deviceInfo]
  );

  const windowStyles = useMemo(
    () => ({
      container: (focused: boolean) => ({
        backgroundColor: focused
          ? getColor("glass.dark.30", colorMode)
          : getColor("glass.dark.20", colorMode),
        backdropFilter: `blur(16px)`,
        border: `1px solid ${
          focused
            ? getColor("primary.400", colorMode)
            : getColor("glass.dark.40", colorMode)
        }`,
        boxShadow: focused
          ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          : "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
        transition: prefersReducedMotion
          ? "none"
          : `all ${animation.duration.normal} ${animation.easing.smooth}`,
      }),
      titleBar: (focused: boolean) => ({
        background: focused
          ? getGradient("professional.slate", colorMode)
          : getColor("glass.dark.10", colorMode),
        backdropFilter: `blur(8px)`,
        borderBottom: `1px solid ${getColor("glass.dark.20", colorMode)}`,
      }),
      content: {
        backgroundColor: getColor("glass.dark.10", colorMode),
        backdropFilter: `blur(4px)`,
      },
      minimized: {
        backgroundColor: getColor("glass.dark.20", colorMode),
        backdropFilter: `blur(12px)`,
        border: `1px solid ${getColor("glass.dark.30", colorMode)}`,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
      },
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 300, damping: 30 },
    }),
    [colorMode, prefersReducedMotion]
  );

  const handleWindowClick = useCallback(() => {
    if (!isFocused) {
      setIsFocused(true);
      bringToFront(id);
      audioManager.playButtonClick();
      hapticManager.playButtonPress();
    }
  }, [isFocused, bringToFront, id]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
  }, [isMinimized]);

  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      setIsMaximized(false);
      if (rndRef.current) {
        rndRef.current.updateSize(windowSize);
        rndRef.current.updatePosition(windowPosition);
      }
    } else {
      setIsMaximized(true);
      if (rndRef.current) {
        const maxWidth = monitor.bounds.width - 40;
        const maxHeight = monitor.bounds.height - 120;
        const maxX = monitor.bounds.x + 20;
        const maxY = monitor.bounds.y + 60;
        rndRef.current.updateSize({ width: maxWidth, height: maxHeight });
        rndRef.current.updatePosition({ x: maxX, y: maxY });
      }
    }
  }, [isMaximized, monitor, windowSize, windowPosition]);

  const handleClose = useCallback(() => {
    onClose?.(id);
  }, [onClose, id]);

  const handleDragStop = useCallback(
    (_e: DraggableEvent, d: DraggableData) => {
      setWindowPosition({ x: d.x, y: d.y });

      const snapResult = windowSnappingManager.calculateSnap(
        {
          x: d.x,
          y: d.y,
          width: windowSize.width,
          height: windowSize.height,
        },
        false
      );

      if (snapResult.snapped && rndRef.current) {
        rndRef.current.updatePosition(snapResult.position);
        if (
          snapResult.size.width !== windowSize.width ||
          snapResult.size.height !== windowSize.height
        ) {
          rndRef.current.updateSize(snapResult.size);
          setWindowSize(snapResult.size);
        }
      }
    },
    [windowSize]
  );

  const handleDrag = useCallback(
    (_e: DraggableEvent, _d: DraggableData) => {
      // Optional live snapping preview logic
    },
    []
  );

  const handleResize = useCallback(
    (
      _e: MouseEvent | TouchEvent,
      _direction: ResizeDirection,
      _ref: HTMLElement,
      delta: { width: number; height: number },
      position: { x: number; y: number }
    ) => {
      setWindowSize({
        width: windowSize.width + delta.width,
        height: windowSize.height + delta.height,
      });
      setWindowPosition(position);
    },
    [windowSize]
  );

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={windowStyles.transition}
        className="fixed bottom-4 left-4 z-50"
      >
        <Tooltip content={`Restore ${title}`} position="top">
          <button
            type="button"
            onClick={handleMinimize}
            style={windowStyles.minimized}
            className="rounded-lg px-3 py-2 text-gray-200"
          >
            {icon} {title}
          </button>
        </Tooltip>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <SafeRnd
        ref={rndRef}
        size={windowSize}
        position={windowPosition}
        bounds="parent"
        style={{
          zIndex: isFocused ? (zIndex || 1) + 1000 : zIndex || 1,
        }}
        minWidth={windowConfig.minWidth}
        minHeight={windowConfig.minHeight}
        maxWidth={windowConfig.maxWidth}
        maxHeight={windowConfig.maxHeight}
        disableDragging={isMaximized || !windowConfig.draggable}
        enableResizing={windowConfig.resizable && !isMaximized}
        onDragStop={handleDragStop}
        onDrag={handleDrag}
        onResize={handleResize}
        onMouseDown={handleWindowClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={windowStyles.transition}
          style={windowStyles.container(isFocused)}
          className={`h-full flex flex-col rounded-xl`}
        >
          {/* Title Bar */}
          <div
            style={windowStyles.titleBar(isFocused)}
            className="window-title-bar flex justify-between px-4 py-3 cursor-move"
          >
            <span className="flex items-center space-x-2">
              <span>{icon}</span>
              <span className="text-gray-200">{title}</span>
            </span>
            <span className="flex space-x-2">
              {minimizable && (
                <button type="button" onClick={handleMinimize}>
                  _
                </button>
              )}
              {maximizable && (
                <button type="button" onClick={handleMaximize}>
                  {isMaximized ? "↺" : "□"}
                </button>
              )}
              {closable && (
                <button type="button" onClick={handleClose}>
                  ×
                </button>
              )}
            </span>
          </div>

          {/* Content */}
          <div
            style={windowStyles.content}
            className="flex-1 overflow-auto p-4 text-gray-200"
          >
            <Component {...props} />
          </div>
        </motion.div>
      </SafeRnd>
    </AnimatePresence>
  );
};
