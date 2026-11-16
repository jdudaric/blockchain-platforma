import { BrowserProvider, Contract, getAddress, JsonRpcSigner, ZeroAddress } from 'ethers'
import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { MODUL_ABI, MODUL_ADRESA, TOKEN_ADRESA, TOKEN_ABI } from '../contracts.js'
import { ucitajGlasanje, Vrsta } from '../voting.js'

const SEPOLIA_CHAIN_ID = 11155111n
const PORUKA_MREZE = 'Prebaci MetaMask na mrežu Sepolia.'

function porukaGreske(error, odbijeno, zadanaPoruka) {
  if (error?.code === 'ACTION_REJECTED' || error?.code === 4001) return odbijeno
  return error?.reason || error?.shortMessage || error?.message || zadanaPoruka
}

function oznakaStana(brojStana) {
  if (!/^(?:[1-9]|1[0-9]|2[0-5])$/.test(brojStana)) {
    throw new Error('Unesi cijeli broj stana od 1 do 25.')
  }
  return BigInt(brojStana)
}

export const useWalletStore = defineStore('wallet', () => {
  const adresa = ref('')
  const saldo = ref(null)
  const stanovi = ref([])
  const predstavnik = ref('')
  const glasanje = shallowRef(null)
  const neglasaci = shallowRef(null)
  const greska = ref('')
  const greskaGlasanja = ref('')
  const povezivanje = ref(false)
  const ucitavanje = ref(false)
  const statusTransakcije = ref('')
  const porukaTransakcije = ref('')
  const greskaTransakcije = ref('')
  const statusEvidencije = ref('')
  const greskaEvidencije = ref('')
  const mozeDodijeliti = computed(() => Boolean(adresa.value) && adresa.value === predstavnik.value)
  const mozeRezultate = computed(() => mozeDodijeliti.value || stanovi.value.length > 0)

  let ethereum
  let provider
  let verzijaSesije = 0

  async function osvjezi() {
    if (!ethereum || ucitavanje.value) return

    const verzija = verzijaSesije
    const noviProvider = provider ?? new BrowserProvider(ethereum)
    greska.value = ''
    greskaGlasanja.value = ''
    ucitavanje.value = true

    try {
      const [racuni, mreza] = await Promise.all([
        ethereum.request({ method: 'eth_accounts' }),
        noviProvider.getNetwork(),
      ])
      if (verzija !== verzijaSesije || !racuni.length) return
      if (mreza.chainId !== SEPOLIA_CHAIN_ID) throw new Error(PORUKA_MREZE)

      const povezanaAdresa = getAddress(racuni[0])
      const stan = new Contract(TOKEN_ADRESA, TOKEN_ABI, noviProvider)
      const blok = await noviProvider.getBlock('latest')
      if (!blok) throw new Error('Posljednji blok Sepolije nije dostupan.')
      const blockTag = blok.number
      const [noviSaldo, noviPredstavnik, povezaniModul] = await Promise.all([
        stan.balanceOf(povezanaAdresa, { blockTag }),
        stan.representative({ blockTag }),
        stan.votingModule({ blockTag }),
      ])
      if (verzija !== verzijaSesije) return

      provider = noviProvider
      adresa.value = povezanaAdresa
      saldo.value = noviSaldo.toString()
      predstavnik.value = getAddress(noviPredstavnik)
      if (!mozeDodijeliti.value) neglasaci.value = null

      try {
        if (getAddress(povezaniModul) !== getAddress(MODUL_ADRESA)) {
          throw new Error('STN ugovor nije povezan s konfiguriranim modulom glasanja.')
        }
        const mojiStanovi = []
        for (let od = 1; noviSaldo > 0n && od <= 25; od += 6) {
          const vlasnici = await Promise.all(Array.from(
            { length: Math.min(6, 26 - od) },
            (_, i) => stan.ownerOfApartment(od + i, { blockTag }),
          ))
          vlasnici.forEach((vlasnik, i) => {
            if (getAddress(vlasnik) === povezanaAdresa) mojiStanovi.push(od + i)
          })
        }
        const novoGlasanje = await ucitajGlasanje(
          noviProvider, povezanaAdresa, mojiStanovi, povezanaAdresa === getAddress(noviPredstavnik), blok,
        )
        if (verzija !== verzijaSesije) return
        stanovi.value = mojiStanovi
        glasanje.value = novoGlasanje
      } catch (error) {
        if (verzija !== verzijaSesije) return
        stanovi.value = []
        glasanje.value = null
        greskaGlasanja.value = porukaGreske(error, 'Zahtjev je odbijen.', 'Učitavanje glasanja nije uspjelo.')
      }
    } catch (error) {
      if (verzija === verzijaSesije) {
        provider = null
        saldo.value = null
        predstavnik.value = ''
        stanovi.value = []
        glasanje.value = null
        neglasaci.value = null
        greska.value = porukaGreske(error, 'Zahtjev je odbijen.', 'Čitanje podataka nije uspjelo.')
      }
    } finally {
      if (verzija === verzijaSesije) ucitavanje.value = false
    }
  }

  function promijeniSesiju() {
    verzijaSesije++
    provider = null
    adresa.value = ''
    saldo.value = null
    stanovi.value = []
    predstavnik.value = ''
    glasanje.value = null
    neglasaci.value = null
    statusEvidencije.value = ''
    greskaEvidencije.value = ''
    porukaTransakcije.value = ''
    greskaTransakcije.value = ''
    ucitavanje.value = false
    return osvjezi()
  }

  async function spoji() {
    if (povezivanje.value) return

    povezivanje.value = true
    greska.value = ''
    try {
      const novcanik = window.ethereum
      if (typeof novcanik?.request !== 'function') {
        throw new Error('MetaMask nije dostupan u ovom pregledniku.')
      }

      if (!ethereum || !adresa.value) {
        await novcanik.request({ method: 'eth_requestAccounts' })
      }
      if (!ethereum) {
        ethereum = novcanik
        ethereum.on?.('accountsChanged', promijeniSesiju)
        ethereum.on?.('chainChanged', promijeniSesiju)
      }
      await osvjezi()
    } catch (error) {
      greska.value = porukaGreske(
        error,
        'Odbijen je zahtjev za povezivanje s MetaMaskom.',
        'Povezivanje s MetaMaskom nije uspjelo.',
      )
    } finally {
      povezivanje.value = false
    }
  }

  onScopeDispose(() => {
    ethereum?.removeListener?.('accountsChanged', promijeniSesiju)
    ethereum?.removeListener?.('chainChanged', promijeniSesiju)
    verzijaSesije++
  })

  async function posalji(cilj, pripremi) {
    if (statusTransakcije.value) return

    greskaTransakcije.value = ''
    porukaTransakcije.value = ''
    statusTransakcije.value = 'Provjera transakcije…'

    const izvorniProvider = provider
    const potpisnik = adresa.value

    try {
      if (!izvorniProvider) throw new Error('Najprije spoji MetaMask na mrežu Sepolia.')
      if (ucitavanje.value) throw new Error('Pričekaj da se podaci učitaju.')
      const [ime, argumenti, potvrdeno] = pripremi()
      const signer = new JsonRpcSigner(izvorniProvider, potpisnik)
      const ugovor = cilj === 'token'
        ? new Contract(TOKEN_ADRESA, TOKEN_ABI, signer)
        : new Contract(MODUL_ADRESA, MODUL_ABI, signer)
      const metoda = ugovor.getFunction(ime)
      await metoda.staticCall(...argumenti)
      const [mreza, racuni] = await Promise.all([
        ethereum.request({ method: 'eth_chainId' }),
        ethereum.request({ method: 'eth_accounts' }),
      ])
      if (BigInt(mreza) !== SEPOLIA_CHAIN_ID) throw new Error(PORUKA_MREZE)
      if (provider !== izvorniProvider || racuni[0]?.toLowerCase() !== potpisnik.toLowerCase()) {
        throw new Error('Račun ili mreža su se promijenili. Provjeri MetaMask i pokušaj ponovno.')
      }

      statusTransakcije.value = 'Potvrdi transakciju u MetaMasku…'
      const tx = await metoda(...argumenti, { chainId: SEPOLIA_CHAIN_ID })
      statusTransakcije.value = 'Transakcija je poslana. Čeka se potvrda mreže…'

      let potvrda
      try {
        potvrda = await tx.wait()
      } catch (error) {
        if (error?.code !== 'TRANSACTION_REPLACED' || error.reason !== 'repriced') throw error
        potvrda = error.receipt
      }
      if (potvrda?.status !== 1) throw new Error('Transakcija nije uspješno izvršena.')

      if (provider === izvorniProvider) {
        porukaTransakcije.value = potvrdeno
        neglasaci.value = null
        await osvjezi()
      }
      return true
    } catch (error) {
      if (error?.code === 'INVALID_ARGUMENT' && error.argument === 'address') {
        greskaTransakcije.value = 'Unesi valjanu Ethereum adresu vlasnika.'
      } else if (error?.code === 'TRANSACTION_REPLACED') {
        greskaTransakcije.value = 'Transakcija je otkazana ili zamijenjena drugom radnjom.'
      } else if (error?.receipt?.status === 0 && !error.reason) {
        greskaTransakcije.value = 'Transakcija nije uspješno izvršena.'
      } else {
        greskaTransakcije.value = porukaGreske(
          error,
          'Potpis transakcije odbijen je u MetaMasku.',
          'Transakcija nije uspjela.',
        )
      }
    } finally {
      statusTransakcije.value = ''
    }
  }

  function dodijeliStan(brojStana, adresaVlasnika) {
    return posalji('token', () => {
      if (!mozeDodijeliti.value) throw new Error('Samo predstavnik može dodijeliti pravo.')
      const id = oznakaStana(brojStana)
      const vlasnik = getAddress(adresaVlasnika.trim())
      if (vlasnik === ZeroAddress) throw new Error('Unesi adresu vlasnika različitu od nulte.')
      return ['assignApartment', [id, vlasnik], `Pravo za stan ${id} je dodijeljeno.`]
    })
  }

  function oduzmiStan(brojStana) {
    return posalji('token', () => {
      if (!mozeDodijeliti.value) throw new Error('Samo predstavnik može oduzeti pravo.')
      const id = oznakaStana(brojStana)
      return ['revokeApartment', [id], `Pravo za stan ${id} je oduzeto.`]
    })
  }

  function predlozi(stan, naslov, opis) {
    return posalji('modul', () => {
      if (!stanovi.value.includes(stan)) throw new Error('Nemaš pravo za odabrani stan.')
      if (!naslov.trim() || !opis.trim() || [...naslov].length > 100 || [...opis].length > 1000) {
        throw new Error('Unesi naslov do 100 i opis do 1000 znakova.')
      }
      return ['submitProposal', [stan, naslov, opis], 'Prijedlog je evidentiran na Sepoliji.']
    })
  }

  function glasaj(krug, stan, izbor) {
    return posalji('modul', () => {
      const stanje = glasanje.value
      if (stanje?.faza !== 'aktivno' || stanje.zadnji.id !== krug.id) {
        throw new Error('Odabrani krug nije aktivan.')
      }
      if (!stanovi.value.includes(stan)) throw new Error('Nemaš pravo za odabrani stan.')
      if (stanje.glasali.includes(stan)) throw new Error('Stan je već glasao.')
      const ime = ['votePriorities', 'voteTieBreak', 'voteApproval'][krug.vrsta]
      return [ime, [krug.id, stan, izbor], `Glas za stan ${stan} je evidentiran.`]
    })
  }

  function pokreniKrug(pocetak, rok) {
    return posalji('modul', () => {
      const stanje = glasanje.value
      const sljedeci = stanje?.sljedeci
      if (!mozeDodijeliti.value || !sljedeci) throw new Error('Pokretanje kruga trenutačno nije dostupno.')
      if (![pocetak, rok].every(Number.isSafeInteger) || pocetak < (stanje.zadnji?.rok ?? 0)
          || rok <= pocetak || rok <= stanje.sada) {
        throw new Error('Odaberi valjan početak i budući rok nakon početka.')
      }

      const { vrsta, kandidati, prethodni } = sljedeci
      const metode = ['startPriorityRound', 'startTieBreakRound', 'startApprovalRound']
      const argumenti = vrsta === Vrsta.dodatni ? [prethodni, kandidati]
        : vrsta === Vrsta.odluka ? [kandidati[0]] : [kandidati]
      return [metode[vrsta], [...argumenti, pocetak, rok], 'Krug glasanja evidentiran je na Sepoliji.']
    })
  }

  async function ucitajNeglasace(id) {
    if (!provider || !mozeDodijeliti.value || statusEvidencije.value) return
    const verzija = verzijaSesije
    const modul = new Contract(MODUL_ADRESA, MODUL_ABI, provider)
    neglasaci.value = null
    greskaEvidencije.value = ''
    statusEvidencije.value = 'Učitavanje evidencije…'
    try {
      const stanovi = await modul.getNonVoters(id, { from: adresa.value })
      if (verzija === verzijaSesije && mozeDodijeliti.value) {
        neglasaci.value = { krug: id, stanovi: stanovi.map(Number) }
      }
    } catch (error) {
      if (verzija === verzijaSesije) {
        greskaEvidencije.value = porukaGreske(error, 'Zahtjev je odbijen.', 'Čitanje evidencije nije uspjelo.')
      }
    } finally {
      if (verzija === verzijaSesije) statusEvidencije.value = ''
    }
  }

  return {
    adresa, saldo, stanovi, glasanje, mozeDodijeliti, mozeRezultate, greska, greskaGlasanja,
    povezivanje, ucitavanje, statusTransakcije, porukaTransakcije, greskaTransakcije,
    neglasaci, statusEvidencije, greskaEvidencije,
    spoji, osvjezi, dodijeliStan, oduzmiStan, predlozi, glasaj, pokreniKrug, ucitajNeglasace,
  }
})
