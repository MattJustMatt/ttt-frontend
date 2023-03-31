import { type NextPage } from "next";
import Head from "next/head";

import { useRef, useEffect, useState, useCallback, memo } from "react";

const REMOTE_WS_URL = process.env.NEXT_PUBLIC_REMOTE_WS_URL;

class TTTRealtimeSocket {
  websocket: WebSocket;
  url: string;
  onCreate: (id: number) => void;
  onUpdate: (id: number, positions: Array<number>) => void;
  onEnd: (id: number, winner: number, winningLine: Array<number>) => void;
  onDisconnected: () => void;
  onConnected: () => void;
  private reconnectBackoff = 500;
  private reconnectBackoffMax = 10000;
  private reconnectDelay = 0;
  private reconnectTimerId: number;
  private disconnectRequested = false;

  constructor(url: string, onCreate, onUpdate, onEnd) {
    this.url = url;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onCreate = onCreate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onUpdate = onUpdate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onEnd = onEnd;
  }

  private setEventHandlers() {
    this.websocket.onmessage = this.handleMessage;
    this.websocket.onopen = () => {
      this.reconnectDelay = 0;
      clearInterval(this.reconnectTimerId);
      this.onConnected();
    };
    this.websocket.onclose = () => {
      // Reconnect logic
      if (!this.disconnectRequested) {
        this.connect();

      }
      this.onDisconnected();
    }
  }

  private handleMessage = (ev: MessageEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    const serverMessage: [string, Record<string, unknown>] = JSON.parse(ev.data);

    const [event, data] = serverMessage;

    if (event === "c") {
      this.onCreate(data.i as number);
    } else if (event === "u") {
      this.onUpdate(data.i as number, data.p as Array<number>);
    } else if (event === "e") {
      this.onEnd(data.i as number, data.w as number, data.wl as Array<number>);
    }
  };

  connect() {
    console.log(`Attempting reconnect delay ${this.reconnectDelay}`);
    this.reconnectDelay = this.reconnectDelay < this.reconnectBackoffMax ? this.reconnectDelay + this.reconnectBackoff : this.reconnectBackoffMax;

    // Don't open a connection if it's already open. Ready state 3 is closed (not re-openable)
    if (this.websocket && this.websocket?.readyState !== 3) {
      console.log("[SOCKET] Attempted to reconnect to an already open socket ", this.websocket.readyState);
      return;
    }

    const url = new URL(this.url);
    this.websocket = new WebSocket(url.href);

    this.setEventHandlers();
  }

  disconnect() {
    this.websocket.close();
  }
}

const Home: NextPage = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedTimeRef = useRef(Date.now());
  const realtimeSocketRef = useRef<TTTRealtimeSocket>();
  const totalUpdatesRef = useRef(0);
  const currentBoardIndexRef = useRef(0);
  const maxBoardsRef = useRef(5);


  const [connectionStatus, setConnectionStatus] = useState("loading");
  const [statistics, setStatistics] = useState({ xWins: 0, oWins: 0, ties: 0 });
  const [boards, setBoards] = useState(new Map());
  const [tps, setTPS] = useState(0);
  const [muted, setMuted] = useState(true);

  const formatNumberWithCommas = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      console.log(window.innerWidth);
      if (window.innerWidth < 600) {
        maxBoardsRef.current = 17;
      } else if (window.innerWidth <= 1024) {
        maxBoardsRef.current = 41;
      } else {
        maxBoardsRef.current = 71;
      }
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  const playTone = useCallback((freq: number, gain: number) => {
    if (muted) return;
    
    // Debounced by delay
    const DELAY = 10;
    
    const currentTime = new Date().getTime();
    if (currentTime - lastPlayedTimeRef.current >= DELAY) {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext;
      }

      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
    
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      gainNode.gain.value = gain;
    
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      lastPlayedTimeRef.current = currentTime;

      oscillator.start();
      setTimeout(() => {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.1);
        oscillator.stop(audioContext.currentTime + 0.1);
      }, 50);
    }
  }, [muted]);

  const handleGameCreated = useCallback((gameId: number) => {
    setBoards((boards: Map<number, BoardType>) => {
      const updatedBoards = new Map(boards);

      if (currentBoardIndexRef.current < maxBoardsRef.current) {
        currentBoardIndexRef.current += 1;
      } else {
        currentBoardIndexRef.current = 0;
      }
      
      updatedBoards.set(currentBoardIndexRef.current, { positions: Array.from({ length: 9 }), id: gameId, ended: false, winningLine: [] });
  
      return updatedBoards;
    });
  }, []);

  const handleGameUpdated = useCallback((gameId: number, positions: Array<number>) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  
    setBoards((boards: Map<number, BoardType>) => {
      const updatedBoards = new Map(boards);
  
      for (const [key, board] of boards.entries()) {
        if (board.id === gameId) {
          updatedBoards.set(key, {...board, positions: positions});
          break;
        }
      }
  
      return updatedBoards;
    });
  }, []);

  const handleGameEnded = useCallback((gameId: number, winner: number, winningLine: Array<number>) => {
    setStatistics((prevStatistics) => {
      const newStatistics = { ...prevStatistics };

      switch (winner) {
        case 0: {
          playTone(110, 0.01);
          newStatistics.ties = prevStatistics.ties + 1;
          break;
        }

        case 1: {
          playTone(440, 0.01);
          newStatistics.xWins = prevStatistics.xWins + 1;
          break;
        }

        case 2: {
          playTone(587, 0.01);
          newStatistics.oWins = prevStatistics.oWins + 1;
          break;
        }
      }

      return newStatistics;
    });

    setBoards((boards: Map<number, BoardType>) => {
        const updatedBoards = new Map(boards); 

        for (const [key, board] of boards.entries()) {
          if (board.id === gameId) {
            updatedBoards.set(key, {...board, ended: true, winningLine: winningLine});

            return updatedBoards;
          }
        }

        return boards;
    });
  }, [playTone]);

  const handleMuteButtonClick = () => {
    setMuted((muted) => { return !muted });
  };

  useEffect(() => {
    realtimeSocketRef.current = new TTTRealtimeSocket(REMOTE_WS_URL, handleGameCreated, handleGameUpdated, handleGameEnded);

    realtimeSocketRef.current.onConnected = () => {
      setConnectionStatus("connected");
      console.log("[REALTIME] Connected");
    }
    realtimeSocketRef.current.connect();

    realtimeSocketRef.current.onDisconnected = () => {
      setConnectionStatus("disconnected");
      console.log("[REALTIME] Disconnected");
      setBoards(new Map());
    };

    const tpsTimer = setInterval(() => {
      setTPS(totalUpdatesRef.current);
      totalUpdatesRef.current = 0;
    }, 1000);

    return () => {
      clearTimeout(tpsTimer);

      realtimeSocketRef.current.disconnect();
    };
  }, [formatNumberWithCommas, handleGameCreated, handleGameUpdated, handleGameEnded]);

  const renderBoards = () => {
    return Array.from(boards.values()).map((board: BoardType) => {
      return <Board key={board.id} positions={board.positions} ended={board.ended} winningLine={board.winningLine} />
    });
  };

  return (
    <>
      <Head>
        <title>Tic Tac YOOO</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className={`flex flex-row justify-center p-2 sm:p-0 space-x-1 sm:space-x-5 align-middle min-h-full ${ connectionStatus === 'connected' ? 'bg-sky-300 shadow-sky-400' : 'bg-red-300 shadow-red-500'} text-md sm:text-lg md:text-2xl shadow-2xl  transition-colors duration-200`}>
          <p>TPS: <span className="font-bold">{formatNumberWithCommas(tps)}</span></p>
          <p className="text-orange-700">X Wins: <span className="text-black font-bold">{ formatNumberWithCommas(statistics.xWins) }</span></p>
          <p className="text-green-700">O Wins: <span className="text-black font-bold">{ formatNumberWithCommas(statistics.oWins) }</span></p>
          <p className="text-gray-500">Ties: <span className="text-black font-bold">{ formatNumberWithCommas(statistics.ties) }</span></p>
          <button onClick={handleMuteButtonClick}>{muted ? 'Click to unmute' : 'Click to mute'}</button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-4 m-5">
          { renderBoards() }
        </div>
      </main>
    </>
  );
};

const Board: React.FC<BoardProps> = memo(({ positions, ended, winningLine }) => {
  Board.displayName = "Board";
  return (
    <>
      <div className={`grid grid-cols-3 grid-rows-3 text-center font-bold sm:text-sm md:text-2xl aspect-square ${ended ? 'opacity-0 transition-opacity duration-500 delay-300' : ''}`}>
        {Array.from({ length: 9 }).map((_, index) => (
          <Square
            key={index}
            isWinning={winningLine.includes(index)}
            playerAtPosition={positions[index]}
          />
        ))}
      </div>
    </>
  )
});

const Square: React.FC<SquareProps> = memo(({playerAtPosition, isWinning}) => {
  Square.displayName = "Square";

  let playerAtPositionString = '';
  let style = "flex flex-col justify-center border shadow-2xl";

  let bgColor = 'bg-slate-700';
  switch (playerAtPosition) {
    case 1: {
      playerAtPositionString = "X";
      if (isWinning) bgColor = "bg-orange-500";
      if (!isWinning) bgColor = "bg-orange-200";

      break;
    }
    case 2: {
      playerAtPositionString = "O";
      if (isWinning) bgColor = "bg-green-500";
      if (!isWinning) bgColor = "bg-green-200";
      
      break;
    }
  }

  style = style + " " + bgColor;

  return (
    <>
      <div className={style}>{playerAtPositionString}</div>
    </>
  );
});

type BoardType = {
  id: number;
  positions: Array<number>;
  ended: boolean;
  winningLine: Array<number>;
};

type BoardProps = {
  positions: Array<number>;
  winningLine: Array<number>;
  ended: boolean;
};

type SquareProps = {
  playerAtPosition: number;
  isWinning: boolean;
};

export default Home;
