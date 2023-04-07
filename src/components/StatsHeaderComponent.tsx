import { formatNumberWithCommas } from "~/lib/utils";
import AudioPlayer from '~/components/AudioPlayerComponent';

const Stats: React.FC<StatsProps> = ({connectionStatus, tps, viewers, statistics}) => {
    return (
        <>
        <div className={`flex flex-row justify-center p-2 sm:p-0 space-x-1 sm:space-x-5 align-middle min-h-full ${ connectionStatus === 'connected' ? 'bg-sky-300 shadow-sky-400' : 'bg-red-300 shadow-red-500'} text-md sm:text-lg md:text-2xl shadow-2xl  transition-colors duration-200`}>
          <p>TPS: <span className="font-bold">{formatNumberWithCommas(tps)}</span></p>
          <p>Viewers: <span className="font-bold">{formatNumberWithCommas(viewers)}</span></p>
          <p className="text-orange-700">X Wins: <span className="text-black font-bold">{ formatNumberWithCommas(statistics.xWins) }</span></p>
          <p className="text-green-700">O Wins: <span className="text-black font-bold">{ formatNumberWithCommas(statistics.oWins) }</span></p>
          <p className="text-gray-500">Ties: <span className="text-black font-bold">{ formatNumberWithCommas(statistics.ties) }</span></p>
        </div>
    </>)
};

type StatsProps = {
  statistics: {
    oWins: number,
    xWins: number,
    ties: number
  };
  connectionStatus: string;
  tps: number;
  viewers: number;
};

export default Stats;