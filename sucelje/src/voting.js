import { Contract, getAddress, toBeHex } from 'ethers'
import { MODUL_ABI, MODUL_ADRESA, TOKEN_ADRESA } from './contracts.js'

export const Vrsta = Object.freeze({ prioriteti: 0, dodatni: 1, odluka: 2 })
export const Ishod = Object.freeze({ bezGlasova: 0, izjednaceno: 1, pobjednik: 2, prihvacen: 3, odbijen: 4 })

const DAN = 86_400
// README i dnevnik bilježe postavljanje ovih adresa 16. 11. 2026.
const PRIJE_POSTAVLJANJA = Date.UTC(2026, 10, 15) / 1000
const povijestPoProvideru = new WeakMap()

async function prviBlok(provider, zadnji) {
  let od = 0
  let doBloka = zadnji.number
  if (zadnji.timestamp < PRIJE_POSTAVLJANJA) return od

  while (od < doBloka) {
    const sredina = Math.floor((od + doBloka) / 2)
    const blok = await provider.getBlock(sredina)
    if (!blok) throw new Error('Povijesni blok nije dostupan.')
    if (blok.timestamp < PRIJE_POSTAVLJANJA) od = sredina + 1
    else doBloka = sredina
  }
  return od
}

async function dohvatiZapise(provider, modul, zadnji) {
  const spremljeno = povijestPoProvideru.get(provider)
  const pocetak = spremljeno?.pocetak ?? await prviBlok(provider, zadnji)
  const od = spremljeno && spremljeno.kraj <= zadnji.number
    ? Math.max(pocetak, spremljeno.kraj - 11)
    : pocetak
  const zapisi = spremljeno?.zapisi.filter((zapis) => zapis.blockNumber < od) ?? []
  const teme = ['ProposalSubmitted', 'RoundStarted'].map((ime) => modul.interface.getEvent(ime).topicHash)

  // Ograničen raspon po pozivu i ponovno čitanje zadnjih blokova pri osvježavanju.
  for (let blok = od; blok <= zadnji.number;) {
    const kraj = Math.min(blok + 1999, zadnji.number)
    const novi = await provider.getLogs({
      address: MODUL_ADRESA, topics: [teme], fromBlock: blok, toBlock: kraj,
    })
    zapisi.push(...novi)
    blok = kraj + 1
  }
  zapisi.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index)
  povijestPoProvideru.set(provider, { pocetak, kraj: zadnji.number, zapisi })
  return zapisi
}

async function tekstPrijedloga(modul, zapis, predmemorija) {
  if (predmemorija.has(zapis.transactionHash)) return predmemorija.get(zapis.transactionHash)
  const tx = await zapis.getTransaction()
  if (!tx?.to || getAddress(tx.to) !== getAddress(MODUL_ADRESA)) return null
  const poziv = modul.interface.parseTransaction({ data: tx.data, value: tx.value })
  if (poziv?.name !== 'submitProposal' || poziv.args[0] !== zapis.apartmentId) return null
  const tekst = { naslov: poziv.args[1], opis: poziv.args[2] }
  predmemorija.set(zapis.transactionHash, tekst)
  return tekst
}

async function uSkupinama(stavke, dohvati) {
  const rezultat = []
  for (let i = 0; i < stavke.length; i += 6) {
    rezultat.push(...await Promise.all(stavke.slice(i, i + 6).map(dohvati)))
  }
  return rezultat
}

const tekstPoProvideru = new WeakMap()

export async function ucitajGlasanje(provider, adresa, stanovi, predstavnik, blok) {
  const modul = new Contract(MODUL_ADRESA, MODUL_ABI, provider)
  const blockTag = blok.number
  const [token, zapisi] = await Promise.all([
    modul.tokenAddress({ blockTag }),
    dohvatiZapise(provider, modul, blok),
  ])
  if (getAddress(token) !== getAddress(TOKEN_ADRESA)) {
    throw new Error('Modul glasanja upućuje na drugi STN ugovor.')
  }

  const krugovi = []
  const predani = []
  for (const zapis of zapisi) {
    const { name, args } = modul.interface.parseLog(zapis)
    if (name === 'RoundStarted') {
      krugovi.push({
        id: args[0].toString(),
        vrsta: Number(args[1]),
        kandidati: args[2].map(String),
        pocetak: Number(args[3]),
        rok: Number(args[4]),
        blok: zapis.blockNumber,
      })
    } else {
      predani.push({
        id: args[0].toString(),
        stan: Number(args[1]),
        apartmentId: args[1],
        transactionHash: zapis.transactionHash,
        getTransaction: () => zapis.getTransaction(),
      })
    }
  }

  const predmemorija = tekstPoProvideru.get(provider) ?? new Map()
  tekstPoProvideru.set(provider, predmemorija)
  const prijedlozi = await uSkupinama(predani, async (zapis) => {
    // Pozivi kroz drugi ugovor nemaju čitljiv naslov u ulazu vanjske transakcije.
    const tekst = await tekstPrijedloga(modul, zapis, predmemorija)
    return { id: zapis.id, stan: zapis.stan, ...tekst }
  })
  const zadnji = krugovi.at(-1)
  const faza = !zadnji ? 'prijedlozi' : blok.timestamp < zadnji.pocetak
    ? 'zakazano' : blok.timestamp < zadnji.rok ? 'aktivno' : 'zavrseno'

  const mozeRezultate = predstavnik || stanovi.length > 0
  const rezultati = Object.fromEntries(await uSkupinama(
    mozeRezultate ? krugovi.filter((krug) => krug.rok <= blok.timestamp) : [],
    async (krug) => {
      const rezultat = await modul.getRoundResults(krug.id, { from: adresa, blockTag })
      return [krug.id, {
        ishod: Number(rezultat.outcome),
        prijedlozi: rezultat.proposalIds.map(String),
        potpore: rezultat.supportCounts.map(Number),
        sudjelovalo: Number(rezultat.participationCount),
        za: Number(rezultat.votesFor),
        protiv: Number(rezultat.votesAgainst),
        vodeci: rezultat.leadingProposalIds.map(String),
      }]
    },
  ))

  const glasali = faza === 'aktivno' && stanovi.length
    ? await dohvatiGlasale(provider, modul, zadnji, stanovi, blockTag)
    : []
  const sljedeci = predstavnik
    ? odrediSljedeci(krugovi, prijedlozi, rezultati, faza, blok.timestamp)
    : null
  return { krugovi, prijedlozi, zadnji, faza, rezultati, glasali, sljedeci, sada: blok.timestamp }
}

async function dohvatiGlasale(provider, modul, krug, stanovi, doBloka) {
  const ime = ['PrioritiesSubmitted', 'TieBreakVoteSubmitted', 'ApprovalVoteSubmitted'][krug.vrsta]
  const tema = modul.interface.getEvent(ime).topicHash
  const glasali = new Set()
  for (let od = krug.blok; od <= doBloka; od += 2000) {
    const zapisi = await provider.getLogs({
      address: MODUL_ADRESA,
      topics: [tema, toBeHex(krug.id, 32), stanovi.map((stan) => toBeHex(stan, 32))],
      fromBlock: od,
      toBlock: Math.min(od + 1999, doBloka),
    })
    for (const zapis of zapisi) glasali.add(Number(zapis.topics[2]))
  }
  return [...glasali]
}

function odrediSljedeci(krugovi, prijedlozi, rezultati, faza, sada) {
  if (faza === 'aktivno' || faza === 'zakazano') return null
  const zadnji = krugovi.at(-1)
  const rezultat = zadnji && rezultati[zadnji.id]
  const prioriteti = (kandidati) => kandidati.length ? { vrsta: Vrsta.prioriteti, kandidati } : null

  if (zadnji && zadnji.vrsta !== Vrsta.odluka) {
    if (zadnji.vrsta === Vrsta.prioriteti && rezultat.ishod === Ishod.bezGlasova) {
      return prioriteti(zadnji.kandidati)
    }
    if (rezultat.ishod === Ishod.izjednaceno || rezultat.ishod === Ishod.bezGlasova) {
      return {
        vrsta: Vrsta.dodatni,
        prethodni: zadnji.id,
        kandidati: rezultat.vodeci.length ? rezultat.vodeci : zadnji.kandidati,
      }
    }
    return { vrsta: Vrsta.odluka, kandidati: rezultat.vodeci }
  }

  if (rezultat?.ishod === Ishod.odbijen) {
    const krajBiranja = krugovi.findLastIndex((krug) => krug.vrsta !== Vrsta.odluka)
    const biranje = krugovi[krajBiranja]
    const pocetni = krugovi.slice(0, krajBiranja + 1)
      .findLast((krug) => krug.vrsta === Vrsta.prioriteti)
    const pobjednik = rezultati[biranje.id].vodeci[0]
    const poredak = [pobjednik, ...rezultati[pocetni.id].prijedlozi.filter((id) => id !== pobjednik)]
    const sljedeci = poredak[krugovi.length - 1 - krajBiranja]
    if (sljedeci) return { vrsta: Vrsta.odluka, kandidati: [sljedeci] }
  }

  const nedostupni = new Set()
  for (const krug of krugovi) {
    const ishod = rezultati[krug.id].ishod
    if (ishod === Ishod.prihvacen || (ishod === Ishod.odbijen && sada < krug.rok + 90 * DAN)) {
      nedostupni.add(krug.kandidati[0])
    }
  }
  return prioriteti(prijedlozi.map(({ id }) => id).filter((id) => !nedostupni.has(id)))
}
