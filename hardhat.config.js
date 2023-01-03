require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ""
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "0xjhilk"
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""
// console.log(GOERLI_RPC_URL, COINMARKETCAP_API_KEY, ETHERSCAN_API_KEY)

module.exports = {
   solidity: "0.8.17",
   defaultNetwork: "hardhat",
   networks: {
      hardhat: {
         chainId: 31337,
         blockConfirmation: 1,
      },
      goerli: {
         url: GOERLI_RPC_URL,
         accounts: [PRIVATE_KEY],
         chainId: 5,
         blockConfirmation: 6,
      },
   },
   etherscan: {
      apiKey: ETHERSCAN_API_KEY,
   },
   gasReporter: {
      enabled: true,
      outputFile: "gas-report.txt",
      noColors: true,
      currency: "USD",
      coinmarketcap: COINMARKETCAP_API_KEY,
      token: "ETH",
   },
   namedAccounts: {
      deployer: {
         default: 0,
      },
      player: {
         default: 1,
      },
   },
   mocha: {
      timeout: 500000, // 500 seconds max
   },
}
