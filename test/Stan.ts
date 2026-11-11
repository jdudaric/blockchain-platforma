import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { network, artifacts } from "hardhat";
import { Interface, ZeroAddress } from "ethers";

const WEEK = 7 * 24 * 60 * 60;
async function setup(contractName = "Stan") {
  const connection = await network.create();
  const { ethers } = connection;
  const [rep, deputy, alice, bob, other] = await ethers.getSigners();
  const token = await ethers.deployContract(contractName, [deputy.address]);
  await token.waitForDeployment();
  const call = (signer: typeof rep) => token.connect(signer) as typeof token;
  const at = async (timestamp: number) => {
    await connection.provider.request({ method: "evm_setNextBlockTimestamp", params: [timestamp] });
  };
  const request = async (id = 1) => {
    const receipt = await (await call(deputy).requestTakeover(id)).wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    return block!.timestamp + WEEK;
  };
  return { connection, ethers, token, rep, deputy, alice, bob, other, call, at, request };
}

async function fails(action: Promise<unknown>, message: string) {
  await assert.rejects(action, (error: any) => {
    // Hardhat i ethers mogu omotati RPC grešku na različitim razinama.
    const text = String(error.message);
    assert.ok(text.includes(`'${message}'`) || text.includes(`"${message}"`) || error.reason === message, text);
    return true;
  });
}
async function events(token: any, tx: any) {
  const receipt = await tx.wait();
  return receipt.logs.flatMap((log: any) => {
    try { const parsed = token.interface.parseLog(log); return parsed ? [parsed] : []; }
    catch { return []; }
  });
}

describe("Stan — IStanToken", () => {
  it("K39/K41: deploy, javna čitanja i prazna početna evidencija", async () => {
    const {token, call, alice, rep, deputy} = await setup();
    assert.equal(await call(alice).name(), "Stan");
    assert.equal(await call(alice).symbol(), "STN");
    assert.equal(await call(alice).decimals(), 0n);
    assert.equal(await token.totalSupply(), 0n);
    assert.equal(await token.balanceOf(alice.address), 0n);
    assert.equal(await token.balanceOf(ZeroAddress), 0n);
    assert.equal(await token.allowance(ZeroAddress, ZeroAddress), 0n);
    assert.equal(await token.representative(), rep.address);
    assert.equal(await token.owner(), rep.address);
    assert.equal(await token.deputy(), deputy.address);
    for (let id = 1; id <= 25; id++) assert.equal(await call(alice).ownerOfApartment(id), ZeroAddress);
  });
  it("K39: odbija nevaljanog početnog zamjenika", async () => {
    const {ethers, rep} = await setup();
    for (const address of [ZeroAddress, rep.address])
      await fails(ethers.deployContract("Stan", [address]), "Neispravna adresa");
  });
  it("K1/K6/K24: dodjela, više stanova, oduzimanje i novi vlasnik", async () => {
    const {token, alice, bob} = await setup();
    const assigned = await events(token, await token.assignApartment(1, alice.address));
    assert.deepEqual(assigned.map((e: any) => e.name), ["Transfer", "ApartmentAssigned"]);
    assert.deepEqual([...assigned[0].args], [ZeroAddress, alice.address, 1n]);
    assert.deepEqual([...assigned[1].args], [1n, alice.address]);
    await token.assignApartment(25, alice.address);
    assert.equal(await token.balanceOf(alice.address), 2n);
    assert.equal(await token.totalSupply(), 2n);
    const revoked = await events(token, await token.revokeApartment(1));
    assert.deepEqual(revoked.map((e: any) => e.name), ["Transfer", "ApartmentRevoked"]);
    assert.deepEqual([...revoked[0].args], [alice.address, ZeroAddress, 1n]);
    assert.deepEqual([...revoked[1].args], [1n, alice.address]);
    assert.equal(await token.ownerOfApartment(1), ZeroAddress);
    assert.equal(await token.balanceOf(alice.address), 1n);
    assert.equal(await token.totalSupply(), 1n);
    await token.assignApartment(1, bob.address);
    assert.equal(await token.ownerOfApartment(1), bob.address);
    assert.equal(await token.balanceOf(bob.address), 1n);
  });
  it("K2/K3: neovlašteni i dvostruki upisi ne mijenjaju stanje", async () => {
    const {token, call, deputy, alice} = await setup();
    for (const caller of [deputy, alice]) {
      await fails(call(caller).assignApartment(1, alice.address), "Samo predstavnik");
      await fails(call(caller).revokeApartment(1), "Samo predstavnik");
    }
    await token.assignApartment(1, alice.address);
    await fails(token.assignApartment(1, deputy.address), "Stan vec ima token");
    assert.equal(await token.totalSupply(), 1n);
    assert.equal(await token.ownerOfApartment(1), alice.address);
    assert.equal((await token.queryFilter(token.filters.ApartmentAssigned())).length, 1);
  });
  it("K1/K6/K41: granice registra, nulta adresa i stan bez prava", async () => {
    const {token, alice} = await setup();
    for (const id of [0, 26]) {
      await fails(token.assignApartment(id, alice.address), "Stan ne postoji");
      await fails(token.revokeApartment(id), "Stan ne postoji");
      await fails(token.ownerOfApartment(id), "Stan ne postoji");
    }
    await fails(token.assignApartment(1, ZeroAddress), "Neispravna adresa");
    await fails(token.revokeApartment(1), "Stan nema token");
  });
  for (const value of [0, 1, 100]) {
    it(`K4: transfer, approve i transferFrom odbijaju iznos ${value}`, async () => {
      const {token, call, rep, deputy, alice, bob} = await setup();
      await token.assignApartment(1, alice.address);
      for (const caller of [rep, deputy, alice, bob]) {
        for (const address of [bob.address, ZeroAddress]) {
          await fails(call(caller).transfer(address, value), "Token nije prenosiv");
          await fails(call(caller).approve(address, value), "Token nije prenosiv");
          await fails(call(caller).transferFrom(alice.address, address, value), "Token nije prenosiv");
        }
      }
      assert.equal(await token.allowance(alice.address, bob.address), 0n);
      assert.equal(await token.balanceOf(alice.address), 1n);
      assert.equal(await token.ownerOfApartment(1), alice.address);
      assert.equal((await token.queryFilter(token.filters.Approval())).length, 0);
      assert.equal((await token.queryFilter(token.filters.Transfer())).length, 1);
    });
  }
  it("K39: imenovanje zamjenika i sve nevaljane adrese", async () => {
    const {token, call, rep, deputy, alice} = await setup();
    await fails(call(alice).setDeputy(alice.address), "Samo predstavnik");
    for (const address of [ZeroAddress, rep.address, deputy.address])
      await fails(token.setDeputy(address), "Neispravna adresa");
    const logs = await events(token, await token.setDeputy(alice.address));
    assert.deepEqual([...logs[0].args], [deputy.address, alice.address]);
    assert.equal(await token.deputy(), alice.address);
    await fails(call(deputy).requestTakeover(1), "Samo zamjenik");
  });
  for (const method of ["transferRepresentative", "transferOwnership"]) {
    it(`K39: ${method} sinkronizira owner i predstavnika`, async () => {
      const {token, call, rep, deputy, alice, bob} = await setup();
      await fails(call(alice)[method](bob.address), "Samo predstavnik");
      for (const address of [ZeroAddress, rep.address]) await fails(token[method](address), "Neispravna adresa");
      const logs = await events(token, await token[method](alice.address));
      assert.deepEqual(logs.map((e: any) => e.name), ["OwnershipTransferred", "RepresentativeChanged"]);
      assert.deepEqual([...logs[1].args], [rep.address, alice.address]);
      assert.equal(await token.owner(), alice.address);
      assert.equal(await token.representative(), alice.address);
      assert.equal(await token.deputy(), deputy.address);
      await fails(token.assignApartment(1, bob.address), "Samo predstavnik");
      await call(alice).assignApartment(1, bob.address);
    });
    it(`K39: ${method} na zamjenika prazni njegovo mjesto`, async () => {
      const {token, deputy, call, alice} = await setup();
      await token[method](deputy.address);
      assert.equal(await token.deputy(), ZeroAddress);
      await call(deputy).setDeputy(alice.address);
      assert.equal(await token.deputy(), alice.address);
    });
  }
  it("K39: odricanje je zabranjeno, neovlašteni poziv prvo pada na ovlasti", async () => {
    const {token, call, alice, rep} = await setup();
    await fails(token.renounceOwnership(), "Odricanje nije dopusteno");
    await fails(call(alice).renounceOwnership(), "Samo predstavnik");
    assert.equal(await token.owner(), rep.address);
  });
  it("K37: ovlasti, ID 0, aktivni zahtjev i događaj", async () => {
    const {token, call, rep, deputy, alice, ethers} = await setup();
    for (const signer of [rep, alice]) {
      await fails(call(signer).requestTakeover(1), "Samo zamjenik");
      await fails(call(signer).completeTakeover(1), "Samo zamjenik");
    }
    await fails(call(deputy).cancelTakeover(1), "Samo predstavnik");
    await fails(call(deputy).requestTakeover(0), "Neispravan ID preuzimanja");
    const tx = await call(deputy).requestTakeover(1);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const logs = await events(token, tx);
    assert.deepEqual([...logs[0].args], [1n, deputy.address, BigInt(block!.timestamp + WEEK)]);
    await fails(call(deputy).requestTakeover(2), "Preuzimanje je pokrenuto");
    await fails(call(deputy).requestTakeover(0), "Preuzimanje je pokrenuto");
    await fails(call(deputy).assignApartment(1, alice.address), "Samo predstavnik");
  });
  it("K37: nema postupka, pogrešan ID i zabrana ponovne uporabe", async () => {
    const {token, call, deputy, request} = await setup();
    for (const id of [0, 1]) {
      await fails(token.cancelTakeover(id), "Nema preuzimanja");
      await fails(call(deputy).completeTakeover(id), "Nema preuzimanja");
    }
    await request();
    await fails(token.cancelTakeover(2), "Nema preuzimanja");
    await fails(call(deputy).completeTakeover(2), "Nema preuzimanja");
    const logs = await events(token, await token.cancelTakeover(1));
    assert.deepEqual([...logs[0].args], [1n]);
    await fails(call(deputy).completeTakeover(1), "Nema preuzimanja");
    await fails(call(deputy).requestTakeover(1), "ID preuzimanja je iskoristen");
    await call(deputy).requestTakeover(2);
  });
  it("K37: otkazivanje uspijeva sekundu prije isteka", async () => {
    const {token, request, at} = await setup();
    const end = await request();
    await at(end - 1);
    await token.cancelTakeover(1);
  });
  it("K37: dovršetak pada sekundu prije isteka", async () => {
    const {call, deputy, request, at, token, rep} = await setup();
    const end = await request();
    await at(end - 1);
    await fails(call(deputy).completeTakeover(1), "Cekanje nije zavrseno");
    assert.equal(await token.owner(), rep.address);
  });
  it("K37: otkazivanje pada točno na isteku", async () => {
    const {token, request, at} = await setup();
    const end = await request();
    await at(end);
    await fails(token.cancelTakeover(1), "Rok za otkazivanje je istekao");
  });
  it("K37/K39: dovršetak točno na isteku, prazni zamjenika i ukida stare ovlasti", async () => {
    const {token, call, deputy, rep, alice, request, at} = await setup();
    const end = await request();
    await at(end);
    const logs = await events(token, await call(deputy).completeTakeover(1));
    assert.deepEqual(logs.map((e: any) => e.name), ["DeputyChanged", "OwnershipTransferred", "RepresentativeChanged"]);
    assert.deepEqual([...logs[0].args], [deputy.address, ZeroAddress]);
    assert.deepEqual([...logs[2].args], [rep.address, deputy.address]);
    assert.equal(await token.owner(), deputy.address);
    assert.equal(await token.representative(), deputy.address);
    assert.equal(await token.deputy(), ZeroAddress);
    await fails(token.assignApartment(1, alice.address), "Samo predstavnik");
    await call(deputy).assignApartment(1, alice.address);
    await call(deputy).setDeputy(rep.address);
    await fails(call(rep).requestTakeover(1), "ID preuzimanja je iskoristen");
    await fails(call(rep).completeTakeover(1), "Nema preuzimanja");
  });
  for (const method of ["setDeputy", "transferRepresentative", "transferOwnership"]) {
    for (const expired of [false, true]) {
      it(`K37/K39: ${method} otkazuje zahtjev ${expired ? "nakon" : "prije"} isteka`, async () => {
        const {token, call, deputy, alice, request, at} = await setup();
        const end = await request();
        if (expired) await at(end + 1);
        const logs = await events(token, await token[method](alice.address));
        const cancelled = logs.find((e: any) => e.name === "TakeoverCancelled");
        assert.deepEqual([...cancelled.args], [1n]);
        await fails(call(deputy).completeTakeover(1), method === "setDeputy" ? "Samo zamjenik" : "Nema preuzimanja");
        const currentDeputy = method === "setDeputy" ? alice : deputy;
        await fails(call(currentDeputy).requestTakeover(1), "ID preuzimanja je iskoristen");
        await call(currentDeputy).requestTakeover(2);
      });
    }
  }
  it("K25: unutarnja provjera blokira obje promjene bez gubitka stanja", async () => {
    const {token, alice, call, deputy} = await setup("StanRoundHarness");
    await token.assignApartment(1, alice.address);
    await token.setActiveForTest(true);
    await fails(token.assignApartment(2, alice.address), "Promjena prava nije dopustena tijekom glasanja");
    await fails(token.revokeApartment(1), "Promjena prava nije dopustena tijekom glasanja");
    await fails(call(deputy).revokeApartment(0), "Samo predstavnik");
    assert.equal(await token.ownerOfApartment(1), alice.address);
    assert.equal(await token.totalSupply(), 1n);
    await token.setActiveForTest(false);
    await token.revokeApartment(1);
    assert.equal(await token.totalSupply(), 0n);
  });
  it("K1/K35: svih 25 prava izdaje točno 25 STN", async () => {
    const {token, alice} = await setup();
    for (let id = 1; id <= 25; id++) await token.assignApartment(id, alice.address);
    assert.equal(await token.totalSupply(), 25n);
    assert.equal(await token.balanceOf(alice.address), 25n);
    await fails(token.assignApartment(26, alice.address), "Stan ne postoji");
    await fails(token.assignApartment(25, alice.address), "Stan vec ima token");
    assert.equal(await token.totalSupply(), 25n);
  });
  it("K37/K39: odbijene promjene uloga ne otkazuju zahtjev", async () => {
    const {token, rep, deputy, call, request, at} = await setup();
    const end = await request();
    await fails(token.setDeputy(deputy.address), "Neispravna adresa");
    await fails(token.transferRepresentative(rep.address), "Neispravna adresa");
    await fails(token.transferOwnership(ZeroAddress), "Neispravna adresa");
    assert.equal((await token.queryFilter(token.filters.TakeoverCancelled())).length, 0);
    await at(end);
    await call(deputy).completeTakeover(1);
    assert.equal(await token.owner(), deputy.address);
  });
  it("ABI: nema modula ni dodatnih javnih funkcija osim Ownable", async () => {
    const token = new Interface((await artifacts.readArtifact("Stan")).abi);
    const required = new Interface((await artifacts.readArtifact("IStanToken")).abi);
    const signatures = (iface: Interface) => {
      const result: string[] = [];
      iface.forEachFunction(f => result.push(f.format("sighash")));
      return result.sort();
    };
    assert.deepEqual(signatures(token), [...signatures(required), "owner()", "renounceOwnership()", "transferOwnership(address)"].sort());
  });
});
