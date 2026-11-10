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