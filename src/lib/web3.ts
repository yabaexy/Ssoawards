import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const WYDA_CONTRACT_ADDRESS = "0xD84B7E8b295d9Fa9656527AC33Bf4F683aE7d2C4";
export const TARGET_ADDRESSES = [
  "0x7A4C0fd9708798a1D7e1Bd27A6C902C9Ba033a75",
  "0x81f63e8de95FD0acC9B9c6f38481B8E9FdAb000b",
  "0x8E8c51b1fd6a0c76c1Fc1d877d962e99af7E5016",
  "0x01017f9F1a27E3E5CfEa61001181e2e31e237845",
  "0x52235F46fD055ed41855d865410a68c75936801d",
];

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function decimals() public view returns (uint8)",
  "function balanceOf(address owner) public view returns (uint256)",
];

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
