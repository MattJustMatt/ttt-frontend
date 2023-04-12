import { type MouseEvent, useState } from "react";
import { getColorClassForPiece } from "~/lib/utils";
import { type BoardPiece } from "~/types/GameTypes";

const Square: React.FC<SquareProps> = ({nextPiece, pieceAtPosition, isWinning, playerInputAllowed, handleSquareClicked}) => {
  Square.displayName = "Square";

  const [hoverText, setHoverText] = useState<null | string>(null);

  let pieceAtPositionString = ''; 
  if (pieceAtPosition === 1) {
    pieceAtPositionString = 'X';
  } else if (pieceAtPosition === 2) {
    pieceAtPositionString = 'O';
  }

  pieceAtPosition === 1 ? 'X' : 'O';
  let style = "flex flex-col justify-center border shadow-2xl";
  const bgColor = getColorClassForPiece(pieceAtPosition, isWinning);
  style = `${style} ${bgColor} ${ playerInputAllowed ? 'hover:bg-slate-300' : ''}`;

  const handleHover = (ev: MouseEvent) => {
    //TODO: don't register if not interactive
    if (playerInputAllowed && !pieceAtPosition) {
      setHoverText(ev.type === 'mouseenter' ? nextPiece === 1 ? 'X' : 'O' : null);
    }
  }

  return (
    <>
      <div onMouseEnter={handleHover} onMouseOut={handleHover} onClick={handleSquareClicked} className={style}>{pieceAtPositionString || hoverText}</div>
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