import { memo } from "react";
import { formatNumberWithCommas, getColorClassForPiece } from "~/lib/utils";
import { BoardPiece, type SanitizedPlayer } from "~/types/GameTypes";

const PlayerListComponent: React.FC<PlayerListProps> = memo(({ players, playerId, maxDisplayedPlayers }) => {
  const formattedPlayers = players.slice(0, maxDisplayedPlayers).sort((a, b) => Number(b.online) - Number(a.online));

  const xTotalScore = players.filter(player => player.playingFor === BoardPiece.X).reduce((score, player) => score + player.score, 0);
  const oTotalScore = players.filter(player => player.playingFor === BoardPiece.O).reduce((score, player) => score + player.score, 0);

  return (
    <>
      <div className="bg-opacity-10 bg-slate-200 mt-5  xl:flex-shrink max-w-4xl xl:max-w-xs shadow-sm">
        <div className="flex text-center font-bold shadow-lg">
          <div className="bg-orange-500 bg-opacity-80 grow pb-1">
            <h3 className="text-2xl mb-[-5px]">{formatNumberWithCommas(xTotalScore)}</h3>
            <h4>Team X</h4>
          </div>

          <div className="bg-green-500 bg-opacity-90 grow pb-1">
            <h3 className="text-2xl mb-[-5px] ">{formatNumberWithCommas(oTotalScore)}</h3>
            <h4>Team O</h4>
          </div>
        </div>

        <div className="p-3">
          { formattedPlayers.map((player, index) => {
              return <h2 className="text-md md:text-xl" key={index}>
                  <span className={`${player.online ? 'text-white' : 'text-slate-400'} ${player.id === playerId ? 'font-extrabold' : ''}`}>{player.username}</span> <span className={`${ getColorClassForPiece(player.playingFor, true)} bg-opacity-50 font-extrabold`}>({player.playingFor === BoardPiece.X ? 'X' : 'O'}s)</span>: {formatNumberWithCommas(player.score)} pts</h2>
          })}
        </div>
      </div>
    </>
  );
});
PlayerListComponent.displayName = "PlayerListComponent";

type PlayerListProps = {
  players: Array<SanitizedPlayer>;
  playerId: number;
  maxDisplayedPlayers: number,
};

export default PlayerListComponent;