import { type NextPage } from "next";
import Head from "next/head";
import { io, type Socket } from 'socket.io-client';

import { useRef, useEffect, useState, useCallback, memo } from "react";

const REMOTE_WS_URL = 'http://45.56.88.220:3001/';
//const REMOTE_WS_URL = 'http://localhost:3001/';


const Home: NextPage = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedTimeRef = useRef(Date.now());
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const totalUpdatesRef = useRef(0);
  const currentBoardIndexRef = useRef(-1);

  const [connectionStatus, setConnectionStatus] = useState("loading");
  const [statistics, setStatistics] = useState({ xWins: 0, oWins: 0, ties: 0 });
  const [boards, setBoards] = useState<Map<number, BoardType>>(new Map());
  const [tps, setTPS] = useState("0");
  const [muted, setMuted] = useState(true);
  const [rowsColumns, setRowsColumns] = useState([5, 30]);

  const matchSetRef = useRef<Map<number, Array<number>>>(new Map());

  // Create our match set based on input text
  useEffect(() => {
    const solutions = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    matchSetRef.current = new Map();
    // M
    const mOffset = 1;
    matchSetRef.current.set(120, solutions[7]);
    matchSetRef.current.set(91, solutions[7]);
    matchSetRef.current.set(62, solutions[7]);
    matchSetRef.current.set(63, solutions[6]);
    matchSetRef.current.set(94, solutions[6]);
    matchSetRef.current.set(96, solutions[7]);
    matchSetRef.current.set(67, solutions[7]);
    matchSetRef.current.set(68, solutions[6]);
    matchSetRef.current.set(99, solutions[6]);
    matchSetRef.current.set(125, solutions[6]);
    matchSetRef.current.set(130, solutions[6]);

    // A
    const aOffset = mOffset + 2;
    matchSetRef.current.set(131+aOffset, solutions[7]);
    matchSetRef.current.set(102+aOffset, solutions[7]);
    matchSetRef.current.set(73+aOffset, solutions[7]);
    matchSetRef.current.set(74+aOffset, solutions[6]);
    matchSetRef.current.set(105+aOffset, solutions[6]);
    matchSetRef.current.set(136+aOffset, solutions[6]);

    // T
    const tOffset = aOffset + 2;
    matchSetRef.current.set(76+tOffset, solutions[2]);
    matchSetRef.current.set(77+tOffset, solutions[2]);
    matchSetRef.current.set(78+tOffset, solutions[2]);
    matchSetRef.current.set(107+tOffset, solutions[4]);
    matchSetRef.current.set(137+tOffset, solutions[4]);

    // T
    const ttOffset = tOffset + 1;
    matchSetRef.current.set(80+ttOffset, solutions[2]);
    matchSetRef.current.set(81+ttOffset, solutions[2]);
    matchSetRef.current.set(82+ttOffset, solutions[2]);
    matchSetRef.current.set(111+ttOffset, solutions[4]);
    matchSetRef.current.set(141+ttOffset, solutions[4]);
  }, []);
  
  function arraysEqual(a: Array<number>, b: Array<number>) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

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
            if (board.frozen) {
              return boards;
            }


            // Check if board is a match for our target drawing
            let freeze = false;
            if (matchSetRef.current.has(key) && arraysEqual(matchSetRef.current.get(key), gameEndData.winningLine)) {
              console.log(`Froze board ${board.id} at index ${key}`);
              console.log("Winning lines ", gameEndData.winningLine)
              console.log("Positions: ", board.positions);
              console.log("Frozen board!")
              freeze = true;
            }

            updatedBoards.set(key, {...board, ended: true, winningLine: gameEndData.winningLine, frozen: freeze});

            return updatedBoards;
          }
        }

        return boards;
    });
  }, [playTone]);

  const handleGameCreated = useCallback((gameData: GameCreatedData) => {
    setBoards((boards: Map<number, BoardType>) => {
      const updatedBoards = new Map(boards);
      const newIndex = (currentBoardIndexRef.current + 1) % (rowsColumns[0] * rowsColumns[1]);

      currentBoardIndexRef.current = newIndex;

      if (boards.get(newIndex) && boards.get(newIndex).frozen) {
        return updatedBoards;
      }

      const frozenBoardCount = Array.from(boards.values()).reduce((frozens, board) => {
        if (board.frozen) return frozens + 1;
        return frozens;
      }, 0);

      if (frozenBoardCount === matchSetRef.current.size) {
        return updatedBoards;
      }

      updatedBoards.set(newIndex, { positions: Array.from({ length: 9 }), id: gameData.id, ended: false, winningLine: [], frozen: false });
  
      return updatedBoards;
    });
  }, []);

  const handleGameUpdated = useCallback((gameUpdate: GameUpdatedData) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  
    setBoards((boards: Map<number, BoardType>) => {
      const updatedBoards = new Map(boards);
  
      for (const [key, board] of boards.entries()) {
        if (board.id === gameUpdate.id) {
          if (board.frozen) {
            break;
          }

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
    return Array.from(boards.entries()).map(([positionKey, board]) => (
      <Board
        key={board.id}
        id={positionKey}
        positions={board.positions}
        ended={board.ended}
        winningLine={board.winningLine}
        frozen={board.frozen}
      />
    ));
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

        <div className="grid grid-cols-tictactoe gap-2 m-2">
          { renderBoards() }
        </div>
      </main>
    </>
  );
};

const Board: React.FC<BoardProps> = memo(({ id, positions, ended, winningLine, frozen }) => {
  Board.displayName = "Board";
  const debug = true;
  
  const [flashOpacity, setFlashOpacity] = useState(1);

  useEffect(() => {
    let timer;

    if (frozen) {
      setFlashOpacity(0);
      timer = setTimeout(() => {
        setFlashOpacity(1);
      }, 500);
    }

    return () => {
      clearTimeout(timer);
    }
  }, [frozen]);

  return (
    <>
      
        {/*<div>
        <div className="bg-white">
          <h2>{id}</h2>
        </div>*/}

<div className={`bg-gray-800 grid grid-cols-3 grid-rows-3 text-center font-bold text-sm aspect-square ${!frozen && ended ? 'opacity-0 transition-opacity duration-100' : ''}`} style={frozen ? {opacity: flashOpacity, transition: 'opacity 500ms'} : {}}>
          {Array.from({ length: 9 }).map((_, index) => {
            const isWinningSquare = winningLine.includes(index) || false;

            return (
              <Square
                key={index}
                isWinningSquare={isWinningSquare}
                playerAtPosition={positions[index]}
                isFrozenGrid={frozen}
              />
            );
          })}
        </div>
        {/*</div>*/}
    </>
  );
});


const Square: React.FC<SquareProps> = memo(({playerAtPosition, isWinningSquare, isFrozenGrid}) => {
  Square.displayName = "Square";

  let playerAtPositionString = '';
  let style = "flex flex-col justify-center border shadow-xl";

  switch (playerAtPosition) {
    case 1: {
      playerAtPositionString = "X";
      if (!isFrozenGrid) {
        if (isWinningSquare) style = style + " bg-orange-500";
        if (!isWinningSquare) style = style + " bg-orange-200";
      } else {
        if (isWinningSquare) style = style + " bg-white";
      }


      break;
    }
    case 2: {
      playerAtPositionString = "O";
      if (!isFrozenGrid) {
        if (isWinningSquare) style = style + " bg-green-500";
        if (!isWinningSquare) style = style + " bg-green-200";
      } else {
        if (isWinningSquare) style = style + " bg-white";
      }
      
      break;
    }
  }

  return (
    <>
      <div className={style}>{playerAtPositionString}</div>
    </>
  )
});

type BoardType = {
  id: number;
  positions: Array<number>;
  ended: boolean;
  winningLine: Array<number>;
  frozen: boolean;
}

type BoardProps = {
  id: number;
  positions: Array<number>;
  ended: boolean;
  winningLine: Array<number>;
  frozen: boolean;
};

type SquareProps = {
  playerAtPosition: number;
  isWinningSquare: boolean;
  isFrozenGrid: boolean;
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
