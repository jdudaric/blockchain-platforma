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

Ovo je funkcionalni opis; točni potpisi definirani su u odjeljku „Sučelja ugovora — Etapa 4”. Navedene poruke greške su točni tekstovi bez dijakritike. Kod više istodobnih grešaka redoslijed provjera tokena definiran je u Dijelu 5; redoslijed provjera modula definiran je u odjeljku „Dio 6”. Kriteriji pojedinu grešku provjeravaju uz ostale valjane uvjete.

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
- **K32 — Nepromjenjiv rok:** **Zadano** je da je krug pokrenut. **Kada** bilo koji korisnik, uključujući predstavnika, pokuša izmijeniti početak ili rok. **Tada** nijedna izmjena nije dopuštena. Krug završava na unaprijed zadanom roku; 7 dana odnosno 3 dana preporučene su zadane vrijednosti aplikacije, a ne obvezno trajanje ugovora.
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
- Implementacija modula glasanja u Dijelu 5; u ovom koraku implementira se samo token i njegova administracija uz testove. Integracijski testovi stvarnog glasanja slijede s modulom. Tehnološki okvir iz AGENTS.md ostaje Vue 3 (script setup), Pinia, Vite; od T4 Solidity ^0.8.24, OpenZeppelin Contracts 5.x, Hardhat 3 (ESM, TypeScript), Mocha i ethers v6; mreža Sepolia, chainId 11155111.

## Otvorena pitanja

Potvrđene odluke iz revizije više se ne smatraju otvorenima. Preostaje precizirati:

1. Tko izvan lanca potvrđuje sadržaj fiksnog registra 25 stanova? Prvi predstavnik i zamjenik zadaju se pri postavljanju ugovora; nakon preuzimanja zamjenika imenuje novi predstavnik. Pravila promjene zamjenika i dobrovoljnog prijenosa potvrđena su u odjeljku „Dio 5 — potvrđene odluke implementacije tokena”.
2. Kako se između više stvarnih suvlasnika istog stana izvan lanca bira ovlaštena adresa te kako predstavnik dokumentira provjeru promjene vlasnika? Na blockchainu pravo ostaje jedno po stanu.
3. Zatvoreno u Dijelu 6: nakon posljednjeg odbijanja ciklus završava bez prihvaćenog projekta.
4. Zatvoreno u Dijelu 6: projekt pod zabranom ne ulazi u novi ciklus prioriteta.
5. Zatvoreno u Dijelu 6: nema uređivanja/povlačenja; prihvaćanje oslobađa mjesto, odbijeni i neobrađeni ostaju aktivni; broje se Unicode skalarne vrijednosti. Prilozi nisu dio sadašnjeg sučelja.
6. Koji se ostali podaci, osim rezultata i evidencije neglasača, prikazuju posjetitelju aplikacije, tko održava privatnu evidenciju identiteta? Redoslijed provjera tokena potvrđen je u Dijelu 5, a modula u Dijelu 6.
7. Dodatni krugovi ponavljaju se do pobjednika prema postojećoj odluci 4, bez uvedenog ograničenja broja ponavljanja. Oporavak uz zamjenika i čekanje ne dokazuje stvarni gubitak ključa.

## Sučelja ugovora — Etapa 4

Dopuna prema odgovorima korisnika u nastavku razgovora 11. 11. 2026. Nazivi, tipovi i administracija potvrđeni su u razgovoru; završni tehnički oblik rezultata i događaja prihvaćen je korisnikovim prepuštanjem tehničke procjene AI-ju. Ova dopuna zatvara pitanja o potpisima za korake 9 i 10 vježbe, a ne sve odluke buduće implementacije.

- Datoteka: `contracts/IStan.sol`; `pragma solidity ^0.8.24`; sučelja `IStanToken` i `IStanModul`, bez implementacije. U Dijelu 5 IStanToken nasljeđuje OpenZeppelin IERC20 radi zajedničkih standardnih događaja.
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

Ovo je prvotni dogovoreni popis događaja sučelja; Dopuna u Dijelu 6 dodaje VotingModuleLinked. Parametri označeni `indexed` služe filtriranju zapisa.

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

Tablica obuhvaća prvotnih 28 funkcija iz `contracts/IStan.sol`. Četiri funkcije povezivanja dopunjene su u Dijelu 6. Oznake odgovaraju komentarima iznad deklaracija; svaki kriterij K1–K41 pojavljuje se barem jednom.

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

### Kriterij | Test | Datoteka | Status

Tablica povezuje svaki kriterij K1–K41 sa stvarnim nazivima testova u mapi `test/`. Navedene su sve varijante parametriziranih testova, s nazivima kakvi se ispisuju pri pokretanju. Kriterij u prvom stupcu primarni je kriterij testa; pojedini integracijski test dodatno provjerava i povezane kriterije.

Statusi se temelje na posljednjem lokalnom pokretanju `npx hardhat test` od 12. 11. 2026.: **69 izvršenih testova prošlo je, a 1 je preskočen (`pending`)**. Naknadno je provjereno podudaranje naziva s aktualnim testnim datotekama. Ova dopuna SPEC-a nije novo pokretanje testova.

| Kriterij | Točan naziv testa | Datoteka | Status |
| --- | --- | --- | --- |
| K1 | `K1: dodjela, više stanova, oduzimanje i novi vlasnik` | `test/Stan.ts` | Prošao |
| K1 | `K1: granice registra, nulta adresa i stan bez prava` | `test/Stan.ts` | Prošao |
| K1 | `K1: svih 25 prava izdaje točno 25 STN` | `test/Stan.ts` | Prošao |
| K2 | `K2: neovlašteni i dvostruki upisi ne mijenjaju stanje` | `test/Stan.ts` | Prošao |
| K3 | `K3: neovlastena dodjela pada bez promjene prava i ukupnog salda` | `test/Stan.ts` | Prošao |
| K4 | `K4: transfer, approve i transferFrom odbijaju iznos 0` | `test/Stan.ts` | Prošao |
| K4 | `K4: transfer, approve i transferFrom odbijaju iznos 1` | `test/Stan.ts` | Prošao |
| K4 | `K4: transfer, approve i transferFrom odbijaju iznos 100` | `test/Stan.ts` | Prošao |
| K5 | `K5: pravo se ne trosi i isti stan ponovno glasa u novom krugu` | `test/StanModul.ts` | Prošao |
| K6 | `K6: stvarna blokada od pocetka do roka, povijest i novi vlasnik` | `test/StanModul.ts` | Prošao |
| K7 | `K7: prijedlog se evidentira s autorom i stanom bez pokretanja glasanja` | `test/StanModul.ts` | Prošao |
| K8 | `K8: ovlasti, kandidati, rokovi i zakazani krug` | `test/StanModul.ts` | Prošao |
| K9 | `K9: konacnost prioriteta, prava, granice vremena i neglasaci` | `test/StanModul.ts` | Prošao |
| K10 | `K10: cetiri prioriteta ne biljeze nijednu potporu ni sudjelovanje` | `test/StanModul.ts` | Prošao |
| K11 | `K11: ponovljeni prijedlog odbija cijeli odabir bez djelomicnog upisa` | `test/StanModul.ts` | Prošao |
| K12 | `K12: drugi glas ne moze promijeniti prvi odgovor ZA` | `test/StanModul.ts` | Prošao |
| K13 | `K13: ponovljena izjednacenja, prazan dodatni krug i tocan skup` | `test/StanModul.ts` | Prošao |
| K14 | `K14: dva izbora u dodatnom krugu odbijaju se bez biljezenja glasa` | `test/StanModul.ts` | Prošao |
| K15 | `K15: 12 ZA i nula PROTIV daje odbijanje` | `test/StanModul.ts` | Prošao |
| K15 | `K15: 13 ZA i nula PROTIV daje prihvacanje` | `test/StanModul.ts` | Prošao |
| K16 | `K16: 0 ZA, rezultat bez finalizacije i fiksna osnovica` | `test/StanModul.ts` | Prošao |
| K17 | `K17: cetiri neglasaca ne povecavaju ni ZA ni PROTIV` | `test/StanModul.ts` | Prošao |
| K18 | `K18: glas na roku i nakon roka odbija se bez rucnog zatvaranja` | `test/StanModul.ts` | Prošao |
| K19 | `K19: glas sekundu prije pocetka pada, tocno na pocetku uspijeva` | `test/StanModul.ts` | Prošao |
| K20 | `K20: saldo drugog stana ne daje pravo glasa za tudji stan` | `test/StanModul.ts` | Prošao |
| K21 | `K21: ugovor ne daje rezultate prije roka, nakon roka vraca zbrojeve` | `test/StanModul.ts` | Prošao — ugovorni dio |
| K22 | `K22: samo predstavnik cita tocan popis stanova bez glasa` | `test/StanModul.ts` | Prošao |
| K23 | `K23: granice ZA/PROTIV i odbijeni projekt nije ponovno sljedeci` | `test/StanModul.ts` | Prošao |
| K24 | `K24: ista adresa glasa za dva stana, ali ne dvaput za isti` | `test/StanModul.ts` | Prošao |
| K25 | `K25: unutarnja provjera blokira obje promjene bez gubitka stanja` | `test/Stan.ts` | Prošao |
| K25 | `K25: konstruktor, jednokratna veza, nevaljane adrese i pogresan token` | `test/StanModul.ts` | Prošao |
| K26 | `K26: promjena vlasnika ne mijenja povijesni glas ni sudjelovanje` | `test/StanModul.ts` | Prošao |
| K27 | `K27: samo prolazak vremena daje konacan rezultat bez finalizacije` | `test/StanModul.ts` | Prošao |
| K28 | `K28: prijedlozi u istom bloku razrjesavaju niza mjesta manjim ID-em` | `test/StanModul.ts` | Prošao |
| K29 | `K29: kandidati se suzavaju nakon svakog dodatnog izjednacenja` | `test/StanModul.ts` | Prošao |
| K30 | `K30: nakon odbijanja samo sljedeci projekt smije u ZA/PROTIV` | `test/StanModul.ts` | Prošao |
| K31 | `K31: odbijen pa sljedeci, prihvacanje zavrsava ciklus i oslobadja mjesto` | `test/StanModul.ts` | Prošao |
| K32 | `K32: tocno funkcije sucelja, bez dodatnih javnih funkcija` | `test/StanModul.ts` | Prošao |
| K33 | `K33: najveci skup od 75 aktivnih prijedloga ostaje izvrsiv` | `test/StanModul.ts` | Prošao |
| K34 | `K34: prava, prazni tekstovi, Unicode granice i tri aktivna po stanu` | `test/StanModul.ts` | Prošao |
| K34 | `K34: odbija nevaljani UTF-8 bez potrosnje mjesta` | `test/StanModul.ts` | Prošao |
| K35 | `K35: 12 ZA, rezultat bez finalizacije i fiksna osnovica` | `test/StanModul.ts` | Prošao |
| K35 | `K35: 13 ZA, rezultat bez finalizacije i fiksna osnovica` | `test/StanModul.ts` | Prošao |
| K36 | `K36: zabrana od roka, granica 90 dana, isti ID i novi slican projekt` | `test/StanModul.ts` | Prošao |
| K37 | `K37: ovlasti, ID 0, aktivni zahtjev i događaj` | `test/Stan.ts` | Prošao |
| K37 | `K37: nema postupka, pogrešan ID i zabrana ponovne uporabe` | `test/Stan.ts` | Prošao |
| K37 | `K37: otkazivanje uspijeva sekundu prije isteka` | `test/Stan.ts` | Prošao |
| K37 | `K37: dovršetak pada sekundu prije isteka` | `test/Stan.ts` | Prošao |
| K37 | `K37: otkazivanje pada točno na isteku` | `test/Stan.ts` | Prošao |
| K37 | `K37: dovršetak točno na isteku, prazni zamjenika i ukida stare ovlasti` | `test/Stan.ts` | Prošao |
| K37 | `K37: setDeputy otkazuje zahtjev prije isteka` | `test/Stan.ts` | Prošao |
| K37 | `K37: setDeputy otkazuje zahtjev nakon isteka` | `test/Stan.ts` | Prošao |
| K37 | `K37: transferRepresentative otkazuje zahtjev prije isteka` | `test/Stan.ts` | Prošao |
| K37 | `K37: transferRepresentative otkazuje zahtjev nakon isteka` | `test/Stan.ts` | Prošao |
| K37 | `K37: transferOwnership otkazuje zahtjev prije isteka` | `test/Stan.ts` | Prošao |
| K37 | `K37: transferOwnership otkazuje zahtjev nakon isteka` | `test/Stan.ts` | Prošao |
| K37 | `K37: odbijene promjene uloga ne otkazuju zahtjev` | `test/Stan.ts` | Prošao |
| K37 | `K37: modul slijedi novog predstavnika bez dodatnih ovlasti zamjenika` | `test/StanModul.ts` | Prošao |
| K38 | `K38: ugovorni dio; zbrojevi su blokirani, ali zapis glasa javno je citljiv` | `test/StanModul.ts` | Prošao — ugovorni dio |
| K38 | `K38: aplikacija skriva zbrojeve prije roka i upozorava na javnost lanca (frontend)` | `test/StanModul.ts` | Čeka frontend (`it.skip`) |
| K39 | `K39: odbija nevaljanog početnog zamjenika` | `test/Stan.ts` | Prošao |
| K39 | `K39: imenovanje zamjenika i sve nevaljane adrese` | `test/Stan.ts` | Prošao |
| K39 | `K39: transferRepresentative sinkronizira owner i predstavnika` | `test/Stan.ts` | Prošao |
| K39 | `K39: transferRepresentative na zamjenika prazni njegovo mjesto` | `test/Stan.ts` | Prošao |
| K39 | `K39: transferOwnership sinkronizira owner i predstavnika` | `test/Stan.ts` | Prošao |
| K39 | `K39: transferOwnership na zamjenika prazni njegovo mjesto` | `test/Stan.ts` | Prošao |
| K39 | `K39: odricanje je zabranjeno, neovlašteni poziv prvo pada na ovlasti` | `test/Stan.ts` | Prošao |
| K40 | `K40: bez glasova ponavlja isti ciklus, novi prijedlog ceka sljedeci` | `test/StanModul.ts` | Prošao |
| K41 | `K41: deploy, javna čitanja i prazna početna evidencija` | `test/Stan.ts` | Prošao |
| K41 | `K41: ABI tokena; token ima tocno funkcije IStanToken i naslijedjene Ownable funkcije` | `test/Stan.ts` | Prošao |

**Provjera potpunosti sljedivosti:** svih 41 kriterija ima barem jedan povezan izvršeni test. Svih 70 registriranih testnih slučajeva (69 izvršenih i 1 preskočen) nalazi se u tablici i ima oznaku postojećeg kriterija. Nema testova bez dodijeljenog kriterija niti kriterija bez povezanog testa.

**Preostala rupa u provjeri aplikacije:** veza s testom ne znači da je cijeli kriterij dokazan. Za K21 provjeren je odgovor ugovora prije i nakon roka, ali prikaz rezultata u aplikaciji još nije provjeren. Za K38 izvršeni test dokazuje blokadu čitanja zbrojeva kroz ugovor i javnu čitljivost zapisa glasa na lancu. Preskočeni test K38 samo je označeno mjesto za buduću provjeru skrivanja zbrojeva i upozorenja u aplikaciji; nije izvršen dokaz niti dovršen frontend test. K21 i K38 zato ostaju djelomično provjereni do implementacije i provjere frontenda.

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


## Dio 5 — potvrđene odluke implementacije tokena

Odluke je korisnik izričito potvrdio u nastavku razgovora 11. 11. 2026., prije implementacije. Ovaj odjeljak dopunjuje ranije potpise i razrješava otvorena pitanja tokena; ne implementira IStanModul.

### Registar, izdavanje i konstruktor

- Postoje točno stanovi s ID-evima 1–25. Početna količina STN je 0; nema početne dodjele ni preminta.
- `constructor(address initialDeputy)` koristi `ERC20("Stan", "STN")` i `Ownable(msg.sender)`. Postavljač je prvi predstavnik. Početni zamjenik mora biti nenulta adresa različita od predstavnika.
- Dodjela izdaje 1 STN, oduzimanje uništava 1 STN. Jedna adresa može imati više prava; ukupno najviše 25 aktivnih prava. `decimals()` vraća 0.
- Implementacija je `contracts/Stan.sol`, Solidity ^0.8.24, OpenZeppelin Contracts 5.x, s importima `@openzeppelin/contracts/...`.
- Radi kompatibilnog nasljeđivanja s ERC20, IStanToken nasljeđuje IERC20. Događaji Transfer i Approval preuzimaju se iz tog zajedničkog sučelja umjesto dvostruke deklaracije. Svi dogovoreni potpisi i događaji ostaju isti; IStanModul nije promijenjen.

### Uloge i administracija

- `owner()` i `representative()` uvijek vraćaju istu adresu. `transferOwnership` i `transferRepresentative` imaju iste ovlasti, provjere i učinak. Naslijeđeni `renounceOwnership` odbija odricanje.
- Zamjenik je obvezan pri postavljanju i pri imenovanju kroz `setDeputy`; mora biti različit od predstavnika. Nije dopušteno imenovati nultu adresu ili ponovno istog zamjenika, niti prenijeti predstavništvo na nultu adresu ili samoga sebe.
- Iznimka: nakon preuzimanja ili dobrovoljnog prijenosa na sadašnjeg zamjenika mjesto zamjenika postaje prazno. Novi predstavnik zatim imenuje drugog zamjenika. Prijenos na treću adresu zadržava sadašnjeg zamjenika.
- Uspješna promjena zamjenika ili predstavnika automatski otkazuje aktivan zahtjev za preuzimanje, i nakon sedam dana ako preuzimanje još nije dovršeno. Odbijena promjena ne otkazuje zahtjev.
- Svaki postupak preuzimanja koristi jedinstven ID veći od 0. Jednom korišten ID ne može se ponovno koristiti ni nakon otkazivanja ni dovršetka; ID-evi ne moraju biti uzastopni.
- Istodobno može postojati jedan zahtjev. Samo zamjenik ga pokreće i dovršava, a samo predstavnik izravno otkazuje.
- Čekanje traje točno `7 days` od pokretanja. Izravno otkazivanje dopušteno je samo za `block.timestamp < executableAt`; dovršetak za `block.timestamp >= executableAt`.
- Dovršetak prazni zahtjev i mjesto zamjenika te prenosi vlasništvo i predstavništvo. Dovršetak ne emitira TakeoverCancelled.
- Standardni Ownable događaj OwnershipTransferred prati promjene vlasništva uz RepresentativeChanged. Početno postavljanje također bilježi početnog predstavnika i zamjenika.

### Dodatne poruke grešaka i redoslijed

| Uvjet | Točna poruka |
| --- | --- |
| Neovlaštena predstavnička radnja, uključujući Ownable prijenos i odricanje | `Samo predstavnik` |
| Neovlašteno pokretanje ili dovršetak preuzimanja | `Samo zamjenik` |
| Nulta ili nedopušteno ista adresa uloge | `Neispravna adresa` |
| Odricanje predstavnika | `Odricanje nije dopusteno` |
| ID novog postupka je 0 | `Neispravan ID preuzimanja` |
| ID novog postupka već je korišten | `ID preuzimanja je iskoristen` |
| Već postoji aktivan zahtjev | `Preuzimanje je pokrenuto` |
| Otkazivanje ili dovršetak za neaktivan/pogrešan ID, uključujući 0 | `Nema preuzimanja` |
| Dovršetak prije isteka čekanja | `Cekanje nije zavrseno` |
| Izravno otkazivanje na isteku čekanja ili poslije | `Rok za otkazivanje je istekao` |

Prvo se provjerava ovlast, zatim stanje postupka ili glasanja, pa ulazni podaci. Pri dodjeli/oduzimanju slijede provjera aktivnog kruga, postojanja stana i njegova prava; pri dodjeli zatim nenulta adresa. Pri pokretanju preuzimanja slijede odsutnost aktivnog zahtjeva, ID veći od 0 i neiskorištenost ID-a. Pri otkazivanju/dovršetku provjerava se odgovarajući aktivni ID, zatim vrijeme. Svi odbijeni pozivi zadržavaju prethodno stanje i ne ostavljaju događaje.

### Stanje nakon Dijela 5 — prije integracije modula

- Token ima unutarnju nadogradivu provjeru `_isRoundActive()`. U ovoj verziji vraća false jer glasanje još ne postoji; budući modul mora je nadograditi stvarnim stanjem kruga. Dodjela i oduzimanje već koriste poruku K25.
- Testni pomoćni ugovor simulira aktivnost kruga za provjeru blokade K25. To nije implementacija glasanja niti dokaz potpune integracije s modulom.
- K5, K6, K24 i K26 u dijelu stvarnih glasova i povijesti ostaju za integracijske testove modula. Prag 13 ZA nije logika tokena.
- Dopuštene su samo javne funkcije IStanToken i obvezne naslijeđene/override funkcije ERC20 i Ownable. Testni pomoćni ugovor nije ugovor za postavljanje na mrežu.
- Korisnik je odobrio minimalne alate: Hardhat 3 (ESM, TypeScript), Mocha, ethers v6 i OpenZeppelin Contracts 5.x, uz nužne dodatke i tipove. Testiraju se uspješni i neuspješni slučajevi radnji. Funkcije koje uvijek odbijaju poziv nemaju uspješan slučaj, a bezuvjetna čitanja nemaju namjerno neuspješan slučaj.


## Dio 6 — potvrđene odluke i implementacija modula (12. 11. 2026.)

Korisnik je potvrdio plan prije koda, zatim preporuke 1A/2A/3A i preostale odluke odgovorom „sve A”. Ovaj odjeljak nadopunjuje i, gdje je potrebno, zamjenjuje ranije otvorene točke i opis stanja iz Dijela 5. Tehnički detalji ispod opisuju implementaciju; nisu tvrdnja da su svi ranije bili posebno propisani.

### Životni ciklus i trajanje

- Prihvaćeni prijedlog prestaje biti aktivan i oslobađa jedno od tri mjesta pripadajućeg stana. Odbijeni i neobrađeni prijedlozi ostaju aktivni. Odbijeni i tijekom 90-dnevne zabrane zauzima mjesto. Promjena vlasnika ne briše prijedloge ni limit stana.
- Nema uređivanja, povlačenja ni dodatne funkcije aktivacije. Novi ID znači novi prijedlog, uz isti limit tri aktivna po stanu; sličnost teksta ne aktivira zabranu.
- Prvi prioritetni krug uzima sve aktivne prijedloge koji u trenutku pokretanja nisu pod zabranom. Taj skup ostaje isti tijekom ciklusa. Novi prijedlozi predani tijekom ciklusa čekaju sljedeći ciklus, čak i ako se prioriteti ponavljaju zbog nultog sudjelovanja.
- Nakon odbijanja posljednjeg projekta ciklus završava bez prihvaćenog projekta. Nakon prihvaćanja ciklus također završava. Novi ciklus uvijek ponovno određuje prioritete.
- Zabrana traje do `endTime + 90 days`, uključuje vrijeme prije te granice, a na samoj granici projekt ponovno može u prioritete. Vrijeme naknadne tehničke obrade ne pomiče početak zabrane.
- Početak i rok određuje predstavnik. Potrebno je `endTime > startTime` i `endTime > block.timestamp`. Trajanja 7/3 dana ostaju preporuka aplikaciji, ne ograničenje ugovora. Početak novog kruga ne smije biti prije roka prethodnog; novi krug pokreće se tek kada prethodni završi. Nema preklapanja ni već zakazanih krugova.
- Aktivnost za blokadu promjene prava jest `startTime <= block.timestamp < endTime`. Prije početka zakazanog kruga promjena prava je dopuštena; od početka do roka zabranjena. Povijesni glasovi uvijek ostaju nepromijenjeni.

### Rangiranje i rubni slučajevi

- Rezultati svakog kruga prioriteta/dodatnog kruga rangiraju se po potporama silazno, zatim vremenu prijedloga i ID-u uzlazno. Jednake najveće potpore i dalje znače neriješeno prvo mjesto.
- Dodatni krug bira pobjednika među izjednačenima. Pobjednik ide na prvo mjesto rang-liste ciklusa, a ostali ostaju u poretku izvornog kruga prioriteta (potpore, vrijeme, ID). Potpore iz dodatnih krugova ne zbrajaju se s prioritetima.
- Ako dodatni krug nema glasova, vraća `NoVotes` i prazne vodeće ID-eve, kako nalaže tip rezultata. Prethodno izjednačenje ostaje neriješeno: dopušten je novi dodatni krug s istim kandidatima. Prazan početni prioritetni krug ponavlja se kao prioritetni, ne dodatni krug.
- Svaki krug pohranjuje ID ciklusa i vezu na prethodni krug istog ciklusa (0 za prvi krug).
- Nakon završenog dodatnog kruga dopušteno je nastaviti samo iz posljednjeg kruga; stari krug ne može otvoriti paralelnu granu glasanja.
- U popisu neglasača nalaze se svi stanovi 1–25 bez glasa, uključujući one bez dodijeljenog prava. Čitanje tog popisa ne traži da krug završi.

### Unicode tekst

Naslov ima najviše 100, opis najviše 1000 Unicode skalarnih vrijednosti. `č` i pojedinačni emoji poput `😀` računaju se kao jedan znak; kombinacija slova i kombinirajućeg naglaska ili složenog emojija može imati više vrijednosti. Ne radi se normalizacija niti brojanje vizualnih grafema. Nevaljan UTF-8 se odbija. Prazan znači duljina nula; tekst sastavljen od razmaka nije posebno zabranjen. Prilozi i osobni podaci nisu dio implementacije.

### Odobrena minimalna dopuna sučelja za K25

| Funkcija | Uloga i učinak | Kriteriji |
| --- | --- | --- |
| `IStanToken.setVotingModule(address module)` | Samo predstavnik, jednokratno povezuje već postavljen modul | K25 |
| `IStanToken.votingModule() view returns (address)` | Svi, nulta adresa dok modul nije povezan | K25 |
| `IStanModul.tokenAddress() view returns (address)` | Svi, nepromjenjiva adresa tokena iz konstruktora | K25 |
| `IStanModul.isRoundActive() view returns (bool)` | Svi, stvarna trenutačna aktivnost posljednjeg kruga | K25, K27 |

- Uz ranijih 28 sada postoje ukupno 32 deklarirane funkcije u dva sučelja. Gornje četiri dopunjuju prethodne tablice sljedivosti. Modul nema drugih javnih funkcija ni automatskih javnih gettera. Unutarnje pomoćne funkcije nisu dio javnog sučelja.
- Konstruktor modula prima `address initialToken`, provjerava kod na adresi i čita predstavnika kroz `IStanToken`. Veza tokena je nepromjenjiva. Token provjerava da modul ima kod, da `tokenAddress()` pokazuje na njega te da može pročitati neaktivan status. Jednokratnu vezu bilježi `VotingModuleLinked(address indexed module)`.
- Redoslijed lokalnog postavljanja: `Stan(initialDeputy)`, zatim `StanModul(adresaStana)`, zatim predstavnikov `Stan.setVotingModule(adresaModula)`. Nepovezan modul ne smije pokrenuti nijednu vrstu kruga. Token prije povezivanja omogućuje dodjelu početnih prava.
- Postavljanje povezuje odabrani ugovor; provjera sučelja nije dokaz vjerodostojnosti proizvoljnog tuđeg koda. Za projekt se postavlja ovdje testirani StanModul. Jednom postavljeni ugovori u Remix VM-u neće dobiti ove izmjene bez novog postavljanja.
- `_isRoundActive()` u tokenu sada čita stvarni povezani modul. Testni StanRoundHarness ostaje samo pomoćni ugovor.

### Dodatne tehničke poruke i redoslijed provjera

Ranije propisane poruke ostaju točno iste. Za ranije neimenovane neuspjehe koriste se:

| Uvjet | Poruka |
| --- | --- |
| Nulta adresa ili adresa bez koda pri povezivanju/konstruktoru | `Neispravna adresa` |
| Modul je već trajno povezan | `Modul je vec povezan` |
| Modul je za drugi token | `Neispravan token modula` |
| Modul ne podržava potrebno čitanje sučelja | `Neispravan modul` |
| Kandidat za povezivanje prijavljuje aktivan krug | `Modul je aktivan` |
| Pokretanje kroz nepovezani modul | `Modul nije povezan` |
| Prethodni krug je aktivan ili zakazan | `Prethodno glasanje nije zavrseno` |
| Početak novog kruga preklapa interval prethodnog | `Preklapanje glasanja` |
| Novi prioriteti dok postojeći ciklus nije završen (osim ponavljanja bez glasova) | `Ciklus nije zavrsen` |
| ZA/PROTIV bez otvorenog ciklusa, uključujući nakon prihvaćanja/posljednjeg odbijanja | `Ciklus nije otvoren` |
| Skup prioriteta ne odgovara svim raspoloživim prijedlozima / istom ciklusu | `Nepotpun skup prijedloga` |
| Ponovljeni ID u popisu za pokretanje prioriteta | `Prijedlog je ponovljen` |
| Prihvaćeni projekt ponovno u prioritetima | `Prijedlog nije raspoloziv` |
| Projekt pod aktivnom zabranom | `Projekt je u zabrani` |
| ZA/PROTIV za projekt koji nije sljedeći | `Projekt nije sljedeci` |
| Rezultate čita netko tko nije predstavnik i nema STN | `Nema prava za rezultate` |
| Nevaljana UTF-8 sekvenca | `Neispravan tekst` |

Administrativne funkcije prvo provjeravaju ulogu, a pokretanja zatim povezanost i stanje ciklusa/kruga. Predaja glasa provjerava postojanje kruga, pravo za stan, vrstu, početak, kraj, prethodni glas te specifičan izbor. Nepoznat stan pri predlaganju/glasanju znači `Nema prava za stan`; izravni getter tokena i dalje vraća `Stan ne postoji`. Čitanje rezultata provjerava ovlast, postojanje kruga pa rok; čitanje neglasača ovlast pa postojanje. Ako postoji više neovisnih pogrešaka ulaza, mjerodavan je redoslijed provjera u implementaciji, a kriteriji ciljaju jedan nevaljan uvjet.

### Obrada isteka i provjere

`getRoundResults` izravno računa rezultat iz roka i glasova; ne traži promjenu stanja ni dodatnu finalizacijsku transakciju. Pri sljedećoj redovnoj radnji modul interno usklađuje aktivnost prijedloga, rang-listu, zabranu i stanje ciklusa. Odbijena transakcija poništava i tu internu obradu, a sljedeći valjan poziv ponovno je izvodi. To ne mijenja konačni rezultat.

Testovi modula nalaze se u `test/StanModul.ts`, a postojeći testovi tokena u `test/Stan.ts`. Testovi javnih radnji pokrivaju uspjeh i neuspjeh. Bezuvjetni getteri `tokenAddress`, `isRoundActive` i `votingModule` nemaju namjerno neuspješan slučaj; provjeravaju se njihove vrijednosti i vremenska stanja. Aplikacijski prikaz i upozorenje o pseudonimnosti iz K21/K38 nisu dokazani testovima ugovora i ostaju posao frontenda. Nije izvršeno postavljanje na Sepoliju.
