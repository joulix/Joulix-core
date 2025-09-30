// D:\Joulix\dashboard\lib\abi.ts
import type { Abi } from "viem";
import ERC20_JSON from "./abi/ERC20.json";
import ERC1155_JSON from "./abi/ERC1155.json";
import MARKETPLACE_JSON from "./abi/Marketplace.json";

/** ABI dla USDC (ERC20) */
export const ERC20_ABI = ERC20_JSON.abi as const satisfies Abi;

/** ABI dla GoO (ERC1155) */
export const ERC1155_ABI = ERC1155_JSON.abi as const satisfies Abi;

/** ABI dla Marketplace */
export const MARKET_ABI = MARKETPLACE_JSON.abi as const satisfies Abi;
