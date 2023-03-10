const { deployments, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25 is the premium. it costs 0.25Link for a request
const GAS_PRICE_LINK = 1e9 // link per gas. calculated value based on the gas price of the chain

// ChainLink nodes pay the gas fees to give us the randomness & to do external execution

module.exports = async function ({ getNamedAccounts, deployments }) {
   const { deploy, log } = deployments
   const { deployer } = await getNamedAccounts()
   const chainId = network.config.chainId

   if (chainId == 31337) {
      
      log("Local network detected Deploying mocks...")
      // deploy a mock vrfCoordinator
      await deploy("VRFCoordinatorV2Mock", {
         from: deployer,
         log: true,
         args: [BASE_FEE, GAS_PRICE_LINK],
      })
      log("Mocks Deployed!")
      log("------------------------------------------------")
   }
}

module.exports.tags = ["all", "mocks"]
