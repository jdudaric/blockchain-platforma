# Specifikacija: Decentralizirani sustav glasanja suvlasnika stambene zgrade

## Opis

Projekt za vježbe iz kolegija Blockchain aplikacije obuhvaća jednu stambenu zgradu. Suvlasnici predlažu projekte uređenja i korištenja zajedničkih prostora, biraju prioritete i odlučuju o prihvaćanju projekta. Jedinica glasačkog prava je stan, ne osoba ni vlasnički udio. Sustav sprječava višestruko glasanje istog stana u istom krugu i naknadnu promjenu predanog glasa.

Glasanje je pseudonimno: na lancu se koriste adrese novčanika, ali javne transakcije i povezanost adrese sa stanom mogu otkriti identitet. Sustav ne jamči potpunu anonimnost niti tajnost pojedinačnih glasova na javnom blockchainu. Aplikacija prikazuje rezultate tek nakon završetka glasanja; to ne znači da su podaci na lancu skriveni prije završetka.

## Korisnici i uloge

- **Suvlasnik / ovlašteni novčanik stana:** predstavlja stan s važećim STN tokenom, predlaže projekte i glasa u ime stana. Više suvlasnika istog stana ne dobiva dodatne tokene ni glasove.
- **Predstavnik suvlasnika:** dodjeljuje i oduzima tokene pri promjeni vlasnika, jedini pokreće sve vrste glasanja te određuje početak i rok završetka. Vidi koji stanovi nisu glasali. Predstavnička uloga sama po sebi ne daje glasačko pravo; za glasanje predstavnik mora imati pravo za stan.
- **Posjetitelj / adresa bez prava za stan:** nema ovlasti predlaganja, glasanja ni upravljanja. Opseg pristupa aplikaciji bez prijave ostaje otvoren; javne podatke blockchaina moguće je čitati izvan aplikacije.

## Odluke o tokenu

- Standard: ERC-20 s ograničenjem prenosivosti; naziv **Stan**, oznaka **STN**, **0 decimala**.
- Jednom stanu pripada **1 STN** i jedno glasačko pravo. Ne smiju istodobno postojati dva aktivna prava za isti stan.
- Token je neprenosiv: vlasnik ga ne može prodati, darovati ni prenijeti izravno ili preko odobrenja trećoj osobi. Dodjela i oduzimanje koje provodi predstavnik služe evidenciji prava, a nisu slobodan prijenos tokena.
- Pravo je trajno i višekratno: ne istječe završetkom glasanja i token se glasanjem ne troši. Trajnost ne sprečava oduzimanje pri promjeni vlasnika.
- Pri promjeni vlasnika predstavnik oduzima pravo starom vlasniku i dodjeljuje ga novom. Stari vlasnik nakon oduzimanja ne smije glasati temeljem tog stana.
- Ukupan broj stanova zgrade nije isto što i broj trenutačno dodijeljenih tokena. Nedodijeljeni tokeni ne smiju automatski smanjiti osnovicu za prihvaćanje projekta.
- Model za vlasnika više stanova i promjenu vlasnika tijekom aktivnog glasanja treba razriješiti prije implementacije.

## Odluke o modulu

1. Suvlasnici predlažu projekte. Predlaganje samo po sebi ne otvara glasanje.
2. Samo predstavnik pokreće krug odabira prioriteta, dodatni krug zbog izjednačenja i konačno glasanje ZA/PROTIV.
3. U krugu prioriteta stan predaje jedan konačan odabir najviše **3 različita prijedloga**. Svaki odabrani prijedlog dobiva jednu potporu tog stana; nije dopušteno višestruko poduprijeti isti prijedlog.
4. Izjednačenje koje onemogućuje izbor prioriteta rješava se dodatnim glasanjem među izjednačenim prijedlozima. Svaki stan ima **jedan glas za jedan prijedlog**. Postupak ako se izjednačenje ponovi ostaje otvoren.
5. Nakon određivanja prioriteta slijedi zasebno glasanje **ZA/PROTIV** projekta. Svaki stan smije predati jedan od ta dva odgovora.
6. Projekt je prihvaćen ako broj glasova ZA iznosi najmanje **51% svih stanova zgrade**. Za N stanova potrebno je najmanje **⌈51 × N / 100⌉** glasova ZA. Primjeri: za 10 stanova potrebno je 6 glasova ZA, za 100 stanova 51. Nije dovoljno imati većinu samo među sudionicima.
7. Neglasanje ne daje glas ZA i ne bilježi se kao glas PROTIV. Ako nema sudionika u glasanju ZA/PROTIV, projekt je odbijen.
8. Predani glas ili odabir je konačan; nema povlačenja, dopunjavanja ni promjene u istom krugu. U novom krugu stan ponovno ima odgovarajuće pravo glasanja.
9. Predstavnik unaprijed određuje početak i kraj kruga. Glasanje vrijedi u intervalu **početak ≤ vrijeme < rok**. Istekom roka automatski prestaje primanje glasova, bez ručnog zaključavanja predstavnika. Pravilo vrijedi za sve vrste krugova.
10. Aplikacija prikazuje rezultate nakon isteka roka. Predstavnik vidi evidenciju stanova koji nisu glasali; taj prikaz drugim korisnicima nije dogovorena ovlast.
11. Automatski završetak znači da status i mogućnost glasanja ovise o roku, a ne o tome je li netko pritisnuo gumb. Pametni ugovor sam ne šalje transakciju po isteku vremena; eventualna tehnička finalizacija mora poštovati istekli rok i već zadana pravila rezultata.

## Funkcije

Ovo je funkcionalni opis, bez programskog koda i bez konačnih potpisa funkcija. Navedene poruke greške su točni tekstovi bez dijakritike. Kod više istodobnih grešaka redoslijed provjera tek treba odrediti; kriteriji pojedinu grešku provjeravaju uz ostale valjane uvjete.

| Funkcija | Tko je smije pozvati | Ulazni podaci | Učinak | Neuspjeh i točna poruka |
| --- | --- | --- | --- | --- |
| Dodjela prava za stan | Predstavnik | Oznaka postojećeg stana, adresa novog vlasnika | Dodjeljuje 1 STN za stan bez aktivnog prava | Druga uloga: `Samo predstavnik`; nepoznat stan: `Stan ne postoji`; stan već ima pravo: `Stan vec ima token`; nevaljana adresa: `Neispravna adresa` |
| Oduzimanje prava za stan | Predstavnik | Oznaka stana | Ukida postojeće pravo i pripadajući STN | Druga uloga: `Samo predstavnik`; nepoznat stan: `Stan ne postoji`; nema aktivnog prava: `Stan nema token` |
| Prijenos ili odobrenje prijenosa STN | Nitko | Primatelj ili ovlaštena adresa i količina | Ne omogućuje prijenos ni ovlast za prijenos | Pokušaj prijenosa ili odobrenja: `Token nije prenosiv` |
| Predlaganje projekta | Suvlasnik s pravom za stan | Stan, naslov i opis prijedloga | Evidentira prijedlog za zgradu | Nema prava: `Nema prava za stan`; prazan naslov ili opis: `Nepotpun prijedlog` |
| Pokretanje kruga prioriteta | Predstavnik | Skup postojećih prijedloga, početak i rok | Otvara vremenski određen krug prioriteta | Druga uloga: `Samo predstavnik`; prazan skup: `Nema prijedloga`; nepoznat prijedlog: `Prijedlog ne postoji`; kraj nije nakon početka ili je već istekao: `Neispravan rok` |
| Predaja prioriteta | Suvlasnik s pravom za stan | Krug, stan, 1 do 3 različita prijedloga iz kruga | Jednokratno bilježi odabir i potpore | Zajedničke provjere glasanja navedene ispod; više od 3: `Najvise 3 prijedloga`; ponavljanje prijedloga: `Prijedlog je ponovljen`; prazan odabir: `Odaberite prijedlog`; prijedlog izvan kruga: `Prijedlog nije u glasanju` |
| Pokretanje dodatnog kruga | Predstavnik | Završen krug s izjednačenjem, izjednačeni prijedlozi, početak i rok | Otvara dodatni krug s jednim izborom po stanu | Druga uloga: `Samo predstavnik`; prethodni krug traje: `Prethodno glasanje nije zavrseno`; nema odgovarajućeg izjednačenja: `Nema izjednacenja`; neodgovarajući kandidati: `Neispravni kandidati`; nevaljan rok: `Neispravan rok` |
| Glasanje u dodatnom krugu | Suvlasnik s pravom za stan | Krug, stan, jedan prijedlog iz dodatnog kruga | Jednokratno bilježi jedan glas | Zajedničke provjere; broj izbora nije 1: `Odaberite jedan prijedlog`; prijedlog izvan kruga: `Prijedlog nije u glasanju` |
| Pokretanje ZA/PROTIV | Predstavnik | Projekt odabran postupkom prioriteta, početak i rok | Otvara konačno odlučivanje o projektu | Druga uloga: `Samo predstavnik`; prioritet nije razriješen: `Prioritet nije odredjen`; nevaljan rok: `Neispravan rok` |
| Predaja ZA/PROTIV | Suvlasnik s pravom za stan | Krug, stan, odgovor ZA ili PROTIV | Jednokratno bilježi odgovor | Zajedničke provjere; drugi odgovor: `Neispravan glas` |
| Prikaz rezultata u aplikaciji | Suvlasnik i predstavnik | Krug | Nakon roka prikazuje zbrojeve, sudjelovanje i ishod prema vrsti kruga | Nepoznat krug: `Glasanje ne postoji`; prije isteka: `Rezultati jos nisu dostupni` |
| Prikaz onih koji nisu glasali | Predstavnik | Krug | Prikazuje stanove bez predanog glasa i vezu na evidenciju vlasnika izvan lanca | Druga uloga: `Samo predstavnik`; nepoznat krug: `Glasanje ne postoji` |

**Zajedničke provjere svih predaja glasova:** nepoznat krug → `Glasanje ne postoji`; nema prava za zadani stan → `Nema prava za stan`; pogrešna vrsta kruga → `Pogresna vrsta glasanja`; prije početka → `Glasanje nije pocelo`; vrijeme je jednako roku ili kasnije → `Glasanje je zavrseno`; stan je već predao glas/odabir u tom krugu → `Stan je vec glasao`.

## Matrica ovlasti

„Da, uz token” znači važeće pravo za konkretni stan. Predstavnik bez takvog prava nema dodatni glas. „Nije odlučeno” izričito označava otvoreno pitanje, a ne dopuštenje.

| Radnja | Posjetitelj / bez prava | Suvlasnik s pravom za stan | Predstavnik |
| --- | --- | --- | --- |
| Dodijeliti ili oduzeti STN | Ne | Ne | Da |
| Prenijeti STN ili odobriti prijenos | Ne | Ne | Ne |
| Predložiti projekt | Ne | Da | Da, uz token |
| Pokrenuti prioritete | Ne | Ne | Da |
| Pokrenuti dodatni krug | Ne | Ne | Da |
| Pokrenuti ZA/PROTIV | Ne | Ne | Da |
| Odrediti početak i rok pri pokretanju | Ne | Ne | Da |
| Glasati u bilo kojoj vrsti kruga | Ne | Da, prema pravilima kruga | Da, uz token |
| Promijeniti ili povući predani glas | Ne | Ne | Ne |
| Glasati nakon roka | Ne | Ne | Ne |
| Vidjeti rezultate u aplikaciji prije roka | Ne | Ne | Ne |
| Vidjeti rezultate u aplikaciji nakon roka | Nije odlučeno | Da | Da |
| Vidjeti popis onih koji nisu glasali u aplikaciji | Ne | Ne | Da |
| Mijenjati rok aktivnog kruga | Nije odlučeno | Nije odlučeno | Nije odlučeno |
| Pregledavati javne podatke blockchaina | Da | Da | Da |

## Model podataka na lancu

Konceptualni model potreban za dogovorena pravila:

- Uloga/adresa predstavnika; postupak prve dodjele i zamjene uloge ostaje otvoren.
- Registar stanova s tehničkim oznakama, ukupan broj stanova N i veza stana s ovlaštenom adresom. Ne koristiti imena osoba kao oznake.
- ERC-20 metapodaci, stanja STN i evidencija aktivnog prava po stanu. Sam saldo adrese nije dovoljan za provjeru pravila „jedan glas po stanu”.
- Prijedlog: identifikator, autorova adresa i stan, naslov/opis ili referenca na sadržaj. Točan smještaj sadržaja ostaje otvoren.
- Krug: identifikator, vrsta (prioriteti / dodatni krug / ZA-PROTIV), kandidati ili projekt, veza na prethodni krug, početak i rok.
- Evidencija je li stan glasao u određenom krugu; konačan izbor/odgovor i pripadajući zbrojevi potrebni za provjerljiv rezultat.
- Osnovica N korištena za konačno odlučivanje te iz nje izveden prag. Vrijeme utvrđivanja osnovice i popisa prava treba potvrditi.
- Status završetka izveden iz roka; rezultat prioriteta, izjednačenje odnosno prihvaćen/odbijen projekt izvedeni iz zabilježenih glasova.

## Što se NE sprema na blockchain

- Privatni ključevi, seed fraze, lozinke i drugi pristupni podaci.
- Imena i prezimena, OIB, telefonski brojevi, e-mail adrese i vlasnička dokumentacija.
- Privatna evidencija koja tehničku oznaku stana/adresu novčanika povezuje s identitetom vlasnika; predstavnik je vodi izvan lanca uz ograničen pristup.
- Osobni podaci u naslovima, opisima ili prilozima prijedloga. Ni pseudonimne oznake ni vanjske reference ne jamče anonimnost.

## Kriteriji prihvaćanja

Svaki kriterij pretpostavlja da su svi uvjeti koji nisu predmet provjere valjani.

- **K1 — Dodjela:** **Zadano** je da poznati stan nema aktivno pravo. **Kada** predstavnik dodijeli pravo vlasniku. **Tada** stan ima točno 1 STN s 0 decimala i jedno glasačko pravo.
- **K2 — Dvostruka dodjela (neuspjeh):** **Zadano** je da stan već ima token. **Kada** predstavnik pokuša dodijeliti još jedan za isti stan. **Tada** zahtjev pada s `Stan vec ima token`, bez promjene prava.
- **K3 — Neovlaštena dodjela (neuspjeh):** **Zadano** je da pozivatelj nije predstavnik. **Kada** pokuša dodijeliti STN. **Tada** zahtjev pada s `Samo predstavnik`.
- **K4 — Neprenosivost (neuspjeh):** **Zadano** je da vlasnik ima STN. **Kada** pokuša prenijeti token ili odobriti njegov prijenos drugoj adresi. **Tada** zahtjev pada s `Token nije prenosiv`, bez promjene vlasnika prava.
- **K5 — Trajno pravo:** **Zadano** je da je stan glasao u završenom krugu. **Kada** započne novi krug. **Tada** token nije potrošen i stan ponovno smije glasati.
- **K6 — Promjena vlasnika:** **Zadano** je da nema aktivnog glasanja i stan ima starog vlasnika. **Kada** predstavnik oduzme staro pravo i dodijeli ga novom vlasniku. **Tada** samo novi vlasnik može glasati za taj stan u idućem krugu.
- **K7 — Predlaganje:** **Zadano** je da suvlasnik ima pravo za stan. **Kada** preda naslov i opis projekta. **Tada** prijedlog je evidentiran, ali glasanje nije automatski pokrenuto.
- **K8 — Pokretanje (neuspjeh):** **Zadano** je da suvlasnik nije predstavnik. **Kada** pokuša pokrenuti bilo koju vrstu kruga. **Tada** zahtjev pada s `Samo predstavnik`.
- **K9 — Tri prioriteta:** **Zadano** je da traje krug prioriteta s barem tri prijedloga. **Kada** stan preda tri različita prijedloga. **Tada** svaki dobiva jednu potporu, a odabir stana je konačan.
- **K10 — Previše prioriteta (neuspjeh):** **Zadano** je da stan još nije glasao. **Kada** odabere četiri prijedloga. **Tada** zahtjev pada s `Najvise 3 prijedloga` i ne bilježi se nijedna potpora.
- **K11 — Ponavljanje prijedloga (neuspjeh):** **Zadano** je da stan još nije glasao. **Kada** isti prijedlog uključi dvaput u odabir. **Tada** zahtjev pada s `Prijedlog je ponovljen`.
- **K12 — Konačnost glasa (neuspjeh):** **Zadano** je da je stan predao glas u tekućem krugu. **Kada** ponovno glasa, mijenja odgovor ili pokušava dopuniti prioritete. **Tada** zahtjev pada s `Stan je vec glasao`, a prvi odabir ostaje nepromijenjen.
- **K13 — Izjednačenje:** **Zadano** je da je završeni krug prioriteta izjednačen. **Kada** predstavnik pokrene dodatni krug. **Tada** kandidati su izjednačeni prijedlozi i svaki stan smije odabrati samo jedan.
- **K14 — Više izbora u dodatnom krugu (neuspjeh):** **Zadano** je da traje dodatni krug. **Kada** stan pokuša odabrati dva prijedloga. **Tada** zahtjev pada s `Odaberite jedan prijedlog`.
- **K15 — Prag prihvaćanja:** **Zadano** je da zgrada ima 10 stanova i završilo je ZA/PROTIV. **Kada** postoji 6 glasova ZA. **Tada** projekt je prihvaćen; pri 5 glasova ZA projekt je odbijen, čak i ako nitko nije glasao PROTIV.
- **K16 — Bez sudjelovanja:** **Zadano** je da traje ZA/PROTIV. **Kada** rok istekne bez ijednog glasa. **Tada** sudjelovanje je 0, broj ZA je 0 i projekt je odbijen.
- **K17 — Neglasanje:** **Zadano** je da zgrada ima 10 stanova, od kojih 4 nisu glasala. **Kada** se izračuna ishod ZA/PROTIV. **Tada** osnovica ostaje 10, a četiri neglasanja ne povećavaju ni ZA ni PROTIV.
- **K18 — Rok (neuspjeh):** **Zadano** je da je dosegnut ili prošao rok. **Kada** stan pokuša predati glas, iako predstavnik nije ručno zaključio krug. **Tada** zahtjev pada s `Glasanje je zavrseno`.
- **K19 — Prije početka (neuspjeh):** **Zadano** je da početak kruga još nije nastupio. **Kada** stan pokuša glasati. **Tada** zahtjev pada s `Glasanje nije pocelo`.
- **K20 — Bez prava (neuspjeh):** **Zadano** je da adresa nema pravo za zadani stan. **Kada** pokuša glasati za njega. **Tada** zahtjev pada s `Nema prava za stan`.
- **K21 — Rezultati:** **Zadano** je da krug traje. **Kada** korisnik zatraži rezultate u aplikaciji. **Tada** dobiva `Rezultati jos nisu dostupni`; nakon roka aplikacija prikazuje konačne zbrojeve i ishod. Javna čitljivost lanca pritom ostaje navedena korisniku.
- **K22 — Evidencija sudjelovanja:** **Zadano** je da dio stanova nije glasao. **Kada** predstavnik otvori evidenciju. **Tada** vidi te stanove; isti zahtjev drugog korisnika pada s `Samo predstavnik`.
- **K23 — Nevaljan rok (neuspjeh):** **Zadano** je da predstavnik pokreće krug. **Kada** odredi kraj koji nije nakon početka ili je već istekao. **Tada** zahtjev pada s `Neispravan rok`.

## Izvan opsega

- Više zgrada, glasanje po osobama ili suvlasničkim udjelima, trgovanje tokenima i delegiranje glasova.
- Plaćanja, prikupljanje sredstava, izvršenje radova i raspodjela novca.
- Potpuna anonimnost, kriptografski tajno glasanje i skrivanje javnih transakcija.
- Automatska provjera stvarnog vlasništva preko službenih registara.
- Pisanje koda i implementacija u ovom zadatku. Tehnološki okvir iz AGENTS.md ostaje Vue 3 (script setup), Pinia, Vite; od T4 Solidity ^0.8.24, OpenZeppelin Contracts 5.x, Hardhat 3 (ESM, TypeScript), Mocha i ethers v6; mreža Sepolia, chainId 11155111.

## Otvorena pitanja

1. Kako birati i zamijeniti predstavnika, uključujući gubitak njegova novčanika?
2. Tko i kako početno potvrđuje popis i ukupan broj stanova te mijenja registar? Kada se za svaki krug utvrđuju N i glasačka prava?
3. Kako se među više suvlasnika istog stana određuje ovlašteni novčanik? Kako isti vlasnik ostvaruje prava za više stanova?
4. Što se događa pri promjeni vlasnika tijekom aktivnog kruga, osobito ako je stan već glasao? Mora ostati očuvano pravilo najviše jednog glasa stana u krugu.
5. Što ako dodatni krug ponovno završi izjednačeno? Nije dogovoren odlučujući glas predstavnika.
6. Koliko prioriteta prelazi u konačno odlučivanje i kojim redoslijedom? Što ako nema glasova u prioritetnom ili dodatnom krugu? Pravilo automatskog odbijanja pri 0 sudionika potvrđeno je za ZA/PROTIV.
7. Smije li predstavnik uređivati, otkazati ili promijeniti rok već pokrenutog kruga? Kako se uređuju/povlače prijedlozi i ograničava njihov broj?
8. Smije li istodobno trajati više krugova i kada se odbijeni projekt smije ponovno predložiti?
9. Gdje se čuvaju naslovi, opisi i prilozi te tko ima pristup privatnoj evidenciji vlasnika? Koji su podaci u aplikaciji dostupni posjetiteljima?
10. Koji su najveći dopušteni opseg prijedloga, trajanje kruga i duljina tekstova? Koji je redoslijed provjera ako zahtjev ima više grešaka?
11. Treba li posebna transakcija finalizacije radi pohrane ishoda i tko je može pozvati? Završetak prava glasanja i prikaz rezultata ne smiju ovisiti o ručnom zaključavanju predstavnika.

## Sljedivost

Izvori su korisnikov zahtjev za nastavak razgovora **„BA projekt VJEŽBE”** (6af33f8f-bf08-83ed-a578-7c457b38df1f), dostupni završni dio tog razgovora i lokalne upute AGENTS.md. Dostupan dohvat razgovora sadrži završne odluke o pokretanju, isteku roka, nultom sudjelovanju i konačnosti glasa te sažetak prethodnih odluka; za ostale detalje mjerodavan je izričit korisnikov zahtjev. Neriješeni detalji nisu predstavljeni kao ranije potvrđene odluke.

| Zahtjev / odluka | Odjeljak | Provjera |
| --- | --- | --- |
| Jedna zgrada, jedan token i glas po stanu | Opis; Odluke o tokenu | K1, K2, K12 |
| ERC-20 Stan / STN, 0 decimala, neprenosivost | Odluke o tokenu | K1, K4 |
| Trajno pravo i promjena vlasnika preko predstavnika | Odluke o tokenu; Funkcije | K3, K5, K6 |
| Suvlasnici predlažu, samo predstavnik pokreće | Korisnici i uloge; Matrica ovlasti | K7, K8 |
| Najviše 3 prioriteta i dodatni krug s jednim izborom | Odluke o modulu | K9–K14 |
| ZA/PROTIV, najmanje 51% svih stanova | Odluke o modulu | K15–K17 |
| Konačan glas i automatski završetak | Odluke o modulu; Funkcije | K12, K18, K19, K23 |
| Pseudonimnost i rezultati nakon završetka | Opis; Što se NE sprema na blockchain | K21 i pregled teksta aplikacije pri implementaciji |
| Predstavnik vidi tko nije glasao | Matrica ovlasti; Model podataka na lancu | K22 |
| Kontrola prava i točne poruke bez dijakritike | Funkcije; Kriteriji prihvaćanja | K2–K4, K8, K10–K12, K14, K18–K23 |
| Neriješene odluke ostaju vidljive | Otvorena pitanja | Ručni pregled prije implementacije |
