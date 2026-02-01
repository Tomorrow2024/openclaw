
import WebSocket from 'ws';

const PORTS = [18792];

async function checkPort(port: number) {
  console.log(`Checking port ${port}...`);
  return new Promise<void>((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/cdp`);
    
    ws.on("open", async () => {
      console.log(`[${port}] Connected to CDP endpoint`);
      ws.send(JSON.stringify({ id: 1, method: "Target.getTargets" }));
    });
    
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      console.log(`[${port}] Received message:`, msg.id, msg.method, msg.result ? "result" : "error");

      if (msg.id === 1 && msg.result && msg.result.targetInfos) {
        const targets = msg.result.targetInfos;
        console.log(`[${port}] Targets found:`, targets.length);
        const page = targets.find((t: any) => t.type === 'page' && t.url.includes('mgkaoqin'));
        if (page) {
            console.log(`[${port}] Found MG page:`, page.targetId, page.url);
            // Simulate attach
            ws.send(JSON.stringify({ 
                id: 2, 
                method: "Target.attachToTarget", 
                params: { targetId: page.targetId } 
            }));
        } else {
            console.log(`[${port}] MG page not found`);
            // List all targets
            targets.forEach((t: any) => console.log(` - ${t.type}: ${t.url}`));
        }
      }
      if (msg.id === 2 && msg.result) {
          console.log(`[${port}] Attached to target. SessionId:`, msg.result.sessionId);
          // Send Runtime.evaluate
          ws.send(JSON.stringify({
              id: 3,
              sessionId: msg.result.sessionId,
              method: "Runtime.evaluate",
              params: { expression: "document.title", returnByValue: true }
          }));
      }
      if (msg.id === 3) {
          console.log(`[${port}] Evaluate result:`, JSON.stringify(msg.result));
          // Detach
          if (msg.result && msg.result.result && msg.result.result.value) {
               console.log(`[${port}] Page title:`, msg.result.result.value);
          }
          
          const sessionId = (msg as any).sessionId || (msg as any).params?.sessionId; // wait, message 3 is response, so it doesn't have sessionId usually, but we need the one from attach
          // actually we need to store sessionId from message 2
          // But here I'll just hardcode id 4
          
          // We need the sessionId from step 2. 
          // Since I can't easily access it here without state, I'll rely on the log.
          // But to test detach, I should send it.
          // Let's just exit for now to see if this part works.
          resolve();
          ws.close();
      }
    });
    
    ws.on("error", (err) => {
        console.error(`[${port}] WebSocket error:`, err.message);
        resolve();
    });
  });
}

(async () => {
  for (const port of PORTS) {
    await checkPort(port);
  }
})();
