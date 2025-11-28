import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Monitor, Film, Video, Radio, Loader2, AlertCircle, RotateCw, List, Gauge, Subtitles, Timer, Zap, ChevronRight, Languages, Crown, ShoppingBag } from "lucide-react";
// @ts-ignore - Shaka Player types
import shaka from "shaka-player";
// @ts-ignore - HLS.js types
import Hls from "hls.js";
import { Capacitor } from '@capacitor/core';
import { NativeScreenProtection } from "@/utils/nativeScreenProtection";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { VideoSource, Episode } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface VideoPlayerProps {
  videoSources: VideoSource[];
  onEpisodeSelect?: (episodeId: string) => void;
  episodes?: any[];
  currentEpisodeId?: string;
  contentBackdrop?: string;
  contentId?: string;
}

// Server preference storage
const SERVER_PREFERENCES_KEY = "video_player_preferences";

interface ServerPreferences {
  [serverId: string]: {
    quality?: string;
    volume?: number;
    lastPlaybackTime?: number;
  };
}

export const VideoPlayer = ({ videoSources, onEpisodeSelect, episodes = [], currentEpisodeId, contentBackdrop, contentId }: VideoPlayerProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  
  // Enhanced video download protection + Native screen recording protection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Enable native screen protection for mobile apps
    if (Capacitor.isNativePlatform()) {
      NativeScreenProtection.enable();
      
      // Listen for screen recording events
      const handleScreenRecording = () => {
        if (video) {
          video.pause();
          setIsPlaying(false);
          toast({
            title: "Screen Recording Detected",
            description: "Video playback paused for security. Please stop recording to continue.",
            variant: "destructive",
          });
        }
      };
      
      const handleScreenRecordingStopped = () => {
        toast({
          title: "Recording Stopped",
          description: "You can resume playback now.",
        });
      };
      
      const handleScreenshot = () => {
        console.warn('Screenshot attempt detected');
      };
      
      window.addEventListener('screen-recording-detected', handleScreenRecording);
      window.addEventListener('screen-recording-stopped', handleScreenRecordingStopped);
      window.addEventListener('screenshot-detected', handleScreenshot);
    }

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const preventDownload = () => {
      // Remove download attribute
      video.removeAttribute('download');
      
      // Disable download controls (but allow fullscreen)
      video.setAttribute('controlslist', 'nodownload noremoteplayback');
      video.setAttribute('disablepictureinpicture', 'true');
      video.setAttribute('disableremoteplayback', 'true');
      
      // Prevent source URL inspection
      try {
        Object.defineProperty(video, 'currentSrc', {
          get: () => 'blob:protected',
          configurable: false
        });
      } catch (e) {
        // Ignore if property is already defined
      }
    };

    // Prevent drag and drop
    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Continuous protection check
    const protectionInterval = setInterval(() => {
      if (video) {
        preventDownload();
      }
    }, 1000);

    video.addEventListener('contextmenu', preventContextMenu);
    video.addEventListener('dragstart', preventDrag);
    preventDownload();

    // Disable inspect element on video
    const preventInspect = (e: KeyboardEvent) => {
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'J') ||
          (e.ctrlKey && e.key === 'U') ||
          (e.ctrlKey && e.key === 's')) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('keydown', preventInspect);

    return () => {
      clearInterval(protectionInterval);
      video.removeEventListener('contextmenu', preventContextMenu);
      video.removeEventListener('dragstart', preventDrag);
      document.removeEventListener('keydown', preventInspect);
      
      // Cleanup native protection
      if (Capacitor.isNativePlatform()) {
        NativeScreenProtection.disable();
        window.removeEventListener('screen-recording-detected', () => {});
        window.removeEventListener('screen-recording-stopped', () => {});
        window.removeEventListener('screenshot-detected', () => {});
      }
    };
  }, [toast]);
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFullscreen = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentQuality, setCurrentQuality] = useState("480p");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentServer, setCurrentServer] = useState<VideoSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shakaPlayerRef = useRef<shaka.Player | null>(null);
  const hlsPlayerRef = useRef<Hls | null>(null);
  
  // Advanced player settings
  const [stableVolume, setStableVolume] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>("off");
  const [availableSubtitles, setAvailableSubtitles] = useState<Array<{id: string, language: string, label: string}>>([]);
  const [selectedAudio, setSelectedAudio] = useState<string>("0");
  const [availableAudioTracks, setAvailableAudioTracks] = useState<Array<{id: string, language: string, label: string, roles?: string[]}>>([]);
  const [sleepTimer, setSleepTimer] = useState<number>(0); // in minutes, 0 = off
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSleepTimerMenu, setShowSleepTimerMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Mobile controls auto-hide
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Watch progress tracking
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);
  
  // Orientation change state preservation
  const orientationStateRef = useRef<{
    currentTime: number;
    isPlaying: boolean;
    volume: number;
  } | null>(null);

  // Derived list of sources for current episode (deduplicated)
  const displayedSources = useMemo(() => {
    const base = currentEpisodeId ? videoSources.filter(s => s.episode_id === currentEpisodeId) : videoSources;
    const seen = new Set<string>();
    const result: VideoSource[] = [];
    for (const s of base) {
      let key = (s.server_name || s.name || '').trim().toLowerCase();
      if (!key) {
        try {
          const u = new URL(s.url);
          key = `${u.hostname}${s.source_type || ''}`;
        } catch {
          key = `${s.url}-${s.source_type || ''}`;
        }
      }
      if (!seen.has(key)) {
        seen.add(key);
        result.push(s);
      }
    }
    return result;
  }, [videoSources, currentEpisodeId]);
  const [defaultServerId, setDefaultServerId] = useState<string | null>(null);

  // Load/Save preferences
  const loadPreferences = (): ServerPreferences => {
    try {
      const saved = localStorage.getItem(SERVER_PREFERENCES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const savePreference = (serverId: string, key: string, value: any) => {
    try {
      const prefs = loadPreferences();
      prefs[serverId] = { ...prefs[serverId], [key]: value };
      localStorage.setItem(SERVER_PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error("Failed to save preference:", e);
    }
  };

  // Detect server type
  const detectServerType = (source?: VideoSource) => {
    if (!source) return "unknown";
    const type = source.source_type?.toLowerCase();
    if (type === "iframe" || type === "embed") return "embed";
    if (type === "hls") return "hls";
    if (type === "mp4") return "mp4";
    return "unknown";
  };


  // Initialize servers from Supabase data
  useEffect(() => {
    if (displayedSources && displayedSources.length > 0) {
      // Find default server within the displayed sources or use first one
      const defaultServer = displayedSources.find(s => s.is_default) || displayedSources[0];
      setCurrentServer(defaultServer);
      setDefaultServerId(defaultServer.id);
      
      // Load saved preferences for this server
      const prefs = loadPreferences();
      const serverPrefs = prefs[defaultServer.id];
      if (serverPrefs) {
        if (serverPrefs.quality) setCurrentQuality(serverPrefs.quality);
        if (serverPrefs.volume !== undefined) setVolume(serverPrefs.volume);
      }
    }
  }, [displayedSources]);

  // Cleanup function
  const cleanupPlayer = async () => {
    // Clear any pending timeouts
    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = null;
    }

    // Destroy HLS.js instance
    if (hlsPlayerRef.current) {
      try {
        console.log("Cleaning up HLS.js player...");
        hlsPlayerRef.current.destroy();
        console.log("HLS.js player destroyed successfully");
      } catch (e) {
        console.error("Error destroying HLS.js:", e);
      } finally {
        hlsPlayerRef.current = null;
      }
    }

    // Destroy Shaka Player instance
    if (shakaPlayerRef.current) {
      try {
        console.log("Cleaning up Shaka player...");
        await shakaPlayerRef.current.unload();
        await shakaPlayerRef.current.detach();
        await shakaPlayerRef.current.destroy();
        console.log("Shaka player destroyed successfully");
      } catch (e) {
        console.error("Error destroying Shaka Player:", e);
      } finally {
        shakaPlayerRef.current = null;
      }
    }

    // Reset video element completely
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch (e) {
        console.error("Error resetting video:", e);
      }
    }

    // Reset states
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAvailableQualities([]);
    setAvailableSubtitles([]);
    setAvailableAudioTracks([]);
    setHasError(false);
    setErrorMessage("");
  };

  // Handle orientation changes without restarting video
  useEffect(() => {
    if (!videoRef.current) return;

    const handleOrientationChange = () => {
      const video = videoRef.current;
      if (!video) return;

      console.log('Orientation changed, preserving state...');
      
      // Save current state
      orientationStateRef.current = {
        currentTime: video.currentTime,
        isPlaying: !video.paused,
        volume: video.volume
      };

      // No need to do anything else - video should continue playing
      console.log('State preserved:', orientationStateRef.current);
    };

    // Listen for orientation change events
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Initialize video player (native HTML5)
  useEffect(() => {
    const sourceType = detectServerType(currentServer);
    
    // Skip video element for iframe/embed sources
    if (!videoRef.current || !currentServer || sourceType === "embed") {
      setIsLoading(false);
      setIsTransitioning(false);
      return;
    }

    const initPlayer = async () => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage("");
      
      try {
        // Complete cleanup before initialization
        await cleanupPlayer();

        // Delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Set timeout for stuck loading (45 seconds for HLS, 20 seconds for MP4) - only show error if still loading
        const timeoutDuration = sourceType === "hls" ? 45000 : 20000;
        switchTimeoutRef.current = setTimeout(() => {
          // Only show error if still in loading/transitioning state
          if (videoRef.current && (videoRef.current.readyState === 0 || videoRef.current.networkState === 3)) {
            setIsLoading(false);
            setIsTransitioning(false);
            setHasError(true);
            setErrorMessage("Connection timeout - server not responding");
            toast({
              title: "Connection Timeout",
              description: "Server is taking too long to respond. Try another server.",
              variant: "destructive",
            });
          }
        }, timeoutDuration);

        if (sourceType === "mp4") {
          // MP4: Use quality_urls for manual quality switching
          if (currentServer.quality_urls) {
            const qualities = Object.keys(currentServer.quality_urls).sort((a: string, b: string) => {
              return parseInt(b) - parseInt(a);
            });
            setAvailableQualities(qualities);
            
            // Load saved quality or initial quality
            const prefs = loadPreferences();
            const savedQuality = prefs[currentServer.id]?.quality;
            const initialQuality = savedQuality || currentServer.quality || qualities[0] || "720p";
            setCurrentQuality(initialQuality);
            const initialUrl = currentServer.quality_urls[initialQuality] || currentServer.url;
            
            if (videoRef.current) {
              // Set new source
              videoRef.current.src = initialUrl;
              
              // Handle metadata loaded
              const handleMetadataLoaded = () => {
                if (switchTimeoutRef.current) {
                  clearTimeout(switchTimeoutRef.current);
                  switchTimeoutRef.current = null;
                }
                setIsLoading(false);
                setIsTransitioning(false);
                setHasError(false);
                setErrorMessage("");
                
                // Restore state if we have it (from orientation change)
                if (orientationStateRef.current && videoRef.current) {
                  console.log('Restoring state after orientation change:', orientationStateRef.current);
                  videoRef.current.currentTime = orientationStateRef.current.currentTime;
                  videoRef.current.volume = orientationStateRef.current.volume;
                  if (orientationStateRef.current.isPlaying) {
                    videoRef.current.play().catch(console.error);
                  }
                  orientationStateRef.current = null;
                }
                
                videoRef.current?.removeEventListener('loadedmetadata', handleMetadataLoaded);
              };
              
              // Handle load errors
              const handleLoadError = () => {
                if (switchTimeoutRef.current) {
                  clearTimeout(switchTimeoutRef.current);
                  switchTimeoutRef.current = null;
                }
                setIsLoading(false);
                setIsTransitioning(false);
                videoRef.current?.removeEventListener('error', handleLoadError);
              };
              
              videoRef.current.addEventListener('loadedmetadata', handleMetadataLoaded);
              videoRef.current.addEventListener('error', handleLoadError);
              videoRef.current.load();
            }
          } else {
            // Fallback to direct URL
            if (videoRef.current) {
              videoRef.current.src = currentServer.url;
              
              const handleMetadataLoaded = () => {
                if (switchTimeoutRef.current) {
                  clearTimeout(switchTimeoutRef.current);
                  switchTimeoutRef.current = null;
                }
                setIsLoading(false);
                setIsTransitioning(false);
                setHasError(false);
                setErrorMessage("");
                
                // Restore state if we have it (from orientation change)
                if (orientationStateRef.current && videoRef.current) {
                  console.log('Restoring state after orientation change:', orientationStateRef.current);
                  videoRef.current.currentTime = orientationStateRef.current.currentTime;
                  videoRef.current.volume = orientationStateRef.current.volume;
                  if (orientationStateRef.current.isPlaying) {
                    videoRef.current.play().catch(console.error);
                  }
                  orientationStateRef.current = null;
                }
                
                videoRef.current?.removeEventListener('loadedmetadata', handleMetadataLoaded);
              };
              
              const handleLoadError = () => {
                if (switchTimeoutRef.current) {
                  clearTimeout(switchTimeoutRef.current);
                  switchTimeoutRef.current = null;
                }
                setIsLoading(false);
                setIsTransitioning(false);
                videoRef.current?.removeEventListener('error', handleLoadError);
              };
              
              videoRef.current.addEventListener('loadedmetadata', handleMetadataLoaded);
              videoRef.current.addEventListener('error', handleLoadError);
              videoRef.current.load();
            }
          }
        } else if (sourceType === "hls") {
          // HLS: Use HLS.js for better compatibility with fMP4 streams
          if (videoRef.current) {
            const video = videoRef.current;
            
            // Check if browser has native HLS support (Safari, iOS)
            const supportsNativeHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '' || 
                                     video.canPlayType('application/x-mpegURL') !== '';
            
            if (supportsNativeHLS) {
              console.log('Using native HLS playback');
              
              // Use native HLS
              video.src = currentServer.url;
              
              const handleCanPlay = () => {
                console.log('Native HLS: Can play');
                if (switchTimeoutRef.current) {
                  clearTimeout(switchTimeoutRef.current);
                  switchTimeoutRef.current = null;
                }
                setIsLoading(false);
                setIsTransitioning(false);
                setHasError(false);
                setErrorMessage("");
                
                // Restore state if we have it (from orientation change)
                if (orientationStateRef.current && videoRef.current) {
                  console.log('Restoring state after orientation change:', orientationStateRef.current);
                  videoRef.current.currentTime = orientationStateRef.current.currentTime;
                  videoRef.current.volume = orientationStateRef.current.volume;
                  if (orientationStateRef.current.isPlaying) {
                    videoRef.current.play().catch(console.error);
                  }
                  orientationStateRef.current = null;
                }
                
                video.removeEventListener('canplay', handleCanPlay);
              };
              
              const handleError = (e: Event) => {
                console.error('Native HLS error:', e);
                if (switchTimeoutRef.current) {
                  clearTimeout(switchTimeoutRef.current);
                  switchTimeoutRef.current = null;
                }
                setHasError(true);
                setErrorMessage("Failed to load HLS stream");
                setIsLoading(false);
                setIsTransitioning(false);
                video.removeEventListener('error', handleError);
                toast({
                  title: "Playback Error",
                  description: "Unable to load HLS stream. Try another server.",
                  variant: "destructive",
                });
              };
              
              video.addEventListener('canplay', handleCanPlay);
              video.addEventListener('error', handleError);
              video.load();
              
            } else if (Hls.isSupported()) {
              // Use HLS.js for browsers without native HLS support
              console.log('Using HLS.js for HLS playback');
              
              const hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                maxBufferSize: 60 * 1000 * 1000,
                maxBufferHole: 0.5,
                highBufferWatchdogPeriod: 2,
                nudgeOffset: 0.1,
                nudgeMaxRetry: 3,
                maxFragLookUpTolerance: 0.25,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: Infinity,
                liveDurationInfinity: false,
                liveBackBufferLength: Infinity,
                maxLiveSyncPlaybackRate: 1,
                progressive: false,
                abrEwmaDefaultEstimate: 500000,
                abrBandWidthFactor: 0.95,
                abrBandWidthUpFactor: 0.7,
                abrMaxWithRealBitrate: false,
                maxStarvationDelay: 4,
                maxLoadingDelay: 4,
                minAutoBitrate: 0,
                emeEnabled: false,
                manifestLoadingTimeOut: 40000,
                manifestLoadingMaxRetry: 5,
                manifestLoadingRetryDelay: 1000,
                manifestLoadingMaxRetryTimeout: 64000,
                levelLoadingTimeOut: 40000,
                levelLoadingMaxRetry: 5,
                levelLoadingRetryDelay: 1000,
                levelLoadingMaxRetryTimeout: 64000,
                fragLoadingTimeOut: 40000,
                fragLoadingMaxRetry: 6,
                fragLoadingRetryDelay: 1000,
                fragLoadingMaxRetryTimeout: 64000,
              });
              
              hlsPlayerRef.current = hls;
              
              // Attach to video element
              hls.attachMedia(video);
              
              // Handle HLS.js events
              hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                console.log('HLS.js: Media attached');
                hls.loadSource(currentServer.url);
              });
              
              hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                console.log('HLS.js: Manifest parsed', data);
                
                // Clear timeout on successful manifest parse
                if (switchTimeoutRef.current) {
                  clearTimeout(switchTimeoutRef.current);
                  switchTimeoutRef.current = null;
                }
                
                // Extract quality levels
                const levels = data.levels;
                if (levels && levels.length > 0) {
                  const qualities = levels.map((level: any) => `${level.height}p`);
                  const uniqueQualities = [...new Set(qualities)].sort((a, b) => parseInt(b) - parseInt(a));
                  setAvailableQualities(uniqueQualities as string[]);
                }
                
                setIsLoading(false);
                setIsTransitioning(false);
                setHasError(false);
                setErrorMessage("");
                
                // Restore state if we have it (from orientation change)
                if (orientationStateRef.current && videoRef.current) {
                  console.log('Restoring state after orientation change:', orientationStateRef.current);
                  videoRef.current.currentTime = orientationStateRef.current.currentTime;
                  videoRef.current.volume = orientationStateRef.current.volume;
                  if (orientationStateRef.current.isPlaying) {
                    videoRef.current.play().catch(console.error);
                  }
                  orientationStateRef.current = null;
                }
              });
              
              hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS.js error:', data);
                
                // Only handle fatal errors
                if (data.fatal) {
                  if (switchTimeoutRef.current) {
                    clearTimeout(switchTimeoutRef.current);
                    switchTimeoutRef.current = null;
                  }
                  
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      console.error('HLS.js: Fatal network error');
                      hls.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      console.error('HLS.js: Fatal media error, trying to recover');
                      hls.recoverMediaError();
                      break;
                    default:
                      console.error('HLS.js: Unrecoverable error');
                      setHasError(true);
                      setErrorMessage("Failed to load HLS stream");
                      setIsLoading(false);
                      setIsTransitioning(false);
                      toast({
                        title: "Playback Error",
                        description: "Unable to load HLS stream. Try another server.",
                        variant: "destructive",
                      });
                      hls.destroy();
                      break;
                  }
                }
              });
              
            } else {
              console.error('Browser does not support HLS');
              if (switchTimeoutRef.current) {
                clearTimeout(switchTimeoutRef.current);
                switchTimeoutRef.current = null;
              }
              setHasError(true);
              setErrorMessage("Browser doesn't support HLS playback");
              setIsLoading(false);
              setIsTransitioning(false);
              toast({
                title: "Browser Not Supported",
                description: "Your browser doesn't support HLS playback.",
                variant: "destructive",
              });
            }
          }
        }
      } catch (e: any) {
        console.error("Error loading player:", e);
        
        // Clear timeout
        if (switchTimeoutRef.current) {
          clearTimeout(switchTimeoutRef.current);
          switchTimeoutRef.current = null;
        }
        
        setHasError(true);
        setErrorMessage(e?.message || "Failed to load video");
        setIsLoading(false);
        setIsTransitioning(false);
        
        toast({
          title: "Playback Error",
          description: `Failed to load ${currentServer.server_name || 'server'}. Try another server.`,
          variant: "destructive",
        });
      }
    };

    initPlayer();

    return () => {
      // Cleanup on unmount or server change
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
        switchTimeoutRef.current = null;
      }
      // Properly cleanup Shaka player when changing episodes/servers
      cleanupPlayer();
    };
  }, [currentServer, currentEpisodeId]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setHasError(true);
      setErrorMessage("Playback error occurred");
      toast({
        title: "Playback Error",
        description: "An error occurred during playback. Try switching servers.",
        variant: "destructive",
      });
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
    };
  }, []);

  // Track watch progress
  useEffect(() => {
    const trackWatchProgress = async () => {
      if (!contentId || !videoRef.current) return;

      const currentTime = Math.floor(videoRef.current.currentTime);
      const duration = Math.floor(videoRef.current.duration);

      // Only update every 10 seconds to avoid too many database calls
      if (currentTime - lastProgressUpdateRef.current < 10) return;
      if (!isFinite(currentTime) || !isFinite(duration) || duration === 0) return;

      lastProgressUpdateRef.current = currentTime;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Call the update_watch_progress function
        const { error } = await supabase.rpc('update_watch_progress', {
          p_content_id: contentId,
          p_episode_id: currentEpisodeId || null,
          p_progress_seconds: currentTime,
          p_duration_seconds: duration
        });

        if (error) {
          console.error('Error updating watch progress:', error);
        }
      } catch (err) {
        console.error('Error tracking watch progress:', err);
      }
    };

    // Set up interval to track progress while playing
    if (isPlaying && contentId) {
      progressIntervalRef.current = setInterval(trackWatchProgress, 10000); // Every 10 seconds
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isPlaying, contentId, currentEpisodeId]);

  // Track final progress on unmount or episode change
  useEffect(() => {
    return () => {
      const trackFinalProgress = async () => {
        if (!contentId || !videoRef.current) return;

        const currentTime = Math.floor(videoRef.current.currentTime);
        const duration = Math.floor(videoRef.current.duration);

        if (!isFinite(currentTime) || !isFinite(duration) || duration === 0) return;

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await supabase.rpc('update_watch_progress', {
            p_content_id: contentId,
            p_episode_id: currentEpisodeId || null,
            p_progress_seconds: currentTime,
            p_duration_seconds: duration
          });
        } catch (err) {
          console.error('Error tracking final progress:', err);
        }
      };

      trackFinalProgress();
    };
  }, [contentId, currentEpisodeId]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      if (!stableVolume) {
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        
        // Save volume preference
        if (currentServer) {
          savePreference(currentServer.id, "volume", newVolume);
        }
      }
    }
  };

  const toggleStableVolume = () => {
    setStableVolume(!stableVolume);
    toast({
      title: stableVolume ? "Stable Volume Off" : "Stable Volume On",
      description: stableVolume ? "Volume can now be adjusted" : "Volume is now locked",
    });
  };

  const handleSubtitleChange = (subtitleId: string) => {
    setSelectedSubtitle(subtitleId);
    
    if (shakaPlayerRef.current) {
      const player = shakaPlayerRef.current;
      const textTracks = player.getTextTracks();
      
      if (subtitleId === "off") {
        player.setTextTrackVisibility(false);
      } else {
        const trackIndex = parseInt(subtitleId);
        if (textTracks[trackIndex]) {
          player.selectTextTrack(textTracks[trackIndex]);
          player.setTextTrackVisibility(true);
        }
      }
      
      toast({
        title: "Subtitle Changed",
        description: subtitleId === "off" ? "Subtitles disabled" : `Subtitle track ${parseInt(subtitleId) + 1} selected`,
      });
    }
  };

  const handleAudioChange = (audioId: string) => {
    setSelectedAudio(audioId);
    
    if (shakaPlayerRef.current) {
      const player = shakaPlayerRef.current;
      const audioTracks = player.getAudioLanguagesAndRoles();
      
      const trackIndex = parseInt(audioId);
      if (audioTracks[trackIndex]) {
        player.selectAudioLanguage(audioTracks[trackIndex].language, audioTracks[trackIndex].role);
        
        toast({
          title: "Audio Track Changed",
          description: `Now playing: ${audioTracks[trackIndex].label || audioTracks[trackIndex].language}`,
        });
      }
    }
  };

  const handleSleepTimerChange = (minutes: number) => {
    // Clear existing timer
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    
    setSleepTimer(minutes);
    
    if (minutes > 0) {
      sleepTimerRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
        setSleepTimer(0);
        toast({
          title: "Sleep Timer",
          description: "Video paused automatically",
        });
      }, minutes * 60 * 1000);
      
      toast({
        title: "Sleep Timer Set",
        description: `Video will pause in ${minutes} minute${minutes > 1 ? 's' : ''}`,
      });
    } else {
      toast({
        title: "Sleep Timer Off",
        description: "Sleep timer disabled",
      });
    }
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    
    toast({
      title: "Playback Speed",
      description: `Playing at ${speed}x speed`,
    });
  };

  // Auto-hide controls after 3-4 seconds on mobile
  const resetControlsTimeout = () => {
    // Clear existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Show controls
    setShowControls(true);
    
    // Set new timeout to hide controls after 3.5 seconds if playing
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  // Handle touch/click on video player area
  const handlePlayerTouch = (e?: React.MouseEvent | React.TouchEvent) => {
    // If controls are hidden, just show them without toggling play/pause
    if (!showControls && window.innerWidth < 768) {
      if (e) {
        e.stopPropagation();
      }
      resetControlsTimeout();
      return;
    }
    resetControlsTimeout();
  };

  // Update controls visibility when playing state changes
  useEffect(() => {
    if (isPlaying) {
      resetControlsTimeout();
    } else {
      // Keep controls visible when paused
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current && !videoRef.current) {
      console.error('No container or video element found');
      return;
    }

    try {
      // Check current fullscreen state from document
      const doc = document as any;
      const currentlyFullscreen = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      // Detect iOS/iPadOS - on these devices, fullscreen only works on video element
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Check if we're in a Capacitor native app
      const isNativeApp = Capacitor.isNativePlatform();
      
      console.log('Fullscreen toggle - currentlyFullscreen:', currentlyFullscreen, 'isIOS:', isIOS, 'isNativeApp:', isNativeApp);
      console.log('containerRef.current:', !!containerRef.current, 'videoRef.current:', !!videoRef.current);
      
      if (!currentlyFullscreen) {
        // ENTERING FULLSCREEN
        console.log('Attempting to enter fullscreen...');
        
        // For native apps or iOS, prioritize video element fullscreen
        if ((isNativeApp || isIOS) && videoRef.current && currentServer?.source_type !== 'iframe') {
          const video = videoRef.current as any;
          
          console.log('Attempting video element fullscreen...');
          
          // Try native fullscreen methods for video
          if (video.webkitEnterFullscreen) {
            console.log('Using webkitEnterFullscreen');
            video.webkitEnterFullscreen();
            return;
          } else if (video.requestFullscreen) {
            console.log('Using requestFullscreen on video');
            await video.requestFullscreen();
            return;
          }
        }
        
        // Try container fullscreen for desktop/Android web
        const elem = containerRef.current as any;
        
        if (!elem) {
          console.error('Container element not found');
          toast({
            title: "Fullscreen Error",
            description: "Player container not ready. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        console.log('Attempting container fullscreen...', elem);
        console.log('Element type:', elem.nodeName, 'Class:', elem.className);
        
        let fullscreenPromise: Promise<void> | null = null;
        
        if (elem.requestFullscreen) {
          console.log('Using requestFullscreen on container');
          fullscreenPromise = elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          console.log('Using webkitRequestFullscreen on container');
          fullscreenPromise = elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          console.log('Using mozRequestFullScreen on container');
          fullscreenPromise = elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          console.log('Using msRequestFullscreen on container');
          fullscreenPromise = elem.msRequestFullscreen();
        } else {
          // Last resort: try video element even if not iOS/native
          console.log('No container fullscreen method, trying video element...');
          if (videoRef.current && currentServer?.source_type !== 'iframe') {
            const video = videoRef.current as any;
            console.log('Fallback to video element fullscreen');
            
            if (video.requestFullscreen) {
              fullscreenPromise = video.requestFullscreen();
            } else if (video.webkitRequestFullscreen) {
              fullscreenPromise = video.webkitRequestFullscreen();
            } else {
              console.error('No fullscreen method available');
              throw new Error('Fullscreen not supported by this browser');
            }
          } else {
            console.error('No fullscreen method available');
            throw new Error('Fullscreen not supported by this browser');
          }
        }
        
        if (fullscreenPromise) {
          await fullscreenPromise;
          console.log('Fullscreen request completed successfully');
        }
      } else {
        // EXITING FULLSCREEN
        console.log('Attempting to exit fullscreen...');
        
        // For native/iOS, try video element exit first
        if ((isNativeApp || isIOS) && videoRef.current && currentServer?.source_type !== 'iframe') {
          const video = videoRef.current as any;
          if (video.webkitExitFullscreen) {
            console.log('Using webkitExitFullscreen on video');
            video.webkitExitFullscreen();
            return;
          } else if (video.exitFullscreen) {
            console.log('Using exitFullscreen on video');
            await video.exitFullscreen();
            return;
          }
        }
        
        // Try document exit methods
        let exitPromise: Promise<void> | null = null;
        
        if (doc.exitFullscreen) {
          console.log('Using exitFullscreen on document');
          exitPromise = doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          console.log('Using webkitExitFullscreen on document');
          exitPromise = doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          console.log('Using mozCancelFullScreen on document');
          exitPromise = doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          console.log('Using msExitFullscreen on document');
          exitPromise = doc.msExitFullscreen();
        } else {
          console.error('No exit fullscreen method available');
        }
        
        if (exitPromise) {
          await exitPromise;
          console.log('Exit fullscreen completed successfully');
        }
      }
    } catch (error: any) {
      console.error('Fullscreen error:', error);
      console.error('Error type:', error?.name);
      console.error('Error message:', error?.message);
      
      // Don't show error toast for common user cancellations
      if (error?.message && !error.message.includes('request was denied') && !error.message.includes('not allowed') && error?.name !== 'NotAllowedError') {
        toast({
          title: "Fullscreen Error",
          description: error.message || "Unable to toggle fullscreen mode",
          variant: "destructive",
        });
      } else {
        console.log('Fullscreen request denied by user or browser policy');
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleQualityChange = (quality: string) => {
    setCurrentQuality(quality);
    const sourceType = detectServerType(currentServer);
    
    // Save quality preference
    if (currentServer) {
      savePreference(currentServer.id, "quality", quality);
    }
    
    if (sourceType === "mp4" && videoRef.current && currentServer?.quality_urls) {
      // MP4: Load the quality URL from quality_urls
      const qualityUrl = currentServer.quality_urls[quality];
      if (qualityUrl) {
        const currentTime = videoRef.current?.currentTime || 0;
        const wasPlaying = !videoRef.current?.paused;
        
        try {
          videoRef.current.src = qualityUrl;
          videoRef.current.currentTime = currentTime;
          if (wasPlaying) {
            videoRef.current.play();
          }
        } catch (e) {
          console.error("Error changing quality:", e);
          toast({
            title: "Quality Change Failed",
            description: "Unable to switch quality. Please try again.",
            variant: "destructive",
          });
        }
      }
    } else if (sourceType === "hls" && shakaPlayerRef.current) {
      // HLS: Use Shaka Player to select quality
      try {
        const player = shakaPlayerRef.current;
        const tracks = player.getVariantTracks();
        
        // Extract height from quality string (e.g., "720p" -> 720)
        const targetHeight = parseInt(quality);
        
        // Find tracks matching the target quality
        const matchingTracks = tracks.filter(track => track.height === targetHeight);
        
        if (matchingTracks.length > 0) {
          // Select the first matching track
          player.selectVariantTrack(matchingTracks[0], true);
          
          toast({
            title: "Quality Changed",
            description: `Now playing at ${quality}`,
          });
        }
      } catch (e) {
        console.error("Error changing HLS quality:", e);
        toast({
          title: "Quality Change Failed",
          description: "Unable to switch quality for HLS stream.",
          variant: "destructive",
        });
      }
    }
  };

  const handleServerChange = (server: VideoSource) => {
    if (server.id === currentServer?.id) return;
    
    // Prevent switching if already transitioning
    if (isTransitioning) {
      toast({
        title: "Please Wait",
        description: "Server switch in progress...",
      });
      return;
    }
    
    setIsTransitioning(true);
    setHasError(false);
    setErrorMessage("");
    
    // Save current playback position
    const savedTime = videoRef.current?.currentTime || 0;
    const wasPlaying = !videoRef.current?.paused;
    
    if (currentServer) {
      savePreference(currentServer.id, "lastPlaybackTime", savedTime);
    }
    
    // Switch server immediately (cleanup will happen in useEffect)
    setCurrentServer(server);
    
    try {
      
      // Load saved preferences for new server
      const prefs = loadPreferences();
      const serverPrefs = prefs[server.id];
      
      // Restore saved position or start from current position for seamless transition
      const startTime = serverPrefs?.lastPlaybackTime ?? savedTime;
      
      // Wait for player to initialize, then restore position
      setTimeout(() => {
        const newSourceType = detectServerType(server);
        
        if (newSourceType !== "embed" && videoRef.current && startTime > 0) {
          videoRef.current.currentTime = startTime;
          if (wasPlaying) {
            videoRef.current.play().catch(() => {});
          }
        }
      }, 1000);
      
      toast({
        title: "Server Switched",
        description: `Now playing from ${server.server_name || server.language || 'new server'}`,
      });
    } catch (error) {
      console.error("Error switching server:", error);
      setIsTransitioning(false);
      setHasError(true);
      setErrorMessage("Failed to switch server");
      toast({
        title: "Server Switch Failed",
        description: "Unable to switch to the selected server",
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    if (currentServer) {
      setHasError(false);
      setErrorMessage("");
      setIsLoading(true);
      
      // Force re-initialization by briefly setting server to null then back
      const serverToRetry = currentServer;
      setCurrentServer(null);
      
      // Small delay to ensure cleanup happens
      setTimeout(() => {
        setCurrentServer(serverToRetry);
      }, 100);
    }
  };

  // Get server icon
  const getServerIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      embed: Monitor,
      hls: Film,
      mp4: Video,
      unknown: Radio,
    };
    return iconMap[type] || Radio;
  };

  const sourceType = detectServerType(currentServer);
  const ServerIcon = getServerIcon(sourceType);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black group"
    >
      {/* Video Element - Hidden for iframe/embed */}
      {sourceType !== "embed" && (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => {
            // On mobile, clicking video shows controls if hidden, or toggles play/pause if visible
            if (window.innerWidth < 768) {
              if (!showControls) {
                // Just show controls if they're hidden
                handlePlayerTouch(e);
              } else {
                // Toggle play/pause and reset timer if controls are visible
                togglePlayPause();
                resetControlsTimeout();
              }
            } else {
              // Desktop: just toggle play/pause
              togglePlayPause();
            }
          }}
        />
      )}

      {/* Iframe Element - For embed sources */}
      {sourceType === "embed" && currentServer && (
        <iframe
          ref={iframeRef}
          src={currentServer.url}
          className="w-full h-full object-contain"
          allowFullScreen
          allow="autoplay; encrypted-media"
        />
      )}

      {/* Watermark */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 text-white text-xs sm:text-sm md:text-base font-semibold opacity-60 pointer-events-none z-40">
        KHMERZOON
      </div>

      {/* Server Selector - Top Right Corner */}
      {displayedSources.length > 1 && (
        <div className={`absolute top-2 right-2 sm:top-4 sm:right-4 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 md:opacity-0 md:group-hover:opacity-100'}`}
          style={{ pointerEvents: showControls || window.innerWidth >= 768 ? 'auto' : 'none' }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="text-white hover:bg-primary/80 gap-1 sm:gap-2 bg-black/50 backdrop-blur-sm transition-colors px-2 sm:px-4 py-1 sm:py-2 h-auto"
              >
                <ServerIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">
                  {currentServer?.server_name || currentServer?.language || 'Server'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent container={containerRef.current} className="bg-background/95 backdrop-blur-sm border-border z-50">
              <DropdownMenuLabel>Select Server</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {displayedSources.map((source) => {
                const type = detectServerType(source);
                const Icon = getServerIcon(type);
                return (
                  <DropdownMenuItem
                    key={source.id}
                    onClick={() => handleServerChange(source)}
                    className={currentServer?.id === source.id ? "bg-accent hover:bg-primary/20" : "hover:bg-primary/20 transition-colors"}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {source.server_name || source.language || 'Server'}
                    {source.id === defaultServerId && (
                      <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}


      {/* Loading Overlay */}
      {(isLoading || isTransitioning) && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
            <p className="text-white text-sm">
              {isTransitioning ? "Switching server..." : "Loading video..."}
            </p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
          <div className="text-center p-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">Playback Error</h3>
            <p className="text-white/80 text-sm mb-6">{errorMessage}</p>
            <Button onClick={handleRetry} variant="default">
              <RotateCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )}


      {/* Custom Controls - Only show for non-iframe sources */}
      {sourceType !== "embed" && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 sm:p-4 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 md:opacity-0 md:group-hover:opacity-100'}`}
          style={{ pointerEvents: showControls || window.innerWidth >= 768 ? 'auto' : 'none' }}
        >
          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full mb-2 sm:mb-4 h-0.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 sm:[&::-webkit-slider-thumb]:w-4 sm:[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            style={{
              background: duration > 0 
                ? `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(currentTime / duration) * 100}%, rgba(255, 255, 255, 0.3) ${(currentTime / duration) * 100}%, rgba(255, 255, 255, 0.3) 100%)`
                : 'rgba(255, 255, 255, 0.3)'
            }}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
              >
                {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-12 sm:w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              {/* Time */}
              <div className="text-white text-xs sm:text-sm hidden md:block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Episodes List Button */}
              {episodes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEpisodes(!showEpisodes)}
                  className="text-white hover:bg-white/20 border border-white/50 rounded-full px-2 py-1 sm:px-3 sm:py-1 text-xs gap-1 h-auto"
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Episodes</span>
                </Button>
              )}

              {/* Settings Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  container={containerRef.current} 
                  align="end" 
                  side="top"
                  sideOffset={8}
                  className="w-64 sm:w-80 bg-black/10 backdrop-blur-sm border-primary/50 z-50 p-2 max-h-[80vh] overflow-y-auto shadow-[0_0_20px_rgba(239,68,68,0.5),0_0_40px_rgba(239,68,68,0.3)]"
                >
                  {/* Main Menu */}
                  {!showSubtitlesMenu && !showAudioMenu && !showSleepTimerMenu && !showSpeedMenu && !showQualityMenu && (
                    <>
                      {/* Stable Volume */}
                      <DropdownMenuItem 
                        onClick={toggleStableVolume} 
                        className="cursor-pointer hover:bg-primary rounded px-3 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Gauge className="h-5 w-5 text-white" />
                          <span className="text-white text-base">Stable Volume</span>
                        </div>
                        <div className={`w-11 h-6 rounded-full transition-colors ${stableVolume ? 'bg-blue-600' : 'bg-gray-600'} relative`}>
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${stableVolume ? 'left-5' : 'left-0.5'}`} />
                        </div>
                      </DropdownMenuItem>

                      {/* Subtitles/CC */}
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setShowSubtitlesMenu(true)}
                        className="cursor-pointer hover:bg-primary rounded px-3 py-3 mt-1"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <Subtitles className="h-5 w-5 text-white" />
                            <span className="text-white text-base">
                              Subtitles/CC {availableSubtitles.length > 0 && `(${availableSubtitles.length})`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">
                              {selectedSubtitle === "off" ? "Off" : availableSubtitles.find(s => s.id === selectedSubtitle)?.language || "Khmer"}
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </DropdownMenuItem>

                      {/* Audio Track */}
                      {availableAudioTracks.length > 0 && (
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => setShowAudioMenu(true)}
                          className="cursor-pointer hover:bg-primary rounded px-3 py-3 mt-1"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <Languages className="h-5 w-5 text-white" />
                              <span className="text-white text-base">
                                Audio Track {availableAudioTracks.length > 0 && `(${availableAudioTracks.length})`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">
                                {availableAudioTracks.find(a => a.id === selectedAudio)?.label || "Default"}
                              </span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </DropdownMenuItem>
                      )}

                      {/* Sleep Timer */}
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setShowSleepTimerMenu(true)}
                        className="cursor-pointer hover:bg-primary rounded px-3 py-3 mt-1"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <Timer className="h-5 w-5 text-white" />
                            <span className="text-white text-base">Sleep timer</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">
                              {sleepTimer === 0 ? "Off" : `${sleepTimer} min`}
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </DropdownMenuItem>

                      {/* Playback Speed */}
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setShowSpeedMenu(true)}
                        className="cursor-pointer hover:bg-primary rounded px-3 py-3 mt-1"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <Zap className="h-5 w-5 text-white" />
                            <span className="text-white text-base">Playback speed</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">
                              {playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </DropdownMenuItem>

                      {/* Quality */}
                      {availableQualities.length > 0 && (
                        <DropdownMenuItem 
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => setShowQualityMenu(true)}
                          className="cursor-pointer hover:bg-primary rounded px-3 py-3 mt-1"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <Settings className="h-5 w-5 text-white" />
                              <span className="text-white text-base">Quality</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">
                                Auto ({currentQuality})
                              </span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {/* Subtitles Submenu */}
                  {showSubtitlesMenu && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => setShowSubtitlesMenu(false)}
                        className="cursor-pointer hover:bg-primary rounded px-3 py-2 mb-2 border-b border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-white rotate-180" />
                          <span className="text-white font-medium">Subtitles/CC</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          handleSubtitleChange("off");
                          setShowSubtitlesMenu(false);
                        }}
                        className={`cursor-pointer hover:bg-primary rounded px-3 py-2 ${selectedSubtitle === "off" ? "bg-gray-800" : ""}`}
                      >
                        <span className="text-white text-sm ml-6">Off</span>
                      </DropdownMenuItem>
                      {availableSubtitles.map((subtitle) => (
                        <DropdownMenuItem
                          key={subtitle.id}
                          onClick={() => {
                            handleSubtitleChange(subtitle.id);
                            setShowSubtitlesMenu(false);
                          }}
                          className={`cursor-pointer hover:bg-primary rounded px-3 py-2 ${selectedSubtitle === subtitle.id ? "bg-gray-800" : ""}`}
                        >
                          <span className="text-white text-sm ml-6">{subtitle.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {/* Audio Track Submenu */}
                  {showAudioMenu && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => setShowAudioMenu(false)}
                        className="cursor-pointer hover:bg-primary rounded px-3 py-2 mb-2 border-b border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-white rotate-180" />
                          <span className="text-white font-medium">Audio Track</span>
                        </div>
                      </DropdownMenuItem>
                      {availableAudioTracks.map((audio) => (
                        <DropdownMenuItem
                          key={audio.id}
                          onClick={() => {
                            handleAudioChange(audio.id);
                            setShowAudioMenu(false);
                          }}
                          className={`cursor-pointer hover:bg-primary rounded px-3 py-2 ${selectedAudio === audio.id ? "bg-gray-800" : ""}`}
                        >
                          <span className="text-white text-sm ml-6">
                            {audio.label} {audio.roles && audio.roles.length > 0 && `(${audio.roles.join(', ')})`}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {/* Sleep Timer Submenu */}
                  {showSleepTimerMenu && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => setShowSleepTimerMenu(false)}
                        className="cursor-pointer hover:bg-primary rounded px-3 py-2 mb-2 border-b border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-white rotate-180" />
                          <span className="text-white font-medium">Sleep timer</span>
                        </div>
                      </DropdownMenuItem>
                      {[0, 15, 30, 45, 60, 90, 120].map((minutes) => (
                        <DropdownMenuItem
                          key={minutes}
                          onClick={() => {
                            handleSleepTimerChange(minutes);
                            setShowSleepTimerMenu(false);
                          }}
                          className={`cursor-pointer hover:bg-primary rounded px-3 py-2 ${sleepTimer === minutes ? "bg-gray-800" : ""}`}
                        >
                          <span className="text-white text-sm ml-6">
                            {minutes === 0 ? "Off" : `${minutes} minutes`}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {/* Playback Speed Submenu */}
                  {showSpeedMenu && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => setShowSpeedMenu(false)}
                        className="cursor-pointer hover:bg-primary rounded px-3 py-2 mb-2 border-b border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-white rotate-180" />
                          <span className="text-white font-medium">Playback speed</span>
                        </div>
                      </DropdownMenuItem>
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                        <DropdownMenuItem
                          key={speed}
                          onClick={() => {
                            handlePlaybackSpeedChange(speed);
                            setShowSpeedMenu(false);
                          }}
                          className={`cursor-pointer hover:bg-primary rounded px-3 py-2 ${playbackSpeed === speed ? "bg-gray-800" : ""}`}
                        >
                          <span className="text-white text-sm ml-6">
                            {speed === 1 ? "Normal" : `${speed}x`}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {/* Quality Submenu */}
                  {showQualityMenu && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => setShowQualityMenu(false)}
                        className="cursor-pointer hover:bg-primary rounded px-3 py-2 mb-2 border-b border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-white rotate-180" />
                          <span className="text-white font-medium">Quality</span>
                        </div>
                      </DropdownMenuItem>
                      {availableQualities.map((quality) => (
                        <DropdownMenuItem
                          key={quality}
                          onClick={() => {
                            handleQualityChange(quality);
                            setShowQualityMenu(false);
                          }}
                          className={`cursor-pointer hover:bg-primary rounded px-3 py-2 ${currentQuality === quality ? "bg-gray-800" : ""}`}
                        >
                          <span className="text-white text-sm ml-6">{quality}</span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 touch-manipulation active:scale-95 transition-transform z-50"
                aria-label="Toggle fullscreen"
                type="button"
              >
                <Maximize className="h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Episodes Popup Overlay */}
      {showEpisodes && episodes.length > 0 && (
        <div className="absolute inset-0 bg-black/95 z-[60] overflow-y-auto p-2 sm:p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-black text-lg sm:text-xl font-bold">Episodes</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEpisodes(false);
                }}
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
              >
                ✕
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
              {episodes.map((episode: any) => {
                const thumbnailUrl = episode.still_path || contentBackdrop || "/placeholder.svg";
                
                return (
                  <div
                    key={episode.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEpisodeSelect) {
                        onEpisodeSelect(episode.id);
                        setShowEpisodes(false);
                      }
                    }}
                    className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:border-primary hover:scale-105 ${
                      currentEpisodeId === episode.id ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-accent/20">
                      <img
                        src={thumbnailUrl}
                        alt={`Episode ${episode.episode_number}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                      <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 text-white font-black text-xl sm:text-2xl md:text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] [text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%)]">
                        {episode.episode_number}
                      </div>
                      {/* Access Type Ribbon - Left Triangle */}
                      {episode.access_type === 'membership' && (
                        <div className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 pointer-events-none">
                          <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-amber-400 via-yellow-500 to-orange-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                          <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 z-10">
                            <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white drop-shadow-md" strokeWidth={2.5} />
                          </div>
                        </div>
                      )}
                      {episode.access_type === 'purchase' && (
                        <div className="absolute bottom-0 right-0 w-12 h-12 sm:w-14 sm:h-14 pointer-events-none">
                          <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 shadow-lg" style={{ clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' }}></div>
                          <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 z-10">
                            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-md" strokeWidth={2.5} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-1 sm:p-2 bg-card">
                      <p className="text-[10px] sm:text-xs font-medium truncate text-foreground">{episode.title || `Episode ${episode.episode_number}`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
