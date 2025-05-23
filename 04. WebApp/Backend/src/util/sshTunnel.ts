import {
  createTunnel,
  ForwardOptions,
  ServerOptions,
  SshOptions,
  TunnelOptions,
} from "tunnel-ssh";
import env from "./validateEnv";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tunnel: any;

export async function startSshTunnel(): Promise<void> {
  if (!env.SSH_KEY) {
    throw new Error("SSH_KEY is missing in environment variables");
  }

  const sshOptions: SshOptions = {
    host: env.SSH_HOST,
    port: env.SSH_PORT,
    username: env.SSH_USER,
    privateKey: env.SSH_KEY.replace(/\\n/g, "\n"),
  };

  const tunnelOptions: TunnelOptions = {
    autoClose: true,
    reconnectOnError: true,
  };

  const forwardOptions: ForwardOptions = {
    srcAddr: env.DB_HOST,
    srcPort: env.DB_PORT,
    dstAddr: env.DST_DB_HOST,
    dstPort: env.DST_DB_PORT,
  };

  const serverOptions: ServerOptions = {
    port: env.DB_PORT,
  };

  tunnel = await createTunnel(
    tunnelOptions,
    serverOptions,
    sshOptions,
    forwardOptions
  );

  console.log(`SSH Tunnel created on localhost:${env.DB_PORT}`);
}

export async function stopSshTunnel(): Promise<void> {
  if (tunnel && typeof tunnel.close === "function") {
    tunnel.close();
    console.log("SSH Tunnel closed");
  }
}

process.on("SIGINT", stopSshTunnel);
process.on("SIGTERM", stopSshTunnel);
