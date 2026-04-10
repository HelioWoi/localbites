/**
 * Video compression utility for optimizing videos before upload
 * Compresses videos to 720p with optimized bitrate for mobile playback
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  onProgress?: (progress: number) => void;
}

export async function compressVideo(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 720,
    maxHeight = 1280,
    quality = 0.8,
    onProgress = () => {},
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.volume = 0; // Silent playback but audio is still captured

    video.onloadedmetadata = async () => {
      let audioContext: AudioContext | null = null;
      
      try {
        // Calculate dimensions maintaining aspect ratio
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidth;
            height = Math.round(maxWidth / aspectRatio);
          } else {
            height = maxHeight;
            width = Math.round(maxHeight * aspectRatio);
          }
        }

        // Create canvas for video processing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Setup MediaRecorder with audio
        const canvasStream = canvas.captureStream(30); // 30 FPS
        const chunks: Blob[] = [];
        
        // Try to capture audio from video
        let audioTracks: MediaStreamTrack[] = [];
        try {
          audioContext = new AudioContext();
          const source = audioContext.createMediaElementSource(video);
          const destination = audioContext.createMediaStreamDestination();
          source.connect(destination);
          audioTracks = destination.stream.getAudioTracks();
        } catch (audioError) {
          console.warn('Could not capture audio, video will be silent:', audioError);
          // Continue without audio if capture fails
        }
        
        // Combine video and audio streams
        const stream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioTracks
        ]);
        
        // Prefer MP4 for broad playback compatibility (especially iOS Safari)
        const preferredMp4MimeTypes = [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=h264,aac',
          'video/mp4'
        ];
        const supportedMp4Mime = preferredMp4MimeTypes.find((type) => MediaRecorder.isTypeSupported(type));

        // If MP4 recording is not supported in this browser, skip compression to avoid producing WebM files
        // that can cause playback issues on iOS devices.
        if (!supportedMp4Mime) {
          console.warn('[VideoCompression] MP4 MediaRecorder not supported, skipping compression to preserve iOS compatibility');
          if (audioContext) {
            audioContext.close();
          }
          URL.revokeObjectURL(video.src);
          onProgress(100);
          resolve(file);
          return;
        }

        const mimeType = supportedMp4Mime;

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2500000, // 2.5 Mbps - good balance for mobile
          audioBitsPerSecond: 128000, // 128 kbps for audio
        });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const originalExtension = file.name.split('.').pop() || 'mp4';
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, `.${originalExtension}`),
            { type: mimeType }
          );
          
          // Clean up
          audioContext.close();
          URL.revokeObjectURL(video.src);
          onProgress(100);
          resolve(compressedFile);
        };

        recorder.onerror = (e) => {
          audioContext.close();
          URL.revokeObjectURL(video.src);
          reject(new Error('Recording failed: ' + e));
        };

        // Start recording
        recorder.start();
        video.play();

        // Draw frames to canvas
        const duration = video.duration;
        let lastTime = 0;
        const frameInterval = 1000 / 30; // 30 FPS

        const drawFrame = (currentTime: number) => {
          if (currentTime - lastTime >= frameInterval) {
            ctx.drawImage(video, 0, 0, width, height);
            lastTime = currentTime;
            
            // Update progress
            const progress = Math.min(95, (video.currentTime / duration) * 100);
            onProgress(progress);
          }

          if (!video.ended && !video.paused) {
            requestAnimationFrame(drawFrame);
          } else {
            recorder.stop();
          }
        };

        video.onplay = () => {
          requestAnimationFrame(drawFrame);
        };

        video.onended = () => {
          recorder.stop();
        };

      } catch (error) {
        if (audioContext) {
          audioContext.close();
        }
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Check if video needs compression based on size and resolution
 */
export async function shouldCompressVideo(file: File): Promise<boolean> {
  // Always compress if file is larger than 3MB
  if (file.size > 3 * 1024 * 1024) {
    return true;
  }

  // Check resolution
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      // Compress if resolution is higher than 720p
      const needsCompression = video.videoWidth > 720 || video.videoHeight > 1280;
      resolve(needsCompression);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(false);
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Get video info (duration, dimensions, size)
 */
export async function getVideoInfo(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  size: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      const info = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        size: file.size,
      };
      URL.revokeObjectURL(video.src);
      resolve(info);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}
