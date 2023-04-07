/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { type NextPage } from "next";
import { useRouter } from 'next/router';
import Head from "next/head";

import Stats from '~/components/StatsHeaderComponent';
import Board from '~/components/BoardComponent';

import boardsReducer from "~/reducers/boardsReducer";

import { useRef, useEffect, useState, useReducer } from "react";
import TTTRealtimeSocket from "~/lib/TTTRealtimeSocket";

const REMOTE_WS_URL = process.env.NEXT_PUBLIC_REMOTE_WS_URL;

const Home: NextPage = () => {
  const router = useRouter();

  const realtimeSocketRef = useRef<TTTRealtimeSocket>();
  const totalUpdatesRef = useRef(0);
  const maxBoardsRef = useRef(5);

  const endedGames = useRef([]);

  const [connectionStatus, setConnectionStatus] = useState("loading");
  const [statistics, setStatistics] = useState({ xWins: 0, oWins: 0, ties: 0 });
  const [boards, dispatchBoards] = useReducer(boardsReducer, new Map());
  const [tps, setTPS] = useState(0);
  const [viewers, setViewers] = useState(0);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    setShowStats(router.query.showStats === 'false' ? false : true);
  }, [router.query.showStats]);

  const handleGameCreated = (gameId: number) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  
    dispatchBoards({ type: 'create', gameId: gameId, maxBoards: maxBoardsRef.current });
  };

  const handleGameUpdated = (gameId: number, position: number, newPlayer: number) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  
    if (endedGames.current.includes(gameId)) {
      console.error(`Received update for ended game ${gameId}`);
      return;
    }
  
    dispatchBoards({ type: 'update_square', gameId: gameId, position: position, newPlayer: newPlayer });
  };

  const handleGameEnded = (gameId: number, winner: number, winningLine: Array<number>) => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;

    setStatistics((prevStatistics) => {
      const newStatistics = { ...prevStatistics };

      switch (winner) {
        case 0: {
          //if (!muted) playTone(110, 0.01);
          newStatistics.ties = prevStatistics.ties + 1;
          break;
        }

        case 1: {
          //if (!muted) playTone(440, 0.01);
          newStatistics.xWins = prevStatistics.xWins + 1;
          break;
        }

        case 2: {
          //if (!muted) playTone(587, 0.01);
          newStatistics.oWins = prevStatistics.oWins + 1;
          break;
        }
      }

      return newStatistics;
    });

    dispatchBoards({ type: 'end_game', gameId: gameId, winningLine: winningLine });
  }

  const handleViewers = (connections: number) => {
    setViewers(connections);
  };

  // Initial setup
  useEffect(() => {
    realtimeSocketRef.current = new TTTRealtimeSocket(REMOTE_WS_URL, handleGameCreated, handleGameUpdated, handleGameEnded, handleViewers);

    realtimeSocketRef.current.onConnected = () => {
      setConnectionStatus("connected");
      console.log("[REALTIME] Connected");
    }
    realtimeSocketRef.current.connect();

    realtimeSocketRef.current.onDisconnected = () => {
      setConnectionStatus("disconnected");
      console.log("[REALTIME] Disconnected");

      dispatchBoards({ type: 'reset' });
    };

    const tpsTimer = setInterval(() => {
      setTPS(totalUpdatesRef.current);
      totalUpdatesRef.current = 0;
    }, 1000);

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
      clearTimeout(tpsTimer);
      window.removeEventListener('resize', handleResize);
      realtimeSocketRef.current.disconnect();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Tic Tac YOOO</title>
        <meta name="description" content="Experience Tic Tac Toe like never before. Join the realtime online multiplayer viewing experience and enjoy watching games unfold live!" />
        <meta name="keywords" content="Tic Tac Toe, multiplayer, realtime, online, game, viewing experience" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ overflow: 'hidden', maxHeight: '100vh' }}>
        {showStats && <Stats connectionStatus={connectionStatus} tps={tps} viewers={viewers} statistics={statistics} /> }

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-4 m-5">
          { Array.from(boards.values()).map((board: BoardType) => {
            return <Board key={board.id} positions={board.positions} ended={board.ended} winningLine={board.winningLine} />
          }) }
        </div>
      </main>
    </>
  );
};

type BoardType = {
  id: number;
  positions: Array<number>;
  ended: boolean;
  winningLine: Array<number>;
};

export default Home;
