export const naziviKrugova = ['Prioriteti', 'Dodatni krug', 'ZA / PROTIV']
export const naziviFaza = {
  prijedlozi: 'Prikupljanje prijedloga',
  zakazano: 'Zakazano glasanje',
  aktivno: 'Glasanje je otvoreno',
  zavrseno: 'Krug je završen',
}
export const naziviIshoda = [
  'Bez glasova', 'Izjednačeno prvo mjesto', 'Prioritet je određen', 'Projekt je prihvaćen', 'Projekt je odbijen',
]

const datum = new Intl.DateTimeFormat('hr-HR', { dateStyle: 'medium', timeStyle: 'short' })

export function datumKruga(sekunde) {
  return datum.format(new Date(sekunde * 1000))
}
