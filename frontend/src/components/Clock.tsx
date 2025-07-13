import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getColor } from '../utils/themeHelpers.ts';
import type { ThemeMode } from '../utils/themeHelpers.ts';
import { blur, elevation, animation } from '../utils/designTokens.ts';
import { useUIState } from '../store/uiState.ts';

// Types
interface Timezone {
  name: string;
  offset: number;
  label: string;
}

interface Weather {
  temperature: number;
  condition: string;
  icon: string;
}

interface StopwatchState {
  time: number;
  running: boolean;
  laps: number[];
}

interface TimerState {
  time: number;
  running: boolean;
  duration: number;
}

type ClockMode = 'clock' | 'stopwatch' | 'timer';

// Constants
const TIMEZONES: Timezone[] = [
  { name: 'local', offset: 0, label: 'Local' },
  { name: 'UTC', offset: 0, label: 'UTC' },
  { name: 'EST', offset: -5, label: 'Eastern' },
  { name: 'CST', offset: -6, label: 'Central' },
  { name: 'MST', offset: -7, label: 'Mountain' },
  { name: 'PST', offset: -8, label: 'Pacific' },
  { name: 'GMT', offset: 0, label: 'London' },
  { name: 'CET', offset: 1, label: 'Paris' },
  { name: 'JST', offset: 9, label: 'Tokyo' },
];

const TIMER_PRESETS = [
  { value: 60, label: '1 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1800, label: '30 min' },
  { value: 3600, label: '1 hour' },
];

const WEATHER_CONDITIONS = [
  { condition: 'Sunny', icon: '☀️' },
  { condition: 'Cloudy', icon: '☁️' },
  { condition: 'Rainy', icon: '🌧️' },
  { condition: 'Snowy', icon: '❄️' },
];

// Utility functions
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const formatTimer = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getTimezoneTime = (date: Date, timezone: Timezone): Date => {
  if (timezone.name === 'local') {
    return date;
  }
  
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const targetTime = utc + (timezone.offset * 3600000);
  return new Date(targetTime);
};

// Custom hooks
const useClock = (timezone: Timezone) => {
  const [now, setNow] = useState(new Date());
  const requestRef = useRef<number>();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  useEffect(() => {
    // Skip animation frame updates if user prefers reduced motion
    if (prefersReducedMotion) {
      const interval = setInterval(() => {
        setNow(new Date());
      }, 1000); // Update every second instead of every frame
      
      return () => clearInterval(interval);
    }

    const animate = () => {
      const now = new Date();
      setNow(now);
      requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [prefersReducedMotion]);

  const timezoneTime = useMemo(() => getTimezoneTime(now, timezone), [now, timezone]);
  
  return timezoneTime;
};

const useStopwatch = () => {
  const [state, setState] = useState<StopwatchState>({
    time: 0,
    running: false,
    laps: [],
  });

  useEffect(() => {
    if (!state.running) return;

    const interval = setInterval(() => {
      setState(prev => ({ ...prev, time: prev.time + 10 }));
    }, 10);

    return () => clearInterval(interval);
  }, [state.running]);

  const start = useCallback(() => setState(prev => ({ ...prev, running: true })), []);
  const pause = useCallback(() => setState(prev => ({ ...prev, running: false })), []);
  const reset = useCallback(() => setState({ time: 0, running: false, laps: [] }), []);
  const lap = useCallback(() => setState(prev => ({ ...prev, laps: [...prev.laps, prev.time] })), []);

  return { ...state, start, pause, reset, lap };
};

const useTimer = () => {
  const [state, setState] = useState<TimerState>({
    time: 300000, // 5 minutes default
    running: false,
    duration: 300,
  });

  useEffect(() => {
    if (!state.running || state.time <= 0) return;

    const interval = setInterval(() => {
      setState(prev => {
        if (prev.time <= 1000) {
          // Timer finished
          return { ...prev, time: 0, running: false };
        }
        return { ...prev, time: prev.time - 1000 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.running, state.time]);

  const start = useCallback(() => setState(prev => ({ ...prev, running: true })), []);
  const pause = useCallback(() => setState(prev => ({ ...prev, running: false })), []);
  const reset = useCallback(() => setState(prev => ({ ...prev, time: prev.duration * 1000, running: false })), []);
  const setDuration = useCallback((duration: number) => setState(prev => ({ ...prev, duration, time: duration * 1000 })), []);

  return { ...state, start, pause, reset, setDuration };
};

const useWeather = (timezone: Timezone) => {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    const fetchWeather = () => {
      try {
        // TODO: Replace with actual weather API
        const randomCondition = WEATHER_CONDITIONS[Math.floor(Math.random() * WEATHER_CONDITIONS.length)];
        if (!randomCondition) {
          console.warn('No weather condition found');
          return;
        }
        const mockWeather: Weather = {
          temperature: Math.floor(Math.random() * 30) + 10,
          condition: randomCondition.condition,
          icon: randomCondition.icon,
        };
        setWeather(mockWeather);
      } catch (error) {
        console.warn('Weather fetch failed:', error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [timezone.name]); // Only re-fetch when timezone changes

  return weather;
};

// Sub-components
const ModeSelector: React.FC<{
  mode: ClockMode;
  onModeChange: (mode: ClockMode) => void;
  colorMode: ThemeMode;
}> = ({ mode, onModeChange, colorMode }) => {
  // Performance: Memoized theme-aware styles
  const buttonStyles = useMemo(() => ({
    active: {
      backgroundColor: getColor('glass.light.20', colorMode),
      color: getColor('white', colorMode),
    },
    inactive: {
      color: getColor('gray.300', colorMode),
    },
  }), [colorMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentMode: ClockMode) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const modes: ClockMode[] = ['clock', 'stopwatch', 'timer'];
      const currentIndex = modes.indexOf(currentMode);
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      const newIndex = (currentIndex + direction + modes.length) % modes.length;
      const newMode = modes[newIndex];
      if (newMode) {
        onModeChange(newMode);
      }
    }
  }, [onModeChange]);

  return (
    <div className="flex space-x-1 mb-3" role="tablist" aria-label="Clock modes">
      {(['clock', 'stopwatch', 'timer'] as const).map((m) => (
        <button
          type="button"
          key={m}
          role="tab"
          aria-selected={mode === m}
          onClick={() => onModeChange(m)}
          onKeyDown={(e) => handleKeyDown(e, m)}
          style={mode === m ? buttonStyles.active : buttonStyles.inactive}
          className="px-2 py-1 text-xs rounded transition-colors hover:bg-opacity-80"
        >
          {m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  );
};

const TimezoneSelector: React.FC<{
  timezone: Timezone;
  onTimezoneChange: (timezone: Timezone) => void;
  colorMode: ThemeMode;
}> = ({ timezone, onTimezoneChange, colorMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Performance: Memoized theme-aware styles
  const dropdownStyles = useMemo(() => ({
    backgroundColor: getColor('glass.dark.90', colorMode),
    backdropFilter: `blur(${blur.md})`,
    border: `1px solid ${getColor('glass.light.30', colorMode)}`,
    boxShadow: elevation.lg,
  }), [colorMode]);

  const optionStyles = useMemo(() => ({
    active: {
      backgroundColor: getColor('glass.light.20', colorMode),
      color: getColor('white', colorMode),
    },
    inactive: {
      color: getColor('gray.300', colorMode),
    },
  }), [colorMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative mb-2">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-white text-opacity-80 hover:text-opacity-100 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select timezone (current: ${timezone.label})`}
      >
        {timezone.label} ▼
      </button>
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 rounded-lg p-2 z-10 min-w-32"
          style={dropdownStyles}
          role="listbox"
          aria-label="Timezone options"
        >
          {TIMEZONES.map((tz) => (
            <button
              type="button"
              key={tz.name}
              role="option"
              aria-selected={timezone.name === tz.name}
              onClick={() => {
                onTimezoneChange(tz);
                setIsOpen(false);
              }}
              style={timezone.name === tz.name ? optionStyles.active : optionStyles.inactive}
              className="block w-full text-left px-2 py-1 text-xs rounded hover:bg-opacity-80"
            >
              {tz.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AnalogClock: React.FC<{
  time: Date;
  timezone: Timezone;
  colorMode: ThemeMode;
}> = ({ time, timezone, colorMode }) => {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const ms = time.getMilliseconds();

  const hourDeg = ((hours % 12) + minutes / 60) * 30;
  const minDeg = (minutes + seconds / 60) * 6;
  const secDeg = (seconds + ms / 1000) * 6;

  // Performance: Memoized theme-aware styles
  const clockStyles = useMemo(() => ({
    hourHand: {
      backgroundColor: getColor('white', colorMode),
      boxShadow: `0 0 1.5px ${getColor('white', colorMode)}80`,
    },
    minuteHand: {
      backgroundColor: getColor('primary.400', colorMode),
      boxShadow: `0 0 1.5px ${getColor('white', colorMode)}80`,
    },
    secondHand: {
      backgroundColor: getColor('info.500', colorMode),
      boxShadow: `0 0 4px ${getColor('info.500', colorMode)}99`,
    },
    centerCap: {
      backgroundColor: getColor('white', colorMode),
      border: `1.5px solid ${getColor('primary.500', colorMode)}`,
      boxShadow: `0 0 4px ${getColor('white', colorMode)}80`,
    },
    tick: {
      backgroundColor: getColor('white', colorMode),
    },
  }), [colorMode]);

  return (
    <div 
      className="relative flex items-center justify-center mx-auto mb-2" 
      style={{ width: 68, height: 68 }}
      role="img"
      aria-label={`Analog clock showing ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} in ${timezone.label}`}
    >
      {/* Ticks */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded"
          style={{
            ...clockStyles.tick,
            width: 1.2,
            height: 6,
            left: '50%',
            top: 4,
            transform: `rotate(${i * 30}deg) translate(-50%, 0)`,
            transformOrigin: '50% 32px',
            opacity: 0.2,
          }}
        />
      ))}
      {/* Hour hand */}
      <div
        className="absolute rounded"
        style={{
          ...clockStyles.hourHand,
          width: 4,
          height: 20,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -100%) rotate(${hourDeg}deg)`,
          transformOrigin: '50% 100%',
          zIndex: 3,
        }}
      />
      {/* Minute hand */}
      <div
        className="absolute rounded"
        style={{
          ...clockStyles.minuteHand,
          width: 2.5,
          height: 28,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -100%) rotate(${minDeg}deg)`,
          transformOrigin: '50% 100%',
          zIndex: 2,
        }}
      />
      {/* Second hand */}
      <div
        className="absolute rounded"
        style={{
          ...clockStyles.secondHand,
          width: 1.5,
          height: 33,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -100%) rotate(${secDeg}deg)`,
          transformOrigin: '50% 100%',
          zIndex: 1,
        }}
      />
      {/* Center cap */}
      <div
        className="absolute rounded-full border"
        style={{
          ...clockStyles.centerCap,
          width: 7,
          height: 7,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
        }}
      />
      {/* City label */}
      <div
        className="absolute text-white text-[0.55rem] font-semibold opacity-80"
        style={{
          left: '50%',
          top: '62%',
          transform: 'translate(-50%, 0)',
          letterSpacing: '0.08em',
          textShadow: '0 1px 4px #0008',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {timezone.name}
      </div>
    </div>
  );
};

const ClockMode: React.FC<{
  time: Date;
  weather: Weather | null;
  colorMode: ThemeMode;
}> = ({ time, weather, colorMode }) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const dateStr = time.toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });

  // Performance: Memoized theme-aware styles
  const textStyles = useMemo(() => ({
    date: {
      color: getColor('info.300', colorMode),
    },
    weather: {
      color: getColor('gray.300', colorMode),
    },
  }), [colorMode]);

  return (
    <>
      {/* Digital Time */}
      <div 
        className="text-center font-mono font-semibold tracking-wider mb-1" 
        style={{ fontSize: '0.85rem' }}
        role="status"
        aria-live="polite"
        aria-label={`Digital time: ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      >
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </div>
      {/* Date */}
      <div 
        className="text-center font-normal mb-1" 
        style={{ 
          fontSize: '0.65rem', 
          marginBottom: '0.2rem',
          ...textStyles.date,
        }}
      >
        {dateStr}
      </div>
      {/* Weather */}
      {weather && (
        <div 
          className="text-center text-xs"
          style={textStyles.weather}
          aria-label={`Weather: ${weather.temperature}°C, ${weather.condition}`}
        >
          <span aria-hidden="true">{weather.icon}</span> {weather.temperature}°C {weather.condition}
        </div>
      )}
    </>
  );
};

const StopwatchMode: React.FC<{
  stopwatch: ReturnType<typeof useStopwatch>;
  colorMode: ThemeMode;
}> = ({ stopwatch, colorMode }) => {
  // Performance: Memoized theme-aware styles
  const buttonStyles = useMemo(() => ({
    backgroundColor: getColor('glass.light.20', colorMode),
    color: getColor('white', colorMode),
    transition: `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode]);

  return (
    <>
      {/* Stopwatch Display */}
      <div 
        className="text-center font-mono font-semibold tracking-wider mb-2" 
        style={{ fontSize: '1.1rem' }}
        role="status"
        aria-live="polite"
        aria-label={`Stopwatch: ${formatTime(stopwatch.time)}`}
      >
        {formatTime(stopwatch.time)}
      </div>
      {/* Stopwatch Controls */}
      <div className="flex space-x-2 mb-2">
        <button
          type="button"
          onClick={stopwatch.running ? stopwatch.pause : stopwatch.start}
          style={buttonStyles}
          className="px-3 py-1 text-xs rounded hover:bg-opacity-30"
          aria-label={stopwatch.running ? 'Pause stopwatch' : 'Start stopwatch'}
        >
          {stopwatch.running ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          onClick={stopwatch.reset}
          style={buttonStyles}
          className="px-3 py-1 text-xs rounded hover:bg-opacity-30"
          aria-label="Reset stopwatch"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={stopwatch.lap}
          style={buttonStyles}
          className="px-3 py-1 text-xs rounded hover:bg-opacity-30"
          aria-label="Record lap time"
        >
          Lap
        </button>
      </div>
      {/* Lap Times */}
      {stopwatch.laps.length > 0 && (
        <div 
          className="max-h-16 overflow-y-auto text-xs text-white text-opacity-70"
          role="log"
          aria-label="Lap times"
        >
          {stopwatch.laps.map((lap, index) => (
            <div key={index} className="text-center">
              Lap {index + 1}: {formatTime(lap)}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const TimerMode: React.FC<{
  timer: ReturnType<typeof useTimer>;
  colorMode: ThemeMode;
}> = ({ timer, colorMode }) => {
  // Performance: Memoized theme-aware styles
  const buttonStyles = useMemo(() => ({
    active: {
      backgroundColor: getColor('glass.light.20', colorMode),
      color: getColor('white', colorMode),
    },
    disabled: {
      backgroundColor: getColor('gray.500', colorMode),
      color: getColor('gray.300', colorMode),
    },
  }), [colorMode]);

  const selectStyles = useMemo(() => ({
    backgroundColor: 'transparent',
    color: getColor('gray.300', colorMode),
    border: `1px solid ${getColor('glass.light.30', colorMode)}`,
  }), [colorMode]);

  return (
    <>
      {/* Timer Display */}
      <div 
        className="text-center font-mono font-semibold tracking-wider mb-2" 
        style={{ fontSize: '1.1rem' }}
        role="status"
        aria-live="polite"
        aria-label={`Timer: ${formatTimer(timer.time)}`}
      >
        {formatTimer(timer.time)}
      </div>
      {/* Timer Controls */}
      <div className="flex space-x-2 mb-2">
        <button
          type="button"
          onClick={timer.running ? timer.pause : timer.start}
          disabled={timer.time === 0}
          style={timer.time === 0 ? buttonStyles.disabled : buttonStyles.active}
          className={`px-3 py-1 text-xs rounded ${
            timer.time === 0 ? 'cursor-not-allowed' : 'hover:bg-opacity-30'
          }`}
          aria-label={timer.running ? 'Pause timer' : 'Start timer'}
        >
          {timer.running ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          onClick={timer.reset}
          style={buttonStyles.active}
          className="px-3 py-1 text-xs rounded hover:bg-opacity-30"
          aria-label="Reset timer"
        >
          Reset
        </button>
      </div>
      {/* Timer Duration Selector */}
      <div className="text-center text-xs text-white text-opacity-70">
        <select
          value={timer.duration / 60}
          onChange={(e) => timer.setDuration(Number(e.target.value) * 60)}
          style={selectStyles}
          className="rounded px-1"
          aria-label="Select timer duration"
        >
          {TIMER_PRESETS.map(preset => (
            <option key={preset.value} value={preset.value / 60}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

// Main component
export const Clock: React.FC = () => {
  const { colorMode } = useUIState();
  const [mode, setMode] = useState<ClockMode>('clock');
  const [selectedTimezone, setSelectedTimezone] = useState<Timezone>(TIMEZONES[0] || { name: 'local', offset: 0, label: 'Local' });

  const time = useClock(selectedTimezone);
  const stopwatch = useStopwatch();
  const timer = useTimer();
  const weather = useWeather(selectedTimezone);

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const containerStyles = useMemo(() => ({
    backgroundColor: getColor('glass.dark.20', colorMode),
    border: `1.5px solid ${getColor('glass.light.30', colorMode)}`,
    backdropFilter: `blur(${blur.lg})`,
    boxShadow: elevation['2xl'],
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode, prefersReducedMotion]);

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl shadow-lg"
      style={{
        ...containerStyles,
        padding: '1.2rem 1rem 1rem 1rem',
        minWidth: 210, 
        maxWidth: 230,
      }}
      role="application"
      aria-label="Clock application with time, stopwatch, and timer"
    >
      <ModeSelector mode={mode} onModeChange={setMode} colorMode={colorMode} />
      <TimezoneSelector timezone={selectedTimezone} onTimezoneChange={setSelectedTimezone} colorMode={colorMode} />
      <AnalogClock time={time} timezone={selectedTimezone} colorMode={colorMode} />

      {mode === 'clock' && <ClockMode time={time} weather={weather} colorMode={colorMode} />}
      {mode === 'stopwatch' && <StopwatchMode stopwatch={stopwatch} colorMode={colorMode} />}
      {mode === 'timer' && <TimerMode timer={timer} colorMode={colorMode} />}
    </div>
  );
};