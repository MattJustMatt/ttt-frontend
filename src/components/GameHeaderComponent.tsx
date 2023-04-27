import { BoardPiece } from "~/types/GameTypes";

const GameHeaderComponent: React.FC<GameHeaderProps> = ({playingFor, nextPiece, playerInputAllowed}) => {
  return (
    <>
      <div className={`text-white text-center p-1 nd:p-0 space-x-1 transition-all duration-200 bg-slate-200 text-lg md:text-2xl shadow-2xl ${playerInputAllowed ? 'bg-opacity-10' : 'bg-opacity-40'}`}>
        <div className="flex flex-wrap justify-center items-center">
          <p>You&apos;re team <span className={`font-bold px-1 ${playingFor === BoardPiece.X ? 'bg-orange-400' : 'bg-green-400'}`}>{playingFor === BoardPiece.X ? 'X' : 'O'}&apos;s</span></p>
          
          {playerInputAllowed && <span className="font-bold">&nbsp;make a move!</span>}
          
          {!playerInputAllowed && (<>
            <p className="whitespace-nowrap">&nbsp;but, it&apos;s team <span className={`font-bold px-1 ${nextPiece === BoardPiece.X ? 'bg-orange-400' : 'bg-green-400'}`}>{nextPiece === BoardPiece.X ? 'X' : 'O'}&apos;s</span> turn.</p>
          
            <p className="font-extrabold">&nbsp;Invite a friend to continue!</p>
          </>)}
        </div>
      </div>
    </>
  );
}

type GameHeaderProps = {
  playingFor: BoardPiece;
  nextPiece: BoardPiece;
  playerInputAllowed: boolean;
}

export default GameHeaderComponent;