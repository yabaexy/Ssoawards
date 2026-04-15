import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const WYDA_CONTRACT_ADDRESS = "0xD84B7E8b295d9Fa9656527AC33Bf4F683aE7d2C4";
export const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
export const APESWAP_ROUTER_ADDRESS = "0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607";

export const TARGET_ADDRESSES = [
  "0x7A4C0fd9708798a1D7e1Bd27A6C902C9Ba033a75",
  "0x81f63e8de95FD0acC9B9c6f38481B8E9FdAb000b",
  "0x8E8c51b1fd6a0c76c1Fc1d877d962e99af7E5016",
  "0x01017f9F1a27E3E5CfEa61001181e2e31e237845",
  "0x52235F46fD055ed41855d865410a68c75936801d",
];

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function decimals() public view returns (uint8)",
  "function balanceOf(address owner) public view returns (uint256)",
];

const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];

export async function swapUSDTtoWYDA(usdtAmount: string) {
  if (!window.ethereum) throw new Error("MetaMask is not installed");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, signer);
  const routerContract = new ethers.Contract(APESWAP_ROUTER_ADDRESS, ROUTER_ABI, signer);

  const amountIn = ethers.parseUnits(usdtAmount, 18);
  
  // Approve router
  const approveTx = await usdtContract.approve(APESWAP_ROUTER_ADDRESS, amountIn);
  await approveTx.wait();

  const path = [USDT_CONTRACT_ADDRESS, WYDA_CONTRACT_ADDRESS];
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins

  // Get estimated output for slippage (simplified)
  const amounts = await routerContract.getAmountsOut(amountIn, path);
  const amountOutMin = (amounts[1] * 95n) / 100n; // 5% slippage

  const tx = await routerContract.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    path,
    address,
    deadline
  );
  return tx.wait();
}

export async function addWYDALiquidity(usdtAmount: string) {
  if (!window.ethereum) throw new Error("MetaMask is not installed");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, ERC20_ABI, signer);
  const wydaContract = new ethers.Contract(WYDA_CONTRACT_ADDRESS, ERC20_ABI, signer);
  const routerContract = new ethers.Contract(APESWAP_ROUTER_ADDRESS, ROUTER_ABI, signer);

  const amountUsdtDesired = ethers.parseUnits(usdtAmount, 18);
  
  // Calculate required WYDA (simplified: 1:1 for this example, in real app use getAmountsOut)
  const path = [USDT_CONTRACT_ADDRESS, WYDA_CONTRACT_ADDRESS];
  const amounts = await routerContract.getAmountsOut(amountUsdtDesired, path);
  const amountWydaDesired = amounts[1];

  // Approve both tokens
  const approveUsdt = await usdtContract.approve(APESWAP_ROUTER_ADDRESS, amountUsdtDesired);
  await approveUsdt.wait();
  const approveWyda = await wydaContract.approve(APESWAP_ROUTER_ADDRESS, amountWydaDesired);
  await approveWyda.wait();

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  const tx = await routerContract.addLiquidity(
    USDT_CONTRACT_ADDRESS,
    WYDA_CONTRACT_ADDRESS,
    amountUsdtDesired,
    amountWydaDesired,
    (amountUsdtDesired * 95n) / 100n,
    (amountWydaDesired * 95n) / 100n,
    address,
    deadline
  );
  return tx.wait();
}

export async function voteForCandidate(candidateIndex: number) {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const wydaContract = new ethers.Contract(WYDA_CONTRACT_ADDRESS, ERC20_ABI, signer);
  const targetAddress = TARGET_ADDRESSES[candidateIndex];
  
  if (!targetAddress) {
    throw new Error("Invalid candidate index");
  }

  // 10 Wyda
  const decimals = await wydaContract.decimals();
  const amount = ethers.parseUnits("10", decimals);

  const tx = await wydaContract.transfer(targetAddress, amount);
  return tx.wait();
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0];
}
