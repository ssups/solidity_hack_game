import { ethers } from "hardhat";
import { P1_UpgradeWithoutProxyV1__factory } from "../../typechain-types";

async function main() {
  const test1 = ethers.utils
    .keccak256(ethers.utils.toUtf8Bytes("transfer(address,uint)"))
    .slice(2, 2 + 8);
  const test2 = ethers.utils
    .keccak256(ethers.utils.toUtf8Bytes("transfer(address,uint256)"))
    .slice(2, 2 + 8);

  console.log(test1);
  console.log(test2);

  return;
  const provider = ethers.provider;
  const [owner, user1, user2, user3] = await ethers.getSigners();
  const users = [user1, user2, user3];
  const funcSig = ethers.utils
    .keccak256(ethers.utils.toUtf8Bytes("withdrawAll(address)"))
    .slice(2, 2 + 8);

  const TokenC = await ethers.getContractFactory("TestToken");
  const tokenC = await TokenC.deploy([user1.address, user2.address, user3.address]);
  await tokenC.deployed();

  // first deploy contract
  const Factory1 = await ethers.getContractFactory("Factory1");
  const factory1 = await Factory1.deploy();
  await factory1.deployed();

  const salt = 1;
  const bytecode = (await ethers.getContractFactory("S1_UpgradeWithoutProxyV1")).bytecode;
  const tx = await factory1.deploy(salt, bytecode);
  const receipt = await tx.wait();
  const logData = receipt.logs[0].data.slice(2);
  const contractV1Ca = "0x" + logData.slice(24, 64);
  const factory2Ca = "0x" + logData.slice(64 + 24);

  const contractV1 = new ethers.Contract(
    contractV1Ca,
    P1_UpgradeWithoutProxyV1__factory.abi,
    provider
  );
  console.log("@@ contractV1 deployed: ");
  console.log(contractV1Ca);
  console.log("");

  // users depoist token to contract
  {
    let promises = users.map(async (user) => {
      const balance = await tokenC.balanceOf(user.address);
      const approveTx = await tokenC.connect(user).approve(contractV1Ca, balance);
      await approveTx.wait();
      const depositTx = await contractV1.connect(user).deposit(tokenC.address, balance);
      await depositTx.wait();
    });
    await Promise.all(promises);

    const user_balance: { [key: string]: string } = {};
    promises = users.map(async (user, ind) => {
      user_balance[`user${ind + 1}`] = ethers.utils.formatEther(
        await contractV1.balanceOf(tokenC.address, user.address)
      );
    });
    await Promise.all(promises);

    const contractBalance = ethers.utils.formatEther(await tokenC.balanceOf(contractV1Ca));

    console.log("@@ deposits of users to contratV1 successed");
    console.log(user_balance);
    console.log("contract total token balance: ", contractBalance);
    console.log("");
  }

  // try to withdraw all user's assets
  {
    const paddedTokenCa = "0".repeat(64 - 40) + tokenC.address.slice(2);
    const txData = "0x" + funcSig + paddedTokenCa;
    try {
      const tx = await owner.sendTransaction({
        to: contractV1.address,
        data: txData,
        gasLimit: 1000000,
      });
      await tx.wait();
    } catch (error) {
      if (error instanceof Error) {
        const revertIndex = error.message.indexOf("revert");
        if (revertIndex > 0) {
          console.log("@@ function call of withdrawAll to contractV1 reverted");
          console.log(error.message.slice(revertIndex));
          console.log("");
        } else console.log(error.message);
      }
    }
  }

  // destruct all contracts for upgrade
  {
    const destroyTx = await factory1.connect(owner).destroy();
    await destroyTx.wait();
    const contractCode = (await provider.getCode(contractV1.address)).slice(2);
    if (contractCode.length === 0) {
      console.log("@@ contractV1 successfully destroyed");
      console.log("");
    }
  }

  // deploy contractV2 wich has same contract address with contractV1
  {
    const bytecode = (await ethers.getContractFactory("S1_UpgradeWithoutProxyV2")).bytecode;
    const tx = await factory1.deploy(salt, bytecode);
    const receipt = await tx.wait();
    const contractV2Ca = "0x" + receipt.logs[0].data.slice(2 + 24, 2 + 64);
    console.log("@@ successfully deployed contracV2 at same address with contractV1");
    console.log("contractV1: ", contractV1Ca);
    console.log("contractV2: ", contractV2Ca);
    console.log("");
  }

  // withdraw all user's assets again
  {
    const before_ownerToeknBalance = ethers.utils.formatEther(
      await tokenC.balanceOf(owner.address)
    );
    const before_contractBalance = ethers.utils.formatEther(await tokenC.balanceOf(contractV1Ca));

    const paddedTokenCa = "0".repeat(64 - 40) + tokenC.address.slice(2);
    const txData = "0x" + funcSig + paddedTokenCa;
    const tx = await owner.sendTransaction({
      to: contractV1Ca,
      data: txData,
      gasLimit: 1000000,
    });
    await tx.wait();

    const after_contractBalance = ethers.utils.formatEther(await tokenC.balanceOf(contractV1Ca));
    const after_ownerTokenBalance = ethers.utils.formatEther(await tokenC.balanceOf(owner.address));

    console.log("@@ successfully withdraw all user's token balance deposited in contract");
    console.log("before contract total toekn balance: ", before_contractBalance);
    console.log("after contract total toekn balance: ", after_contractBalance);
    console.log("before owner token balance: ", before_ownerToeknBalance);
    console.log("after owner token balance: ", after_ownerTokenBalance);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
