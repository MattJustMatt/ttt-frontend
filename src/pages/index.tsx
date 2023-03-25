import { type NextPage } from "next";
import Head from "next/head";
import { io, type Socket } from 'socket.io-client';

import { useRef, useEffect, useState, useCallback, memo } from "react";

const REMOTE_WS_URL = 'http://45.56.88.220:3001/';

const Home: NextPage = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedTimeRef = useRef(Date.now());
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const totalUpdatesRef = useRef(0);
  const currentBoardIndexRef = useRef(0);

  const [connectionStatus, setConnectionStatus] = useState("loading");
  const [statistics, setStatistics] = useState({ xWins: 0, oWins: 0, ties: 0 });
  const [boards, setBoards] = useState(new Map());
  const [tps, setTPS] = useState("0");
  const [muted, setMuted] = useState(true);

  const formatNumberWithCommas = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
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

  const handleGameEnded = useCallback((gameEndData: GameEndedData) => {
    setStatistics((prevStatistics) => {
      const newStatistics = { ...prevStatistics };

      switch (gameEndData.winner) {
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
          if (board.id === gameEndData.id) {
            updatedBoards.set(key, {...board, ended: true, winningLine: gameEndData.winningLine});

            return updatedBoards;
          }
        }

        return boards;
    });
  }, [playTone]);

  const handleGameCreated = useCallback((gameData: GameCreatedData) => {
    setBoards((boards: Map<number, BoardType>) => {
      const updatedBoards = new Map(boards);
      const newIndex = (currentBoardIndexRef.current + 1) % 72;
      updatedBoards.set(newIndex, { positions: Array.from({ length: 9 }), id: gameData.id, ended: false, winningLine: [] });

      currentBoardIndexRef.current = newIndex;
  
      return updatedBoards;
    });
  }, []);

  const handleGameUpdated = useCallback((gameUpdate: GameUpdatedData) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  
    setBoards((boards: Map<number, BoardType>) => {
      const updatedBoards = new Map(boards);
  
      for (const [key, board] of boards.entries()) {
        if (board.id === gameUpdate.id) {
          updatedBoards.set(key, {...board, positions: gameUpdate.positions});
          break;
        }
      }
  
      return updatedBoards;
    });
  }, []);

  const handleMuteButtonClick = () => {
    setMuted((muted) => { return !muted });
  };

  useEffect(() => {
    document.body.style.background = "#00101e";
    socketRef.current = io(REMOTE_WS_URL);

    socketRef.current?.on('gameCreated', handleGameCreated);
    socketRef.current?.on('gameUpdated', handleGameUpdated);
    socketRef.current?.on('gameEnded', handleGameEnded);

    socketRef.current?.on('connect', () => {
      setConnectionStatus("connected");
      console.log("Connected to tictac websockets");
    });

    socketRef.current?.on('disconnect', () => {
      setConnectionStatus("disconnected");
      console.log("Disconnected from tictac websockets");
      setBoards(new Map());
    });

    const tpsTimer = setInterval(() => {
      setTPS(formatNumberWithCommas(totalUpdatesRef.current));
      totalUpdatesRef.current = 0;

      socketRef.current?.emit('ping');
    }, 1000);

    return () => {
      clearTimeout(tpsTimer);

      socketRef.current?.off('gameCreated', handleGameCreated);
      socketRef.current?.off('gameUpdated', handleGameUpdated);
      socketRef.current?.off('gameEnded', handleGameEnded);

      socketRef.current?.disconnect();
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
        <div className="flex flex-row justify-center p-2 sm:p-0 space-x-1 sm:space-x-5 align-middle min-h-full text-gray-0 bg-blue-300 text-md sm:text-lg md:text-2xl">
          <p>Socket status: <span className={`font-bold ${ connectionStatus === 'connected' ? 'text-green-700' : 'text-red-600'}`}>{connectionStatus}</span></p>
          <p>TPS: <span className="font-bold">{tps}</span></p>
          <p className="text-orange-700">X Wins: <span className="text-black font-bold">{ statistics.xWins }</span></p>
          <p className="text-green-700">O Wins: <span className="text-black font-bold">{ statistics.oWins }</span></p>
          <p className="text-gray-500">Ties: <span className="text-black font-bold">{ statistics.ties }</span></p>
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
      <div className={`bg-gray-800 grid grid-cols-3 grid-rows-3 text-center font-bold sm:text-sm md:text-2xl aspect-square ${ended ? 'opacity-0 transition-opacity duration-100' : ''}`}>
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
  let style = "flex flex-col justify-center border shadow-xl";

  switch (playerAtPosition) {
    case 1: {
      playerAtPositionString = "X";
      if (isWinning) style = style + " bg-orange-500";
      if (!isWinning) style = style + " bg-orange-200";

      break;
    }
    case 2: {
      playerAtPositionString = "O";
      if (isWinning) style = style + " bg-green-500";
      if (!isWinning) style = style + " bg-green-200";
      
      break;
    }
  }

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

type ServerToClientEvents = {
  gameCreated: (data: GameCreatedData) => void;
  gameUpdated: (data: GameUpdatedData) => void;
  gameEnded: (data: GameEndedData) => void;
};

type ClientToServerEvents = {
  ping: () => void;
};

type GameCreatedData = {
  id: number;
};

type GameUpdatedData = {
  id: number;
  positions: Array<number>;
};

type GameEndedData = {
  id: number;
  winner: number;
  winningLine: Array<number>;
};

export default Home;
