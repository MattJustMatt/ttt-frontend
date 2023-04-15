
import { getColorClassForPiece } from "~/lib/utils";
import InteractiveBoard from "./InteractiveBoardComponent";
import { BoardPiece, type Board, type Game } from "~/types/GameTypes";
import { memo, useEffect } from "react";

const MultiBoardComponent: React.FC<BoardSetProps> = ({ game, boards, playingFor, playerInputAllowed, handleSquareClicked }) => {
    MultiBoardComponent.displayName = "MultiBoardComponent";

    useEffect(() => {
        const glowContainers = document.querySelectorAll('.glow-container');
      
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const containerWidth = entry.contentRect.width;
            const containerHeight = entry.contentRect.height;
            const glowContainer = entry.target as HTMLElement;
      
            glowContainer.style.setProperty('--glow-container-width', `${containerWidth}px`);
            glowContainer.style.setProperty('--glow-container-height', `${containerHeight}px`);
          }
        });
      
        glowContainers.forEach((glowContainer) => {
          resizeObserver.observe(glowContainer);
        });
    
        return () => {
          resizeObserver.disconnect();
        };
      }, [boards]);


    console.log("winner ", game.winner);
    return (
        <>
            { game.winner !== null &&
                <div className={`m-10 p-10 shadow-2xl ${getColorClassForPiece(game.winner, true)}`}>
                    <h2 className="text-slate-200 text-5xl font-semibold text-center">{ game.winner === BoardPiece.X ? 'X' : 'O'} WINS!</h2>
                </div>
            }

            <div className={`grid grid-rows-3 grid-cols-3 gap-3 shadow-md ${ game.winner ? 'opacity-0 transition-opacity duration-[7000ms] delay-[3000ms]' : ''} `}>
                { Array.from(boards).map((board) =>
                    <InteractiveBoard 
                        key={board.id}
                        game={game}
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