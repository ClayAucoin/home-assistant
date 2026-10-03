(() => {
  "use strict";

  const BRIDGE_URL = "ws://127.0.0.1:2395";
  const RECONNECT_DELAY_MS = 2000;
  const STATE_CHECK_DELAY_MS = 250;

  /*
   * Google Meet's actual Leave Call button.
   *
   * Unlike the microphone control, this is only present when the
   * tab is participating in an active meeting.
   */
  const LEAVE_CALL_SELECTOR = '[jsname="CQylAd"]';

  const clientId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  let socket = null;
  let lastSentState = null;
  let stateCheckTimer = null;
  let reconnectTimer = null;

  function isMeetingActive() {
    return document.querySelector(LEAVE_CALL_SELECTOR) !== null;
  }

  function sendCurrentState(force = false) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const active = isMeetingActive();

    if (!force && active === lastSentState) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "meet_state",
        client_id: clientId,
        active: active
      })
    );

    lastSentState = active;

    console.log(
      `[HA Meet Bridge] Meeting state: ${active ? "ACTIVE" : "INACTIVE"}`
    );
  }

  function scheduleStateCheck() {
    if (stateCheckTimer !== null) {
      return;
    }

    stateCheckTimer = window.setTimeout(() => {
      stateCheckTimer = null;
      sendCurrentState();
    }, STATE_CHECK_DELAY_MS);
  }

  function connect() {
    if (
      socket &&
      (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      )
    ) {
      return;
    }

    console.log("[HA Meet Bridge] Connecting to local bridge...");

    socket = new WebSocket(BRIDGE_URL);

    socket.addEventListener("open", () => {
      console.log("[HA Meet Bridge] Connected.");

      lastSentState = null;
      sendCurrentState(true);
    });

    socket.addEventListener("close", () => {
      console.log(
        "[HA Meet Bridge] Connection closed. Reconnecting..."
      );

      socket = null;
      lastSentState = null;

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }

      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_DELAY_MS);
    });

    socket.addEventListener("error", () => {
      /*
       * The close event performs the reconnect.
       * Avoid repeatedly logging the browser's WebSocket error object.
       */
    });
  }

  const observer = new MutationObserver(() => {
    scheduleStateCheck();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true
  });

  window.addEventListener("pagehide", () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  });

  connect();
})();