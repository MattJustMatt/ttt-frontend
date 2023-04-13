import { type NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";

const Test: NextPage = () => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setTimeout(() => setReady(true), 1000);
    }, []);
    return (
        <>
            <Head>

            </Head>
            <div className="bg-slate-500">
                Header
            </div>
            <main className="flex">
                <div className="grow bg-green-800">
                    Games Container

                    <div className="m-20">                        
                        <div className="grid grid-rows-3 grid-cols-3 bg-white">
                            <div className="aspect-square">Grid Item 1</div>
                            <div>Grid Item 1</div>
                            <div>Grid Item 1</div>

                            <div>Grid Item 1</div>
                            <div>Grid Item 1</div>
                            <div>Grid Item 1</div>

                            <div>Grid Item 1</div>
                            <div>Grid Item 1</div>
                            <div>Grid Item 1</div>
                        </div>
                    </div>
                </div>
                <div className="flex-none w-32 bg-white">Leaderboard</div>
            </main>
        </>
    )  
}


export default Test;