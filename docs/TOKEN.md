# Dio 5 — token Stan

`contracts/Stan.sol` implementira samo IStanToken. Prava pripadaju stanovima 1–25, svako pravo predstavlja 1 STN s 0 decimala. Ugovor počinje bez tokena. Predstavnik dodjeljuje i oduzima prava; obični ERC-20 prijenosi i odobrenja uvijek padaju.

Konstruktor prima `initialDeputy`, adresu početnog zamjenika. Predstavnik je adresa koja postavlja ugovor. Zamjenik mora biti druga, nenulta adresa. `owner()` je uvijek isti kao `representative()`. Pravila tokena zapisana su u Dijelu 5 SPEC.md, a povezivanje s modulom u Dijelu 6.

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
- Blokada promjena prava tijekom stvarnog aktivnog kruga i odsutnost nedogovorenih javnih funkcija.

Bezuvjetne funkcije čitanja nemaju neuspješan slučaj. Zabranjene radnje poput prijenosa STN-a nemaju uspješan slučaj. Testovi provjeravaju upravo njihovo odbijanje.

## Granice ove etape

Od 12. 11. 2026. `_isRoundActive()` čita stvarni povezani StanModul. `contracts/test/StanRoundHarness.sol` ostaje pomoćni ugovor za izolirani test, nije ugovor za postavljanje na mrežu.

Za povezivanje postaviti `Stan(initialDeputy)`, zatim `StanModul(adresaStana)`, a potom s predstavničkog računa pozvati `Stan.setVotingModule(adresaModula)`. Veza je jednokratna. Prije povezivanja moguće je dodjeljivati početna prava, ali nije moguće pokrenuti glasanje. Za provjeru koristiti `Stan.votingModule()`, `StanModul.tokenAddress()` i `StanModul.isRoundActive()`.

Integracijski testovi sada provjeravaju stvarno glasanje, prag 13 ZA, trajnost prava, promjenu vlasnika, zabranu promjena tijekom aktivnog kruga i povijest glasova (K5, K6, K24–K27). Postavljanje na Sepoliju i frontend nisu provedeni. Stare kopije u Remixu treba ažurirati i ponovno postaviti da bi podržavale vezu.

Pri instalaciji npm audit prijavio je 10 nalaza u razvojnim ovisnostima (1 low, 3 moderate, 6 high), uključujući posredne ovisnosti Hardhata i Moche. Produkcijska ovisnost OpenZeppelin nije među tim nalazima. Automatski prijedlozi uključuju nesukladne glavne verzije; nisu primijenjeni bez provjere kompatibilnosti. Ovo nije sigurnosni audit ugovora.

Tehničke reference: [Hardhat — Ethers i Mocha](https://hardhat.org/docs/guides/testing/using-ethers), [OpenZeppelin — ERC20](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20), [OpenZeppelin — Ownable](https://docs.openzeppelin.com/contracts/5.x/api/access).

## Rezultat lokalne provjere

Dana 11. 11. 2026. u projektnoj mapi prošli su kompilacija Solidity 0.8.24, svih 30 Mocha testova i TypeScript provjera. Testovi postavljaju ugovor samo na lokalnu simuliranu mrežu.

Dana 12. 11. 2026. nakon dodavanja modula prošli su kompilacija Solidity 0.8.24, svih 49 Mocha testova (30 tokena i 19 modula/integracije) i TypeScript provjera. To su lokalni testovi, bez postavljanja na Sepoliju.
