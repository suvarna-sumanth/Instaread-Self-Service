
// Utility function to encode the article title slug
if (!window.__ir_player_loaded) {
  window.__ir_player_loaded = true;
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

    // Function to load the player
    function loadIRPlayer() {
      const instareadPlayerIframe = document.getElementById("instaread_iframe");
      console.log("instareadPlayerIframe: ", instareadPlayerIframe);

      function getUniqueTimestampForHour() {
        const currentTimestamp = Date.now(); // Get current timestamp in milliseconds
        const roundedTimestamp =
          Math.floor(currentTimestamp / (60 * 60 * 1000)) * (60 * 60 * 1000); // Round down to the nearest hour
        const uniqueTimestamp = new Date(roundedTimestamp);

        return uniqueTimestamp;
      }
      const ir_version = getUniqueTimestampForHour();

      const instareadPlayer = document.querySelector("instaread-player");

      const ir_publication =
        instareadPlayer?.getAttribute("publication") || "default";
      const ir_color_type =
        instareadPlayer?.getAttribute("colortype") || "blue";
      const ir_playertype = instareadPlayer?.getAttribute("playertype");
      
      // --- Instaread Installation Pingback ---
      // This sends a one-time signal to the demo generator to mark this partner as "installed".
      (async function() {
        try {
          // Use a publication-specific key to avoid conflicts and ensure accuracy.
          const pingSentKey = `instaread_install_ping_sent_${ir_publication}`;
          
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
          console.error('Instaread: Install ping failed. This does not affect player functionality.', error);
        }
      })();
      // --- End of Pingback ---

      console.log("ir_publication:", ir_publication);
      console.log("ir_color_type:", ir_color_type);
      console.log("ir_playertype (exists?):", ir_playertype);

      // Properly encode the values for safe URL usage
      const encodedPlayerDesign = encodeURIComponent(ir_playertype || "");
      const encodedColorType = encodeURIComponent(ir_color_type || "");

      instareadPlayerIframe.setAttribute(
        "src",
        `http://localhost:3001/playerdesign?player_design=${encodedPlayerDesign}&colortype=${encodedColorType}`
      );

      console.log("instareadPlayerIframe.src:", instareadPlayerIframe.src);
    }

    // Call the loadPlayer function
    loadIRPlayer();
    (function () {
      // Helper to check conditions
      function shouldSetHeight(player) {
        if (!player) return false;
        const playertype = player.getAttribute("playertype");
        return (
          (playertype === "newdesign" || playertype === "shortdesign") &&
          document.querySelector(".instaread-widget-mobile")
        );
      }

      function setAudioPlayerHeight() {
        const audioPlayer = document.querySelector(".instaread-audio-player");
        if (audioPlayer) {
          audioPlayer.style.height = "224px";
        }
      }

      // Observe <instaread-player> attribute changes
      const player = document.querySelector("instaread-player");
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

      // Also observe DOM for .instaread-widget-mobile insertion
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
