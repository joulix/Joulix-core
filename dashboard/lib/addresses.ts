export const ADDR = {
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x747B2fD91a78068b8eFCcB634C43dd49c317Dc5d",
  GoO: process.env.NEXT_PUBLIC_ERC1155_ADDRESS || "0x21Bd8f6C9A0879C615AFB6c882aB66117F7c2209",
  Market: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0xb9110838c02c769c194aB392B3ff173611fe675d",
};

export const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology";