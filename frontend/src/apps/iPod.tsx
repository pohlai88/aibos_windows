import React, { useState, useEffect, useCallback } from 'react';
import { audioPlayer, TrackMetadata, Playlist } from '../utils/audio.ts';
import { useUIState } from '../store/uiState.ts';
import { getColor, getGradient } from '../utils/themeHelpers.ts';
import { audioManager } from '../utils/audio.ts';

interface iPodProps {
  onClose?: () => void;
}

export default function iPod({ onClose }: iPodProps) {
  const { colorMode } = useUIState();
  const [currentTrack, setCurrentTrack] = useState<TrackMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample playlist for demo
  const samplePlaylist: Playlist = {
    id: 'demo-playlist',
    name: 'AI-BOS Demo Mix',
    tracks: [
      {
        id: '1',
        title: 'Digital Dreams',
        artist: 'AI Composer',
        album: 'Synthetic Symphony',
        file: '/sounds/demo-track-1.mp3',
        coverUrl: '/images/album-cover-1.jpg'
      },
      {
        id: '2',
        title: 'Neural Network',
        artist: 'Quantum Beats',
        album: 'Algorithmic Harmony',
        file: '/sounds/demo-track-2.mp3',
        coverUrl: '/images/album-cover-2.jpg'
      },
      {
        id: '3',
        title: 'Binary Sunset',
        artist: 'Cyber Orchestra',
        album: 'Digital Dawn',
        file: '/sounds/demo-track-3.mp3',
        coverUrl: '/images/album-cover-3.jpg'
      }
    ],
    shuffle: false,
    repeat: 'none'
  };

  useEffect(() => {
    // Set up event listeners
    audioPlayer.setOnTrackChange((track) => {
      setCurrentTrack(track);
      setError(null);
    });

    audioPlayer.setOnPlayStateChange((playing) => {
      setIsPlaying(playing);
      setIsLoading(false);
    });

    audioPlayer.setOnPlaylistChange((_playlist) => {
      // setPlaylist(playlist); // This line is removed as per the edit hint
    });

    // Load sample playlist
    try {
      audioPlayer.loadPlaylist(samplePlaylist);
      // setPlaylist(samplePlaylist); // This line is removed as per the edit hint
    } catch (err) {
      setError('Failed to load playlist');
      console.error('Playlist load error:', err);
    }

    // Performance: Use requestAnimationFrame instead of setInterval
    let animationId: number;
    const updateTime = () => {
      try {
        setCurrentTime(audioPlayer.getCurrentTime());
        setDuration(audioPlayer.getDuration());
      } catch (err) {
        console.error('Time update error:', err);
      }
      animationId = requestAnimationFrame(updateTime);
    };
    animationId = requestAnimationFrame(updateTime);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const handlePlayPause = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Play UI sound effect
      await audioManager.playButtonClick();
      
      if (isPlaying) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
    } catch (err) {
      setError('Playback failed');
      setIsLoading(false);
      console.error('Playback error:', err);
    }
  }, [isPlaying]);

  const handleNext = useCallback(async () => {
    try {
      setError(null);
      await audioManager.playButtonClick();
      audioPlayer.next();
    } catch (err) {
      setError('Failed to skip track');
      console.error('Next track error:', err);
    }
  }, []);

  const handlePrev = useCallback(async () => {
    try {
      setError(null);
      await audioManager.playButtonClick();
      audioPlayer.prev();
    } catch (err) {
      setError('Failed to go back');
      console.error('Previous track error:', err);
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      audioPlayer.setVolume(newVolume);
    } catch (err) {
      console.error('Volume change error:', err);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newTime = parseFloat(e.target.value);
      audioPlayer.seek(newTime);
    } catch (err) {
      console.error('Seek error:', err);
    }
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Design token styles
  const containerStyle = {
    background: getGradient('professional.slate', colorMode),
    color: getColor('white', colorMode),
  };

  const buttonStyle = {
    backgroundColor: getColor('glass.dark.40', colorMode),
    border: `1px solid ${getColor('glass.dark.50', colorMode)}`,
  };

  const playButtonStyle = {
    backgroundColor: getColor('white', colorMode),
    color: getColor('black', colorMode),
  };

  const sliderStyle = {
    backgroundColor: getColor('gray.700', colorMode),
  };

  return (
    <div 
      className="w-80 h-96 rounded-3xl p-6 shadow-2xl"
      style={containerStyle}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">iPod</h2>
        <button 
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Close iPod"
        >
          ✕
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Album Art */}
      <div className="w-48 h-48 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        {currentTrack?.coverUrl ? (
          <img 
            src={currentTrack.coverUrl} 
            alt={`Album cover for ${currentTrack.title}`}
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <div className="text-4xl" role="img" aria-label="Music note">🎵</div>
        )}
      </div>

      {/* Track Info */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold truncate" aria-label="Track title">
          {currentTrack?.title || 'No Track Playing'}
        </h3>
        <p className="text-gray-400 truncate" aria-label="Artist name">
          {currentTrack?.artist || 'Unknown Artist'}
        </p>
        <p className="text-sm text-gray-500 truncate" aria-label="Album name">
          {currentTrack?.album || 'Unknown Album'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
          style={sliderStyle}
          aria-label="Track progress"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span aria-label="Current time">{formatTime(currentTime)}</span>
          <span aria-label="Total duration">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400" role="img" aria-label="Volume">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer slider"
            style={sliderStyle}
            aria-label="Volume control"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={volume}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-4">
        <button
          type="button"
          onClick={handlePrev}
          className="w-12 h-12 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
          style={buttonStyle}
          aria-label="Previous track"
          disabled={isLoading}
        >
          ⏮
        </button>
        
        <button
          type="button"
          onClick={handlePlayPause}
          className="w-16 h-16 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
          style={playButtonStyle}
          aria-label={isPlaying ? "Pause track" : "Play track"}
          disabled={isLoading}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </button>
        
        <button
          type="button"
          onClick={handleNext}
          className="w-12 h-12 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
          style={buttonStyle}
          aria-label="Next track"
          disabled={isLoading}
        >
          ⏭
        </button>
      </div>

      {/* Playlist Info */}
      <div className="mt-4 text-center text-xs text-gray-400">
        Track {audioPlayer.getCurrentTrackIndex() + 1} of {audioPlayer.getTrackCount()}
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
} 