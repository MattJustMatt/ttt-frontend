import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from 'next/router';

const AudioPlayer: React.FC<AudioPlayerComponentProps> = () => {
    const router = useRouter();
    const audioContextRef = useRef<AudioContext | null>();
    const [muted, setMuted] = useState(true);

    const playTone = useCallback((freq: number, gain: number) => {
        if (!audioContextRef) return;
        if (muted) return;

        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
      
        oscillator.type = "sine";
        oscillator.frequency.value = freq;
        gainNode.gain.value = gain;
      
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
      
        oscillator.start();
        setTimeout(() => {
          gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 0.1);
          oscillator.stop(audioContextRef.current.currentTime + 0.1);
        }, 50);
    }, [audioContextRef]);

    useEffect(() => {
        console.log("Query!");
    }, [router.query.muted]);

    const toggleMute = () => {
        setMuted(!muted);
    }

    useEffect(() => {
        audioContextRef.current = new window.AudioContext;
    }, []);


    //TODO: handle query param
    return (
        <>
            <button onClick={ toggleMute }>Audio: { muted ? 'muted' : 'unmuted' }</button>
        </>
    )
};

export default AudioPlayer;

type AudioPlayerComponentProps = {
    test?: undefined;
};