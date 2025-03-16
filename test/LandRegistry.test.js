const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistry", function () {
    let LandRegistry;
    let landRegistry;
    let owner;
    let verifier;
    let addr1;
    let addr2;

    beforeEach(async function () {
        // Get signers
        [owner, verifier, addr1, addr2] = await ethers.getSigners();

        // Deploy contract
        LandRegistry = await ethers.getContractFactory("LandRegistry");
        landRegistry = await LandRegistry.deploy();
        await landRegistry.deployed();

        // Add verifier
        await landRegistry.addVerifier(verifier.address);
    });

    describe("Deployment", function () {
        it("Should set the right admin", async function () {
            expect(await landRegistry.admin()).to.equal(owner.address);
        });
    });

    describe("Verifier Management", function () {
        it("Should add verifier correctly", async function () {
            expect(await landRegistry.verifiers(verifier.address)).to.equal(true);
        });

        it("Should remove verifier correctly", async function () {
            await landRegistry.removeVerifier(verifier.address);
            expect(await landRegistry.verifiers(verifier.address)).to.equal(false);
        });

        it("Should not allow non-admin to add verifier", async function () {
            await expect(
                landRegistry.connect(addr1).addVerifier(addr2.address)
            ).to.be.revertedWith("Only admin can perform this action");
        });
    });

    describe("Land Registration", function () {
        const landDetails = {
            ownerName: "John Doe",
            area: 1000,
            location: "123 Main St",
            value: ethers.utils.parseEther("10"),
            description: "Beautiful property"
        };

        it("Should register land correctly", async function () {
            await landRegistry.connect(addr1).registerLand(
                landDetails.ownerName,
                landDetails.area,
                landDetails.location,
                landDetails.value,
                landDetails.description
            );

            const land = await landRegistry.lands(1);
            expect(land.owner).to.equal(addr1.address);
            expect(land.ownerName).to.equal(landDetails.ownerName);
            expect(land.area).to.equal(landDetails.area);
            expect(land.location).to.equal(landDetails.location);
            expect(land.value).to.equal(landDetails.value);
            expect(land.description).to.equal(landDetails.description);
            expect(land.isVerified).to.equal(false);
        });

        it("Should emit LandRegistered event", async function () {
            const tx = await landRegistry.connect(addr1).registerLand(
                landDetails.ownerName,
                landDetails.area,
                landDetails.location,
                landDetails.value,
                landDetails.description
            );

            const receipt = await tx.wait();
            const event = receipt.events?.find(e => e.event === 'LandRegistered');
            
            expect(event?.args?.id).to.equal(1);
            expect(event?.args?.owner).to.equal(addr1.address);
            expect(event?.args?.location).to.equal(landDetails.location);
            expect(event?.args?.value).to.equal(landDetails.value);
            // Timestamp check is skipped as it can vary slightly
        });
    });

    describe("Land Verification", function () {
        beforeEach(async function () {
            await landRegistry.connect(addr1).registerLand(
                "John Doe",
                1000,
                "123 Main St",
                ethers.utils.parseEther("10"),
                "Beautiful property"
            );
        });

        it("Should verify land correctly", async function () {
            await landRegistry.connect(verifier).verifyLand(1);
            const land = await landRegistry.lands(1);
            expect(land.isVerified).to.equal(true);
        });

        it("Should not allow non-verifier to verify land", async function () {
            await expect(
                landRegistry.connect(addr2).verifyLand(1)
            ).to.be.revertedWith("Only verifier can perform this action");
        });
    });

    describe("Land Transfer", function () {
        beforeEach(async function () {
            await landRegistry.connect(addr1).registerLand(
                "John Doe",
                1000,
                "123 Main St",
                ethers.utils.parseEther("10"),
                "Beautiful property"
            );
            await landRegistry.connect(verifier).verifyLand(1);
        });

        it("Should transfer land correctly", async function () {
            const newValue = ethers.utils.parseEther("12");
            await landRegistry.connect(addr1).transferLand(1, addr2.address, newValue);
            
            const land = await landRegistry.lands(1);
            expect(land.owner).to.equal(addr2.address);
            expect(land.value).to.equal(newValue);
        });

        it("Should not transfer unverified land", async function () {
            await landRegistry.connect(addr1).registerLand(
                "John Doe",
                1000,
                "456 Side St",
                ethers.utils.parseEther("10"),
                "Another property"
            );

            await expect(
                landRegistry.connect(addr1).transferLand(2, addr2.address, ethers.utils.parseEther("12"))
            ).to.be.revertedWith("Land is not verified");
        });

        it("Should maintain transfer history", async function () {
            const newValue = ethers.utils.parseEther("12");
            await landRegistry.connect(addr1).transferLand(1, addr2.address, newValue);
            
            const history = await landRegistry.getLandTransferHistory(1);
            expect(history.length).to.equal(1);
            expect(history[0].from).to.equal(addr1.address);
            expect(history[0].to).to.equal(addr2.address);
            expect(history[0].value).to.equal(newValue);
        });
    });
});
