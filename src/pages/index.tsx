import { type NextPage } from "next";
import Head from "next/head";
import { io, Socket } from 'socket.io-client';

import { useRef, useEffect, useState } from "react";

type ServerToClientEvents = {
  gameCreated: (id: Number) => void;
  gameUpdated: (id: Number, position: Number, piece: Number) => void;
  gameEnded: (id: Number) => void;
}

type ClientToServerEvents = {
  ping: () => void;
}

const Home: NextPage = () => {
  const [tps, setTPS] = useState("0");
  const totalUpdatesRef = useRef(0);
  const [startTime, setStartTime] = useState(Date.now());
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    document.body.style.background = "#00101e";
    socketRef.current = io('http://localhost:3001');

    const timer = setInterval(() => {
      setStartTime(Date.now());
      setTPS(formatNumberWithCommas(totalUpdatesRef.current / ((Date.now() - startTime) / 1000)));
      
      socketRef.current?.emit('ping');
    }, 1000);

    return () => {
      clearTimeout(timer);
      socketRef.current?.disconnect();
    }
  }, []);

  const onSquareUpdate = () => {
    totalUpdatesRef.current = totalUpdatesRef.current + 1;
  }

  const renderBoards = () => {
    return Array(100).fill(undefined).map((x, i) => {
      return <Board key={i} onSquareUpdate={onSquareUpdate}/>;
    });
  };

  return (
    <>
      <Head>
        <title>Tic Tac YOOO</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="flex flex-row justify-center align-middle min-h-full text-gray-0 bg-blue-300">
          <p>TPS: <span className="font-bold">{tps}</span></p>
        </div>

        <div className="grid grid-cols-12 gap-4 m-5">
          {renderBoards()}
        </div>
      </main>
    </>
  );
};

const Board: React.FC<BoardProps> = ({ onSquareUpdate }) => {
  return (
    <>
      <div className="bg-purple-400 grid grid-cols-3 grid-rows-3 text-center font-bold text-2xl aspect-square">
        <Square onSquareUpdate={onSquareUpdate}/>
        <Square onSquareUpdate={onSquareUpdate}/>
        <Square onSquareUpdate={onSquareUpdate}/>

        <Square onSquareUpdate={onSquareUpdate}/>
        <Square onSquareUpdate={onSquareUpdate}/>
        <Square onSquareUpdate={onSquareUpdate}/>

        <Square onSquareUpdate={onSquareUpdate}/>
        <Square onSquareUpdate={onSquareUpdate}/>
        <Square onSquareUpdate={onSquareUpdate}/>
      </div>
    </>
  )
}

const Square: React.FC<SquareProps> = ({ onSquareUpdate }) => {
  const [position, setPosition] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      let rnd = Math.random();
      let newPosition = "";
      if (rnd < 0.05) newPosition = "X";
      if (rnd > 0.95) newPosition = "O";

      // Todo don't repeat positions
      if (position !== newPosition) {
        setPosition(newPosition);
        onSquareUpdate();
      }
    }, 30);

    return () => {
      console.log("Cleared")
      clearInterval(timer);
    }
  }, [position]);

  let style = "flex flex-col justify-center border shadow-xl";
  // conditionally add color
  if (true) {
    if (position === "X") style = style + " bg-orange-200";
    if (position === "O") style = style + " bg-green-200";
  }

  return (
    <>
      <div className={style}>{position}</div>
    </>
  )
}

function formatNumberWithCommas(num: Number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
}

type BoardProps = {
  onSquareUpdate: () => void;
};

type SquareProps = {
  onSquareUpdate: () => void;
};

export default Home;
