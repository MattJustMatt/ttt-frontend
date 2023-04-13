import { type MouseEvent, useState } from "react";
import { getColorClassForPiece } from "~/lib/utils";
import { BoardPiece } from "~/types/GameTypes";

const Square: React.FC<SquareProps> = ({nextPiece, pieceAtPosition, isWinning, playerInputAllowed, handleSquareClicked}) => {
  Square.displayName = "Square";

  const [hoverText, setHoverText] = useState<null | string>(null);

  let pieceString = ''; 
  if (pieceAtPosition === BoardPiece.X) pieceString = 'X';
  if (pieceAtPosition === BoardPiece.O) pieceString = 'O';

  const pieceBackground = getColorClassForPiece(pieceAtPosition, isWinning);
  const bgColor = `${pieceBackground ? pieceBackground + ' color-fill' : ''} bg-gradient-to-br from-indigo-400 `;
  const style = `flex flex-col justify-center border shadow-2xl ${bgColor} ${ playerInputAllowed ? 'hover:bg-slate-300' : ''}`;

  const handleHover = (ev: MouseEvent) => {
    //TODO: don't register if not interactive
    if (playerInputAllowed && !pieceAtPosition) {
      setHoverText(ev.type === 'mouseenter' ? nextPiece === 1 ? 'X' : 'O' : null);
    }
  }

  return (
    <>
      <span className="overflow-hidden relative w-full h-full bg-indigo-500">
        <div
          onMouseEnter={handleHover}
          onMouseOut={handleHover}
          onClick={handleSquareClicked}
          className={`${style} text-slate-200 w-full h-full flex items-center justify-center`}
        >
          {pieceString || hoverText}
        </div>
      </span>
    </>
  );
};

type SquareProps = {
  nextPiece?: BoardPiece,
  pieceAtPosition: BoardPiece;
  isWinning: boolean;
  handleSquareClicked?: () => void;
  playerInputAllowed?: boolean;
};

export default Square;