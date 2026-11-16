# Decentralizirani sustav glasanja suvlasnika stambene zgrade

Autor: Jakov Đudarić

JMBAG: 0246115897

Oblik: Online


## Kratki opis projekta

Blockchain aplikacija koja suvlasnicima stambene zgrade omogućuje sigurno, transparentno i pseudonimno glasanje o prijedlozima za uređenje i korištenje zajedničkih prostora.


## Što sam izradio

Izradio sam blockchain aplikaciju za pseudonimno glasanje suvlasnika o uređenju i korištenju zajedničkih prostora. U ugovoru `Stan` evidentiram glasačko pravo po stanu neprenosivim tokenom STN. U ugovoru `StanModul` provodim predlaganje projekata, odabir prioriteta i konačno glasanje ZA/PROTIV, pri čemu svaki stan može predati jedan glas ili odabir po krugu. Kroz Vue sučelje mogu povezati MetaMask na Sepoliji, vidjeti svoja glasačka prava, predložiti projekt i glasati u ime ovlaštenog stana. Nakon isteka roka mogu pregledati rezultate. Kao predstavnik mogu pokretati krugove, pregledati stanove bez glasa te dodijeliti ili oduzeti pravo.

## Kako pokrećem sučelje

Rad sam isprobao s ovim verzijama:

```text
node 24.12.0
git version 2.54.0 (Apple Git-157)
```

Mogu koristiti i Node.js 22.18.0 ili noviji unutar grane 22.x. Iz korijena projekta pokrećem:

```sh
cd sucelje
npm install
npm run dev
```

Otvaram lokalnu adresu koju mi ispiše Vite i povezujem MetaMask na mreži Sepolia. Za čitanje salda, krugova i dostupnih rezultata ne potpisujem transakciju. Za predlaganje, glasanje i upravljanje koristim odgovarajući račun sa Sepolia ETH-om za mrežnu naknadu. Za ovo pokretanje koristim ugovore koji su već postavljeni na Sepoliji.

## Pametni ugovori – Sepolia

Koristim testnu mrežu Ethereum Sepolia (Chain ID 11155111).

### Stan (STN token)

- Adresa: `0xcEE1092a860238a455512F9A118341B21f3197DB`
- [Stan na Etherscanu](https://sepolia.etherscan.io/address/0xcEE1092a860238a455512F9A118341B21f3197DB)

### StanModul (glasanje)

- Adresa: `0xa5C42bf8B68C86847fa65a2DE440d770a23e98eC`
- [StanModul na Etherscanu](https://sepolia.etherscan.io/address/0xa5C42bf8B68C86847fa65a2DE440d770a23e98eC)
- [Uspješna predaja prijedloga „Stalak za bicikle” iz sučelja](https://sepolia.etherscan.io/tx/0xaad594ee6740c03df614bc8482a3a827b342216f69989c0ae09e8ab3b2e2adf2)

### Povezivanje

Ugovore sam povezao pozivom `Stan.setVotingModule()`. Uspješno povezivanje provjerio sam pozivom `Stan.votingModule()`.

### ABI

U sučelje uvozim ABI-je iz ovih datoteka:

- `frontend/src/abi/Stan.json`
- `frontend/src/abi/StanModul.json`

## Ručna provjera cijelog ciklusa na Sepoliji

U Braveu sam se preko MetaMaska spojio kao Account 1, predstavnik s pravom za stan 1, i kao Account 2, ovlašteni račun za stan 2. S Accounta 2 predao sam prijedlog „Stalak za bicikle” i nakon potvrde provjerio da se pojavljuje u sučelju.

- **Prioriteti.** Kao predstavnik pokrenuo sam krug, a s oba sam računa odabrao isti prijedlog. Prije roka zbrojevi su bili skriveni. Nakon roka sučelje je prikazalo dvije potpore.
- **ZA/PROTIV.** Pokrenuo sam završni krug i s oba računa glasao ZA. Nakon roka sučelje je prikazalo **2 ZA, 0 PROTIV i odbijen projekt**. Za prihvaćanje treba 13 glasova ZA od ukupno 25 stanova.
- **Odbijena dodjela.** Izvan aktivnog kruga pokušao sam ponovno dodijeliti zauzeti stan 1. Ugovor je u provjeri prije potpisa vratio `Stan vec ima token` i sučelje je prikazalo tu poruku. Za taj pokušaj nije poslana transakcija.

## Što sam naučio

U radu s ChatGPT-om naučio sam kako pravilo „jedan stan, jedno glasačko pravo” pretvoriti u specifikaciju i provjeriti ga testovima. Kod povezivanja s MetaMaskom naučio sam razlikovati čitanje stanja, odbijanje potpisa i potvrdu transakcije na mreži. Kad sam dodijelio stan 1, vidio sam kako se saldo u sučelju promijeni nakon potvrde. Idući put bih ranije spojio jednostavno sučelje na ugovore te odmah zapisao korake, očekivani i stvarni ishod svakog ručnog testa. Dok provjeravam vremenske granice glasanja, unaprijed bih odredio kada trebam stvoriti novi blok kako bih zaista provjerio stanje u zadanom trenutku.
