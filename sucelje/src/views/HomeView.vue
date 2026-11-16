<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import RepresentativePanel from '../components/RepresentativePanel.vue'
import { MODUL_ADRESA, TOKEN_ADRESA } from '../contracts.js'
import { useWalletStore } from '../stores/wallet.js'
import { Ishod, Vrsta } from '../voting.js'
import { datumKruga, naziviFaza, naziviIshoda, naziviKrugova } from '../votingLabels.js'

const wallet = useWalletStore()
const stan = ref(null)
const naslov = ref('')
const opis = ref('')
const odabir = ref([])
const odgovor = ref(null)
const odabraniKrug = ref('')
const stanje = computed(() => wallet.glasanje)
const krug = computed(() => stanje.value?.zadnji)
const prijedlozi = computed(() => stanje.value?.prijedlozi ?? [])
const poId = computed(() => new Map(prijedlozi.value.map((prijedlog) => [prijedlog.id, prijedlog])))
const rezultat = computed(() => stanje.value?.rezultati[odabraniKrug.value])
const zavrseniKrugovi = computed(() => [...(stanje.value?.krugovi ?? [])]
  .reverse().filter(({ id }) => stanje.value?.rezultati[id]))
const krugRezultata = computed(() => zavrseniKrugovi.value.find(({ id }) => id === odabraniKrug.value))
const vecGlasao = computed(() => stanje.value?.glasali.includes(stan.value))
const maxIzbora = computed(() => krug.value?.vrsta === Vrsta.dodatni ? 1 : 3)
const zauzeto = computed(() => wallet.ucitavanje || Boolean(wallet.statusTransakcije))
const naslovValjan = computed(() => naslov.value.trim() && [...naslov.value].length <= 100)
const opisValjan = computed(() => opis.value.trim() && [...opis.value].length <= 1000)
const skracenaAdresa = computed(() => wallet.adresa
  ? wallet.adresa.slice(0, 8) + '…' + wallet.adresa.slice(-4)
  : 'Nije spojen')

watch(() => wallet.stanovi, (stanovi) => {
  if (!stanovi.includes(stan.value)) stan.value = stanovi[0] ?? null
}, { immediate: true })
watch(() => wallet.adresa, () => {
  naslov.value = ''
  opis.value = ''
})
watch([stan, () => krug.value?.id], () => {
  odabir.value = []
  odgovor.value = null
})
watch(() => zavrseniKrugovi.value[0]?.id, (id, prethodni) => {
  if (odabraniKrug.value === prethodni || !zavrseniKrugovi.value.some((krug) => krug.id === odabraniKrug.value)) {
    odabraniKrug.value = id ?? ''
  }
}, { immediate: true })

let timer
onMounted(() => {
  timer = window.setInterval(() => {
    if (wallet.adresa && !wallet.statusTransakcije && !document.hidden) wallet.osvjezi()
  }, 30_000)
})
onUnmounted(() => window.clearInterval(timer))

function nazivPrijedloga(id) {
  return poId.value.get(id)?.naslov || `Prijedlog #${id}`
}

async function posaljiPrijedlog() {
  if (await wallet.predlozi(stan.value, naslov.value, opis.value)) {
    naslov.value = ''
    opis.value = ''
  }
}

async function potvrdiGlas() {
  const izbor = krug.value.vrsta === Vrsta.odluka ? odgovor.value : odabir.value
  if (await wallet.glasaj(krug.value, stan.value, izbor)) {
    odabir.value = []
    odgovor.value = null
  }
}
</script>

<template>
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="#vrh">
        <span class="brand-mark" aria-hidden="true">S</span>
        Suvlasnici
      </a>
      <nav aria-label="Glavna navigacija">
        <a href="#glasanje">Glasanje</a>
        <a href="#prijedlozi">Prijedlozi</a>
        <a href="#rezultati">Rezultati</a>
        <a v-if="wallet.mozeDodijeliti" href="#upravljanje">Upravljanje</a>
      </nav>
      <span class="network">Ethereum Sepolia</span>
    </div>
  </header>

  <main id="vrh" class="container">
    <div class="overview">
      <section class="intro">
        <h1>Glasanje<br class="wide-only"> suvlasnika</h1>
        <p>Predloži projekt za zajedničke prostore, odaberi prioritete i glasaj u ime svojeg stana.</p>
        <a class="intro-link" href="#glasanje">Idi na glasanje ↓</a>
      </section>

      <section class="panel wallet" aria-labelledby="wallet-naslov">
        <h2 id="wallet-naslov">Moj novčanik</h2>
        <dl class="wallet-details">
          <div><dt>MetaMask</dt><dd :title="wallet.adresa">{{ skracenaAdresa }}</dd></div>
          <div><dt>Glasačka prava</dt><dd>{{ wallet.saldo === null ? '—' : wallet.saldo + ' STN' }}</dd></div>
          <div>
            <dt>Uloga</dt>
            <dd v-if="wallet.mozeDodijeliti">Predstavnik</dd>
            <dd v-else-if="wallet.saldo === '0'">Bez prava glasa</dd>
            <dd v-else-if="wallet.saldo !== null">Suvlasnik</dd>
            <dd v-else>—</dd>
          </div>
        </dl>
        <label v-if="wallet.stanovi.length > 1">Glasaj u ime stana
          <select v-model="stan" :disabled="zauzeto">
            <option v-for="id in wallet.stanovi" :key="id" :value="id">Stan {{ id }}</option>
          </select>
        </label>
        <p v-else-if="stan !== null" class="muted">Ovlašteni stan {{ stan }}</p>
        <button v-if="!wallet.adresa" :disabled="wallet.povezivanje || zauzeto" @click="wallet.spoji()">
          {{ wallet.povezivanje ? 'Povezivanje…' : 'Spoji MetaMask' }}
        </button>
        <button v-else class="secondary" :disabled="zauzeto" @click="wallet.osvjezi()">Osvježi podatke</button>
        <p v-if="wallet.ucitavanje" class="muted fine" role="status">Učitavanje sa Sepolije…</p>
        <p v-if="wallet.greska" class="notice error" role="alert">{{ wallet.greska }}</p>
      </section>
    </div>

    <div
      v-if="wallet.statusTransakcije || wallet.porukaTransakcije || wallet.greskaTransakcije"
      class="transaction-feedback"
    >
      <p v-if="wallet.statusTransakcije" class="notice" role="status">{{ wallet.statusTransakcije }}</p>
      <p v-else-if="wallet.greskaTransakcije" class="notice error" role="alert">{{ wallet.greskaTransakcije }}</p>
      <p v-else class="notice success" role="status">{{ wallet.porukaTransakcije }}</p>
    </div>

    <section id="glasanje" class="section">
      <h2>Glasanje</h2>
      <article class="panel">
        <template v-if="stanje">
          <div class="round-header">
            <div>
              <p class="status" :class="{ live: stanje.faza === 'aktivno' }">{{ naziviFaza[stanje.faza] }}</p>
              <h3 v-if="krug">{{ naziviKrugova[krug.vrsta] }} <span class="muted">· #{{ krug.id }}</span></h3>
            </div>
            <dl v-if="krug" class="round-dates">
              <div><dt>Početak</dt><dd>{{ datumKruga(krug.pocetak) }}</dd></div>
              <div><dt>Rok</dt><dd>{{ datumKruga(krug.rok) }}</dd></div>
            </dl>
          </div>
          <p v-if="!krug" class="muted">Predstavnik još nije pokrenuo prvi krug.</p>
          <template v-else>
            <template v-if="stanje.faza === 'aktivno' && stan !== null && !vecGlasao">
              <form class="stack ballot" @submit.prevent="potvrdiGlas">
                <fieldset class="stack" :disabled="zauzeto">
                  <template v-if="krug.vrsta === Vrsta.odluka">
                    <legend>{{ nazivPrijedloga(krug.kandidati[0]) }}</legend>
                    <p v-if="poId.get(krug.kandidati[0])?.opis" class="proposal-text muted">{{ poId.get(krug.kandidati[0]).opis }}</p>
                    <div class="choice-row">
                      <label class="choice"><input v-model="odgovor" type="radio" name="odluka" :value="1"> ZA</label>
                      <label class="choice"><input v-model="odgovor" type="radio" name="odluka" :value="0"> PROTIV</label>
                    </div>
                  </template>
                  <template v-else>
                    <legend>{{ maxIzbora === 1 ? 'Odaberi jedan prijedlog' : 'Odaberi 1 do 3 prijedloga' }}</legend>
                    <label v-for="id in krug.kandidati" :key="id" class="choice">
                      <input
                        v-model="odabir"
                        type="checkbox"
                        :value="id"
                        :disabled="!odabir.includes(id) && odabir.length >= maxIzbora"
                      >
                      <span>{{ nazivPrijedloga(id) }}</span>
                    </label>
                  </template>
                  <p class="muted fine">Stan {{ stan }} · Predani glas je konačan.</p>
                  <button :disabled="krug.vrsta === Vrsta.odluka ? odgovor === null : odabir.length === 0">
                    Predaj glas
                  </button>
                </fieldset>
              </form>
            </template>
            <template v-else>
              <ul class="candidate-list">
                <li v-for="id in krug.kandidati" :key="id">{{ nazivPrijedloga(id) }}</li>
              </ul>
              <p v-if="vecGlasao" class="notice success">Stan {{ stan }} već je glasao u ovom krugu.</p>
              <p v-else-if="stanje.faza === 'aktivno' && stan === null" class="muted">
                Za glasanje je potrebno dodijeljeno pravo za stan.
              </p>
              <p v-else-if="stanje.faza === 'zakazano'" class="muted">Glasanje se otvara u zakazano vrijeme.</p>
              <a v-else-if="wallet.mozeRezultate" href="#rezultati">Pogledaj rezultate ↓</a>
            </template>
          </template>
        </template>
        <p v-else-if="wallet.greskaGlasanja" class="notice error" role="alert">{{ wallet.greskaGlasanja }}</p>
        <p v-else class="muted">
          {{ wallet.ucitavanje ? 'Dohvaćanje krugova glasanja…' : 'Spoji MetaMask za prikaz stanja glasanja.' }}
        </p>
      </article>
    </section>

    <section id="prijedlozi" class="section">
      <h2>Prijedlozi projekata</h2>
      <div class="proposal-grid">
        <article class="panel">
          <template v-if="prijedlozi.length">
            <ul class="proposals">
              <li v-for="prijedlog in [...prijedlozi].reverse()" :key="prijedlog.id">
                <p class="muted fine">Prijedlog #{{ prijedlog.id }} · Stan {{ prijedlog.stan }}</p>
                <h3>{{ nazivPrijedloga(prijedlog.id) }}</h3>
                <p v-if="prijedlog.opis" class="proposal-text">{{ prijedlog.opis }}</p>
                <p v-else class="muted fine">Opis nije čitljiv iz ulaza ove transakcije.</p>
              </li>
            </ul>
          </template>
          <p v-else class="muted">
            {{ stanje ? 'Još nema evidentiranih prijedloga.' : 'Prijedlozi se učitavaju nakon povezivanja novčanika.' }}
          </p>
        </article>
        <article v-if="stan !== null" class="panel">
          <h3>Novi prijedlog</h3>
          <form class="stack" @submit.prevent="posaljiPrijedlog">
            <label>Naslov (do 100 znakova)
              <input v-model="naslov" required :disabled="zauzeto">
            </label>
            <label>Opis (do 1000 znakova)
              <textarea v-model="opis" rows="4" required :disabled="zauzeto"></textarea>
            </label>
            <p class="muted fine">Predaješ za stan {{ stan }}. Naslov i opis javno su čitljivi na lancu.</p>
            <button :disabled="zauzeto || !naslovValjan || !opisValjan">Predaj prijedlog</button>
          </form>
        </article>
      </div>
    </section>

    <section id="rezultati" class="section">
      <h2>Rezultati</h2>
      <article class="panel stack">
        <p class="notice">Zbrojevi se u sučelju prikazuju nakon roka. Glasanje je pseudonimno, a glasovi i transakcije javno su čitljivi na blockchainu.</p>
        <p v-if="!wallet.mozeRezultate" class="muted">Rezultate mogu čitati predstavnik i adrese s glasačkim pravom.</p>
        <p v-else-if="!zavrseniKrugovi.length" class="muted">Rezultati još nisu dostupni.</p>
        <template v-else-if="rezultat && krugRezultata">
          <label class="round-select">Završeni krug
            <select v-model="odabraniKrug">
              <option v-for="stavka in zavrseniKrugovi" :key="stavka.id" :value="stavka.id">
                {{ naziviKrugova[stavka.vrsta] }} · #{{ stavka.id }}
              </option>
            </select>
          </label>
          <h3>{{ naziviIshoda[rezultat.ishod] }}</h3>
          <p class="muted">Glasalo je {{ rezultat.sudjelovalo }} od 25 stanova.</p>
          <template v-if="krugRezultata.vrsta === Vrsta.odluka">
            <p><strong>{{ nazivPrijedloga(rezultat.prijedlozi[0]) }}</strong></p>
            <dl class="result-grid">
              <div><dt>ZA</dt><dd>{{ rezultat.za }}</dd></div>
              <div><dt>PROTIV</dt><dd>{{ rezultat.protiv }}</dd></div>
              <div><dt>Prag za prihvaćanje</dt><dd>13 ZA</dd></div>
            </dl>
          </template>
          <ul v-else class="results-list">
            <li v-for="(id, i) in rezultat.prijedlozi" :key="id">
              <span>{{ nazivPrijedloga(id) }} <small v-if="rezultat.vodeci.includes(id)" class="muted">· {{ rezultat.ishod === Ishod.izjednaceno ? 'Izjednačeno' : 'Vodeći projekt' }}</small></span>
              <strong>{{ rezultat.potpore[i] }} {{ krugRezultata.vrsta === Vrsta.prioriteti ? 'potp.' : 'gl.' }}</strong>
            </li>
          </ul>
          <p v-if="rezultat.ishod === Ishod.izjednaceno" class="muted">Za prvoplasirane slijedi dodatni krug.</p>
        </template>
      </article>
    </section>

    <RepresentativePanel v-if="wallet.mozeDodijeliti" :naziv-prijedloga="nazivPrijedloga" />
  </main>

  <footer class="container footer">
    <span>Sustav glasanja suvlasnika · Sepolia</span>
    <a :href="'https://sepolia.etherscan.io/address/' + TOKEN_ADRESA" target="_blank" rel="noopener">Stan (STN) ↗</a>
    <a :href="'https://sepolia.etherscan.io/address/' + MODUL_ADRESA" target="_blank" rel="noopener">Modul glasanja ↗</a>
  </footer>
</template>
