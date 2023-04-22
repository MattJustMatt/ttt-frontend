import { type Emote } from "~/types/GameTypes";
import Image from 'next/image';

const EmoteDrawerComponent: React.FC<EmoteDrawerProps> = ({ emoteList, sendEmote, allowedToSendEmote }) => {
  return (
    <>
      <div className={`p-3 mt-2 bg-opacity-10 bg-slate-200 flex flex-wrap gap-x-4 gap-y-2 justify-center ${!allowedToSendEmote ? 'grayscale' : ''}`}>
        { emoteList.map((emote, index) => {
          const animationDelay = index * 35;
          return (
            <div
              key={emote.name}
              className={`aspect-square max-h-20 bg-opacity-10 shadow-md bg-slate-200 hover:bg-opacity-40`}
              style={allowedToSendEmote ? {
                animationName: 'flicker',
                animationDuration: '0.1s',
                animationIterationCount: 1,
                animationDelay: `${animationDelay}ms`,
              } : {}}
            >
              <button disabled={!allowedToSendEmote} onClick={() => sendEmote(emote)}>
                <Image
                  src={`/emotes/${emote.pathName}`}
                  alt={emote.name}
                  width={96}
                  height={96}
                />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};

type EmoteDrawerProps = {
  emoteList: Array<Emote>,
  sendEmote: (emote: Emote) => void,
  allowedToSendEmote: boolean,
};

export default EmoteDrawerComponent;
