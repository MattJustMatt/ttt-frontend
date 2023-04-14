import { type AppType } from "next/dist/shared/lib/utils";
import { GoogleAnalytics } from "nextjs-google-analytics";

import "~/styles/globals.css";

const MyApp: AppType = ({ Component, pageProps }) => {
  return <>
    <GoogleAnalytics trackPageViews />
    <Component {...pageProps} />;
  </> 
};

export default MyApp;
