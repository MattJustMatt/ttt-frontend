
import { getColorClassForPiece } from "~/lib/utils";
import InteractiveBoard from "./InteractiveBoardComponent";
import { BoardPiece, type Board, type Game } from "~/types/GameTypes";

const MultiBoardComponent: React.FC<BoardSetProps> = ({ game, boards, playingFor, playerInputAllowed, handleSquareClicked }) => {
    return (
        <>
            { game.winner &&
                <div className={`m-10 p-10 shadow-2xl ${getColorClassForPiece(game.winner, true)}`}>
                    <h2 className="text-slate-200 text-5xl font-semibold text-center">{ game.winner === BoardPiece.X ? 'X' : 'O'} WINS!</h2>
                </div>
            }

            <div className={`grid grid-rows-3 grid-cols-3 gap-3 ${ game.winner ? 'opacity-0 transition-opacity duration-[7000ms] delay-[3000ms]' : ''} `}>
                { Array.from(boards).map((board, i) =>
                    <InteractiveBoard 
                        key={i}
                        board={board}
                        playingFor={playingFor}
                        handleSquareClicked={handleSquareClicked}
                        playerInputAllowed={playerInputAllowed}
                    />
                )}
            </div>
        </>
    )
};

type BoardSetProps = {
    game: Game;
    playingFor: BoardPiece;
    boards: Array<Board>;
    playerInputAllowed: boolean;
    handleSquareClicked(boardId: number, squareId: number): void;
};

export default MultiBoardComponent;