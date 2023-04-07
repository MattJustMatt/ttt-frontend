/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { type NextPage } from "next";
import Head from "next/head";
import msgpack from 'msgpack5';

import { useRef, useEffect, useState, useCallback, memo } from "react";

const REMOTE_WS_URL = process.env.NEXT_PUBLIC_REMOTE_WS_URL;

class TTTRealtimeSocket {
  websocket: WebSocket;
  url: string;
  msgPack;

  onCreate: (id: number) => void;
  onUpdate: (id: number, position: number, newPlayer: number) => void;
  onEnd: (id: number, winner: number, winningLine: Array<number>) => void;
  onConnections: (connections: number) => void;
  onDisconnected: () => void;
  onConnected: () => void;
  
  private reconnectBackoff = 500;
  private reconnectBackoffMax = 10000;
  private reconnectDelay = 0;
  private reconnectTimerId: number;
  private disconnectRequested = false;

  constructor(url: string, onCreate, onUpdate, onEnd, onConnections) {
    this.msgPack = msgpack();
    this.url = url;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onCreate = onCreate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onUpdate = onUpdate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onEnd = onEnd;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onConnections = onConnections;
  }

  private setEventHandlers() {
    this.websocket.onmessage = this.handleMessage;
    this.websocket.onopen = () => {
      this.reconnectDelay = 0;
      clearInterval(this.reconnectTimerId);
      this.onConnected();
    };
    this.websocket.onclose = (ev) => {
      this.onDisconnected();

      if (!this.disconnectRequested) {
        console.log(`[REALTIME] Connection closed without being requested [code: ${ ev.code } reason: ${ ev.reason }] reconnecting...`);
        this.disconnectRequested = false;
        this.connect();
      }
    }
    this.websocket.onerror = (err) => {
      console.error(err);
    }
  }

  private handleMessage = async (ev: MessageEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    const arrayBuffer = await ev.data.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const decodedData: Map<number, number | object> = this.msgPack.decode(new Uint8Array(arrayBuffer));

    if (typeof decodedData === 'number') {
      this.onCreate(decodedData);
    } else {
      // End events will have data[2] as an object, representing the winningLine. 
      if (typeof decodedData[2] === 'object') {
        this.onEnd(decodedData[0] as number, decodedData[1] as number, decodedData[2] as Array<number>);
      } else {
        if (decodedData[0] === -1) {
          this.onConnections(decodedData[1] as number);
          return;
        }

        this.onUpdate(decodedData[0] as number, decodedData[1] as number, decodedData[2] as number);
      }
    }
  };

  connect() {
    console.log(`[REALTIME] Connecting...`);
    this.reconnectDelay = this.reconnectDelay < this.reconnectBackoffMax ? this.reconnectDelay + this.reconnectBackoff : this.reconnectBackoffMax;

    // Don't open a connection if it's already open. Ready state 3 is closed (not re-openable)
    if (this.websocket && this.websocket?.readyState !== 3) {
      console.log(`[SOCKET] Attempted to reconnect to an already open socket ${this.websocket.readyState}`);
      return;
    }

    const url = new URL(this.url);
    this.websocket = new WebSocket(url.href);

    this.setEventHandlers();
  }

  disconnect() {
    this.disconnectRequested = true;
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

  const endedGames = useRef([]);

  const [connectionStatus, setConnectionStatus] = useState("loading");
  const [statistics, setStatistics] = useState({ xWins: 0, oWins: 0, ties: 0 });
  const [boards, setBoards] = useState(new Map());
  const [tps, setTPS] = useState(0);
  const [muted, setMuted] = useState(true);
  const [connections, setConnections] = useState(0);

  const formatNumberWithCommas = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
  }, []);

  useEffect(() => {
    const handleResize = () => {
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
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  
    setBoards((prevBoards: Map<number, BoardType>) => {
      const updatedBoards = new Map(prevBoards);
  
      if (currentBoardIndexRef.current < maxBoardsRef.current) {
        currentBoardIndexRef.current += 1;
      } else {
        currentBoardIndexRef.current = 0;
      }
      
      updatedBoards.set(currentBoardIndexRef.current, { id: gameId, positions: Array(9).fill(0), ended: false, winningLine: [] });
      return updatedBoards;
    });
  }, []);

  const handleGameUpdated = useCallback((gameId: number, position: number, newPlayer: number) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  
    if (endedGames.current.includes(gameId)) {
      console.error(`Received update for ended game ${gameId}`);
      return;
    }
  
    setBoards((prevBoards: Map<number, BoardType>) => {
      const updatedBoards = new Map(prevBoards);
  
      for (const [key, board] of updatedBoards.entries()) {
        if (board.id === gameId) {
          board.positions = Array.from(board.positions);
          board.positions[position] = newPlayer;
          updatedBoards.set(key, board);
          break;
        }
      }
  
      return updatedBoards;
    });
  }, []);

  const handleGameEnded = useCallback((gameId: number, winner: number, winningLine: Array<number>) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;

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

    setBoards((prevBoards: Map<number, BoardType>) => {
        const updatedBoards = new Map(prevBoards); 

        for (const [key, board] of updatedBoards.entries()) {
          if (board.id === gameId) {
            endedGames.current.push(gameId);
            updatedBoards.set(key, {...board, ended: true, winningLine: winningLine});

            return updatedBoards;
          }
        }

        return updatedBoards;
    });
  }, [playTone]);

  const handleConnections = useCallback((connections: number) => {
    setConnections(connections);
  }, []);

  const handleMuteButtonClick = () => {
    setMuted((muted) => { return !muted });
  };

  useEffect(() => {
    realtimeSocketRef.current = new TTTRealtimeSocket(REMOTE_WS_URL, handleGameCreated, handleGameUpdated, handleGameEnded, handleConnections);

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
  }, [formatNumberWithCommas, handleGameCreated, handleGameUpdated, handleGameEnded, handleConnections]);

  const renderBoards = () => {
    return Array.from(boards.values()).map((board: BoardType) => {
      return <Board key={board.id} positions={board.positions} ended={board.ended} winningLine={board.winningLine} />
    });
  };

  return (
    <>
      <Head>
        <title>Tic Tac YOOO</title>
        <meta name="description" content="Experience Tic Tac Toe like never before. Join the realtime online multiplayer viewing experience and enjoy watching games unfold live!" />
        <meta name="keywords" content="Tic Tac Toe, multiplayer, realtime, online, game, viewing experience" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ overflow: 'hidden', maxHeight: '100vh' }}>
        <div className={`flex flex-row justify-center p-2 sm:p-0 space-x-1 sm:space-x-5 align-middle min-h-full ${ connectionStatus === 'connected' ? 'bg-sky-300 shadow-sky-400' : 'bg-red-300 shadow-red-500'} text-md sm:text-lg md:text-2xl shadow-2xl  transition-colors duration-200`}>
          <p>TPS: <span className="font-bold">{formatNumberWithCommas(tps)}</span></p>
          <p>Viewers: <span className="font-bold">{formatNumberWithCommas(connections)}</span></p>
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

type BoardProps = {
  positions: Array<number>;
  winningLine: Array<number>;
  ended: boolean;
};

const Board: React.FC<BoardProps> = memo(({ positions, ended, winningLine }) => {
  Board.displayName = "Board";
  const isEmpty = !positions.find((square => square === 1 || square === 2));

  return (
    <>
      <div className={`grid grid-cols-3 grid-rows-3 text-center font-bold sm:text-sm md:text-2xl aspect-square ${isEmpty ? 'ring-4 ring-blue-500' : ''} ${ended ? 'opacity-0  duration-500 md:delay-700' : ''}`}>
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

type SquareProps = {
  playerAtPosition: number;
  isWinning: boolean;
};

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

export default Home;
