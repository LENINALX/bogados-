// Arranca API (Nest) y web (Next) en paralelo. Multiplataforma: en Windows
// `a & b` de npm scripts ejecuta secuencialmente y la web nunca arrancaba.
import { spawn } from "node:child_process";

const scripts = ["dev:api", "dev:web"];

const children = scripts.map((script) =>
  spawn("npm", ["run", script], { stdio: "inherit", shell: true })
);

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exitCode = code;
}

// Si uno de los dos termina (p. ej. error de compilación), se detiene el otro
children.forEach((child, i) =>
  child.on("exit", (code) => {
    if (!stopping) console.error(`\n[dev:all] "${scripts[i]}" terminó (código ${code}); deteniendo el resto.`);
    stopAll(code ?? 0);
  })
);

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
