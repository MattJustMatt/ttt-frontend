import { type MutableRefObject, memo, useEffect, useState, useCallback } from "react";
import { formatNumberWithCommas, getColorClassForPiece } from "~/lib/utils";
import { BoardPiece, type Emote, type SanitizedPlayer } from "~/types/GameTypes";

import Image from 'next/image';
import { type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "~/types/SocketTypes";

const PlayerListComponent: React.FC<PlayerListProps> = memo(({ players, selfUuid: selfUuid, maxDisplayedPlayers, emoteList, socketRef }) => {
  const [emoteMap, setEmoteMap] = useState<Map<string, Emote>>(new Map());

  const formattedPlayers = players.sort((a, b) => Number(b.online) - Number(a.online)).slice(0, maxDisplayedPlayers);

  // TODO: These should be computed on the server, and offline clients should not be sent down, or at least truncated, by default
  const xTotalScore = players.filter(player => player.playingFor === BoardPiece.X).reduce((score, player) => score + player.score, 0);
  const oTotalScore = players.filter(player => player.playingFor === BoardPiece.O).reduce((score, player) => score + player.score, 0);

  const tempMapPlayerToEmote = useCallback((playerUuid: string, emoteSlug: string) => {
    setEmoteMap((prevEmoteMap) => {
      return new Map(prevEmoteMap).set(playerUuid, emoteList.find((emote) => emote.slug === emoteSlug));
    });

    // Clear the emote from the map after the animation is done (4s)
    // These timeouts should ideally be stored somewhere and cleared on component cleanup, but it's ok for this use case
    setTimeout(() => {
      setEmoteMap((prevEmoteMap) => {
        const newEmoteMap = new Map(prevEmoteMap);
        newEmoteMap.delete(playerUuid);
        formattedPlayers.find((player) => player.uuid === playerUuid).currentEmoteSlug = null;

        return newEmoteMap;
      });
    }, 4000);
  }, [emoteList, formattedPlayers]);

  Array.from(emoteMap.keys()).forEach((playerIdEmoted) => {
    formattedPlayers.find((player) => player.uuid === playerIdEmoted).currentEmoteSlug = emoteMap.get(playerIdEmoted).slug;
  });

  // I'd like to find a cleaner abstraction rather than passing the socket down..
  useEffect(() => {
    socketRef.current.on('emote', tempMapPlayerToEmote);

    return () => {
      // should be ok because the socket reference itself never changes. if it does in the future, change this.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      socketRef.current.off('emote', tempMapPlayerToEmote);
    }
  }, [tempMapPlayerToEmote, socketRef]);

  return (
    <>
      <div className="bg-opacity-10 bg-slate-200 mt-5 shadow-sm">
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
          {formattedPlayers.map((player) => {
            return (
              <div className="relative flex items-center" key={player.uuid}>
                <h2 className="text-md md:text-xl">
                  <span className={`${player.online ? 'text-white' : 'text-slate-400'} ${player.uuid === selfUuid ? 'font-extrabold' : ''}`}>
                    {player.username}&nbsp;
                  </span>

                  <span className={`${getColorClassForPiece(player.playingFor, true)} bg-opacity-50 font-extrabold`}>
                    ({player.playingFor === BoardPiece.X ? 'X' : 'O'}s)
                  </span>

                  : {formatNumberWithCommas(player.score)} pts
                </h2>
                {emoteList.find(emote => emote.slug === player.currentEmoteSlug) && 
                  <div className="ml-5 rounded-full p-1 bg-white bg-opacity-80 shadow inline-block emote-animate">
                    <Image
                      src={`/emotes/${emoteList.find(emote => emote.slug === player.currentEmoteSlug).pathName}`}
                      alt={player.currentEmoteSlug}
                      width={64}
                      height={64}
                    />
                  </div>
                }
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
});
PlayerListComponent.displayName = "PlayerListComponent";

type PlayerListProps = {
  players: Array<SanitizedPlayer>;
  selfUuid: string;
  maxDisplayedPlayers: number;
  emoteList: Array<Emote>;
  socketRef: MutableRefObject<Socket<ServerToClientEvents, ClientToServerEvents>>;
};

export default PlayerListComponent;