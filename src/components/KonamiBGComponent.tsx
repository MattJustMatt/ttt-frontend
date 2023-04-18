import { useEffect, useRef, useState } from "react";
import { fadeElement } from "~/lib/utils";

const KonamiBGComponent: React.FC<KonamiBGProps> = ({bgQuery, triggerWord}) => {
  const keyPressesRef = useRef<Array<string>>([]);
  const [showKonami, setShowKonami] = useState(false);
  
  // Konami code changes background :D
  useEffect(() => {
    const keyDownListener = (ev: globalThis.KeyboardEvent) => {
      const keyPresses = keyPressesRef.current
      if (keyPresses.length > 3) keyPresses.shift();
      keyPresses.push(ev.key)
      keyPressesRef.current = keyPresses;

      const word = keyPresses.join("");
      if (word === triggerWord) {
        setShowKonami(true);
      }
    };

    document.addEventListener('keydown', keyDownListener);

    return () => {
      document.removeEventListener('keydown', keyDownListener);
    }
  }, [triggerWord]);

  useEffect(() => {
    let konamiTimer: unknown;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const konamiBG = document.querySelector(bgQuery) as HTMLElement;

    if (showKonami) {
      konamiBG.style.display = 'block';
      fadeElement(konamiBG, 400, 0, 1);

      konamiTimer = setTimeout(() => {
        setShowKonami(false);
      }, 5000);
    } else {
      const fadeOutDelay = 400;
      fadeElement(konamiBG, fadeOutDelay, 1, 0);
      konamiTimer = setTimeout(() => {
        konamiBG.style.display = 'none';
      }, fadeOutDelay);
    }

    return () => {
      if (konamiTimer) clearTimeout(konamiTimer as number);
    }
  }, [bgQuery, showKonami]);

  return (
    <>

    </>
  );
};

type KonamiBGProps = {
  bgQuery: string,
  triggerWord: string,
};

export default KonamiBGComponent;