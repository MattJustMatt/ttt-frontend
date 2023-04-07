const Square: React.FC<SquareProps> = ({playerAtPosition, isWinning}) => {
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
};

type SquareProps = {
  playerAtPosition: number;
  isWinning: boolean;
};

export default Square;