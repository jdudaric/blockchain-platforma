import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { network, artifacts } from "hardhat";
import { Interface, ZeroAddress, AbiCoder, concat, id } from "ethers";

const DAY = 86400;
async function fails(action: Promise<unknown>, message: string) {
  await assert.rejects(action, (e: any) => {
    assert.ok(String(e.message).includes(`'${message}'`) || String(e.message).includes(`"${message}"`) || e.reason === message, String(e));
    return true;
  });
}
async function setup(link = true) {
  const connection = await network.connect();
  const { ethers } = connection;
  const [rep, deputy, alice, bob, visitor] = await ethers.getSigners();
  const token = await ethers.deployContract("Stan", [deputy.address]);
  const module = await ethers.deployContract("StanModul", [await token.getAddress()]);
  const as = (s: typeof rep) => module.connect(s) as typeof module;
  const tc = (s: typeof rep) => token.connect(s) as typeof token;
  if (link) await token.setVotingModule(await module.getAddress());
  for (let apartment = 1; apartment <= 13; ++apartment) await token.assignApartment(apartment, alice.address);
  await token.assignApartment(14, bob.address);
  const now = async () => (await ethers.provider.getBlock("latest"))!.timestamp;
  const at = async (time: number) => { await connection.provider.request({method:"evm_setNextBlockTimestamp",params:[time]}); };
  const mine = async (time: number) => { await at(time); await connection.provider.request({method:"evm_mine"}); };
  const add = async (apartment = 1, title = "Projekt", description = "Opis") => {
    const signer = apartment === 14 ? bob : alice;
    const receipt = await (await as(signer).submitProposal(apartment, title, description)).wait();
    const log = receipt.logs.map((l: any) => {try {return module.interface.parseLog(l);} catch {return null;}}).find((e: any) => e?.name === "ProposalSubmitted");
    return Number(log.args.proposalId);
  };
  const start = async (kind: "priority" | "tie" | "approval", candidates: number[], previous = 0) => {
    const begin = (await now()) + 10, end = begin + 100;
    const tx = kind === "priority" ? await module.startPriorityRound(candidates, begin, end)
      : kind === "tie" ? await module.startTieBreakRound(previous, candidates, begin, end)
      : await module.startApprovalRound(candidates[0], begin, end);
    const receipt = await tx.wait();
    const log = receipt.logs.map((l: any) => {try {return module.interface.parseLog(l);} catch {return null;}}).find((e: any) => e?.name === "RoundStarted");
    assert.deepEqual([...log.args.proposalIds], candidates.map(BigInt));
    assert.equal(log.args.startTime, BigInt(begin));
    assert.equal(log.args.endTime, BigInt(end));
    return {id:Number(log.args.roundId), begin, end};
  };
  const ranked = async (ids: number[]) => {
    const r = await start("priority", ids);
    await at(r.begin);
    await as(alice).votePriorities(r.id, 1, [ids[0]]);
    await mine(r.end);
    return r;
  };
  return {connection, ethers, rep, deputy, alice, bob, visitor, token, module, as, tc, now, at, mine, add, start, ranked};
}

describe("StanModul — SPEC i integracija", () => {
  it("K25: konstruktor, jednokratna veza, nevaljane adrese i pogresan token", async () => {
    const f = await setup(false);
    assert.equal(await f.module.tokenAddress(), await f.token.getAddress());
    assert.equal(await f.token.votingModule(), ZeroAddress);
    assert.equal(await f.module.isRoundActive(), false);
    for (const a of [ZeroAddress, f.alice.address]) {
      await fails(f.ethers.deployContract("StanModul", [a]), "Neispravna adresa");
      await fails(f.token.setVotingModule(a), "Neispravna adresa");
    }
    await fails(f.tc(f.alice).setVotingModule(await f.module.getAddress()), "Samo predstavnik");
    await fails(f.token.setVotingModule(await f.token.getAddress()), "Neispravan modul");
    const otherToken = await f.ethers.deployContract("Stan", [f.deputy.address]);
    const otherModule = await f.ethers.deployContract("StanModul", [await otherToken.getAddress()]);
    await fails(f.token.setVotingModule(await otherModule.getAddress()), "Neispravan token modula");
    const p = await f.add();
    const n = await f.now();
    await fails(f.module.startPriorityRound([p], n + 10, n + 100), "Modul nije povezan");
    await fails(f.module.startApprovalRound(p, n + 10, n + 100), "Modul nije povezan");
    await fails(f.module.startTieBreakRound(1, [p], n + 10, n + 100), "Modul nije povezan");
    await f.token.setVotingModule(await f.module.getAddress());
    assert.equal(await f.token.votingModule(), await f.module.getAddress());
    assert.equal((await f.token.queryFilter(f.token.filters.VotingModuleLinked())).length, 1);
    await fails(f.token.setVotingModule(await f.module.getAddress()), "Modul je vec povezan");
    await f.start("priority", [p]);
  });

  it("K34: prava, prazni tekstovi, Unicode granice i tri aktivna po stanu", async () => {
    const f = await setup();
    for (const apartment of [0, 26, 14]) await fails(f.as(f.alice).submitProposal(apartment, "A", "B"), "Nema prava za stan");
    await fails(f.as(f.visitor).submitProposal(1, "A", "B"), "Nema prava za stan");
    await fails(f.as(f.alice).submitProposal(1, "", "B"), "Nepotpun prijedlog");
    await fails(f.as(f.alice).submitProposal(1, "A", ""), "Nepotpun prijedlog");
    await fails(f.add(1, "č".repeat(101)), "Predug prijedlog");
    await fails(f.add(1, "A", "😀".repeat(1001)), "Predug prijedlog");
    await f.add(1, "č".repeat(100), "😀".repeat(1000));
    await f.add(1, "😀".repeat(100));
    await f.add(1, "e\u0301".repeat(50));
    await fails(f.add(), "Previse aktivnih prijedloga");
    await f.add(2);
    assert.equal(await f.module.isRoundActive(), false);
    assert.equal((await f.module.queryFilter(f.module.filters.RoundStarted())).length, 0);
    assert.equal((await f.module.queryFilter(f.module.filters.ProposalSubmitted())).length, 4);
  });

  it("K34: odbija nevaljani UTF-8 bez potrosnje mjesta", async () => {
    const f = await setup();
    // ABI string i bytes imaju isti raspored; bytes zaobilazi provjeru UTF-8 klijenta.
    for (const bytes of ["0x80", "0xc080", "0xe08080", "0xeda080", "0xf0808080", "0xf4908080", "0xc2", "0xc241"]) {
      const data = concat([id("submitProposal(uint256,string,string)").slice(0,10), AbiCoder.defaultAbiCoder().encode(["uint256","bytes","bytes"],[1,bytes,"0x41"])]);
      await fails(f.alice.sendTransaction({to:await f.module.getAddress(), data}), "Neispravan tekst");
    }
    assert.equal(await f.add(), 1);
  });

  it("K8: ovlasti, kandidati, rokovi i zakazani krug", async () => {
    const f = await setup(); const a = await f.add(), b = await f.add(); const n = await f.now();
    for (const signer of [f.alice, f.deputy, f.visitor]) {
      await fails(f.as(signer).startPriorityRound([a,b], n+50, n+100), "Samo predstavnik");
      await fails(f.as(signer).startTieBreakRound(1,[a,b],n+50,n+100), "Samo predstavnik");
      await fails(f.as(signer).startApprovalRound(a,n+50,n+100), "Samo predstavnik");
    }
    await fails(f.module.startPriorityRound([],n+50,n+100), "Nema prijedloga");
    await fails(f.module.startPriorityRound([99],n+50,n+100), "Prijedlog ne postoji");
    await fails(f.module.startPriorityRound([a,a],n+50,n+100), "Prijedlog je ponovljen");
    await fails(f.module.startPriorityRound([a],n+50,n+100), "Nepotpun skup prijedloga");
    await fails(f.module.startPriorityRound([a,b],n+50,n+50), "Neispravan rok");
    await fails(f.module.startPriorityRound([a,b],n-10,n), "Neispravan rok");
    const r = await f.start("priority", [b,a]);
    await fails(f.module.startPriorityRound([a,b],r.end,r.end+100), "Prethodno glasanje nije zavrseno");
    await fails(f.module.startApprovalRound(a,r.end,r.end+100), "Prethodno glasanje nije zavrseno");
  });

  it("K9: konacnost prioriteta, prava, granice vremena i neglasaci", async () => {
    const f = await setup(); const ids = [await f.add(),await f.add(),await f.add()];
    const r = await f.start("priority", ids);
    await fails(f.as(f.alice).votePriorities(r.id,1,[ids[0]]), "Glasanje nije pocelo");
    await fails(f.as(f.alice).votePriorities(99,1,ids), "Glasanje ne postoji");
    await fails(f.as(f.bob).getNonVoters(r.id), "Samo predstavnik");
    await fails(f.module.getNonVoters(0), "Glasanje ne postoji");
    await fails(f.as(f.visitor).getRoundResults(r.id), "Nema prava za rezultate");
    await fails(f.module.getRoundResults(0), "Glasanje ne postoji");
    await fails(f.module.getRoundResults(r.id), "Rezultati jos nisu dostupni");
    await f.at(r.begin);
    await fails(f.as(f.bob).votePriorities(r.id,1,ids), "Nema prava za stan");
    await fails(f.as(f.alice).voteApproval(r.id,1,1), "Pogresna vrsta glasanja");
    await fails(f.as(f.alice).votePriorities(r.id,1,[]), "Odaberite prijedlog");
    await fails(f.as(f.alice).votePriorities(r.id,1,[...ids,99]), "Najvise 3 prijedloga");
    await fails(f.as(f.alice).votePriorities(r.id,1,[ids[0],ids[0]]), "Prijedlog je ponovljen");
    await fails(f.as(f.alice).votePriorities(r.id,1,[ids[0],99]), "Prijedlog nije u glasanju");
    await f.as(f.alice).votePriorities(r.id,1,ids);
    await fails(f.as(f.alice).votePriorities(r.id,1,[ids[1]]), "Stan je vec glasao");
    await f.as(f.alice).votePriorities(r.id,2,[ids[0]]);
    assert.deepEqual([...await f.module.getNonVoters(r.id)],Array.from({length:23},(_,i)=>BigInt(i+3)));
    await f.at(r.end-1);
    await f.as(f.bob).votePriorities(r.id,14,[ids[0]]);
    await f.at(r.end);
    await fails(f.as(f.alice).votePriorities(r.id,3,[ids[0]]), "Glasanje je zavrseno");
    await f.mine(r.end);
    const result = await f.as(f.alice).getRoundResults(r.id);
    assert.deepEqual([...result.supportCounts],[3n,1n,1n]);
    assert.equal(result.participationCount,3n);
    assert.equal(result.outcome,2n);
    assert.deepEqual([...result.leadingProposalIds],[BigInt(ids[0])]);
    assert.equal((await f.module.queryFilter(f.module.filters.PrioritiesSubmitted())).length,3);
  });

  it("K6: stvarna blokada od pocetka do roka, povijest i novi vlasnik", async () => {
    const f = await setup(); const p = await f.add(); const r = await f.start("priority",[p]);
    assert.equal(await f.module.isRoundActive(),false);
    await f.token.assignApartment(15,f.bob.address);
    await f.mine(r.begin);
    await fails(f.token.revokeApartment(1),"Promjena prava nije dopustena tijekom glasanja");
    assert.equal(await f.module.isRoundActive(),true);
    await fails(f.token.assignApartment(16,f.bob.address),"Promjena prava nije dopustena tijekom glasanja");
    await f.as(f.alice).votePriorities(r.id,1,[p]);
    await f.at(r.end);
    await f.token.revokeApartment(1);
    assert.equal(await f.module.isRoundActive(),false);
    await f.token.assignApartment(1,f.bob.address);
    assert.deepEqual([... (await f.module.getRoundResults(r.id)).supportCounts],[1n]);
    const a = await f.start("approval",[p]); await f.at(a.begin);
    await fails(f.as(f.alice).voteApproval(a.id,1,1),"Nema prava za stan");
    await f.as(f.bob).voteApproval(a.id,1,1);
    assert.equal(await f.token.balanceOf(f.bob.address),3n);
    assert.deepEqual([... (await f.module.getRoundResults(r.id)).supportCounts],[1n]);
  });

  it("K13: ponovljena izjednacenja, prazan dodatni krug i tocan skup", async () => {
    const f = await setup(); const a = await f.add(), b = await f.add(), c = await f.add();
    const r = await f.start("priority",[a,b,c]); await f.at(r.begin);
    await f.as(f.alice).votePriorities(r.id,1,[a,b]);
    await fails(f.module.startTieBreakRound(r.id,[a,b],r.end,r.end+100),"Prethodno glasanje nije zavrseno");
    await f.mine(r.end);
    assert.equal((await f.module.getRoundResults(r.id)).outcome,1n);
    await fails(f.module.startApprovalRound(a,r.end+20,r.end+100),"Prioritet nije odredjen");
    await fails(f.module.startTieBreakRound(r.id,[a,c],r.end+20,r.end+100),"Neispravni kandidati");
    await fails(f.module.startTieBreakRound(r.id,[a,a],r.end+20,r.end+100),"Neispravni kandidati");
    await fails(f.module.startTieBreakRound(r.id,[a,b],r.end+20,r.end+20),"Neispravan rok");
    const t = await f.start("tie",[b,a],r.id); await f.at(t.begin);
    await fails(f.as(f.alice).voteTieBreak(t.id,1,[a,b]),"Odaberite jedan prijedlog");
    await fails(f.as(f.alice).voteTieBreak(t.id,1,[]),"Odaberite jedan prijedlog");
    await fails(f.as(f.alice).voteTieBreak(t.id,1,[c]),"Prijedlog nije u glasanju");
    await f.as(f.alice).voteTieBreak(t.id,1,[a]);
    await fails(f.as(f.alice).voteTieBreak(t.id,1,[b]),"Stan je vec glasao");
    await f.as(f.alice).voteTieBreak(t.id,2,[b]); await f.mine(t.end);
    await fails(f.module.startTieBreakRound(r.id,[a,b],t.end+20,t.end+100),"Nema izjednacenja");
    const empty = await f.start("tie",[a,b],t.id); await f.mine(empty.end);
    const noVotes = await f.module.getRoundResults(empty.id);
    assert.equal(noVotes.outcome,0n); assert.deepEqual([...noVotes.leadingProposalIds],[]);
    const next = await f.start("tie",[a,b],empty.id); await f.at(next.begin);
    await f.as(f.alice).voteTieBreak(next.id,1,[b]); await f.mine(next.end);
    await fails(f.module.startTieBreakRound(next.id,[a,b],next.end+20,next.end+100),"Nema izjednacenja");
    await fails(f.module.startApprovalRound(a,next.end+20,next.end+100),"Projekt nije sljedeci");
    const approval = await f.start("approval",[b]); await f.mine(approval.end);
    // Nakon pobjednika b slijedi a, prema pocetnim potporama/vremenu/ID-u.
    await f.start("approval",[a]);
  });

  it("K40: bez glasova ponavlja isti ciklus, novi prijedlog ceka sljedeci", async () => {
    const f = await setup(); const a = await f.add(); const r = await f.start("priority",[a]);
    const b = await f.add(2);
    await f.mine(r.end);
    assert.equal((await f.module.getRoundResults(r.id)).outcome,0n);
    await fails(f.module.startTieBreakRound(r.id,[a,b],r.end+20,r.end+100),"Nema izjednacenja");
    await fails(f.module.startPriorityRound([a,b],r.end+20,r.end+100),"Nepotpun skup prijedloga");
    await fails(f.module.startPriorityRound([a],r.begin,r.end+100),"Preklapanje glasanja");
    const retry = await f.ranked([a]);
    await fails(f.module.startPriorityRound([a,b],retry.end+20,retry.end+100),"Ciklus nije zavrsen");
    const approval = await f.start("approval",[a]); await f.mine(approval.end);
    // Posljednji odbijeni zatvara ciklus; b ulazi bez a koji je u zabrani.
    await f.start("priority",[b]);
  });

  for (const votes of [0,12,13]) {
    it(`${votes === 0 ? "K16" : "K35"}: ${votes} ZA, rezultat bez finalizacije i fiksna osnovica`, async () => {
      const f = await setup(); const p = await f.add(); await f.ranked([p]);
      const r = await f.start("approval",[p]);
      await f.at(r.begin);
      await fails(f.as(f.alice).voteApproval(r.id,1,2),"Neispravan glas");
      for (let apartment = 1; apartment <= votes; ++apartment) await f.as(f.alice).voteApproval(r.id,apartment,1);
      if (votes) {
        await fails(f.as(f.alice).voteApproval(r.id,1,0),"Stan je vec glasao");
        await f.as(f.bob).voteApproval(r.id,14,0);
      }
      await f.mine(r.end);
      const result = await f.module.getRoundResults(r.id);
      assert.equal(result.votesFor,BigInt(votes));
      assert.equal(result.votesAgainst,votes ? 1n : 0n);
      assert.equal(result.participationCount,BigInt(votes + (votes ? 1 : 0)));
      assert.equal(result.outcome,votes >= 13 ? 3n : 4n);
      assert.deepEqual([...result.proposalIds],[BigInt(p)]);
      assert.deepEqual([...result.supportCounts],[]);
      assert.deepEqual([...result.leadingProposalIds],[]);
      await fails(f.as(f.alice).voteApproval(r.id,2,1),"Glasanje je zavrseno");
      assert.equal(await f.token.totalSupply(),14n);
      assert.equal((await f.module.queryFilter(f.module.filters.ApprovalVoteSubmitted())).length,votes+(votes?1:0));
    });
  }

  it("K31: odbijen pa sljedeci, prihvacanje zavrsava ciklus i oslobadja mjesto", async () => {
    const f = await setup(); const a = await f.add(), b = await f.add(), c = await f.add();
    await f.ranked([c,b,a]);
    const rejected = await f.start("approval",[c]); await f.mine(rejected.end);
    const accepted = await f.start("approval",[a]); await f.at(accepted.begin);
    for (let apartment=1; apartment<=13; ++apartment) await f.as(f.alice).voteApproval(accepted.id,apartment,1);
    await f.mine(accepted.end);
    await fails(f.module.startApprovalRound(b,accepted.end+20,accepted.end+100),"Ciklus nije otvoren");
    const d = await f.add(); // a oslobadja jedno mjesto; c jos zauzima mjesto.
    await fails(f.add(),"Previse aktivnih prijedloga");
    await fails(f.module.startPriorityRound([a,b,d],accepted.end+20,accepted.end+100),"Prijedlog nije raspoloziv");
    const next = await f.start("priority",[b,d]); await f.at(next.begin);
    await f.as(f.alice).votePriorities(next.id,1,[d]); await f.mine(next.end);
    await f.start("approval",[d]); // Novi rang, nema nasljedjivanja starog.
  });

  it("K36: zabrana od roka, granica 90 dana, isti ID i novi slican projekt", async () => {
    const f = await setup(); const a = await f.add(); await f.ranked([a]);
    const r = await f.start("approval",[a]); await f.mine(r.end+10*DAY);
    const b = await f.add(2); // Isti tekst, novi ID.
    const n = await f.now();
    await fails(f.module.startPriorityRound([a,b],n+20,n+100),"Projekt je u zabrani");
    await f.ranked([b]); const rb = await f.start("approval",[b]); await f.mine(rb.end);
    const boundary = r.end+90*DAY;
    await f.at(boundary-1);
    await fails(f.module.startPriorityRound([a],boundary,boundary+100),"Projekt je u zabrani");
    await f.at(boundary);
    await f.module.startPriorityRound([a],boundary,boundary+100);
    await f.as(f.alice).votePriorities(5,1,[a]); // Dva prethodna para prioriteta i ZA/PROTIV daju novi ID 5.
    await f.mine(boundary+100);
    await f.start("approval",[a]);
  });

  it("K37: modul slijedi novog predstavnika bez dodatnih ovlasti zamjenika", async () => {
    const f = await setup(); const a = await f.add();
    await f.tc(f.deputy).requestTakeover(1);
    const n = await f.now();
    await fails(f.as(f.deputy).startPriorityRound([a],n+20,n+100),"Samo predstavnik");
    await f.at(n+7*DAY); await f.tc(f.deputy).completeTakeover(1);
    const t = await f.now();
    await fails(f.module.startPriorityRound([a],t+20,t+100),"Samo predstavnik");
    await f.as(f.deputy).startPriorityRound([a],t+20,t+100);
    await fails(f.module.getNonVoters(1),"Samo predstavnik");
    assert.equal((await f.as(f.deputy).getNonVoters(1)).length,25);
  });

  it("K23: granice ZA/PROTIV i odbijeni projekt nije ponovno sljedeci", async () => {
    const f = await setup(); const a = await f.add(), b = await f.add();
    let n = await f.now();
    await fails(f.module.startApprovalRound(a,n+20,n+100),"Ciklus nije otvoren");
    await f.ranked([a,b]); n = await f.now();
    await fails(f.module.startApprovalRound(99,n+20,n+100),"Prijedlog ne postoji");
    await fails(f.module.startApprovalRound(b,n+20,n+100),"Projekt nije sljedeci");
    await fails(f.module.startApprovalRound(a,n+20,n+20),"Neispravan rok");
    const r = await f.start("approval",[a]); await f.mine(r.end);
    await fails(f.module.startApprovalRound(a,r.end+20,r.end+100),"Projekt je u zabrani");
    await f.start("approval",[b]);
  });

  it("K29: kandidati se suzavaju nakon svakog dodatnog izjednacenja", async () => {
    const f = await setup(); const ids = [await f.add(),await f.add(),await f.add()];
    const p = await f.start("priority",ids); await f.at(p.begin);
    await f.as(f.alice).votePriorities(p.id,1,ids); await f.mine(p.end);
    const t = await f.start("tie",ids,p.id); await f.at(t.begin);
    await f.as(f.alice).voteTieBreak(t.id,1,[ids[1]]);
    await f.as(f.alice).voteTieBreak(t.id,2,[ids[2]]); await f.mine(t.end);
    assert.deepEqual([...(await f.module.getRoundResults(t.id)).leadingProposalIds], ids.slice(1).map(BigInt));
    await fails(f.module.startTieBreakRound(t.id,ids,t.end+20,t.end+100),"Neispravni kandidati");
    const last = await f.start("tie",ids.slice(1),t.id); await f.at(last.begin);
    await f.as(f.alice).voteTieBreak(last.id,1,[ids[2]]); await f.mine(last.end);
    const a = await f.start("approval",[ids[2]]); await f.mine(a.end);
    // Ostala mjesta slijede pocetne potpore/vrijeme/ID, ne potpore dodatnih krugova.
    await f.start("approval",[ids[0]]);
  });

  it("K28: prijedlozi u istom bloku razrjesavaju niza mjesta manjim ID-em", async () => {
    const f = await setup(); const a = await f.add();
    const nonce = await f.ethers.provider.getTransactionCount(f.alice.address);
    await f.connection.provider.request({method:"evm_setAutomine",params:[false]});
    try {
      const tx1 = await f.as(f.alice).submitProposal(1,"B","Opis",{nonce,gasLimit:500000});
      const tx2 = await f.as(f.alice).submitProposal(1,"C","Opis",{nonce:nonce+1,gasLimit:500000});
      await f.connection.provider.request({method:"evm_mine"});
      const receipt1 = await tx1.wait(), receipt2 = await tx2.wait();
      assert.equal(receipt1.blockNumber,receipt2.blockNumber);
    } finally { await f.connection.provider.request({method:"evm_setAutomine",params:[true]}); }
    const p = await f.start("priority",[3,2,a]);
    await f.at(p.begin); await f.as(f.alice).votePriorities(p.id,1,[a]); await f.mine(p.end);
    assert.deepEqual([...(await f.module.getRoundResults(p.id)).proposalIds],[1n,2n,3n]);
    const a1 = await f.start("approval",[a]); await f.mine(a1.end);
    await f.start("approval",[2]);
  });

  it("K33: najveci skup od 75 aktivnih prijedloga ostaje izvrsiv", async () => {
    const f = await setup();
    for (let apartment=15;apartment<=25;++apartment) await f.token.assignApartment(apartment,f.alice.address);
    const ids:number[]=[];
    for (let apartment=1;apartment<=25;++apartment)
      for(let j=0;j<3;++j) ids.push(await f.add(apartment));
    await fails(f.add(25),"Previse aktivnih prijedloga");
    const n = await f.now();
    await fails(f.module.startPriorityRound(ids.slice(1),n+10,n+100),"Nepotpun skup prijedloga");
    const r = await f.start("priority",[...ids].reverse()); await f.at(r.begin);
    await f.as(f.alice).votePriorities(r.id,1,[75,74,73]); await f.mine(r.end);
    const result = await f.module.getRoundResults(r.id);
    assert.equal(result.proposalIds.length,75);
    assert.deepEqual([...result.leadingProposalIds],[73n,74n,75n]);
    const t = await f.start("tie",[75,74,73],r.id); await f.at(t.begin);
    await f.as(f.alice).voteTieBreak(t.id,1,[75]); await f.mine(t.end);
    await f.start("approval",[75]);
  });

  it("K32: tocno funkcije sucelja, bez dodatnih javnih funkcija", async () => {
    const signatures = (i: Interface) => { const s:string[]=[]; i.forEachFunction(f=>s.push(f.format("sighash"))); return s.sort(); };
    assert.deepEqual(signatures(new Interface((await artifacts.readArtifact("StanModul")).abi)), signatures(new Interface((await artifacts.readArtifact("IStanModul")).abi)));
    const a = await artifacts.readArtifact("StanModul");
    assert.ok((a.deployedBytecode.length-2)/2 <= 24576, "Ugovor prelazi EVM ogranicenje velicine");
  });
  it("K5: pravo se ne trosi i isti stan ponovno glasa u novom krugu", async () => {
    const f = await setup(); const p = await f.add();
    const balance = await f.token.balanceOf(f.alice.address);
    const supply = await f.token.totalSupply();
    const first = await f.ranked([p]);
    const second = await f.start("approval",[p]); await f.at(second.begin);
    await f.as(f.alice).voteApproval(second.id,1,1);
    await f.mine(second.end);
    assert.equal((await f.module.getRoundResults(first.id)).participationCount,1n);
    assert.equal((await f.module.getRoundResults(second.id)).votesFor,1n);
    assert.equal(await f.token.ownerOfApartment(1),f.alice.address);
    assert.equal(await f.token.balanceOf(f.alice.address),balance);
    assert.equal(await f.token.totalSupply(),supply);
  });

  it("K10: cetiri prioriteta ne biljeze nijednu potporu ni sudjelovanje", async () => {
    const f = await setup(); const ids = [await f.add(),await f.add(),await f.add(),await f.add(2)];
    const r = await f.start("priority",ids); await f.at(r.begin);
    await fails(f.as(f.alice).votePriorities(r.id,1,ids),"Najvise 3 prijedloga");
    assert.equal((await f.module.getNonVoters(r.id)).length,25);
    await f.mine(r.end);
    const result = await f.module.getRoundResults(r.id);
    assert.deepEqual([...result.supportCounts],[0n,0n,0n,0n]);
    assert.equal(result.participationCount,0n);
    assert.equal((await f.module.queryFilter(f.module.filters.PrioritiesSubmitted())).length,0);
  });

  it("K11: ponovljeni prijedlog odbija cijeli odabir bez djelomicnog upisa", async () => {
    const f = await setup(); const p = await f.add();
    const r = await f.start("priority",[p]); await f.at(r.begin);
    await fails(f.as(f.alice).votePriorities(r.id,1,[p,p]),"Prijedlog je ponovljen");
    assert.equal((await f.module.getNonVoters(r.id)).length,25);
    await f.mine(r.end);
    const result = await f.module.getRoundResults(r.id);
    assert.deepEqual([...result.supportCounts],[0n]);
    assert.equal(result.participationCount,0n);
  });

  it("K12: drugi glas ne moze promijeniti prvi odgovor ZA", async () => {
    const f = await setup(); const p = await f.add(); await f.ranked([p]);
    const r = await f.start("approval",[p]); await f.at(r.begin);
    await f.as(f.alice).voteApproval(r.id,1,1);
    await fails(f.as(f.alice).voteApproval(r.id,1,0),"Stan je vec glasao");
    await f.mine(r.end);
    const result = await f.module.getRoundResults(r.id);
    assert.equal(result.votesFor,1n); assert.equal(result.votesAgainst,0n);
    assert.equal(result.participationCount,1n);
  });

  it("K14: dva izbora u dodatnom krugu odbijaju se bez biljezenja glasa", async () => {
    const f = await setup(); const ids = [await f.add(),await f.add()];
    const p = await f.start("priority",ids); await f.at(p.begin);
    await f.as(f.alice).votePriorities(p.id,1,ids); await f.mine(p.end);
    const r = await f.start("tie",ids,p.id); await f.at(r.begin);
    await fails(f.as(f.alice).voteTieBreak(r.id,1,ids),"Odaberite jedan prijedlog");
    await f.mine(r.end);
    const result = await f.module.getRoundResults(r.id);
    assert.equal(result.participationCount,0n);
    assert.deepEqual([...result.supportCounts],[0n,0n]);
  });

  for (const votes of [12,13]) {
    it(`K15: ${votes} ZA i nula PROTIV daje ${votes === 13 ? "prihvacanje" : "odbijanje"}`, async () => {
      const f = await setup(); const p = await f.add(); await f.ranked([p]);
      const r = await f.start("approval",[p]); await f.at(r.begin);
      for (let apartment=1;apartment<=votes;++apartment) await f.as(f.alice).voteApproval(r.id,apartment,1);
      await f.mine(r.end);
      const result = await f.module.getRoundResults(r.id);
      assert.equal(result.votesFor,BigInt(votes)); assert.equal(result.votesAgainst,0n);
      assert.equal(result.outcome,votes === 13 ? 3n : 4n);
    });
  }

  it("K17: cetiri neglasaca ne povecavaju ni ZA ni PROTIV", async () => {
    const f = await setup();
    for(let apartment=15;apartment<=25;++apartment) await f.token.assignApartment(apartment,f.alice.address);
    const p = await f.add(); await f.ranked([p]);
    const r = await f.start("approval",[p]); await f.at(r.begin);
    for(let apartment=1;apartment<=21;++apartment) {
      const signer = apartment === 14 ? f.bob : f.alice;
      await f.as(signer).voteApproval(r.id,apartment,apartment<=12 ? 1 : 0);
    }
    await f.mine(r.end);
    const result = await f.module.getRoundResults(r.id);
    assert.equal(result.participationCount,21n);
    assert.equal(result.votesFor,12n); assert.equal(result.votesAgainst,9n);
    assert.equal(result.outcome,4n); // Vecina sudionika nije dovoljna: osnovica je 25.
    assert.deepEqual([...await f.module.getNonVoters(r.id)],[22n,23n,24n,25n]);
  });

  it("K18: glas na roku i nakon roka odbija se bez rucnog zatvaranja", async () => {
    const f = await setup(); const p = await f.add(); const r = await f.start("priority",[p]);
    await f.mine(r.end);
    await fails(f.as(f.alice).votePriorities(r.id,1,[p]),"Glasanje je zavrseno");
    await f.mine(r.end+100);
    await fails(f.as(f.alice).votePriorities(r.id,1,[p]),"Glasanje je zavrseno");
    assert.equal((await f.module.getRoundResults(r.id)).participationCount,0n);
  });

  it("K19: glas sekundu prije pocetka pada, tocno na pocetku uspijeva", async () => {
    const f = await setup(); const p = await f.add(); const r = await f.start("priority",[p]);
    await f.at(r.begin-1);
    await fails(f.as(f.alice).votePriorities(r.id,1,[p]),"Glasanje nije pocelo");
    await f.at(r.begin); await f.as(f.alice).votePriorities(r.id,1,[p]);
    await f.mine(r.end);
    assert.equal((await f.module.getRoundResults(r.id)).participationCount,1n);
  });

  it("K20: saldo drugog stana ne daje pravo glasa za tudji stan", async () => {
    const f = await setup(); const p = await f.add(); const r = await f.start("priority",[p]);
    await f.at(r.begin);
    await fails(f.as(f.bob).votePriorities(r.id,1,[p]),"Nema prava za stan");
    await fails(f.as(f.visitor).votePriorities(r.id,1,[p]),"Nema prava za stan");
    await f.mine(r.end);
    assert.equal((await f.module.getRoundResults(r.id)).participationCount,0n);
  });

  it("K21: ugovor ne daje rezultate prije roka, nakon roka vraca zbrojeve", async () => {
    const f = await setup(); const p = await f.add(); const r = await f.start("priority",[p]);
    await f.at(r.begin); await f.as(f.alice).votePriorities(r.id,1,[p]);
    for (const signer of [f.rep,f.alice])
      await fails(f.as(signer).getRoundResults(r.id),"Rezultati jos nisu dostupni");
    await f.mine(r.end);
    const result = await f.as(f.alice).getRoundResults(r.id);
    assert.deepEqual([...result.supportCounts],[1n]);
    assert.equal(result.outcome,2n);
    // Prikaz ovih podataka i upozorenje u aplikaciji provjeravaju se zasebno.
  });

  it("K22: samo predstavnik cita tocan popis stanova bez glasa", async () => {
    const f = await setup(); const p = await f.add(); const r = await f.start("priority",[p]);
    await f.at(r.begin); await f.as(f.alice).votePriorities(r.id,1,[p]);
    await f.as(f.bob).votePriorities(r.id,14,[p]);
    const expected=Array.from({length:25},(_,i)=>BigInt(i+1)).filter(id=>id!==1n && id!==14n);
    assert.deepEqual([...await f.module.getNonVoters(r.id)],expected);
    await fails(f.as(f.alice).getNonVoters(r.id),"Samo predstavnik");
    await fails(f.as(f.visitor).getNonVoters(r.id),"Samo predstavnik");
  });

  it("K24: ista adresa glasa za dva stana, ali ne dvaput za isti", async () => {
    const f = await setup(); const p = await f.add(); const r = await f.start("priority",[p]);
    await f.at(r.begin);
    await f.as(f.alice).votePriorities(r.id,1,[p]);
    await f.as(f.alice).votePriorities(r.id,2,[p]);
    await fails(f.as(f.alice).votePriorities(r.id,2,[p]),"Stan je vec glasao");
    await f.mine(r.end);
    const result = await f.module.getRoundResults(r.id);
    assert.equal(result.participationCount,2n); assert.deepEqual([...result.supportCounts],[2n]);
  });

  it("K26: promjena vlasnika ne mijenja povijesni glas ni sudjelovanje", async () => {
    const f = await setup(); const p = await f.add(); const r = await f.ranked([p]);
    const before = (await f.module.getRoundResults(r.id)).toArray(true);
    const nonVoters = [...await f.module.getNonVoters(r.id)];
    await f.token.revokeApartment(1); await f.token.assignApartment(1,f.bob.address);
    assert.deepEqual((await f.module.getRoundResults(r.id)).toArray(true),before);
    assert.deepEqual([...await f.module.getNonVoters(r.id)],nonVoters);
    const next = await f.start("approval",[p]); await f.at(next.begin);
    await fails(f.as(f.alice).voteApproval(next.id,1,1),"Nema prava za stan");
    await f.as(f.bob).voteApproval(next.id,1,1);
    assert.deepEqual((await f.module.getRoundResults(r.id)).toArray(true),before);
  });

  it("K27: samo prolazak vremena daje konacan rezultat bez finalizacije", async () => {
    const f = await setup(); const p = await f.add(); await f.ranked([p]);
    const r = await f.start("approval",[p]); await f.at(r.begin);
    await f.as(f.alice).voteApproval(r.id,1,1);
    const nonce = await f.ethers.provider.getTransactionCount(f.rep.address);
    await f.mine(r.end);
    const result = await f.module.getRoundResults(r.id);
    assert.equal(result.votesFor,1n); assert.equal(result.outcome,4n);
    assert.equal(await f.ethers.provider.getTransactionCount(f.rep.address),nonce);
    await fails(f.as(f.alice).voteApproval(r.id,2,1),"Glasanje je zavrseno");
    assert.deepEqual((await f.module.getRoundResults(r.id)).toArray(true),result.toArray(true));
  });

  it("K30: nakon odbijanja samo sljedeci projekt smije u ZA/PROTIV", async () => {
    const f = await setup(); const ids = [await f.add(),await f.add(),await f.add()];
    await f.ranked(ids); const first = await f.start("approval",[ids[0]]);
    await f.mine(first.end);
    assert.equal((await f.module.getRoundResults(first.id)).outcome,4n);
    await fails(f.module.startApprovalRound(ids[2],first.end+20,first.end+100),"Projekt nije sljedeci");
    const next = await f.start("approval",[ids[1]]); await f.mine(next.end);
    assert.deepEqual([...(await f.module.getRoundResults(next.id)).proposalIds],[BigInt(ids[1])]);
  });

  it("K38: ugovorni dio; zbrojevi su blokirani, ali zapis glasa javno je citljiv", async () => {
    const f = await setup(); const p = await f.add(); const r = await f.start("priority",[p]);
    await f.at(r.begin); await f.as(f.alice).votePriorities(r.id,1,[p]);
    await fails(f.module.getRoundResults(r.id),"Rezultati jos nisu dostupni");
    const logs = await f.as(f.visitor).queryFilter(f.module.filters.PrioritiesSubmitted());
    assert.equal(logs.length,1);
    const parsed = f.module.interface.parseLog(logs[0])!;
    assert.equal(parsed.args.apartmentId,1n);
    assert.deepEqual([...parsed.args.proposalIds],[BigInt(p)]);
    // Ovo dokazuje javnost lanca, ne prikaz ni tekst upozorenja u aplikaciji.
  });

  // Frontend nije implementiran u ovoj etapi: ove provjere nisu predstavljene kao prosle.
  it.skip("K38: aplikacija skriva zbrojeve prije roka i upozorava na javnost lanca (frontend)", () => {});

  it("K7: prijedlog se evidentira s autorom i stanom bez pokretanja glasanja", async () => {
    const f = await setup(); const p = await f.add(1,"Lift","Obnova lifta");
    const logs = await f.module.queryFilter(f.module.filters.ProposalSubmitted());
    assert.equal(logs.length,1);
    const event = f.module.interface.parseLog(logs[0])!;
    assert.equal(event.args.proposalId,BigInt(p));
    assert.equal(event.args.apartmentId,1n);
    assert.equal(event.args.author,f.alice.address);
    assert.equal((await f.module.queryFilter(f.module.filters.RoundStarted())).length,0);
    assert.equal(await f.module.isRoundActive(),false);
    await f.start("priority",[p]);
  });

});
