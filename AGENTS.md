# Pravila projekta

## Projekt
- Naziv: Decentralizirani sustav glasanja suvlasnika stambene zgrade
- Zajednica: Suvlasnici stanova jedne stambene zgrade
- Opis: Blockchain aplikacija koja suvlasnicima stambene zgrade omogućuje sigurno, transparentno i pseudonimno glasanje o prijedlozima za uređenje i korištenje zajedničkih prostora, uz sprječavanje dvostrukog glasanja i manipulacije rezultatima.

## Stack (koristi točno ove verzije)
- Frontend: Vue 3 (script setup), Pinia, Vite, u mapi frontend/
- Pametni ugovori (od T4): Solidity ^0.8.24, OpenZeppelin Contracts 5.x,
  Hardhat 3 (ESM, TypeScript), testovi: Mocha + ethers v6
- Mreža: Sepolia (chainId 11155111)

## Pravila rada
- Prije pisanja koda predloži kratak plan i pričekaj potvrdu.
- Mijenjaj samo datoteke potrebne za zadatak.
- Ne dodaj nove biblioteke bez pitanja.
- Svaka nova funkcija ugovora mora imati test, uključujući neuspješan slučaj.
- Za slanje ETH-a koristi call s provjerom, nikad transfer.
- Poruke u require piši bez dijakritike.
- Nikad ne traži, ne ispisuj i ne spremaj privatne ključeve.
- Na kraju ukratko objasni što si promijenio i zašto.

## Greške koje je AI već radio u ovom projektu
- (dopunjava student)
