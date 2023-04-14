import { getColorClassForPiece } from "~/lib/utils";
import { BoardPiece, type SanitizedPlayer } from "~/types/GameTypes";

const PlayerListComponent: React.FC<PlayerListProps> = ({ players, playerId, maxDisplayedPlayers }) => {
    const formattedPlayers = players.map((player) => {
        if (player.username === null) player.username = "Anonymous";

        return player;
    });

    formattedPlayers.slice(0, maxDisplayedPlayers);

    return (
        <>
            <div className="bg-opacity-10 bg-slate-200 mt-5 p-3 ring-orange-500 ring-4 xl:flex-shrink max-w-4xl xl:max-w-xs">
                <div className="p-3">
                    <h2 className="text-3xl mb-5 font-semibold">Leaderboard:</h2>
                    { formattedPlayers.map((player, index) => {
                        return <h2 className="text-xl" key={index}>
                            <span className={`${player.id === playerId ? 'font-extrabold' : ''}`}>{player.username}</span> <span className={`${ getColorClassForPiece(player.playingFor, true)} bg-opacity-50 font-extrabold`}>({player.playingFor === BoardPiece.X ? 'X' : 'O'}s)</span>: {player.score} pts</h2>
                    })}
                </div>
            </div>
        </>
    )
}

type PlayerListProps = {
    players: Array<SanitizedPlayer>;
    playerId: number;
    maxDisplayedPlayers: number,
};

export default PlayerListComponent;