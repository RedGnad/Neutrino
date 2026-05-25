import { NextResponse } from "next/server";
import { publicClient, LOGGER_ADDRESS, AGENT_ADDRESS } from "@/lib/onchain";

export const dynamic = "force-dynamic";

export async function GET() {
  let rpcStatus: "ok" | "error" = "error";
  let currentBlock: number | null = null;

  try {
    const block = await publicClient.getBlockNumber();
    currentBlock = Number(block);
    rpcStatus = "ok";
  } catch {
    // rpcStatus stays "error"
  }

  return NextResponse.json({
    status: rpcStatus === "ok" ? "healthy" : "degraded",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    network: process.env.NEUTRINO_NETWORK ?? "mantle",
    logger: LOGGER_ADDRESS || null,
    agent: AGENT_ADDRESS || null,
    rpc: rpcStatus,
    currentBlock,
    deploymentBlock: 95_500_000,
  });
}
