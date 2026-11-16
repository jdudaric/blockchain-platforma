<script setup>
import { computed, ref, watch } from 'vue'
import { useWalletStore } from '../stores/wallet.js'
import { Vrsta } from '../voting.js'
import { naziviKrugova } from '../votingLabels.js'

const props = defineProps({
  nazivPrijedloga: { type: Function, required: true },
})
const wallet = useWalletStore()
const brojStana = ref('')
const vlasnik = ref('')
const oduzimanje = ref('')
const evidencijaKrug = ref('')
const pocetak = ref('')
const rok = ref('')
const sljedeci = computed(() => wallet.glasanje?.sljedeci)
const vrsta = computed(() => sljedeci.value?.vrsta)
const zauzeto = computed(() => wallet.ucitavanje || Boolean(wallet.statusTransakcije))
const promjenaPrava = computed(() => wallet.glasanje?.faza !== 'aktivno')

function lokalniUnos(sekunde) {
  const vrijeme = new Date(sekunde * 1000)
  const lokalno = new Date(vrijeme.getTime() - vrijeme.getTimezoneOffset() * 60_000)
  return lokalno.toISOString().slice(0, 16)
}

watch([() => wallet.glasanje?.zadnji?.id, vrsta], () => {
  if (!sljedeci.value) return
  const sada = Math.max(Date.now() / 1000, wallet.glasanje.sada, wallet.glasanje.zadnji?.rok ?? 0)
  const prviTrenutak = Math.ceil(sada / 60) * 60
  pocetak.value = lokalniUnos(prviTrenutak)
  rok.value = lokalniUnos(prviTrenutak + (vrsta.value === Vrsta.dodatni ? 3 : 7) * 86_400)
}, { immediate: true })

watch(() => wallet.glasanje?.zadnji?.id, (id) => {
  evidencijaKrug.value = id ?? ''
}, { immediate: true })

async function dodijeli() {
  if (await wallet.dodijeliStan(brojStana.value, vlasnik.value)) {
    brojStana.value = ''
    vlasnik.value = ''
  }
}

async function oduzmi() {
  if (await wallet.oduzmiStan(oduzimanje.value)) oduzimanje.value = ''
}

function pokreni() {
  return wallet.pokreniKrug(Date.parse(pocetak.value) / 1000, Date.parse(rok.value) / 1000)
}
</script>

<template>
  <section id="upravljanje" class="section">
    <h2>Upravljanje zgradom</h2>
    <div class="admin-grid">
      <article class="panel">
        <h3>Pokretanje kruga</h3>
        <form v-if="sljedeci" class="stack" @submit.prevent="pokreni">
          <p><strong>{{ naziviKrugova[vrsta] }}</strong></p>
          <p v-if="vrsta === Vrsta.prioriteti && sljedeci.kandidati.length > 1" class="muted">
            U krug ulazi svih {{ sljedeci.kandidati.length }} prijedloga predviđenih za ovaj krug.
          </p>
          <ul class="candidate-list">
            <li v-for="id in sljedeci.kandidati" :key="id">{{ props.nazivPrijedloga(id) }}</li>
          </ul>
          <label>Početak <input v-model="pocetak" type="datetime-local" required :disabled="zauzeto"></label>
          <label>Rok <input v-model="rok" type="datetime-local" required :disabled="zauzeto"></label>
          <p class="muted fine">Vrijeme se prikazuje u lokalnoj zoni. Početak i rok zaključavaju se pri pokretanju.</p>
          <button :disabled="zauzeto">Pokreni krug</button>
        </form>
        <p v-else-if="!wallet.glasanje" class="muted">Podaci o glasanju trenutačno nisu dostupni.</p>
        <p v-else-if="['zakazano', 'aktivno'].includes(wallet.glasanje.faza)" class="muted">
          Sljedeći krug možeš pokrenuti nakon isteka roka postojećeg kruga.
        </p>
        <p v-else class="muted">Trenutačno nema raspoloživih prijedloga za novi krug.</p>

        <div v-if="wallet.glasanje?.krugovi.length" class="subsection stack">
          <h3>Stanovi bez glasa</h3>
          <label for="evidencija-krug">Krug za pregled</label>
          <select id="evidencija-krug" v-model="evidencijaKrug">
            <option v-for="krug in [...wallet.glasanje.krugovi].reverse()" :key="krug.id" :value="krug.id">
              {{ naziviKrugova[krug.vrsta] }} · #{{ krug.id }}
            </option>
          </select>
          <button class="secondary" :disabled="!evidencijaKrug || Boolean(wallet.statusEvidencije)" @click="wallet.ucitajNeglasace(evidencijaKrug)">
            Prikaži evidenciju
          </button>
          <p v-if="wallet.statusEvidencije" class="muted" role="status">{{ wallet.statusEvidencije }}</p>
          <p v-if="wallet.greskaEvidencije" class="notice error" role="alert">{{ wallet.greskaEvidencije }}</p>
          <div v-if="wallet.neglasaci?.krug === evidencijaKrug">
            <p v-if="wallet.neglasaci.stanovi.length">{{ wallet.neglasaci.stanovi.join(', ') }}</p>
            <p v-else>Svi su stanovi glasali.</p>
            <p class="muted fine">Popis obuhvaća i stanove bez dodijeljenog prava. Evidencija identiteta vodi se izvan lanca.</p>
          </div>
        </div>
      </article>

      <article class="panel">
        <h3>Glasačka prava</h3>
        <p v-if="!promjenaPrava" class="notice">Dodjela i oduzimanje prava dostupni su nakon aktivnog kruga.</p>
        <form class="stack" @submit.prevent="dodijeli">
          <fieldset :disabled="zauzeto || !promjenaPrava" class="stack">
            <legend>Dodijeli pravo</legend>
            <label>Broj stana
              <input v-model="brojStana" inputmode="numeric" pattern="[1-9]|1[0-9]|2[0-5]" placeholder="1–25" required>
            </label>
            <label>Ethereum adresa vlasnika
              <input v-model.trim="vlasnik" autocomplete="off" spellcheck="false" placeholder="0x…" required>
            </label>
            <button>Dodijeli pravo</button>
          </fieldset>
        </form>
        <form class="subsection stack" @submit.prevent="oduzmi">
          <fieldset :disabled="zauzeto || !promjenaPrava" class="stack">
            <legend>Oduzmi pravo</legend>
            <label>Broj stana
              <input v-model="oduzimanje" inputmode="numeric" pattern="[1-9]|1[0-9]|2[0-5]" placeholder="1–25" required>
            </label>
            <button class="secondary danger">Oduzmi pravo</button>
          </fieldset>
        </form>
      </article>
    </div>
  </section>
</template>
