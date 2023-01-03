const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
!developmentChains.includes(network.name)
   ? describe.skip
   : describe("Raffle Uint Tests", function () {
        let raffle, raffleContract, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval
        const chainId = network.config.chainId

        beforeEach(async function () {
           deployer = (await getNamedAccounts()).deployer
           await deployments.fixture(["all"])
           raffle = await ethers.getContract("Raffle", deployer)
           vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
           raffleEntranceFee = await raffle.getEntranceFee()
           interval = await raffle.getInterval()
        })

        describe("constructor", function () {
           it("Initializes the raffle correctly", async function () {
              // Ideally we make our tests have just one assert per "it"
              const raffleState = await raffle.getRaffleState()
              assert.equal(raffleState.toString(), "0")
              assert.equal(interval.toString(), networkConfig[chainId]["interval"])
           })
        })

        describe("enterRaffle", function () {
           it("revert when you don't pay enough", async function () {
              await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered")
           })
           it("Records players when they enter", async function () {
              await raffle.enterRaffle({ value: raffleEntranceFee })
              const playerFromContract = await raffle.getPlayer(0)
              assert.equal(playerFromContract, deployer)
           })
           it("Emit events on enter", async function () {
              await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                 raffle,
                 "RaffleEnter"
              )
           })
           it("doesnt allow entrance when raffle is calculating ", async function () {
              await raffle.enterRaffle({ value: raffleEntranceFee })
              await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
              await network.provider.send("evm_mine", [])
              //  We pretend to be Chainlink keeper
              await raffle.performUpkeep([])
              await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                 "Raffle__NotOpen"
              )
           })
        })
        describe("checkUpkeep", function () {
           it("returns false if people haven't sent any ETH", async () => {
              await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
              await network.provider.request({ method: "evm_mine", params: [] })
              const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
              assert(!upkeepNeeded)
           })
           it("returns false if raffle isn't open", async () => {
              await raffle.enterRaffle({ value: raffleEntranceFee })
              await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
              await network.provider.request({ method: "evm_mine", params: [] })
              await raffle.performUpkeep([]) // changes the state to calculating
              const raffleState = await raffle.getRaffleState() // stores the new state
              const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
              assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
           })
           it("returns false if enough time hasn't passed", async () => {
              await raffle.enterRaffle({ value: raffleEntranceFee })
              await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
              await network.provider.request({ method: "evm_mine", params: [] })
              const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
              assert(!upkeepNeeded)
           })
           it("returns true if enough time has passed, has players, eth, and is open", async () => {
              await raffle.enterRaffle({ value: raffleEntranceFee })
              await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
              await network.provider.request({ method: "evm_mine", params: [] })
              const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
              assert(upkeepNeeded)
           })
        })

        describe("performUpkeep", function () {
           it("can only run if checkupkeep is true", async () => {
              await raffle.enterRaffle({ value: raffleEntranceFee })
              await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
              await network.provider.request({ method: "evm_mine", params: [] })
              const tx = await raffle.performUpkeep("0x")
              assert(tx)
           })
           it("reverts if checkup is false", async () => {
              await expect(raffle.performUpkeep("0x")).to.be.revertedWith("Raffle__UpkeepNotNeeded")
           })
           it("updates the raffle state and emits a requestId", async () => {
              // Too many asserts in this test!
              await raffle.enterRaffle({ value: raffleEntranceFee })
              await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
              await network.provider.request({ method: "evm_mine", params: [] })
              const txResponse = await raffle.performUpkeep("0x") // emits requestId
              const txReceipt = await txResponse.wait(1) // waits 1 block
              const raffleState = await raffle.getRaffleState() // updates state
              const requestId = txReceipt.events[1].args.requestId
              assert(requestId.toNumber() > 0)
              assert(raffleState.toString() == "1") // 0 = open, 1 = calculating
           })
        })

        describe("fulfillRandomWords", function () {
           beforeEach(async () => {
              await raffle.enterRaffle({ value: raffleEntranceFee })
              await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
              await network.provider.request({ method: "evm_mine", params: [] })
           })
           it("can only be called after performupkeep", async () => {
              await expect(
                 vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
              ).to.be.revertedWith("nonexistent request")
              await expect(
                 vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
              ).to.be.revertedWith("nonexistent request")
           })

           // This test is too big...
           // This test simulates users entering the raffle and wraps the entire functionality of the raffle
           // inside a promise that will resolve if everything is successful.
           // An event listener for the WinnerPicked is set up
           // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
           // All the assertions are done once the WinnerPicked event is fired
           it("picks a winner, resets, and sends money", async () => {
              const additionalEntrances = 3 // to test
              const startingIndex = 1
              const accounts = await ethers.getSigners()
              raffleContract = await ethers.getContract("Raffle") // Returns a new connection to the Raffle contract
              for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                 // i = 2; i < 5; i=i+1
                 raffle = raffleContract.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to player
                 await raffle.enterRaffle({ value: raffleEntranceFee })
               }
              const startingTimeStamp = await raffle.getLatestTimeStamp() // stores starting timestamp (before we fire our event)

              // This will be more important for our staging tests...
              await new Promise(async (resolve, reject) => {
                 raffle.once("WinnerPicked", async () => {
                    // event listener for WinnerPicked
                    console.log("WinnerPicked event fired!")
                    // assert throws an error if it fails, so we need to wrap
                    // it in a try/catch so that the promise returns event
                    // if it fails.
                    try {
                       const recentWinner = await raffle.getRecentWinner()
                       const raffleState = await raffle.getRaffleState()
                       const winnerBalance = await accounts[1].getBalance()
                       const endingTimeStamp = await raffle.getLatestTimeStamp()
                       await expect(raffle.getPlayer(0)).to.be.reverted
                       // Comparisons to check if our ending values are correct:
                       assert.equal(recentWinner.toString(), accounts[1].address)
                       assert.equal(raffleState, 0)
                       assert.equal(
                          winnerBalance.toString(),
                          startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                             .add(raffleEntranceFee.mul(additionalEntrances).add(raffleEntranceFee))
                             .toString()
                       )
                       assert(endingTimeStamp > startingTimeStamp)
                       resolve() // if try passes, resolves the promise
                    } catch (e) {
                       reject(e) // if try fails, rejects the promise
                    }
                 })

                 // kicking off the event by mocking the chainlink keepers and vrf coordinator
                 const tx = await raffle.performUpkeep("0x")
                 const txReceipt = await tx.wait(1)
                 const startingBalance = await accounts[1].getBalance()
                 await vrfCoordinatorV2Mock.fulfillRandomWords(
                    txReceipt.events[1].args.requestId,
                    raffle.address
                 )
              })
           })
        })
     })
