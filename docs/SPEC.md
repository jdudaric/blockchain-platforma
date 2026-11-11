# Specifikacija: Decentralizirani sustav glasanja suvlasnika stambene zgrade

## Opis

Projekt za vježbe iz kolegija Blockchain aplikacije obuhvaća jednu stambenu zgradu. Suvlasnici predlažu projekte uređenja i korištenja zajedničkih prostora, biraju prioritete i odlučuju o prihvaćanju projekta. Jedinica glasačkog prava je stan, ne osoba ni vlasnički udio. Sustav sprječava višestruko glasanje istog stana u istom krugu i naknadnu promjenu predanog glasa.

Glasanje je pseudonimno: na lancu se koriste adrese novčanika, ali javne transakcije i povezanost adrese sa stanom mogu otkriti identitet. Sustav ne jamči potpunu anonimnost niti tajnost pojedinačnih glasova na javnom blockchainu. Aplikacija prikazuje rezultate tek nakon završetka glasanja; to ne znači da su podaci na lancu skriveni prije završetka.

## Korisnici i uloge

- **Suvlasnik / ovlašteni novčanik stana:** predstavlja stan s važećim STN tokenom, predlaže projekte i glasa u ime stana. Više suvlasnika istog stana ne dobiva dodatne tokene ni glasove.
- **Predstavnik suvlasnika:** dodjeljuje i oduzima tokene pri promjeni vlasnika, jedini pokreće sve vrste glasanja te određuje početak i rok završetka. Vidi koji stanovi nisu glasali. Predstavnička uloga sama po sebi ne daje glasačko pravo; za glasanje predstavnik mora imati pravo za stan.
- **Zamjenik predstavnika:** ima ovlasti običnog suvlasnika samo za stan za koji ima STN; može pokrenuti preuzimanje predstavničke uloge uz sigurnosno čekanje od 7 dana. Predstavnik može otkazati zahtjev tijekom čekanja. Zamjenik prije dovršetka preuzimanja ne može pokretati glasanja niti upravljati tokenima.
- **Posjetitelj / adresa bez prava za stan:** nema ovlasti predlaganja, glasanja ni upravljanja. Opseg pristupa aplikaciji bez prijave ostaje otvoren; javne podatke blockchaina moguće je čitati izvan aplikacije.

## Odluke o tokenu

- Standard: ERC-20 s ograničenjem prenosivosti; naziv **Stan**, oznaka **STN**, **0 decimala**.
- Jednom stanu pripada **1 STN** i jedno glasačko pravo. Ne smiju istodobno postojati dva aktivna prava za isti stan.
- Token je neprenosiv: vlasnik ga ne može prodati, darovati ni prenijeti izravno ili preko odobrenja trećoj osobi. Dodjela i oduzimanje koje provodi predstavnik služe evidenciji prava, a nisu slobodan prijenos tokena.
- Pravo je trajno i višekratno: ne istječe završetkom glasanja i token se glasanjem ne troši. Trajnost ne sprečava oduzimanje pri promjeni vlasnika.
- Pri promjeni vlasnika predstavnik oduzima pravo starom vlasniku i dodjeljuje ga novom. Stari vlasnik nakon oduzimanja ne smije glasati temeljem tog stana.
- Ukupan broj stanova zgrade nije isto što i broj trenutačno dodijeljenih tokena. Nedodijeljeni tokeni ne smiju automatski smanjiti osnovicu za prihvaćanje projekta.
- Ista adresa može biti ovlaštena za više stanova: za dva stana ima 2 STN i pravo na po jedan glas za svaki stan u svakom krugu. Pravo se uvijek provjerava po identifikatoru stana, a ne samo prema ukupnom saldu adrese.
- Dok traje bilo koji aktivni krug glasanja, predstavnik ne može dodjeljivati ni oduzimati prava. Nakon isteka kruga smije promijeniti vlasnika bez brisanja ili promjene povijesnih glasova.
- Za ovu zgradu registar ima fiksnih **N = 25 stanova**, pa je prag prihvaćanja **13 ZA**. Broj izdanih STN ne mijenja N.

## Odluke o modulu

1. Suvlasnici predlažu projekte. Predlaganje samo po sebi ne otvara glasanje. Stan može imati najviše **3 aktivna prijedloga**; naslov ima najviše 100 znakova, a opis najviše 1000 znakova.
2. **Ciklus** se pokreće odlukom predstavnika. U prioritete ulaze **svi valjani prijedlozi** tog ciklusa; predstavnik ne može proizvoljno izostaviti prijedlog. Jedino predstavnik pokreće krug prioriteta, dodatni krug zbog izjednačenja i konačno glasanje ZA/PROTIV.
3. U krugu prioriteta stan predaje jedan konačan odabir od **1 do 3 različita prijedloga**. Svaki odabrani prijedlog dobiva jednu potporu stana; isti prijedlog ne može dobiti više potpora istog stana.
4. Prijedlozi se rangiraju prema broju potpora. Ako je **prvo mjesto** izjednačeno, provodi se dodatni krug samo za izjednačene prvoplasirane prijedloge. Svaki stan ima jedan glas za jedan prijedlog u dodatnom krugu. Ako se izjednačenje na prvom mjestu ponovi, pokreće se novi dodatni krug, dok ne postoji jedan pobjednik. Ostala izjednačenja rješavaju se ranijim vremenom podnošenja prijedloga, pa manjim identifikatorom ako je vrijeme jednako.
5. Ako u prioritetnom krugu nema nijednog glasa, ne određuje se pobjednik; predstavnik može pokrenuti novi krug prioriteta. Prvoplasirani projekt ide prvi u zasebni krug **ZA/PROTIV**. Svaki stan smije dati jedan odgovor ZA ili PROTIV.
6. Projekt se prihvaća samo ako broj glasova ZA iznosi najmanje **⌈51 × N / 100⌉**, gdje je N ukupan fiksni broj stanova zgrade, a ne broj izdanih tokena ili sudionika. Za **N = 25** potrebno je **13 ZA**. Jednaki brojevi ZA i PROTIV ne pokreću dodatno glasanje, nego se primjenjuje isti prag.
7. Neglasanje ne daje glas ZA niti se bilježi kao PROTIV. Ako nema sudionika u ZA/PROTIV, projekt je odbijen. Ako je projekt odbijen, na red dolazi sljedeći projekt s rang-liste. Ako je prihvaćen, **ciklus završava**; preostali projekti mogu sudjelovati u novom ciklusu, ali **ne zadržavaju prethodni rang**.
8. Za isti identifikator **odbijenog projekta** nije moguće ponovno pokrenuti ZA/PROTIV prije isteka **90 dana od završetka** prethodnog konačnog kruga. Novi identifikator smatra se novim projektom; sadržajna sličnost sama po sebi ne aktivira zabranu.
9. Predani glas ili odabir je konačan: nema povlačenja, dopunjavanja ni promjene u istom krugu. U novom krugu stan ponovno ima odgovarajuće pravo glasanja. Prijenos vlasništva ne poništava povijesne glasove.
10. Predstavnik pri pokretanju unaprijed postavlja početak i rok svakog kruga. Nakon pokretanja **ni predstavnik ne smije promijeniti rok**. Glasanje vrijedi kada je **početak ≤ block.timestamp < rok**; nakon isteka automatski se odbijaju novi glasovi.
11. Aplikacija prikazuje rezultate nakon isteka roka. Predstavnik vidi evidenciju stanova koji nisu glasali; javni blockchain podaci ostaju čitljivi i prije isteka, pa je glasanje **pseudonimno, ne tajno ili potpuno anonimno**.
12. Ishod završnog kruga računa se iz zabilježenih glasova i roka **bez obvezne dodatne transakcije finalizacije**. Ako postoji pomoćna tehnička finalizacija, ona ne smije promijeniti rezultat niti uvjetovati čitanje rezultata.
13. Zadano trajanje kruga prioriteta i ZA/PROTIV je **7 dana**, a dodatnog kruga **3 dana**; početak i rok određuje predstavnik prije pokretanja. Zamjenik može pokrenuti preuzimanje uloge uz **7 dana** sigurnosnog čekanja; dotadašnji predstavnik smije otkazati preuzimanje prije isteka čekanja.

## Funkcije

Ovo je funkcionalni opis; točni potpisi definirani su u odjeljku „Sučelja ugovora — Etapa 4”. Navedene poruke greške su točni tekstovi bez dijakritike. Kod više istodobnih grešaka redoslijed provjera tek treba odrediti; kriteriji pojedinu grešku provjeravaju uz ostale valjane uvjete.

| Funkcija | Tko je smije pozvati | Ulazni podaci | Učinak | Neuspjeh i točna poruka |
| --- | --- | --- | --- | --- |
| Dodjela prava za stan | Predstavnik | Oznaka postojećeg stana, adresa novog vlasnika | Dodjeljuje 1 STN za stan bez aktivnog prava; blokirano tijekom aktivnog kruga | Aktivni krug: `Promjena prava nije dopustena tijekom glasanja`; druga uloga: `Samo predstavnik`; nepoznat stan: `Stan ne postoji`; stan već ima pravo: `Stan vec ima token`; nevaljana adresa: `Neispravna adresa` |
| Oduzimanje prava za stan | Predstavnik | Oznaka stana | Ukida postojeće pravo i pripadajući STN; blokirano tijekom aktivnog kruga | Aktivni krug: `Promjena prava nije dopustena tijekom glasanja`; druga uloga: `Samo predstavnik`; nepoznat stan: `Stan ne postoji`; nema aktivnog prava: `Stan nema token` |
| Prijenos ili odobrenje prijenosa STN | Nitko | Primatelj ili ovlaštena adresa i količina | Ne omogućuje prijenos ni ovlast za prijenos | Pokušaj prijenosa ili odobrenja: `Token nije prenosiv` |
| Predlaganje projekta | Suvlasnik s pravom za stan | Stan, naslov i opis prijedloga | Evidentira prijedlog za zgradu | Nema prava: `Nema prava za stan`; prazan naslov ili opis: `Nepotpun prijedlog`; više od 3 aktivna: `Previse aktivnih prijedloga`; prekoračena duljina: `Predug prijedlog` |
| Pokretanje kruga prioriteta | Predstavnik | Skup postojećih prijedloga, početak i rok | Otvara vremenski određen krug prioriteta za sve valjane prijedloge ciklusa | Druga uloga: `Samo predstavnik`; prazan skup: `Nema prijedloga`; nepoznat prijedlog: `Prijedlog ne postoji`; kraj nije nakon početka ili je već istekao: `Neispravan rok` |
| Predaja prioriteta | Suvlasnik s pravom za stan | Krug, stan, 1 do 3 različita prijedloga iz kruga | Jednokratno bilježi odabir i potpore | Zajedničke provjere glasanja navedene ispod; više od 3: `Najvise 3 prijedloga`; ponavljanje prijedloga: `Prijedlog je ponovljen`; prazan odabir: `Odaberite prijedlog`; prijedlog izvan kruga: `Prijedlog nije u glasanju` |
| Pokretanje dodatnog kruga | Predstavnik | Završen krug s izjednačenjem, izjednačeni prijedlozi, početak i rok | Otvara dodatni krug s jednim izborom po stanu | Druga uloga: `Samo predstavnik`; prethodni krug traje: `Prethodno glasanje nije zavrseno`; nema odgovarajućeg izjednačenja: `Nema izjednacenja`; neodgovarajući kandidati: `Neispravni kandidati`; nevaljan rok: `Neispravan rok` |
| Glasanje u dodatnom krugu | Suvlasnik s pravom za stan | Krug, stan, jedan prijedlog iz dodatnog kruga | Jednokratno bilježi jedan glas | Zajedničke provjere; broj izbora nije 1: `Odaberite jedan prijedlog`; prijedlog izvan kruga: `Prijedlog nije u glasanju` |
| Pokretanje ZA/PROTIV | Predstavnik | Projekt odabran postupkom prioriteta, početak i rok | Otvara konačno odlučivanje o sljedećem projektu na rang-listi; poštuje 90 dana zabrane ponavljanja istog odbijenog ID-a | Druga uloga: `Samo predstavnik`; prioritet nije razriješen: `Prioritet nije odredjen`; nevaljan rok: `Neispravan rok` |
| Predaja ZA/PROTIV | Suvlasnik s pravom za stan | Krug, stan, odgovor ZA ili PROTIV | Jednokratno bilježi odgovor | Zajedničke provjere; drugi odgovor: `Neispravan glas` |
| Pokretanje preuzimanja uloge | Zamjenik | Identifikator postupka | Pokreće čekanje od 7 dana; ne daje odmah predstavničke ovlasti | Druga uloga: `Samo zamjenik`; već aktivan postupak: `Preuzimanje je pokrenuto` |
| Otkazivanje preuzimanja uloge | Predstavnik | Identifikator postupka | Otkazuje preuzimanje prije isteka čekanja | Druga uloga: `Samo predstavnik`; nema aktivnog postupka: `Nema preuzimanja` |
| Dovršetak preuzimanja uloge | Zamjenik | Identifikator postupka | Po isteku 7 dana zamjenik postaje predstavnik, prethodna adresa gubi ovlasti | Prije isteka: `Cekanje nije zavrseno`; otkazano ili nepostojeće: `Nema preuzimanja` |
| Prikaz rezultata u aplikaciji | Suvlasnik i predstavnik | Krug | Nakon roka prikazuje zbrojeve, sudjelovanje i ishod prema vrsti kruga | Nepoznat krug: `Glasanje ne postoji`; prije isteka: `Rezultati jos nisu dostupni` |
| Prikaz onih koji nisu glasali | Predstavnik | Krug | Prikazuje stanove bez predanog glasa i vezu na evidenciju vlasnika izvan lanca | Druga uloga: `Samo predstavnik`; nepoznat krug: `Glasanje ne postoji` |

**Zajedničke provjere svih predaja glasova:** nepoznat krug → `Glasanje ne postoji`; nema prava za zadani stan → `Nema prava za stan`; pogrešna vrsta kruga → `Pogresna vrsta glasanja`; prije početka → `Glasanje nije pocelo`; vrijeme je jednako roku ili kasnije → `Glasanje je zavrseno`; stan je već predao glas/odabir u tom krugu → `Stan je vec glasao`.

## Matrica ovlasti

„Da, uz token” znači važeće pravo za konkretni stan. Predstavnik bez takvog prava nema dodatni glas. „Nije odlučeno” izričito označava otvoreno pitanje, a ne dopuštenje.

| Radnja | Posjetitelj / bez prava | Suvlasnik s pravom za stan | Predstavnik |
| --- | --- | --- | --- |
| Dodijeliti ili oduzeti STN | Ne | Ne | Da, samo izvan aktivnog kruga |
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
| Vidjeti rezultate u aplikaciji nakon roka | Ne | Da | Da |
| Vidjeti popis onih koji nisu glasali u aplikaciji | Ne | Ne | Da |
| Mijenjati rok nakon pokretanja kruga | Ne | Ne | Ne |
| Pokrenuti preuzimanje predstavničke uloge | Ne | Samo imenovani zamjenik | Ne (može dobrovoljno prenijeti ulogu) |
| Otkazati preuzimanje tijekom čekanja | Ne | Ne | Da |
| Pregledavati javne podatke blockchaina | Da | Da | Da |

## Model podataka na lancu

Konceptualni model potreban za dogovorena pravila:

- Uloga/adresa predstavnika i imenovanog zamjenika, zahtjev za preuzimanje, vrijeme pokretanja i status otkazivanja; prve adrese zadaju se pri postavljanju ugovora, a kasnije zamjenika imenuje predstavnik.
- Fiksni registar **25 stanova (N = 25)** s tehničkim oznakama i vezom svakog stana s ovlaštenom adresom. Ne koristiti imena osoba kao oznake. Jedna adresa može biti povezana s više stanova.
- ERC-20 metapodaci, stanja STN i evidencija aktivnog prava po stanu. Sam saldo adrese nije dovoljan za provjeru pravila „jedan glas po stanu”.
- Prijedlog: identifikator, autorova adresa i stan, naslov i opis kao tekst na lancu, vrijeme podnošenja, status aktivnosti i pripadnost ciklusu. Ograničenje je najviše tri aktivna prijedloga po stanu. Naslov i opis pohranjuju se na lancu; prilozi nisu razrađeni.
- Ciklus: identifikator, prijedlozi, rang-lista i status. Krug: identifikator, vrsta (prioriteti / dodatni krug / ZA-PROTIV), kandidati ili projekt, veza na ciklus i prethodni krug, početak i nepromjenjivi rok. Evidencija zadnjeg odbijanja po ID-u projekta za zabranu od 90 dana.
- Evidencija je li stan glasao u određenom krugu; konačan izbor/odgovor i pripadajući zbrojevi potrebni za provjerljiv rezultat.
- Fiksna osnovica N = 25 i izvedeni prag 13 ZA, neovisno o trenutačno dodijeljenim STN tokenima; povijesna evidencija glasa po stanu ne mijenja se pri naknadnoj promjeni vlasnika.
- Status završetka izveden iz roka; rezultat prioriteta, izjednačenje i prihvaćen/odbijen projekt izvedeni iz zabilježenih glasova, bez obvezne transakcije finalizacije. Poredak koristi broj potpora, a za jednaka niža mjesta vrijeme prijedloga i ID.

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
- **K15 — Prag prihvaćanja:** **Zadano** je da zgrada ima 25 stanova i završilo je ZA/PROTIV. **Kada** postoji 13 glasova ZA. **Tada** projekt je prihvaćen; pri 12 glasova ZA projekt je odbijen, čak i ako nitko nije glasao PROTIV.
- **K16 — Bez sudjelovanja:** **Zadano** je da traje ZA/PROTIV. **Kada** rok istekne bez ijednog glasa. **Tada** sudjelovanje je 0, broj ZA je 0 i projekt je odbijen.
- **K17 — Neglasanje:** **Zadano** je da zgrada ima 25 stanova, od kojih 4 nisu glasala. **Kada** se izračuna ishod ZA/PROTIV. **Tada** osnovica ostaje 25, a četiri neglasanja ne povećavaju ni ZA ni PROTIV.
- **K18 — Rok (neuspjeh):** **Zadano** je da je dosegnut ili prošao rok. **Kada** stan pokuša predati glas, iako predstavnik nije ručno zaključio krug. **Tada** zahtjev pada s `Glasanje je zavrseno`.
- **K19 — Prije početka (neuspjeh):** **Zadano** je da početak kruga još nije nastupio. **Kada** stan pokuša glasati. **Tada** zahtjev pada s `Glasanje nije pocelo`.
- **K20 — Bez prava (neuspjeh):** **Zadano** je da adresa nema pravo za zadani stan. **Kada** pokuša glasati za njega. **Tada** zahtjev pada s `Nema prava za stan`.
- **K21 — Rezultati:** **Zadano** je da krug traje. **Kada** korisnik zatraži rezultate u aplikaciji. **Tada** dobiva `Rezultati jos nisu dostupni`; nakon roka aplikacija prikazuje konačne zbrojeve i ishod. Javna čitljivost lanca pritom ostaje navedena korisniku.
- **K22 — Evidencija sudjelovanja:** **Zadano** je da dio stanova nije glasao. **Kada** predstavnik otvori evidenciju. **Tada** vidi te stanove; isti zahtjev drugog korisnika pada s `Samo predstavnik`.
- **K23 — Nevaljan rok (neuspjeh):** **Zadano** je da predstavnik pokreće krug. **Kada** odredi kraj koji nije nakon početka ili je već istekao. **Tada** zahtjev pada s `Neispravan rok`.

### Dodatni kriteriji prihvaćanja — prihvaćeni nalazi revizije

- **K24 — Više stanova po adresi:** **Zadano** je da adresa ima pravo za dva različita stana. **Kada** glasa u istom krugu za svaki stan jednom. **Tada** oba glasa su valjana, ali drugi pokušaj za isti stan pada s `Stan je vec glasao`.
- **K25 — Blokada promjene prava tijekom kruga:** **Zadano** je da je krug aktivan. **Kada** predstavnik pokuša dodijeliti ili oduzeti STN. **Tada** zahtjev pada s `Promjena prava nije dopustena tijekom glasanja`; tokeni, veza stan–adresa i stari glasovi ostaju nepromijenjeni.
- **K26 — Povijesni glas:** **Zadano** je da je stan glasao u završenom krugu. **Kada** predstavnik nakon završetka promijeni vlasnika. **Tada** prethodni glas i zbrojevi ostaju isti, a u budućem krugu može glasati samo novi vlasnik.
- **K27 — Automatski završetak i rezultat:** **Zadano** je da je dosegnut rok. **Kada** se bez finalizacijske transakcije zatraži ishod. **Tada** sustav vraća konačne zbrojeve i odbija daljnje glasove.
- **K28 — Redoslijed projekata:** **Zadano** je da je završen krug prioriteta. **Kada** se određuje prvi projekt. **Tada** bira se najveći broj potpora; izjednačenje na prvom mjestu zahtijeva dodatni krug, dok se jednakost na ostalim mjestima razrješava ranijim vremenom i manjim ID-om.
- **K29 — Ponovljeno izjednačenje:** **Zadano** je da dodatni krug opet završava izjednačenjem za prvo mjesto. **Kada** predstavnik pokrene novi dodatni krug. **Tada** kandidati su samo ponovno izjednačeni prijedlozi, svaki stan ima jedan glas, a nijedan projekt još nije određen kao pobjednik.
- **K30 — Odbijen pa sljedeći:** **Zadano** je da prvi projekt nema potreban broj ZA. **Kada** završi njegov krug. **Tada** rezultat je odbijen i sljedeći raspoloživi projekt na rang-listi postaje kandidat za zasebni ZA/PROTIV.
- **K31 — Prihvaćen projekt završava ciklus:** **Zadano** je da je projekt prihvaćen. **Kada** predstavnik pokuša u istom ciklusu pokrenuti ZA/PROTIV za drugi projekt. **Tada** zahtjev se odbija; neobrađeni prijedlozi mogu sudjelovati u novom ciklusu samo uz novo određivanje prioriteta.
- **K32 — Nepromjenjiv rok:** **Zadano** je da je krug pokrenut. **Kada** bilo koji korisnik, uključujući predstavnika, pokuša izmijeniti početak ili rok. **Tada** nijedna izmjena nije dopuštena. Krug od 7 dana, odnosno dodatni krug od 3 dana, završava na unaprijed zadanom roku.
- **K33 — Svi prijedlozi:** **Zadano** je da ciklus sadrži valjane prijedloge A, B i C. **Kada** predstavnik pokrene prioritete. **Tada** svi A, B i C ulaze u popis kandidata; podskup koji proizvoljno izostavlja valjani prijedlog nije dopušten.
- **K34 — Ograničenje prijedloga:** **Zadano** je da stan već ima tri aktivna prijedloga. **Kada** pokuša poslati četvrti. **Tada** zahtjev pada s `Previse aktivnih prijedloga`. Naslov iznad 100 znakova ili opis iznad 1000 znakova pada s `Predug prijedlog`.
- **K35 — 25 stanova:** **Zadano** je N = 25. **Kada** završi ZA/PROTIV. **Tada** 12 ZA znači odbijanje, a 13 ZA znači prihvaćanje, neovisno o broju glasova PROTIV i broju nedodijeljenih STN.
- **K36 — Ponovni pokušaj nakon odbijanja:** **Zadano** je da je projekt s ID-om X odbijen. **Kada** predstavnik prije isteka 90 dana pokuša ponovno pokrenuti ZA/PROTIV za ID X. **Tada** zahtjev se odbija. Novi ID nije automatski obuhvaćen zabranom samo zato što ima sličan sadržaj.
- **K37 — Zamjenik predstavnika:** **Zadano** je da je imenovan zamjenik. **Kada** pokrene preuzimanje. **Tada** ne dobiva ovlasti prije isteka 7 dana; ako predstavnik tijekom čekanja otkaže postupak, on se ne može završiti; nakon valjanog preuzimanja prethodna adresa gubi predstavničke ovlasti.
- **K38 — Pseudonimnost:** **Zadano** je da krug traje. **Kada** korisnik pogleda rezultate u aplikaciji. **Tada** aplikacija ne prikazuje zbrojeve prije roka i upozorava da se transakcije i glasovi mogu čitati izravno s javnog lanca; ne obećava anonimnost.

- **K39 — Administracija uloga:** **Zadano** je da su početne adrese predstavnika i zamjenika zadane pri postavljanju ugovora. **Kada** predstavnik imenuje zamjenika ili dobrovoljno prenese svoju ulogu. **Tada** odgovarajuća adresa uloge se ažurira, a prethodni predstavnik nakon prijenosa gubi ovlasti; poziv druge uloge se odbija. Nakon dovršenog preuzimanja zamjenik postaje predstavnik, a mjesto zamjenika ostaje prazno do novog imenovanja.
- **K40 — Jedan ciklus i nepreklapanje:** **Zadano** je da postoji nezavršen ciklus. **Kada** predstavnik pokreće krug. **Tada** krug pripada tom ciklusu i ne preklapa se s aktivnim ili zakazanim krugom; pokušaj preklapanja se odbija. Prvi prioritetni krug otvara novi ciklus, a ponavljanje prioriteta bez glasova ostaje u istom ciklusu.
- **K41 — Čitanje tokena:** **Zadano** je da je ugovor postavljen. **Kada** bilo koja adresa čita metapodatke, salda, dopuštenja ili vlasnika poznatog stana. **Tada** dobiva Stan / STN / 0 decimala, stvarni broj izdanih tokena i salda, dopuštenje prijenosa 0 te ovlaštenu adresu stana (nultu adresu ako pravo nije dodijeljeno). Nepoznat stan odbija se s `Stan ne postoji`.

## Izvan opsega

- Više zgrada, glasanje po osobama ili suvlasničkim udjelima, trgovanje tokenima i delegiranje glasova.
- Plaćanja, prikupljanje sredstava, izvršenje radova i raspodjela novca.
- Potpuna anonimnost, kriptografski tajno glasanje i skrivanje javnih transakcija.
- Automatska provjera stvarnog vlasništva preko službenih registara.
- Implementacija ugovora u ovom koraku; Etapa 4 sada uključuje deklaracije sučelja. Testovi ponašanja slijede uz implementaciju, kada postoje izvršive funkcije. Tehnološki okvir iz AGENTS.md ostaje Vue 3 (script setup), Pinia, Vite; od T4 Solidity ^0.8.24, OpenZeppelin Contracts 5.x, Hardhat 3 (ESM, TypeScript), Mocha i ethers v6; mreža Sepolia, chainId 11155111.

## Otvorena pitanja

Potvrđene odluke iz revizije više se ne smatraju otvorenima. Preostaje precizirati:

1. Tko izvan lanca potvrđuje sadržaj fiksnog registra 25 stanova? Prvi predstavnik i zamjenik zadaju se pri postavljanju ugovora; nakon preuzimanja zamjenika imenuje novi predstavnik. Detalji zaštite pri promjeni zamjenika dok traje preuzimanje i pri dobrovoljnom prijenosu uloge ostaju za razradu prije implementacije.
2. Kako se između više stvarnih suvlasnika istog stana izvan lanca bira ovlaštena adresa te kako predstavnik dokumentira provjeru promjene vlasnika? Na blockchainu pravo ostaje jedno po stanu.
3. Ako nakon odbijanja posljednjeg projekta više nema kandidata, završava li ciklus bez prihvaćenog projekta? Preklapanje aktivnih i zakazanih krugova nije dopušteno; istodobno postoji najviše jedan nezavršen ciklus.
4. Može li se projekt s aktivnom 90-dnevnom zabranom ponovno uključiti u glasanje prioriteta, iako ne smije u konačni ZA/PROTIV prije isteka zabrane?
5. Kako se tehnički uređuju/povlače prijedlozi i kada prijedlog prestaje biti „aktivan”? Naslov i opis pohranjuju se na lancu. Kako se obrađuju prilozi i broje znakovi (UTF-8 bajtovi ili Unicode znakovi)?
6. Koji se ostali podaci, osim rezultata i evidencije neglasača, prikazuju posjetitelju aplikacije, tko održava privatnu evidenciju identiteta i kojim redoslijedom se provjeravaju istodobne greške?
7. Treba li definirati maksimalno trajanje dodatnih ponavljanja izjednačenja, iako je poslovno pravilo ponavljati do pobjednika? Oporavak uz zamjenika i čekanje ne dokazuje stvarni gubitak ključa.

## Sučelja ugovora — Etapa 4

Dopuna prema odgovorima korisnika u nastavku razgovora 11. 11. 2026. Nazivi, tipovi i administracija potvrđeni su u razgovoru; završni tehnički oblik rezultata i događaja prihvaćen je korisnikovim prepuštanjem tehničke procjene AI-ju. Ova dopuna zatvara pitanja o potpisima za korake 9 i 10 vježbe, a ne sve odluke buduće implementacije.

- Datoteka: `contracts/IStan.sol`; `pragma solidity ^0.8.24`; sučelja `IStanToken` i `IStanModul`, bez implementacije i dodatnih biblioteka.
- Identifikatori i vremenske oznake koriste `uint256`, adrese `address`, naslov/opis `string`. Vrijeme je Unix vrijeme u sekundama. Novi ID prijedloga i kruga vraća funkcija koja ih stvara; ID postupka preuzimanja predaje pozivatelj.
- N je fiksnih 25, prag je 13 ZA (zaokruživanje 12,75 naviše). K15 i K17 usklađeni su s ovom zgradom umjesto ranijih primjera s 10 stanova.
- `choice` je `uint8`: 0 = PROTIV, 1 = ZA; ostalo se odbija s `Neispravan glas`. Dodatni krug prima niz radi provjere K14, ali prihvaća točno jedan izbor.
- Početne uloge postavljaju se pri instalaciji, izvan interfacea (interface nema konstruktor). Predstavnik poziva `setDeputy` i `transferRepresentative`. Nakon preuzimanja `deputy()` vraća nultu adresu do novog imenovanja.
- Istodobno postoji najviše jedan nezavršen ciklus. Krugovi, uključujući zakazane, ne preklapaju se. Prvi prioritetni krug otvara ciklus; ponavljanje prioriteta bez glasova ostaje u istom ciklusu. Zato pozivi pokretanja ne primaju zaseban ID ciklusa.
- Čitanje rezultata i neglasača koristi `view` funkcije ugovora. Rezultate nakon roka čita predstavnik ili adresa s barem jednim važećim pravom za stan; neglasače samo predstavnik. Te provjere nisu zaštita tajnosti javnog lanca. Ugovor vraća samo ID-eve stanova, a povezivanje s identitetom ostaje izvan lanca.
- `transfer`, `approve` i `transferFrom` zadržavaju standardne ERC-20 potpise, ali uvijek odbijaju poziv s `Token nije prenosiv`, uključujući nulti iznos. `allowance` vraća 0.
- Nema funkcije za promjenu roka, glasa ni obveznu finalizaciju. Uređivanje/povlačenje prijedloga zasad nema definiran potpis i nije dodano.

### Točni potpisi funkcija

Svaka deklaracija u sučelju ima komentar s ulogom i pripadajućim kriterijima. `calldata` označava ulazni tekst/niz, `memory` povratni tekst/niz/strukturu.

#### IStanToken

| Potpis | Ovlast | Kriteriji |
| --- | --- | --- |
| `name() external view returns (string memory)` | Svi (čitanje) | K41 |
| `symbol() external view returns (string memory)` | Svi (čitanje) | K41 |
| `decimals() external view returns (uint8)` | Svi (čitanje) | K1, K41 |
| `totalSupply() external view returns (uint256)` | Svi (čitanje) | K1, K6, K35, K41 |
| `balanceOf(address account) external view returns (uint256)` | Svi (čitanje) | K1, K5, K24, K41 |
| `allowance(address owner, address spender) external view returns (uint256)` | Svi (čitanje) | K4, K41 |
| `transfer(address to, uint256 value) external returns (bool)` | Nitko; poziv se odbija s Token nije prenosiv | K4 |
| `approve(address spender, uint256 value) external returns (bool)` | Nitko; poziv se odbija s Token nije prenosiv | K4 |
| `transferFrom(address from, address to, uint256 value) external returns (bool)` | Nitko; poziv se odbija s Token nije prenosiv | K4 |
| `assignApartment(uint256 apartmentId, address owner) external` | Predstavnik | K1, K2, K3, K6, K24, K25, K26 |
| `revokeApartment(uint256 apartmentId) external` | Predstavnik | K6, K25, K26 |
| `ownerOfApartment(uint256 apartmentId) external view returns (address)` | Svi (čitanje) | K1, K6, K24, K41 |
| `representative() external view returns (address)` | Svi (čitanje) | K37, K39 |
| `deputy() external view returns (address)` | Svi (čitanje) | K37, K39 |
| `setDeputy(address newDeputy) external` | Predstavnik | K39 |
| `transferRepresentative(address newRepresentative) external` | Predstavnik | K39 |
| `requestTakeover(uint256 takeoverId) external` | Zamjenik | K37 |
| `cancelTakeover(uint256 takeoverId) external` | Predstavnik | K37 |
| `completeTakeover(uint256 takeoverId) external` | Zamjenik | K37, K39 |

#### IStanModul

| Potpis | Ovlast | Kriteriji |
| --- | --- | --- |
| `submitProposal(uint256 apartmentId, string calldata title, string calldata description) external returns (uint256 proposalId)` | Suvlasnik s pravom za zadani stan; predstavnik i zamjenik samo uz isto pravo | K7, K34 |
| `startPriorityRound(uint256[] calldata proposalIds, uint256 startTime, uint256 endTime) external returns (uint256 roundId)` | Predstavnik | K8, K23, K28, K32, K33, K40 |
| `votePriorities(uint256 roundId, uint256 apartmentId, uint256[] calldata proposalIds) external` | Suvlasnik s pravom za zadani stan; predstavnik i zamjenik samo uz isto pravo | K5, K9, K10, K11, K12, K18, K19, K20, K24, K27 |
| `startTieBreakRound(uint256 previousRoundId, uint256[] calldata proposalIds, uint256 startTime, uint256 endTime) external returns (uint256 roundId)` | Predstavnik | K8, K13, K23, K28, K29, K32, K40 |
| `voteTieBreak(uint256 roundId, uint256 apartmentId, uint256[] calldata proposalIds) external` | Suvlasnik s pravom za zadani stan; predstavnik i zamjenik samo uz isto pravo | K5, K12, K13, K14, K18, K19, K20, K24, K27, K29 |
| `startApprovalRound(uint256 proposalId, uint256 startTime, uint256 endTime) external returns (uint256 roundId)` | Predstavnik | K8, K23, K28, K30, K31, K32, K36, K40 |
| `voteApproval(uint256 roundId, uint256 apartmentId, uint8 choice) external` | Suvlasnik s pravom za zadani stan; predstavnik i zamjenik samo uz isto pravo | K5, K12, K18, K19, K20, K24, K27, K35 |
| `getRoundResults(uint256 roundId) external view returns (RoundResults memory results)` | Predstavnik ili adresa s barem jednim važećim pravom za stan; tek nakon roka | K15, K16, K17, K21, K26, K27, K28, K29, K30, K31, K35, K38 |
| `getNonVoters(uint256 roundId) external view returns (uint256[] memory apartmentIds)` | Predstavnik | K22 |

### Tip rezultata

Tipovi pripadaju `IStanModul`; redoslijed enum vrijednosti počinje od 0.

```solidity
    enum RoundType { Priority, TieBreak, Approval }
    enum RoundOutcome { NoVotes, Tied, WinnerSelected, Accepted, Rejected }

    struct RoundResults {
        RoundType roundType;
        RoundOutcome outcome;
        uint256[] proposalIds;
        uint256[] supportCounts;
        uint256 participationCount;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256[] leadingProposalIds;
    }
```

`participationCount` je broj stanova koji su predali glas, ne zbroj potpora. U prioritetnom i dodatnom krugu `proposalIds` i `supportCounts` imaju istu duljinu i odgovarajuće pozicije; projekti se vraćaju rangirani prema broju potpora, vremenu i ID-u, ali izjednačeni prvoplasirani i dalje zahtijevaju dodatni krug. `leadingProposalIds` sadrži jednog pobjednika ili sve izjednačene prvoplasirane. Bez glasova je prazan, uz ishod `NoVotes`. `votesFor` i `votesAgainst` u tim krugovima su 0.

U ZA/PROTIV `proposalIds` sadrži jedan projekt, a `supportCounts` i `leadingProposalIds` su prazni. `votesFor` i `votesAgainst` su konačni zbrojevi. Ishod je `Accepted` za najmanje 13 ZA, inače `Rejected`, uključujući slučaj bez glasova. Rezultat se računa bez obvezne transakcije finalizacije.

### Događaji

Ovo je potpuni dogovoreni popis događaja sučelja. Parametri označeni `indexed` služe filtriranju zapisa.

**IStanToken**

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
event ApartmentAssigned(uint256 indexed apartmentId, address indexed owner);
event ApartmentRevoked(uint256 indexed apartmentId, address indexed previousOwner);
event DeputyChanged(address indexed previousDeputy, address indexed newDeputy);
event TakeoverRequested(uint256 indexed takeoverId, address indexed requester, uint256 executableAt);
event TakeoverCancelled(uint256 indexed takeoverId);
event RepresentativeChanged(address indexed previousRepresentative, address indexed newRepresentative);
```

**IStanModul**

```solidity
event ProposalSubmitted(uint256 indexed proposalId, uint256 indexed apartmentId, address indexed author);
event RoundStarted(uint256 indexed roundId, RoundType roundType, uint256[] proposalIds, uint256 startTime, uint256 endTime);
event PrioritiesSubmitted(uint256 indexed roundId, uint256 indexed apartmentId, uint256[] proposalIds);
event TieBreakVoteSubmitted(uint256 indexed roundId, uint256 indexed apartmentId, uint256 indexed proposalId);
event ApprovalVoteSubmitted(uint256 indexed roundId, uint256 indexed apartmentId, uint8 choice);
```

`Transfer` prati izdavanje i uništavanje STN uz nultu izvornu odnosno odredišnu adresu. `Approval` je standardna ERC-20 deklaracija, ali odbijeni `approve` ne ostavlja događaj. Ostali događaji prate uspješnu odgovarajuću radnju; `RepresentativeChanged` prati i dobrovoljni prijenos i dovršeno preuzimanje, a `DeputyChanged` i pražnjenje mjesta zamjenika. Odbijeni pozivi ne ostavljaju događaje. Nema obveznog događaja završetka jer sam protek vremena ne izvršava transakciju.

## Sljedivost

### Funkcija | Kriteriji

Tablica obuhvaća svih 28 funkcija iz `contracts/IStan.sol`. Oznake odgovaraju komentarima iznad deklaracija; svaki kriterij K1–K41 pojavljuje se barem jednom.

| Funkcija | Kriteriji |
| --- | --- |
| `IStanToken.name()` | K41 |
| `IStanToken.symbol()` | K41 |
| `IStanToken.decimals()` | K1, K41 |
| `IStanToken.totalSupply()` | K1, K6, K35, K41 |
| `IStanToken.balanceOf()` | K1, K5, K24, K41 |
| `IStanToken.allowance()` | K4, K41 |
| `IStanToken.transfer()` | K4 |
| `IStanToken.approve()` | K4 |
| `IStanToken.transferFrom()` | K4 |
| `IStanToken.assignApartment()` | K1, K2, K3, K6, K24, K25, K26 |
| `IStanToken.revokeApartment()` | K6, K25, K26 |
| `IStanToken.ownerOfApartment()` | K1, K6, K24, K41 |
| `IStanToken.representative()` | K37, K39 |
| `IStanToken.deputy()` | K37, K39 |
| `IStanToken.setDeputy()` | K39 |
| `IStanToken.transferRepresentative()` | K39 |
| `IStanToken.requestTakeover()` | K37 |
| `IStanToken.cancelTakeover()` | K37 |
| `IStanToken.completeTakeover()` | K37, K39 |
| `IStanModul.submitProposal()` | K7, K34 |
| `IStanModul.startPriorityRound()` | K8, K23, K28, K32, K33, K40 |
| `IStanModul.votePriorities()` | K5, K9, K10, K11, K12, K18, K19, K20, K24, K27 |
| `IStanModul.startTieBreakRound()` | K8, K13, K23, K28, K29, K32, K40 |
| `IStanModul.voteTieBreak()` | K5, K12, K13, K14, K18, K19, K20, K24, K27, K29 |
| `IStanModul.startApprovalRound()` | K8, K23, K28, K30, K31, K32, K36, K40 |
| `IStanModul.voteApproval()` | K5, K12, K18, K19, K20, K24, K27, K35 |
| `IStanModul.getRoundResults()` | K15, K16, K17, K21, K26, K27, K28, K29, K30, K31, K35, K38 |
| `IStanModul.getNonVoters()` | K22 |

Povezanost s funkcijom ne znači da je ponašanje već implementirano ili testirano. K32 provjerava i da ne postoji put za naknadnu promjenu početka ili roka; zato se veže uz funkcije koje postavljaju te vrijednosti. K21 i K38 uz `getRoundResults` zahtijevaju i provjeru prikaza i upozorenja u aplikaciji. Početno imenovanje iz K39 provjerava se pri postavljanju buduće implementacije, jer sučelje nema konstruktor.

### Izvori i odluke

Izvori su korisnikov zahtjev za nastavak razgovora **„BA projekt VJEŽBE”** (6af33f8f-bf08-83ed-a578-7c457b38df1f), dostupni završni dio tog razgovora i lokalne upute AGENTS.md. Dostupan dohvat razgovora sadrži završne odluke o pokretanju, isteku roka, nultom sudjelovanju i konačnosti glasa te sažetak prethodnih odluka; za ostale detalje mjerodavan je izričit korisnikov zahtjev. Neriješeni detalji nisu predstavljeni kao ranije potvrđene odluke. Prihvaćeni nalazi recenzije i korisnikove naknadne potvrde iz razgovora uneseni su u ovu inačicu SPEC.md; odbijeni prijedlozi (potpuna anonimnost i prijenos starog ranga u novi ciklus) nisu uvedeni.

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
| Više stanova, blokada promjene prava i povijesni glasovi | Odluke o tokenu; Funkcije | K24–K26 |
| Rangiranje, dodatni krug i sljedeći projekt | Odluke o modulu | K28–K31 |
| Rokovi, svi prijedlozi, limiti, 90 dana | Odluke o modulu; Funkcije | K32–K36 |
| Zamjenik i pseudonimnost | Korisnici i uloge; Funkcije | K37–K38 |
| Neriješene odluke ostaju vidljive | Otvorena pitanja | Ručni pregled prije implementacije |
