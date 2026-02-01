import WebSocket from "ws";

const PORTS = [18792];

async function checkPort(port: number) {
  console.log(`Checking port ${port}...`);
  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/cdp`);

    ws.on("open", async () => {
      console.log(`[${port}] Connected to CDP endpoint`);

      // 1. Get Targets
      const getTargetsMsg = { id: 1, method: "Target.getTargets" };
      console.log(`[${port}] Sending Target.getTargets...`);
      ws.send(JSON.stringify(getTargetsMsg));
    });

    ws.on("message", (data) => {
      const response = JSON.parse(data.toString());
      console.log(`[${port}] Received message id=${response.id}`);

      if (response.id === 1) {
        // Handle Target.getTargets response
        const targets = response.result.targetInfos;
        console.log(`[${port}] Targets found: ${targets.length}`);

        const mgPage = targets.find(
          (t: any) => t.url.includes("mgkaoqin") || t.title.includes("MG"),
        );
        if (mgPage) {
          console.log(`[${port}] Found MG Page: ${mgPage.title} (${mgPage.targetId})`);

          // 2. Attach to target
          const attachMsg = {
            id: 2,
            method: "Target.attachToTarget",
            params: { targetId: mgPage.targetId, flatten: true },
          };
          console.log(`[${port}] Attaching to target...`);
          ws.send(JSON.stringify(attachMsg));
        } else {
          console.log(`[${port}] MG Page not found. Available pages:`);
          targets.forEach((t: any) => console.log(` - ${t.title} (${t.url})`));
          ws.close();
          resolve();
        }
      } else if (response.id === 2) {
        // Handle attach response
        const sessionId = response.result.sessionId;
        console.log(`[${port}] Attached! SessionId: ${sessionId}`);

        // 3. Take Screenshot (small region to be fast)
        const screenshotMsg = {
          id: 3,
          sessionId,
          method: "Page.captureScreenshot",
          params: { format: "png", clip: { x: 0, y: 0, width: 100, height: 100, scale: 1 } },
        };
        console.log(`[${port}] Taking screenshot...`);
        ws.send(JSON.stringify(screenshotMsg));

        // Set a timeout for the screenshot
        setTimeout(() => {
          console.log(`[${port}] Screenshot timed out!`);
          ws.close();
          resolve(); // Resolve to move on, but log failure
        }, 10000);
      } else if (response.id === 3) {
        console.log(`[${port}] Screenshot success! (Length: ${response.result.data.length})`);
        ws.close();
        resolve();
      }
    });

    ws.on("error", (err) => {
      console.error(`[${port}] Error:`, err.message);
      resolve();
    });
  });
}

(async () => {
  for (const port of PORTS) {
    await checkPort(port);
  }
})();
