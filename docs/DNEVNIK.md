# AI dnevnik

## T1 — Postavljanje projekta (10.11.)
- Cilj termina: riješiti etapu 1 , prvi chat sa ai
- Najkorisniji prompt (kopiran u cijelosti):

51% neka bude  ukljucujuci i one koji nisu glasali da a ova anonimnost, kuzim da se vidi u blockchainu ali recimo da pise mozda stanar 1 , stanar 2 itd a samo da predstavnik vidi one koji nisu glasali , neznam

- Što je AI napravio dobro: kriticki je razmisljao
- Što je AI napravio drugačije nego što sam očekivao: 
- Što sam dodao u AGENTS.md: naziv, zajednicu i opis projekta

### Tri odbijena prijedloga AI-ja

1. **Potpuno anonimno glasanje uz enkripciju** – Odbijeno jer bi zahtijevalo složeniju implementaciju. Odabrano je jednostavnije pseudonimno glasanje putem blockchain adresa.

2. **Prikaz rezultata tijekom glasanja** – Odbijeno jer bi se kod malog broja glasača moglo zaključiti kako je pojedini suvlasnik glasao. Rezultati će biti prikazani tek nakon završetka glasanja.

3. **Prihvaćanje prijedloga većinom izašlih glasača** – Odbijeno jer bi mali broj suvlasnika mogao odlučivati u ime cijele zgrade. Odabrano je pravilo da prijedlog mora dobiti najmanje 51% glasova ZA od ukupnog broja stanova s pravom glasa.

- Provjera:
- Commit: 10.11.26.

## T2 — AI intervju i specifikacija (10.11.)
dopunio datoteku docs/SPEC.md za projekt . Definirao sam pravila neprenosivog tokena Stan (STN), glasačko pravo po stanu te ovlasti suvlasnika i predstavnika.

Opisao sam predlaganje projekata, odabir najviše tri prioriteta, dodatno glasanje kod izjednačenja i konačno glasanje ZA/PROTIV uz prag prihvaćanja od najmanje 51% svih stanova. Definirao sam automatski završetak glasanja i nemogućnost promjene predanog glasa.

Dodana je matrica ovlasti, opis podataka na blockchainu i 23 kriterija prihvaćanja u obliku Zadano/Kada/Tada, uključujući 12 neuspješnih slučajeva s porukama greške bez dijakritike. Neriješene odluke navedene su u odjeljku „Otvorena pitanja”. Izmijenjena je samo specifikacija, bez pisanja programskog koda.

| Nalaz | Odluka (prihvaćeno / odbijeno) | Obrazloženje |
|---|---|---|
| C1 – Vlasnik više stanova | Prihvaćeno | Jedan stan ima jedan STN token i jedno glasačko pravo. Vlasnik dva stana ima dva tokena i može glasati jednom za svaki stan. |
| C2 – Promjena vlasnika tijekom glasanja | Prihvaćeno | Dodjela i oduzimanje tokena nisu dopuštene tijekom aktivnog glasanja kako bi se spriječila manipulacija pravima. |
| C3 – Automatski završetak glasanja | Prihvaćeno | Glasanje automatski završava istekom roka, bez potrebe za dodatnom transakcijom predstavnika. |
| C4 – Redoslijed projekata | Prihvaćeno | Projekti se rangiraju prema glasovima. Ako prvoplasirani projekt bude odbijen, prelazi se na sljedeći. |
| Z2 – Promjena roka glasanja | Prihvaćeno | Predstavnik određuje rok prije pokretanja glasanja. Nakon pokretanja rok se ne može mijenjati. |
| Z3 – Odabir prijedloga | Prihvaćeno | Svi valjani prijedlozi suvlasnika uključuju se u glasanje o prioritetima. Predstavnik ih ne može proizvoljno izostaviti. |
| Z4 – Neograničeno stvaranje prijedloga | Prihvaćeno | Svaki stan može imati najviše tri aktivna prijedloga, s naslovom do 100 znakova i opisom do 1000 znakova. |
| Z7 – Uvođenje potpune anonimnosti | Odbijeno | Sustav koristi pseudonimne adrese novčanika. Potpuna anonimnost nije cilj projekta i nepotrebno bi povećala složenost. |
| Z8 – Promjena ukupnog broja stanova | Prihvaćeno | Broj stanova je fiksan. Za primjer s 25 stanova potrebno je najmanje 13 glasova ZA. |
| Z9 – Gubitak ključa predstavnika | Prihvaćeno | Zamjenik može preuzeti ulogu nakon sigurnosnog čekanja od sedam dana. Predstavnik može otkazati preuzimanje tijekom čekanja. |
| R7 – Ponovno izjednačenje projekata | Prihvaćeno | Ako se izjednačenje za prvo mjesto ponovi, održava se novi dodatni krug dok se ne dobije pobjednik. |
| Z6 – Ponavljanje odbijenog projekta | Prihvaćeno | Isti projekt ne može ponovno na konačno glasanje 90 dana nakon odbijanja. |
| Zadržavanje prioriteta u novom ciklusu | Odbijeno | Neobrađeni projekti ne zadržavaju prethodni rang. U novom ciklusu ponovno se određuju prioriteti. |

## T3 — sucelje i sljedivost (11.11.)
Danas sam radio na sučeljima pametnih ugovora. Razjasnio sam nedostatke u specifikaciji i dopunio docs/SPEC.md dogovorenim odlukama. Izrađena su dva Solidity sučelja, IStanToken za token, uloge i administraciju te IStanModul za glasanje, spremljena u contracts/IStan.sol. Sučelja koriste pragma solidity 0.8.24 i sadrže deklaracije funkcija i događaja, bez implementacije. Iznad svake funkcije navedene su ovlaštene uloge i pripadajući kriteriji prihvaćanja.

Datoteku sam učitao u Remix i pokrenuo kompilaciju. U SPEC je dodana tablica sljedivosti koja povezuje svih 28 funkcija s kriterijima K1–K41. Provjereno je da svaki kriterij ima povezanu funkciju i da nema funkcije bez kriterija.

## T3 — Dio 5: token i provjera u Remixu (11.11.2026.)

Pripremio sam ugovor `Stan.sol` koji implementira `IStanToken` uz OpenZeppelin ERC20 i Ownable. Token Stan (STN) ima 0 decimala i nije prenosiv. Stanovi imaju oznake 1–25, a ugovor počinje bez izdanih tokena. Dogovorena pravila administracije zapisana su u SPEC, a funkcije u ugovoru povezane su s kriterijima kroz komentare.

U Remixu sam kompajlirao ugovor s verzijom 0.8.24 i postavio `Stan` u Remix VM. Račun A je račun kojim sam postavio ugovor i predstavnik, a račun B drugi račun kojem dodjeljujem pravo za stan. Ovo je lokalna simulacija, ne postavljanje na Sepoliju.

### Ručna provjera kriterija — koraci 19 i 20

| Kriterij | Što sam kliknuo | Očekivano | Dobiveno (poruka iz konzole / rezultat poziva) |
| --- | --- | --- | --- |
| K1 — uspješna dodjela | S računa A pozvao sam `assignApartment(1, adresa B)`, zatim `ownerOfApartment(1)`. Za provjeru salda i metapodataka predviđeni su `balanceOf(adresa B)`, `totalSupply()` i `decimals()`. | Dodjela uspijeva. Stan 1 pripada računu B, njegov saldo iznosi 1 STN, ukupna količina nakon prve dodjele je 1, a broj decimala 0. | Dodjela je uspjela. Na snimci zaslona `ownerOfApartment(1)` vraća `0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2` — adresu računa B. |
| K3 — neovlaštena dodjela | S računa B pokušao sam pozvati `assignApartment(2, adresa B)`. | Poziv pada s `Samo predstavnik`. | Dobivena je očekivana greška `Samo predstavnik`, prema mojoj potvrdi nakon ručne provjere. |
| K4 — neprenosivost | S računa B pokušao sam pozvati `transfer(adresa A, 1)`. | Poziv pada s `Token nije prenosiv`. | Dobivena je očekivana greška `Token nije prenosiv`, prema mojoj potvrdi nakon ručne provjere. |

Za ove tri provjere nisam prijavio odstupanje od očekivanog ponašanja. Puni ispisi konzole za K3 i K4 nisu priloženi u razgovoru; zapis poruka temelji se na mojoj potvrdi da su se pojavile očekivane greške. Za K1 snimka potvrđuje vlasnika stana; zasebni rezultati salda, ukupne količine i decimala, kao ni ponovno čitanje stanja nakon odbijenih poziva, nisu pojedinačno zabilježeni u razgovoru. Te dokaze mogu dopuniti iz Remixa, bez izmišljanja ispisa.

### Nalaz tijekom kompilacije i ispravak

| Nalaz | Je li problem u kodu ili SPEC-u? | Ispravak | Rezultat |
| --- | --- | --- | --- |
| Remix javlja `DeclarationError: Event with same name and parameter types defined twice` za `Transfer` i `Approval`. | Problem je u staroj kopiji koda `contracts/IStan.sol` u Remixu: događaji su zasebno deklarirani i u našem sučelju i u OpenZeppelin IERC20. Poslovna pravila SPEC-a nisu pogrešna. | Dodan je import `IERC20`, sučelje je promijenjeno u `interface IStanToken is IERC20`, a dvije ponovljene deklaracije događaja uklonjene su. Događaji ostaju naslijeđeni, s istim potpisima. | Nakon ispravka i ponovne kompilacije pojavile su se zelene kvačice. |

### Lokalna automatska provjera

Uz ručne provjere, lokalno je prethodno prošlo 30 automatskih testova tokena i provjera TypeScripta. Nakon dopune komentara u koraku 17 potvrđeno je da izvršni kod nije promijenjen te je ponovljena kompilacija s verzijom 0.8.24. Modul glasanja još nije implementiran; unutarnja provjera aktivnosti kruga pripremljena je za njegovo kasnije povezivanje.

### Spremanje tokena u projekt

Ugovor tokena spremljen je u `contracts/Stan.sol`, pokraj sučelja `contracts/IStan.sol`. Budući da su obje datoteke već bile u lokalnom projektu, nije bilo potrebno ponovno kopiranje. Time je dovršen korak spremanja tokena u mapu `contracts/`.

## T4 — Dio 6: modul glasanja i povezivanje tokena (12.11.2026.)

Nakon čitanja AGENTS.md, SPEC-a, sučelja, tokena i dnevnika potvrđen je plan prije pisanja koda. Potvrdio sam preporuke za završetak ciklusa nakon posljednjeg odbijanja, isključenje projekata pod 90-dnevnom zabranom iz novog ciklusa i minimalno povezivanje modula s tokenom. Zatim sam odgovorom „sve A” potvrdio životni ciklus prijedloga, slobodno određivanje valjanih rokova i brojanje Unicode znakova. Odluke i dodatni tehnički detalji zapisani su u Dijelu 6 SPEC-a.

### Implementacija

- Dodan je `contracts/StanModul.sol`, Solidity ^0.8.24, koji implementira IStanModul. Adresu tokena prima konstruktorom i s tokenom komunicira samo preko IStanToken.
- Implementirani su prijedlozi, prioriteti, ponovljeni dodatni krugovi, ZA/PROTIV s pragom 13 od 25, konačnost glasa, neglasači i čitanje rezultata nakon roka bez obvezne finalizacije.
- Krugovi čuvaju vezu na ciklus i prethodni krug. Novi prijedlozi čekaju sljedeći ciklus. Prihvaćanje oslobađa mjesto stana; odbijeni prijedlog ostaje aktivan, uz zabranu 90 dana od roka završnog kruga.
- Uz prethodno odobrenu dopunu sučelja, token dobiva `setVotingModule` i `votingModule`, a modul `tokenAddress` i `isRoundActive`. Veza je jednokratna; nepovezan modul ne može pokrenuti glasanje. Stvarna aktivnost kruga sada blokira promjene prava u Stanu.
- Funkcije imaju oznake SPEC K#. Nisu dodane biblioteke niti druge javne funkcije mimo dopunjenih sučelja.

### Lokalna automatska provjera

| Provjera | Stvarni rezultat |
| --- | --- |
| Kompilacija | Solidity 0.8.24, uspješno; završna izmjena modula kompajlirana i kroz Hardhat test naredbu |
| Mocha testovi | 49 prošlo: 30 postojećih testova tokena i 19 testova modula/integracije |
| TypeScript | `npm run typecheck` prošao |
| Provjera razlika | `git diff --check` bez grešaka |
| Javne funkcije i veličina | Test potvrđuje podudarnost modula sa sučeljem i veličinu ispod EVM ograničenja 24 576 bajtova |

Testovi uključuju uspješne i odbijene pozive, 0/12/13 ZA, nove vlasnike i povijesne glasove, točne vremenske granice, 90-dnevnu zabranu, promjenu predstavnika, nevaljan UTF-8, znakove s dijakritikom i emoji, izjednačenja koja se ponavljaju i sužavaju, nulto sudjelovanje, jednake vremenske oznake prijedloga te najveći skup od 75 aktivnih prijedloga.

Tijekom razvoja ispravljene su dvije provjere vremena: odbijeni poziv pri procjeni transakcije ne stvara novi blok, pa prije naknadnog čitanja treba izričito stvoriti blok na zadanom vremenu. Ispravljen je i test rangiranja koji je glasao za prvi ID obrnutog popisa, a očekivao drugog pobjednika. Završni skup testova prolazi.

Provjere su lokalne. Ovaj zapis ne tvrdi da sam modul ručno ispitao u Remixu ili postavio na Sepoliju. Aplikacijski prikaz i upozorenje o pseudonimnosti ostaju za frontend. Za zajedničku provjeru u Remixu treba ponovno postaviti ažurirani Stan, zatim StanModul s njegovom adresom, pa s predstavničkog računa pozvati setVotingModule.

## T4 — Korak 6: tri pogreške AI-ja i njihovi ispravci (12.11.2026.)

Tijekom izrade testova za modul glasanja naišao sam na tri pogreške u testovima koje je napisao AI. U nastavku opisujem što je bilo pogrešno i kako sam to ispravio uz njegovu pomoć. Sve tri pogreške bile su u `test/StanModul.ts`, pa nisam morao mijenjati ugovor ni poslovna pravila.

### 1. Pogrešno pomicanje vremena u testovima

**Što je AI pogriješio:** napisao je test koji postavlja vrijeme sljedećeg bloka, očekuje odbijenu transakciju i odmah nakon toga čita stanje ugovora. Međutim, odbijeni poziv tijekom procjene transakcije nije stvorio novi blok, pa se pri čitanju još koristilo staro vrijeme. Zbog toga test nije dobio očekivani rezultat: pojavila se poruka `Rezultati jos nisu dostupni`, odnosno aktivnost kruga bila je `false` umjesto `true`.

**Što sam ispravio:** uz pomoć AI-ja dodao sam `mine(vrijeme)` prije čitanja stanja na početku ili kraju kruga. Time se ne postavlja samo vrijeme sljedećeg bloka nego se taj blok i stvara pozivom `evm_mine`. Za određivanje vremena sljedeće transakcije zadržao sam `at(vrijeme)`.

**Rezultat:** testovi vremenskih granica i blokade promjene prava sada prolaze. Ovaj ispravak odnosi se na K18, K21, K25 i K27.

### 2. Pogrešno pripremljen glas u testu rangiranja

**Što je AI pogriješio:** u testu K28 upotrijebio je `ranked([3, 2, a])`, a očekivao poredak `[1, 2, 3]`, gdje je `a = 1`. Pomoćna funkcija `ranked` glasa za prvi projekt iz predanog popisa, pa je zapravo glasala za projekt 3. Ugovor je zato ispravno vratio `[3, 1, 2]`, ali je test pao jer je očekivao drugačiji rezultat.

**Što sam ispravio:** uz pomoć AI-ja zamijenio sam taj poziv izričitim pokretanjem prioriteta pomoću `start("priority", [3, 2, a])`, zatim glasom za `[a]` i pomakom vremena na rok. Tako sam uskladio stvarno predani glas s očekivanim rezultatom. Druga dva prijedloga ostala su bez potpore i s jednakim vremenom podnošenja, kako bi se njihov poredak provjerio prema manjem ID-u.

**Rezultat:** test sada dobiva očekivani poredak `[1, 2, 3]` i prolazi. Nije bilo potrebno mijenjati rangiranje u ugovoru.

### 3. Pogrešna usporedba povratnih vrijednosti ethers biblioteke

**Što je AI pogriješio:** u testovima K26 i K27 izravno je uspoređivao dva ethers v6 objekta `Result` pomoću `assert.deepEqual` iz `node:assert/strict`. Iako su sadržavali iste vrijednosti, provjera je pala uz poruku `Values have same structure but are not reference-equal`.

**Što sam ispravio:** uz pomoć AI-ja pretvorio sam rezultate u obične ugniježđene nizove pomoću `.toArray(true)` prije usporedbe. Za popis neglasača upotrijebio sam `[...rezultat]`. Zadržao sam usporedbu svih vrijednosti, ali sam uklonio problem usporedbe posebnih objekata biblioteke.

**Rezultat:** testovi sada prolaze i potvrđuju da promjena vlasnika ne mijenja povijesne glasove te da rezultat nakon isteka ostaje isti bez dodatne finalizacije i nakon odbijenog kasnog glasa.

### Završna provjera

Nakon ispravaka i dopune testova dobio sam rezultat **69 uspješnih testova i 1 preskočen test** pri lokalnom pokretanju `npx hardhat test` uz AI. Prošla je i provjera `npm run typecheck`. Preskočen test odnosi se na prikaz i upozorenje u aplikaciji iz K38, što ostavljam za frontend. Ugovorni dio K38 ima uspješan test. U SPEC sam uz pomoć AI-ja dopunio Sljedivost nazivima testova za kriterije K1–K41.
