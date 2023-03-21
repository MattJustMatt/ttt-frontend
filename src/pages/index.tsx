/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import { type NextPage } from "next";
import Head from "next/head";
import { io, Socket } from 'socket.io-client';

import { useRef, useEffect, useState, useCallback, memo } from "react";

const Home: NextPage = () => {
  const audioContextRef = useRef(null);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const totalUpdatesRef = useRef(0);
  const currentBoardIndexRef = useRef(0);

  const [connectionStatus, setConnectionStatus] = useState("loading");
  const [statistics, setStatistics] = useState({ xWins: 0, oWins: 0, ties: 0 });
  const [boards, setBoards] = useState(new Map());
  const [tps, setTPS] = useState("0");

  const formatNumberWithCommas = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
  }, []);

  const playTone = (freq: number, gain: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext;
    }

    let audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
  
    oscillator.type = "square";
    oscillator.frequency.value = freq; // 440 Hz tone
    gainNode.gain.value = gain; // Control the volume
  
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
  
    oscillator.start();
    setTimeout(() => {
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
    }, 50); // Stop playing after 0.1 seconds
  };

  useEffect(() => {
    document.body.style.background = "#00101e";
    socketRef.current = io('http://localhost:3001');

    const handleGameCreated = (gameData) => {
      playTone((currentBoardIndexRef.current*10) + 300, 0.2);

      setBoards((boards) => {
        const updatedBoards = new Map(boards);
        const newIndex = (currentBoardIndexRef.current + 1) % 72;
        updatedBoards.set(newIndex, { positions: gameData.positions, id: gameData.id });

        // Update the currentBoardIndexRef using the newIndex value
        currentBoardIndexRef.current = newIndex;
    
        return updatedBoards;
      });
    }

    const handleGameUpdated = (gameData) => {
      totalUpdatesRef.current = totalUpdatesRef.current + 1;
    
      setBoards(boards => {
        let updatedBoards = new Map(boards);
    
        // Iterate through the entries of the boards map
        for (const [key, board] of boards.entries()) {
          // If the board's id matches the server's value id
          if (board.id === gameData.id) {
            // Update the board with the new game data
            //console.log(`Set board ${key} to server id ${gameData.id}`)
            updatedBoards.set(key, gameData);
            break;
          }
        }
    
        return updatedBoards;
      });
    }

    const handleGameEnded = (gameEndData) => {
      setStatistics((prevStatistics) => {
        let newStatistics = { ...prevStatistics };

        switch (gameEndData.winner) {
          case 0: {
            playTone(90, 1);
            newStatistics.ties = prevStatistics.ties + 1;
            break;
          }

          case 1: {
            newStatistics.xWins = prevStatistics.xWins + 1;
            playTone(300, 1);
            break;
          }

          case 2: {
            playTone(600, 1);
            newStatistics.oWins = prevStatistics.oWins + 1;
            break;
          }
        }

        return newStatistics;
      });

      setBoards(boards => {
          const updatedBoards = new Map(boards); 

          for (const [key, board] of boards.entries()) {
            // If the board's id matches the server's value id
            if (board.id === gameEndData.id) {
              // Update the board with the new game data
              updatedBoards.set(key, {...board, ended: true});

              return updatedBoards;
            }
          }

          return boards;
      });
    };

    
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
      console.log("called shutdown")
      clearTimeout(tpsTimer);
      socketRef.current?.off('gameCreated', handleGameCreated);
      socketRef.current?.off('gameUpdated', handleGameUpdated);
      socketRef.current?.off('gameEnded', handleGameEnded);

      socketRef.current?.disconnect();
    }
  }, []);


  const renderBoards = () => {
    return Array.from(boards.values()).map((board) => {
      return <Board key={board.id} positions={board.positions} ended={board.ended} />
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
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-4 m-5">
          {renderBoards()}
        </div>
      </main>
    </>
  );
};

const Board: React.FC<BoardProps> = memo(({ positions, ended }) => {
  Board.displayName = "Board";

  const getWinningSquares = useCallback(() => {
    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
  
    for (const line of winningLines) {
      if (positions[line[0]] && positions[line[0]] === positions[line[1]] && positions[line[0]] === positions[line[2]]) {
        return line;
      }
    }
  
    return [];
  }, [positions]);

  const winningSquares = getWinningSquares();

  return (
    <>
      <div className={`bg-gray-800 grid grid-cols-3 grid-rows-3 text-center font-bold sm:text-sm md:text-2xl aspect-square ${ended ? 'opacity-0 transition-opacity duration-500 delay-1000' : ''}`}>
        {Array.from({ length: 9 }).map((_, index) => (
          <Square
            key={index}
            isWinningLine={winningSquares.includes(index)}
            playerAtPosition={positions[index]}
          />
        ))}
        <h2>{ended}</h2>
      </div>
    </>
  )
});


const Square: React.FC<SquareProps> = memo(({playerAtPosition, isWinningLine}) => {
  Square.displayName = "Square";

  let playerAtPositionString = '';
  let style = "flex flex-col justify-center border shadow-xl";

  switch (playerAtPosition) {
    case 1: {
      playerAtPositionString = "X";
      if (isWinningLine) style = style + " bg-orange-500";
      if (!isWinningLine) style = style + " bg-orange-200";
      break;
    }
    case 2: {
      playerAtPositionString = "O";
      if (isWinningLine) style = style + " bg-green-500";
      if (!isWinningLine) style = style + " bg-green-200";
      
      break;
    }
  }

  return (
    <>
      <div className={style}>{playerAtPositionString}</div>
    </>
  )
});

type BoardProps = {
  positions: Array<number>,
  ended: boolean
};

type SquareProps = {
  playerAtPosition: number,
  isWinningLine: boolean
};

type ServerToClientEvents = {
  gameCreated: (data: { id: number }) => void;
  gameUpdated: (gameData: {id: number, position: Array<number>}) => void;
  gameEnded: (gameEndData: {id: number, winner: number}) => void;
}

type ClientToServerEvents = {
  ping: () => void;
}

export default Home;
