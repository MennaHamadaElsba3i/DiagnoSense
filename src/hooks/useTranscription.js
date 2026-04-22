import { useState, useRef, useCallback, useEffect } from 'react';

export const useTranscription = (onTranscriptChunk) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  
  const callbackRef = useRef(onTranscriptChunk);
  useEffect(() => {
    callbackRef.current = onTranscriptChunk;
  }, [onTranscriptChunk]);
  
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRecording(false);
    setIsConnecting(false);
  }, []);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  const toggleRecording = async () => {
    if (isRecording || isConnecting) {
      cleanupAudio();
      return;
    }

    try {
      setError(null);
      setIsConnecting(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ws = new WebSocket('wss://unallegedly-wrinkly-claribel.ngrok-free.dev/ws/transcribe');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsRecording(true);
        
        // 16kHz sample rate for AI backend
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              let s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            ws.send(pcm16.buffer);
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.transcript && callbackRef.current) {
            callbackRef.current(data.transcript);
          }
        } catch (err) {
          console.error("Error parsing transcript:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket transcription error:", err);
        setError("Transcription connection failed.");
        cleanupAudio();
      };

      ws.onclose = () => {
        cleanupAudio();
      };

    } catch (err) {
      console.error("Microphone access denied or error:", err);
      setError("Microphone access denied or unavailable.");
      cleanupAudio();
    }
  };

  return { isRecording, isConnecting, error, toggleRecording, stopRecording: cleanupAudio };
};
