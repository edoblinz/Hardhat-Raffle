const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
   ? describe.skip
   : describe("Raffle Uint Tests", function () {
        let raffle, raffleContract, raffleEntranceFee, deployer

        beforeEach(async function () {
           deployer = (await getNamedAccounts()).deployer
           raffle = await ethers.getContract("Raffle", deployer)
           raffleEntranceFee = await raffle.getEntranceFee()
        })

        describe("fulfillRandomWords", function () {
           it("work with a live ChainLink keepers and chainLink VRF, we get a random winner", async function () {
              // enter the raffle
              const startingTimeStamp = await raffle.getLatestTimeStamps()
              const accounts = await ethers.getSigners()

              await new Promise(async (resolve, reject) => {
                 // setup listener before we enter the raffle
                 // just in case the blockchain moves really fast

                 raffle.once("WinnerPicked", async () => {
                    console.log("WinnerPicked event fired!")
                    try {
                       const recentWinner = raffle.getRecentWinner()
                       const raffleState = await raffle.getRaffleState()
                       const winnerEndingBalance = await accounts[0].getBalance()
                       const endingTimeStamp = await raffle.getLatestTimeStamps()

                       await expect(raffle.getPlayers(0)).to.be.reverted
                       assert.equal(recentWinner.toString(), accounts[0].address)
                       assert.equal(raffleState, 0)
                       assert.equal(
                          winnerEndingBalance.toString(),
                          winnerStartingBalance.add(raffleEntranceFee).toString()
                       )
                       assert(endingTimeStamp > startingTimeStamp)
                       resolve()
                    } catch (error) {
                       console.log(error)
                       reject(error)
                    }
                 })
                 //  Then Entering the rafffle
                 await raffle.enterRaffle({ value: raffleEntranceFee })
                 const winnerStartingBalance = await accounts[0].getBalance()

                 //  and this wont complete until our listener has finished listening
              })
           })
        })
     })
