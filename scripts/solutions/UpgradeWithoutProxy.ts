import { ethers } from "hardhat";

async function main() {
  const usersWallet = new Array(3).fill(0).map(() => ethers.Wallet.createRandom());

  // deploy
  const tokenF = await ethers.getContractFactory("TestToken");
  const tokenC = await tokenF.deploy([
    usersWallet[0].address,
    usersWallet[1].address,
    usersWallet[2].address,
  ]);
  await tokenC.deployed();
  const contractF = await ethers.getContractFactory("P1_UpgradeWithoutProxyV1");
  const contract = await contractF.deploy();
  await contract.deployed();

  // users depoist token to contract
  {
    const promises = usersWallet.map(async (wallet) => {
      const balance = await tokenC.balanceOf(wallet.address);
      const tx = await tokenC.connect(wallet).approve(contract.address, balance);
      await tx.wait();
    });
    await Promise.all(promises);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
