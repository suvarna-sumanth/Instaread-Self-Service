
// Utility function to encode the article title slug
if (!window.__al_player_loaded) {
  window.__al_player_loaded = true;
  (function () {
    function audioleapPlayerTitleSlug(e) {
      if (e.includes("http://") || e.includes("https://")) {
        return encodeURIComponent(e);
      } else {
        let t = e || "";
        return (
          (t = t
            .replace(/\&nbsp;/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^\wéÉèÈêÊëËôÔöÖîÎïÏûÛüÜàÀáÁíÍóÓúÚñÑ _-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")) ||
            console.log(`article title is empty: ${e}`),
          t
        );
      }
    }

    // var addStyletoiframediv = function (e) {
    //   let t = document.createElement("style");
    //   t.textContent = e;
    //   const player = document.querySelector(".audioleap-audio-player");
    //   if (!!player) player?.append(t);
    // };
    //     addStyletoiframediv(`
    //         @media only screen and (min-width: 1100px) {
    //     .audioleap-audio-player {
    //         width: 766px;
    //         height: 144px;
    //         position: relative;
    //     }

    //     .ir-player-alignment,
    //     .adp-interscroller-container {
    //         position: absolute !important;
    //         margin: auto !important;
    //         bottom: 44.2px !important;
    //         cursor: pointer;
    //         right: 14.4px !important;
    //         z-index: 99 !important;
    //     }
    // }

    // @media only screen and (min-width: 660px) and (max-width: 1099px) {
    //     .audioleap-audio-player {
    //         max-width: 100%;
    //         min-width: 332px;
    //         height: 224px;
    //         position: relative;
    //     }
    // }

    // @media only screen and (min-width: 660px) and (max-width: 783px) {
    //     .ir-player-alignment {
    //         position: absolute !important;
    //         left: 0px !important;
    //         right: 0.27rem !important;
    //         cursor: pointer;
    //         bottom: 0.9rem !important;
    //         z-index: 99 !important;
    //         margin: 0px auto !important;
    //     }
    // }

    // @media only screen and (min-width: 783px) and (max-width: 818px) {
    //     .ir-player-alignment {
    //         position: absolute !important;
    //         left: 25rem !important;
    //         right: 0.27rem !important;
    //         cursor: pointer;
    //         bottom: 7.8rem !important;
    //         z-index: 99 !important;
    //         margin: 0px auto !important;
    //     }
    // }

    // @media only screen and (min-width: 818px) and (max-width: 922px) {
    //     .ir-player-alignment {
    //         position: absolute !important;
    //         left: 26.4rem !important;
    //         right: 0.27rem !important;
    //         cursor: pointer;
    //         bottom: 7.8rem !important;
    //         z-index: 99 !important;
    //         margin: 0px auto !important;
    //     }
    // }

    // @media only screen and (min-width: 922px) and (max-width: 1024px) {
    //     .ir-player-alignment {
    //         position: absolute !important;
    //         left: 29.4rem !important;
    //         right: 0.27rem !important;
    //         cursor: pointer;
    //         bottom: 7.8rem !important;
    //         z-index: 99 !important;
    //         margin: 0px auto !important;
    //     }
    // }

    // @media only screen and (min-width: 1024px) and (max-width: 1099px) {
    //     .ir-player-alignment {
    //         position: absolute !important;
    //         left: 0.4rem !important;
    //         right: 0.27rem !important;
    //         cursor: pointer;
    //         bottom: 0.9rem !important;
    //         z-index: 99 !important;
    //         margin: 0px auto !important;
    //     }
    // }

    // @media only screen and (max-width: 659px) {
    //     .audioleap-audio-player {
    //         max-width: 100%;
    //         min-width: 332px;
    //         height: 224px;
    //         position: relative;
    //     }

    //     .ir-player-alignment {
    //         position: absolute !important;
    //         left: 0px !important;
    //         right: 0.27rem !important;
    //         cursor: pointer;
    //         bottom: 0.9rem !important;
    //         z-index: 99 !important;
    //         margin: 0px auto !important;
    //     }

    //     .adp-interscroller-container {
    //         position: absolute !important;
    //         left: 0px !important;
    //         right: 0.27rem !important;
    //         cursor: pointer;
    //         bottom: 0.6rem !important;
    //         z-index: 99 !important;
    //         margin: 0px auto !important;
    //     }
    // }
    //       `);

    // Function to load the player
    function loadALPlayer() {
      const audioleapPlayerIframe = document.getElementById("audioleap_iframe");
      console.log("audioleapPlayerIframe: ", audioleapPlayerIframe);
      // const pageTitleElement = document.querySelector(
      //   "h1.Heading-sc-1w5xk2o-0.iSsUwa"
      // );
      // const titleElement = document.querySelector('meta[property="og:title"]');
      // // const ir_version = new Date().valueOf();
      // let content;
      // if (pageTitleElement) {
      //   content = pageTitleElement.innerText;
      // } else if (titleElement) {
      //   content = titleElement.content;
      // }
      // const ir_titleSlug = audioleapPlayerTitleSlug(content);
      // const ir_article_url = document.location.href;
      // let urlToFind;
      // if (ir_article_url) {
      //   const domain = new URL(ir_article_url);
      //   urlToFind = `${domain.origin}${domain.pathname}`;
      //   urlToFind = encodeURIComponent(urlToFind.replace(/\/+$/, ""));
      // }
      function getUniqueTimestampForHour() {
        const currentTimestamp = Date.now(); // Get current timestamp in milliseconds
        const roundedTimestamp =
          Math.floor(currentTimestamp / (60 * 60 * 1000)) * (60 * 60 * 1000); // Round down to the nearest hour
        const uniqueTimestamp = new Date(roundedTimestamp);

        return uniqueTimestamp;
      }
      const ir_version = getUniqueTimestampForHour();

      const audioleapPlayer = document.querySelector("audioleap-player");

      const ir_publication =
        audioleapPlayer?.getAttribute("publication") || "default";
      const ir_color_type =
        audioleapPlayer?.getAttribute("colortype") || "blue";
      const ir_playertype = audioleapPlayer?.getAttribute("playertype");
      
      // --- AudioLeap Installation Pingback ---
      // This sends a one-time signal to the demo generator to mark this partner as "installed".
      (async function() {
        try {
          // Use a publication-specific key to avoid conflicts and ensure accuracy.
          const pingSentKey = `audioleap_install_ping_sent_${ir_publication}`;
          
          if (localStorage.getItem(pingSentKey)) {
            return; // Ping has already been sent for this publication on this browser.
          }
    
          // IMPORTANT: This URL points to your deployed testing environment.
          const apiUrl = 'https://6000-firebase-studio-1750674614783.cluster-ubrd2huk7jh6otbgyei4h62ope.cloudworkstations.dev/api/installs/confirm';
          
          await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publication: ir_publication })
          });
    
          localStorage.setItem(pingSentKey, 'true');
    
        } catch (error) {
          // Silently log the error. This must not break the player loading functionality.
          console.error('AudioLeap: Install ping failed. This does not affect player functionality.', error);
        }
      })();
      // --- End of Pingback ---

      console.log("ir_publication:", ir_publication);
      console.log("ir_color_type:", ir_color_type);
      console.log("ir_playertype (exists?):", ir_playertype);

      // Properly encode the values for safe URL usage
      const encodedPlayerDesign = encodeURIComponent(ir_playertype || "");
      const encodedColorType = encodeURIComponent(ir_color_type || "");

      audioleapPlayerIframe.setAttribute(
        "src",
        `http://localhost:3001/playerdesign?player_design=${encodedPlayerDesign}&colortype=${encodedColorType}`
      );

      console.log("audioleapPlayerIframe.src:", audioleapPlayerIframe.src);
    }

    // Call the loadPlayer function
    loadALPlayer();
    (function () {
      // Helper to check conditions
      function shouldSetHeight(player) {
        if (!player) return false;
        const playertype = player.getAttribute("playertype");
        return (
          (playertype === "newdesign" || playertype === "shortdesign") &&
          document.querySelector(".audioleap-widget-mobile")
        );
      }

      function setAudioPlayerHeight() {
        const audioPlayer = document.querySelector(".audioleap-audio-player");
        if (audioPlayer) {
          audioPlayer.style.height = "224px";
        }
      }

      // Observe <audioleap-player> attribute changes
      const player = document.querySelector("audioleap-player");
      if (player) {
        const observer = new MutationObserver(() => {
          if (shouldSetHeight(player)) {
            setAudioPlayerHeight();
          }
        });

        observer.observe(player, {
          attributes: true,
          attributeFilter: ["playertype"],
        });
      }

      // Also observe DOM for .audioleap-widget-mobile insertion
      const domObserver = new MutationObserver(() => {
        if (shouldSetHeight(player)) {
          setAudioPlayerHeight();
        }
      });

      domObserver.observe(document.body, { childList: true, subtree: true });

      // Initial check in case everything is already present
      if (shouldSetHeight(player)) {
        setAudioPlayerHeight();
      }
    })();
  })();
}
