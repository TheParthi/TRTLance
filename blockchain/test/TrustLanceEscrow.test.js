const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

const ref = (n = 1) => ethers.zeroPadBytes(ethers.toBeHex(n), 32);
const eth = (v) => ethers.parseEther(v);

describe('TrustLanceEscrow', () => {
  async function deploy() {
    const [owner, arbiter, client, freelancer, stranger, newArbiter] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory('TrustLanceEscrow');
    const escrow = await Escrow.deploy(arbiter.address);
    return { escrow, owner, arbiter, client, freelancer, stranger, newArbiter };
  }

  async function funded() {
    const ctx = await deploy();
    const amounts = [eth('1'), eth('2'), eth('3')];
    await ctx.escrow.connect(ctx.client).fund(ref(), ctx.freelancer.address, amounts, { value: eth('6') });
    const key = await ctx.escrow.keyFor(ctx.client.address, ref());
    return { ...ctx, amounts, key };
  }

  describe('fund', () => {
    it('stores every milestone and emits Funded with the amounts', async () => {
      const { escrow, client, freelancer } = await loadFixture(deploy);
      const amounts = [eth('1'), eth('2')];
      const key = await escrow.keyFor(client.address, ref());
      await expect(escrow.connect(client).fund(ref(), freelancer.address, amounts, { value: eth('3') }))
        .to.emit(escrow, 'Funded')
        .withArgs(key, ref(), client.address, freelancer.address, eth('3'), amounts);
      const a = await escrow.getAgreement(key);
      expect(a.client).to.equal(client.address);
      expect(a.milestoneCount).to.equal(2);
      expect((await escrow.getMilestone(key, 1)).amount).to.equal(eth('2'));
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(eth('3'));
    });

    it('rejects wrong totals, zero amounts, self-dealing and duplicates', async () => {
      const { escrow, client, freelancer } = await loadFixture(deploy);
      await expect(escrow.connect(client).fund(ref(), freelancer.address, [eth('1')], { value: eth('2') }))
        .to.be.revertedWithCustomError(escrow, 'InvalidAmount');
      await expect(escrow.connect(client).fund(ref(), freelancer.address, [0n], { value: 0n }))
        .to.be.revertedWithCustomError(escrow, 'InvalidAmount');
      await expect(escrow.connect(client).fund(ref(), client.address, [eth('1')], { value: eth('1') }))
        .to.be.revertedWithCustomError(escrow, 'InvalidAgreement');
      await expect(escrow.connect(client).fund(ref(), freelancer.address, [], { value: 0n }))
        .to.be.revertedWithCustomError(escrow, 'InvalidAgreement');
      await escrow.connect(client).fund(ref(), freelancer.address, [eth('1')], { value: eth('1') });
      await expect(escrow.connect(client).fund(ref(), freelancer.address, [eth('1')], { value: eth('1') }))
        .to.be.revertedWithCustomError(escrow, 'AlreadyFunded');
    });

    it('keys agreements by client so another wallet cannot squat a reference', async () => {
      const { escrow, client, freelancer, stranger } = await loadFixture(deploy);
      await escrow.connect(stranger).fund(ref(7), freelancer.address, [eth('1')], { value: eth('1') });
      await expect(escrow.connect(client).fund(ref(7), freelancer.address, [eth('1')], { value: eth('1') })).to.not.be.reverted;
    });

    it('rejects plain transfers', async () => {
      const { escrow, client } = await loadFixture(deploy);
      await expect(client.sendTransaction({ to: await escrow.getAddress(), value: 1n })).to.be.reverted;
    });
  });

  describe('release and refund', () => {
    it('only the client releases, exactly once, to the freelancer', async () => {
      const { escrow, key, client, freelancer, stranger } = await loadFixture(funded);
      await expect(escrow.connect(freelancer).release(key, 0)).to.be.revertedWithCustomError(escrow, 'NotClient');
      await expect(escrow.connect(stranger).release(key, 0)).to.be.revertedWithCustomError(escrow, 'NotClient');
      await expect(escrow.connect(client).release(key, 0)).to.changeEtherBalances([freelancer, escrow], [eth('1'), -eth('1')]);
      await expect(escrow.connect(client).release(key, 0)).to.be.revertedWithCustomError(escrow, 'InvalidStatus');
      await expect(escrow.connect(client).release(key, 9)).to.be.revertedWithCustomError(escrow, 'InvalidAgreement');
    });

    it('only the freelancer refunds a funded milestone', async () => {
      const { escrow, key, client, freelancer } = await loadFixture(funded);
      await expect(escrow.connect(client).refund(key, 1)).to.be.revertedWithCustomError(escrow, 'NotFreelancer');
      const tx = escrow.connect(freelancer).refund(key, 1);
      await expect(tx).to.emit(escrow, 'Refunded').withArgs(key, 1, client.address, eth('2'));
      await expect(tx).to.changeEtherBalance(client, eth('2'));
      await expect(escrow.connect(client).release(key, 1)).to.be.revertedWithCustomError(escrow, 'InvalidStatus');
    });
  });

  describe('disputes', () => {
    it('freezes a milestone and lets only the arbiter settle it by percentage', async () => {
      const { escrow, key, client, freelancer, arbiter, stranger } = await loadFixture(funded);
      await expect(escrow.connect(stranger).raiseDispute(key, 2)).to.be.revertedWithCustomError(escrow, 'NotParty');
      await expect(escrow.connect(freelancer).raiseDispute(key, 2)).to.emit(escrow, 'DisputeRaised').withArgs(key, 2, freelancer.address);
      await expect(escrow.connect(client).release(key, 2)).to.be.revertedWithCustomError(escrow, 'InvalidStatus');
      await expect(escrow.connect(freelancer).refund(key, 2)).to.be.revertedWithCustomError(escrow, 'InvalidStatus');
      await expect(escrow.connect(client).resolveDispute(key, 2, 50)).to.be.revertedWithCustomError(escrow, 'NotArbiter');
      await expect(escrow.connect(arbiter).resolveDispute(key, 2, 101)).to.be.revertedWithCustomError(escrow, 'InvalidAmount');
      const tx = escrow.connect(arbiter).resolveDispute(key, 2, 40);
      await expect(tx).to.emit(escrow, 'DisputeResolved').withArgs(key, 2, 40, eth('1.2'), eth('1.8'));
      await expect(tx).to.changeEtherBalances([freelancer, client], [eth('1.2'), eth('1.8')]);
      await expect(escrow.connect(arbiter).resolveDispute(key, 2, 40)).to.be.revertedWithCustomError(escrow, 'InvalidStatus');
    });

    it('the arbiter cannot touch milestones nobody disputed', async () => {
      const { escrow, key, arbiter } = await loadFixture(funded);
      await expect(escrow.connect(arbiter).resolveDispute(key, 0, 0)).to.be.revertedWithCustomError(escrow, 'InvalidStatus');
    });

    it('rounds the freelancer share down and never loses wei', async () => {
      const { escrow, client, freelancer, arbiter } = await loadFixture(deploy);
      await escrow.connect(client).fund(ref(3), freelancer.address, [7n], { value: 7n });
      const key = await escrow.keyFor(client.address, ref(3));
      await escrow.connect(client).raiseDispute(key, 0);
      await expect(escrow.connect(arbiter).resolveDispute(key, 0, 33))
        .to.emit(escrow, 'DisputeResolved').withArgs(key, 0, 33, 2n, 5n);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
    });
  });

  describe('administration', () => {
    it('only the owner rotates the arbiter, and ownership cannot be renounced', async () => {
      const { escrow, owner, stranger, newArbiter } = await loadFixture(deploy);
      await expect(escrow.connect(stranger).setArbiter(newArbiter.address)).to.be.revertedWithCustomError(escrow, 'OwnableUnauthorizedAccount');
      await escrow.connect(owner).setArbiter(newArbiter.address);
      expect(await escrow.arbiter()).to.equal(newArbiter.address);
      await expect(escrow.connect(owner).renounceOwnership()).to.be.reverted;
    });

    it('has no way for the owner to withdraw escrowed funds', async () => {
      const { escrow } = await loadFixture(funded);
      const names = escrow.interface.fragments.filter((f) => f.type === 'function').map((f) => f.name);
      expect(names).to.not.include('emergencyWithdraw');
      expect(names).to.not.include('withdraw');
    });
  });

  describe('reentrancy', () => {
    it('a malicious freelancer contract cannot re-enter release', async () => {
      const { escrow, client } = await loadFixture(deploy);
      const Attacker = await ethers.getContractFactory('ReentrantReceiver');
      const attacker = await Attacker.deploy(await escrow.getAddress());
      await escrow.connect(client).fund(ref(9), await attacker.getAddress(), [eth('1'), eth('1')], { value: eth('2') });
      const key = await escrow.keyFor(client.address, ref(9));
      await attacker.setTarget(key, 1);
      // The re-entrant call reverts inside receive(), so the whole release reverts.
      await expect(escrow.connect(client).release(key, 0)).to.be.revertedWithCustomError(escrow, 'TransferFailed');
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(eth('2'));
    });
  });
});
