# Dio 5 — token Stan

`contracts/Stan.sol` implementira samo IStanToken. Prava pripadaju stanovima 1–25, svako pravo predstavlja 1 STN s 0 decimala. Ugovor počinje bez tokena. Predstavnik dodjeljuje i oduzima prava; obični ERC-20 prijenosi i odobrenja uvijek padaju.

Konstruktor prima `initialDeputy`, adresu početnog zamjenika. Predstavnik je adresa koja postavlja ugovor. Zamjenik mora biti druga, nenulta adresa. `owner()` je uvijek isti kao `representative()`. Pravila i točne poruke zapisani su u završnom odjeljku SPEC.md.

## Lokalna provjera

Potrebni su Node.js 24 i npm. U korijenu projekta pokrenuti:

```sh
npm ci
npm run compile
npm test
npm run typecheck
```

Verzije ovisnosti zaključane su u package-lock.json. OpenZeppelin Contracts 5.4.0 koristi se uz Solidity 0.8.24, Hardhat 3, TypeScript, Mocha i ethers v6. Nisu potrebni novčanik, privatni ključevi ni sredstva na Sepoliji za lokalne testove.

## Što testovi dokazuju

- Metapodaci, početne uloge, prazan registar i točno 25 mogućih prava.
- Dodjela i oduzimanje, više prava po adresi, točne poruke grešaka i događaji.
- Neprenosivost kroz transfer, approve i transferFrom, uključujući nulti iznos i nedopuštene adrese.
- Oba načina prijenosa predstavništva, odbijanje odricanja, promjena zamjenika i gubitak starih ovlasti.
- Preuzimanje nakon sedam dana, otkazivanje prije isteka, granice vremena, pogrešni i ponovno korišteni ID-evi.
- Automatsko otkazivanje pri promjeni uloga, uključujući istek čekanja; neuspjele promjene zadržavaju zahtjev.
- Pripremljena blokada promjena prava tijekom aktivnog kruga i odsutnost nedogovorenih javnih funkcija.

Bezuvjetne funkcije čitanja nemaju neuspješan slučaj. Zabranjene radnje poput prijenosa STN-a nemaju uspješan slučaj. Testovi provjeravaju upravo njihovo odbijanje.

## Granice ove etape

`_isRoundActive()` u Stanu zasad vraća false. Budući modul mora nadograditi provjeru stvarnim stanjem glasanja. `contracts/test/StanRoundHarness.sol` samo simulira aktivni krug za test K25 i nije ugovor za postavljanje na mrežu.

Nisu implementirani glasanje, prag 13 ZA ni povijest glasova. Zato K5 i dijelovi K6, K24 i K26 koji se odnose na glasanje još nisu integracijski provjereni. Nije provedeno postavljanje na Sepoliju. Za buduće postavljanje odabire se Stan, ne StanRoundHarness.

Pri instalaciji npm audit prijavio je 10 nalaza u razvojnim ovisnostima (1 low, 3 moderate, 6 high), uključujući posredne ovisnosti Hardhata i Moche. Produkcijska ovisnost OpenZeppelin nije među tim nalazima. Automatski prijedlozi uključuju nesukladne glavne verzije; nisu primijenjeni bez provjere kompatibilnosti. Ovo nije sigurnosni audit ugovora.

Tehničke reference: [Hardhat — Ethers i Mocha](https://hardhat.org/docs/guides/testing/using-ethers), [OpenZeppelin — ERC20](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20), [OpenZeppelin — Ownable](https://docs.openzeppelin.com/contracts/5.x/api/access).

## Rezultat lokalne provjere

Dana 11. 11. 2026. u projektnoj mapi prošli su kompilacija Solidity 0.8.24, svih 30 Mocha testova i TypeScript provjera. Testovi postavljaju ugovor samo na lokalnu simuliranu mrežu.
